import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { movies, subtitles, videoAssets } from "@/lib/db/schema";
import {
  cloudflareSigningConfigured,
  signedPlaybackUrl,
} from "@/lib/video/cloudflare";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  try {
    const [movie] = await db
      .select()
      .from(movies)
      .where(eq(movies.slug, slug))
      .limit(1);

    if (movie) {
      if (movie.status !== "published") {
        return NextResponse.json(
          { error: "This title is not available right now." },
          { status: 404 },
        );
      }
      if (
        movie.licenseType === "unlicensed" ||
        !movie.rightsConfirmedAt ||
        (movie.licenseExpiresAt && movie.licenseExpiresAt.getTime() < Date.now())
      ) {
        return NextResponse.json(
          { error: "This title is not currently licensed for playback." },
          { status: 403 },
        );
      }

      const [asset] = await db
        .select()
        .from(videoAssets)
        .where(eq(videoAssets.movieId, movie.id))
        .limit(1);

      if (!asset || asset.status !== "ready" || (!asset.hlsUrl && !asset.mp4Url)) {
        return NextResponse.json(
          { error: "This title does not have a playable stream yet." },
          { status: 404 },
        );
      }

      const tracks = await db
        .select({
          language: subtitles.language,
          label: subtitles.label,
          url: subtitles.url,
          isDefault: subtitles.isDefault,
        })
        .from(subtitles)
        .where(eq(subtitles.movieId, movie.id));

      let hlsUrl = asset.hlsUrl;
      let mp4Url = asset.mp4Url;
      let signed = false;

      if (
        asset.signedPlayback &&
        asset.provider === "cloudflare" &&
        asset.providerAssetId &&
        cloudflareSigningConfigured()
      ) {
        if (hlsUrl) {
          try {
            hlsUrl = signedPlaybackUrl(hlsUrl, asset.providerAssetId);
            signed = true;
          } catch {
            hlsUrl = asset.hlsUrl;
          }
        }
        if (mp4Url) {
          try {
            mp4Url = signedPlaybackUrl(mp4Url, asset.providerAssetId);
            signed = true;
          } catch {
            mp4Url = asset.mp4Url;
          }
        }
      }

      return NextResponse.json(
        {
          source: asset.provider,
          name: movie.name,
          kind: movie.kind,
          posterUrl: movie.backdropUrl ?? movie.posterUrl,
          hlsUrl,
          mp4Url,
          subtitles: tracks,
          signed,
          expiresIn: signed ? 7200 : null,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch {
    // Fall through to a not-found response when the database is unavailable.
  }

  return NextResponse.json({ error: "Title not found." }, { status: 404 });
}
