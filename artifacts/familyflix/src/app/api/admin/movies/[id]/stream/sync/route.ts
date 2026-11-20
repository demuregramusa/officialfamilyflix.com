import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { jsonError, requireStaffApi } from "@/lib/admin/api";
import { getAdminMovie, logAudit } from "@/lib/admin/movies";
import { db } from "@/lib/db";
import { videoAssets } from "@/lib/db/schema";
import {
  cloudflareConfigured,
  getCloudflareAsset,
  mapCloudflareStatus,
} from "@/lib/video/cloudflare";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("stream.manage", request);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const result = await getAdminMovie(id);
  if (!result) return jsonError("Title not found.", 404);
  if (!result.asset || result.asset.provider !== "cloudflare" || !result.asset.providerAssetId) {
    return jsonError("This title does not have a Cloudflare upload yet.");
  }
  if (!cloudflareConfigured()) {
    return jsonError("Cloudflare Stream is not configured.", 503);
  }

  let remote;
  try {
    remote = await getCloudflareAsset(result.asset.providerAssetId);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not reach Cloudflare Stream.",
      502,
    );
  }

  const status = mapCloudflareStatus(remote);
  const [asset] = await db
    .update(videoAssets)
    .set({
      status,
      hlsUrl: remote.playback?.hls ?? null,
      thumbnailUrl: remote.thumbnail ?? null,
      durationSeconds: remote.duration ? Math.round(remote.duration) : null,
      sizeBytes: remote.size ?? null,
      width: remote.input?.width ?? null,
      height: remote.input?.height ?? null,
      signedPlayback: Boolean(remote.requireSignedURLs),
      error:
        status === "error"
          ? remote.status?.errorReasonText ??
            remote.status?.errorReasonCode ??
            "Cloudflare could not process this video."
          : null,
      updatedAt: new Date(),
    })
    .where(eq(videoAssets.movieId, id))
    .returning();

  await logAudit(auth.session, "stream.sync", "movie", id, { status });
  return NextResponse.json({ asset });
}
