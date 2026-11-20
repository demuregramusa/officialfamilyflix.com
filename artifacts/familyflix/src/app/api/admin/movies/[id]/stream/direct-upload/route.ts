import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { jsonError, requireStaffApi } from "@/lib/admin/api";
import { getAdminMovie, logAudit } from "@/lib/admin/movies";
import { db } from "@/lib/db";
import { movies, videoAssets } from "@/lib/db/schema";
import {
  cloudflareConfigured,
  cloudflareSigningConfigured,
  createDirectUpload,
} from "@/lib/video/cloudflare";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("stream.manage", request);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const result = await getAdminMovie(id);
  if (!result) return jsonError("Title not found.", 404);
  if (result.movie.kind === "live") {
    return jsonError("Live channels do not use a movie upload.");
  }

  if (!cloudflareConfigured()) {
    return jsonError(
      "Cloudflare Stream is not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_STREAM_API_TOKEN, or attach an HLS URL instead.",
      503,
    );
  }

  let upload;
  try {
    upload = await createDirectUpload({
      name: result.movie.name,
      movieId: result.movie.id,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not start the Cloudflare upload.",
      502,
    );
  }

  const values = {
    movieId: id,
    provider: "cloudflare" as const,
    providerAssetId: upload.uid,
    playbackId: null,
    hlsUrl: null,
    mp4Url: null,
    thumbnailUrl: null,
    status: "pending_upload" as const,
    signedPlayback: cloudflareSigningConfigured(),
    error: null,
    createdBy: auth.session.userId,
    updatedAt: new Date(),
  };

  await db
    .insert(videoAssets)
    .values(values)
    .onConflictDoUpdate({ target: videoAssets.movieId, set: values });
  await db.update(movies).set({ updatedAt: new Date() }).where(eq(movies.id, id));
  await logAudit(auth.session, "stream.direct_upload", "movie", id, {
    providerAssetId: upload.uid,
  });

  return NextResponse.json({
    uploadUrl: upload.uploadURL,
    uid: upload.uid,
    provider: "cloudflare",
  });
}
