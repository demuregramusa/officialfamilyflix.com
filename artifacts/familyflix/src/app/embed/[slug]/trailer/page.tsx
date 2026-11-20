import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Film, Play } from "lucide-react";

import { getSettings } from "@/lib/admin/settings";
import { backdropUrl, getTitle } from "@/lib/catalog";
import { getTrailerVideoId, trailerEmbedUrl } from "@/lib/trailer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trailer",
  robots: { index: false, follow: false },
};

export default async function TrailerEmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const settings = await getSettings();
  if (!settings.developer.embedsEnabled || !settings.playback.trailersEnabled) {
    notFound();
  }

  const { slug } = await params;
  const title = getTitle(slug);
  if (!title || title.type !== "movie") notFound();

  const videoId = await getTrailerVideoId(slug);

  if (!videoId) {
    return (
      <div className="relative grid h-dvh w-full place-items-center overflow-hidden bg-black px-6 text-center">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url("${backdropUrl(title)}")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/40" />
        <div className="relative max-w-md">
          <Film className="mx-auto size-8 text-[#b79dff]" aria-hidden />
          <p className="mt-4 text-[15px] font-semibold text-white">
            Trailer not available
          </p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/50">
            {title.name} ({title.year}) does not have an embeddable trailer
            yet. The full movie is still free to watch on FamilyFlix.
          </p>
          <Link
            href={`/watch/${encodeURIComponent(title.slug)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-[12.5px] font-bold text-black transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <Play className="size-3.5" fill="currentColor" aria-hidden />
            Watch the full movie
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <iframe
        src={trailerEmbedUrl(videoId)}
        title={`${title.name} (${title.year}) trailer`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="h-full w-full border-0"
      />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
        <span className="text-[13px] font-black leading-none tracking-[-0.05em] text-white/85">
          family<span className="text-[#b79dff]">flix</span>
        </span>
        <span className="rounded-[3px] bg-black/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/65 backdrop-blur">
          Trailer
        </span>
      </div>
    </div>
  );
}
