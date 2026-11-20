import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Volume2 } from "lucide-react";

import { EpisodeList } from "@/components/familyflix/episode-list";
import { MyListButton } from "@/components/familyflix/my-list-button";
import { PosterCard, posterSize } from "@/components/familyflix/poster-card";
import { ShareButton } from "@/components/familyflix/share-button";
import { TitleRow } from "@/components/familyflix/title-row";
import { getTitle, getTitles, relatedTitles } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = getTitle(slug);
  if (!title) return { title: "Title not found" };
  return { title: `Watch ${title.name}` };
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const title = getTitle(slug);
  if (!title) notFound();

  const isSeries = title.type === "series";
  const isLive = title.type === "live";
  const related = getTitles(relatedTitles(title, 10));
  const detail = isSeries
    ? `${title.seasons} ${title.seasons === 1 ? "Season" : "Seasons"}`
    : isLive
      ? "Live channel"
      : title.duration;

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-40"
        style={{
          background: `radial-gradient(60% 100% at 50% 0%, ${title.palette[1]}55 0%, transparent 70%)`,
        }}
      />

      <div className="relative mx-auto w-full max-w-[1240px] px-4 pb-6 pt-5 sm:px-6 md:px-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`/title/${title.slug}`}
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-white/50 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Back to details
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-medium text-white/45">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-2.5 py-1">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Free with ads
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-2.5 py-1">
              <Volume2 className="size-3" aria-hidden />
              HD
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)] ring-1 ring-white/10">
          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={`/embed/${title.slug}`}
              title={`${title.name} player`}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        </div>

        <p className="mt-2.5 text-center text-[11px] text-white/30">
          Your title will start after a short ad break. Ads keep FamilyFlix free.
        </p>

        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {title.badge ? (
                <span className="rounded-[4px] bg-white px-1.5 py-0.5 text-[9px] font-black uppercase leading-none tracking-[0.12em] text-black">
                  {title.badge}
                </span>
              ) : null}
              <span className="rounded-[4px] border border-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-[0.12em] text-white/70">
                {isLive ? "Live" : isSeries ? "Series" : "Movie"}
              </span>
            </div>
            <h1 className="mt-2 text-[clamp(1.7rem,3.2vw,2.5rem)] font-black leading-none tracking-[-0.035em] text-white">
              {title.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] font-medium text-white/50">
              {title.score > 0 ? (
                <span className="font-bold text-emerald-400">{title.score}%</span>
              ) : null}
              <span>{title.year}</span>
              <span className="rounded border border-white/20 px-1.5 py-px text-[10px] font-semibold text-white/60">
                {title.rating}
              </span>
              <span>{detail}</span>
              <span className="text-white/20">·</span>
              <span>{title.genres.join(", ")}</span>
            </div>
            <p className="mt-3 max-w-[70ch] text-[13px] leading-relaxed text-white/55">
              {title.synopsis}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <MyListButton slug={title.slug} name={title.name} />
            <ShareButton name={title.name} />
          </div>
        </div>

        {isSeries ? <EpisodeList title={title} /> : null}

        {isLive && title.live ? (
          <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ff8a8a]">
                  <span className="size-1.5 rounded-full bg-[#f04444] animate-live" />
                  On now
                </p>
                <p className="mt-1 text-[15px] font-semibold text-white">
                  {title.live.onNow}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
                  Up next
                </p>
                <p className="mt-1 text-[13px] text-white/60">{title.live.next}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {related.length > 0 ? (
        <div className="mt-8">
          <TitleRow title="Up Next" subtitle="Keep watching after this">
            {related.map((item) => (
              <PosterCard key={item.slug} title={item} className={posterSize} />
            ))}
          </TitleRow>
        </div>
      ) : null}
    </div>
  );
}
