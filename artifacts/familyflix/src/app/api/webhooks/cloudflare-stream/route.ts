import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { videoAssets } from "@/lib/db/schema";
import { getCloudflareAsset, mapCloudflareStatus } from "@/lib/video/cloudflare";

export async function POST(request: Request) {
  const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
  if (secret) {
    const provided =
      request.headers.get("x-webhook-secret") ??
      new URL(request.url).searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Invalid webhook secret." }, { status: 401 });
    }
  }

  let payload: { uid?: string; data?: { uid?: string } };
  try {
    payload = (await request.json()) as { uid?: string; data?: { uid?: string } };
  } catch {
    return NextResponse.json({ ok: true });
  }

  const uid = payload.uid ?? payload.data?.uid;
  if (!uid) return NextResponse.json({ ok: true });

  const [asset] = await db
    .select()
    .from(videoAssets)
    .where(eq(videoAssets.providerAssetId, uid))
    .limit(1);

  if (!asset) return NextResponse.json({ ok: true });

  try {
    const remote = await getCloudflareAsset(uid);
    const status = mapCloudflareStatus(remote);
    await db
      .update(videoAssets)
      .set({
        status,
        hlsUrl: remote.playback?.hls ?? asset.hlsUrl,
        thumbnailUrl: remote.thumbnail ?? asset.thumbnailUrl,
        durationSeconds: remote.duration ? Math.round(remote.duration) : asset.durationSeconds,
        sizeBytes: remote.size ?? asset.sizeBytes,
        width: remote.input?.width ?? asset.width,
        height: remote.input?.height ?? asset.height,
        signedPlayback: Boolean(remote.requireSignedURLs),
        error:
          status === "error"
            ? remote.status?.errorReasonText ??
              remote.status?.errorReasonCode ??
              "Cloudflare could not process this video."
            : null,
        updatedAt: new Date(),
      })
      .where(eq(videoAssets.id, asset.id));
  } catch {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
