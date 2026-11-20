import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { firstIssue, jsonError, requireStaffApi } from "@/lib/admin/api";
import { can } from "@/lib/admin/permissions";
import { createMovie, listAdminMovies } from "@/lib/admin/movies";
import { movieCreateSchema } from "@/lib/admin/validation";
import { db } from "@/lib/db";
import { movies } from "@/lib/db/schema";

export async function GET(request: Request) {
  const auth = await requireStaffApi("library.view", request);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const kind = searchParams.get("kind");

  const rows = await listAdminMovies({
    query: searchParams.get("q") ?? undefined,
    status:
      status === "draft" || status === "published" || status === "archived"
        ? status
        : undefined,
    kind: kind === "movie" || kind === "series" || kind === "live" ? kind : undefined,
  });

  return NextResponse.json({ movies: rows });
}

export async function POST(request: Request) {
  const auth = await requireStaffApi("library.create", request);
  if (auth.response) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Send a JSON body.");
  }

  const parsed = movieCreateSchema.safeParse(payload);
  if (!parsed.success) return jsonError(firstIssue(parsed.error));

  const [existing] = await db
    .select({ id: movies.id })
    .from(movies)
    .where(eq(movies.slug, parsed.data.slug))
    .limit(1);
  if (existing) return jsonError("That slug is already in use.", 409);

  if (parsed.data.status === "published") {
    return jsonError("Save the title as a draft, attach a stream, then publish.");
  }

  const input = { ...parsed.data };
  if (!can(auth.session.role, "rights.manage")) {
    input.rightsHolder = null;
    input.licenseType = "unlicensed";
    input.licenseTerritory = null;
    input.licenseExpiresAt = null;
    input.sourceUrl = null;
    input.rightsConfirmed = false;
  }

  const movie = await createMovie(input, auth.session);
  return NextResponse.json({ movie }, { status: 201 });
}

export const dynamic = "force-dynamic";
