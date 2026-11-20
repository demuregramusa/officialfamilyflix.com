import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { firstIssue, jsonError, requireStaffApi } from "@/lib/admin/api";
import { getAdminMovie, logAudit } from "@/lib/admin/movies";
import { manualStreamSchema } from "@/lib/admin/validation";
import { db } from "@/lib/db";
import { movies, videoAssets } from "@/lib/db/schema";
import { deleteCloudflareAsset } from "@/lib/video/cloudflare";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireStaffApi("stream.view", request);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const result = await getAdminMovie(id);
  if (!result) return jsonError("Title not found.", 404);
  return NextResponse.json({ asset: result.asset });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireStaffApi("stream.manage", request);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const result = await getAdminMovie(id);
  if (!result) return jsonError("Title not found.", 404);
  if (result.movie.kind === "live") {
    return jsonError("Live channels do not use a movie stream. Change the type first.");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Send a JSON body.");
  }

  const parsed = manualStreamSchema.safeParse(payload);
  if (!parsed.success) return jsonError(firstIssue(parsed.error));

  const values = {
    movieId: id,
    provider: "manual" as const,
    providerAssetId: null,
    playbackId: null,
    status: "ready" as const,
    hlsUrl: parsed.data.hlsUrl,
    mp4Url: parsed.data.mp4Url,
    thumbnailUrl: parsed.data.thumbnailUrl,
    durationSeconds: parsed.data.durationSeconds ?? null,
    signedPlayback: parsed.data.signedPlayback,
    error: null,
    createdBy: auth.session.userId,
    updatedAt: new Date(),
  };

  const [asset] = await db
    .insert(videoAssets)
    .values(values)
    .onConflictDoUpdate({ target: videoAssets.movieId, set: values })
    .returning();

  await db.update(movies).set({ updatedAt: new Date() }).where(eq(movies.id, id));
  await logAudit(auth.session, "stream.attach", "movie", id, {
    hlsUrl: parsed.data.hlsUrl,
    mp4Url: parsed.data.mp4Url,
  });

  return NextResponse.json({ asset });
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireStaffApi("stream.manage", request);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const result = await getAdminMovie(id);
  if (!result) return jsonError("Title not found.", 404);

  if (result.asset?.provider === "cloudflare" && result.asset.providerAssetId) {
    try {
      await deleteCloudflareAsset(result.asset.providerAssetId);
    } catch {
      // Continue removing the local record.
    }
  }

  await db.delete(videoAssets).where(eq(videoAssets.movieId, id));
  await logAudit(auth.session, "stream.remove", "movie", id);
  return NextResponse.json({ ok: true });
}
