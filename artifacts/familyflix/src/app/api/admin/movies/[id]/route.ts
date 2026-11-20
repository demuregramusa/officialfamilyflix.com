import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { firstIssue, jsonError, requireStaffApi } from "@/lib/admin/api";
import { can } from "@/lib/admin/permissions";
import {
  deleteMovie,
  getAdminMovie,
  publishBlockers,
  updateMovie,
} from "@/lib/admin/movies";
import { movieUpdateSchema } from "@/lib/admin/validation";
import { db } from "@/lib/db";
import { movies } from "@/lib/db/schema";
import { deleteCloudflareAsset } from "@/lib/video/cloudflare";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireStaffApi("library.view", request);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const result = await getAdminMovie(id);
  if (!result) return jsonError("Title not found.", 404);
  return NextResponse.json(result);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffApi("library.edit", request);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const existing = await getAdminMovie(id);
  if (!existing) return jsonError("Title not found.", 404);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Send a JSON body.");
  }

  const parsed = movieUpdateSchema.safeParse(payload);
  if (!parsed.success) return jsonError(firstIssue(parsed.error));

  const input = { ...parsed.data };

  if (!can(auth.session.role, "library.publish")) {
    if (input.status && input.status !== existing.movie.status) {
      return jsonError("Only an administrator can change publishing state.", 403);
    }
    input.status = undefined;
  }

  if (!can(auth.session.role, "rights.manage")) {
    const sameText = (next: string | null | undefined, current: string | null) =>
      next === undefined || (next ?? "") === (current ?? "");
    const currentExpiry = existing.movie.licenseExpiresAt?.getTime() ?? null;
    const nextExpiry = input.licenseExpiresAt?.getTime() ?? null;
    const changed =
      !sameText(input.rightsHolder, existing.movie.rightsHolder) ||
      !sameText(input.licenseType, existing.movie.licenseType) ||
      !sameText(input.licenseTerritory, existing.movie.licenseTerritory) ||
      !sameText(input.sourceUrl, existing.movie.sourceUrl) ||
      (input.licenseExpiresAt !== undefined && nextExpiry !== currentExpiry) ||
      (input.rightsConfirmed !== undefined &&
        input.rightsConfirmed !== Boolean(existing.movie.rightsConfirmedAt));

    if (changed) {
      return jsonError(
        "Only an administrator can change licensing and rights.",
        403,
      );
    }

    input.rightsHolder = undefined;
    input.licenseType = undefined;
    input.licenseTerritory = undefined;
    input.licenseExpiresAt = undefined;
    input.sourceUrl = undefined;
    input.rightsConfirmed = undefined;
  }

  if (input.slug) {
    const [duplicate] = await db
      .select({ id: movies.id })
      .from(movies)
      .where(and(eq(movies.slug, input.slug), ne(movies.id, id)))
      .limit(1);
    if (duplicate) return jsonError("That slug is already in use.", 409);
  }

  if (input.status === "published" && existing.movie.status !== "published") {
    const candidate = {
      ...existing.movie,
      ...input,
      rightsConfirmedAt:
        input.rightsConfirmed === undefined
          ? existing.movie.rightsConfirmedAt
          : input.rightsConfirmed
            ? new Date()
            : null,
    };
    const blockers = publishBlockers(candidate, existing.asset);
    if (blockers.length) return jsonError(blockers.join(" "));
  }

  const movie = await updateMovie(id, input, auth.session);
  return NextResponse.json({ movie });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireStaffApi("library.delete", request);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const existing = await getAdminMovie(id);
  if (!existing) return jsonError("Title not found.", 404);

  if (existing.asset?.provider === "cloudflare" && existing.asset.providerAssetId) {
    try {
      await deleteCloudflareAsset(existing.asset.providerAssetId);
    } catch {
      // The title is removed locally even if the provider asset is already gone.
    }
  }

  await deleteMovie(id, auth.session);
  return NextResponse.json({ ok: true });
}
