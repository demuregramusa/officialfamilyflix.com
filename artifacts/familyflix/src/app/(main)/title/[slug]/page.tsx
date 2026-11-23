import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Play } from "lucide-react";

import { BackdropArt, PosterImage } from "@/components/familyflix/art";
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
  return {
    title: title.name,
    description: title.synopsis,
  };
}

export default async function TitlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const title = getTitle(slug);
  if (!title) notFound();

  const isSeries = title.type === "series";
  const isLive = title.type === "live";
  const browseHref = isSeries ? "/tv-shows" : "/movies";
  const browseLabel = isSeries ? "TV Shows" : "Movies";
  const related = getTitles(relatedTitles(title, 10));
  const detail = isSeries
    ? `${title.seasons} ${title.seasons === 1 ? "Season" : "Seasons"}`
    : isLive
      ? "Live channel"
      : title.duration;

  return (
    <article className="pb-2">
      <section className="relative">
        <div className="relative h-[46vh] min-h-[320px] w-full overflow-hidden sm:h-[52vh] sm:max-h-[560px]">
          <BackdropArt title={title} />
          <div className="absolute inset-0 detail-fade" />
          <div className="absolute inset-0 hidden hero-fade md:block" />
        </div>

        <div className="relative mx-auto -mt-36 w-full max-w-[1600px] px-4 sm:-mt-44 sm:px-6 md:px-8 xl:px-12">
          <div className="flex flex-row items-end gap-4 sm:gap-6">
            <div className="w-[104px] shrink-0 overflow-hidden rounded-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/15 sm:w-[186px] lg:w-[206px]">
              <PosterImage title={title} />
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                {title.badge ? (
                  <span className="rounded-[5px] bg-white px-2 py-1 text-[10px] font-black uppercase leading-none tracking-[0.12em] text-black">
                    {title.badge}
                  </span>
                ) : null}
                <span className="rounded-[5px] border border-white/25 px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-white/80">
                  {isLive ? "Live TV" : isSeries ? "Series" : "Movie"}
                </span>
                {isLive && title.live ? (
                  <span className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#f04444] px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-white">
                    <span className="size-1.5 rounded-full bg-white animate-live" />
                    Live
                  </span>
                ) : null}
              </div>

              <h1 className="mt-3 text-[clamp(2rem,4.2vw,3.6rem)] font-black leading-[0.94] tracking-[-0.045em] text-white text-shadow-hero">
                {title.name}
              </h1>

              <p className="mt-2 max-w-[56ch] text-[13.5px] leading-relaxed text-white/60">
                {title.tagline}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[12px] font-medium text-white/55">
                {title.score > 0 ? (
                  <span className="font-bold text-emerald-400">{title.score}%</span>
                ) : null}
                <span>{title.year}</span>
                <span className="rounded border border-white/25 px-1.5 py-px text-[10px] font-semibold text-white/70">
                  {title.rating}
                </span>
                <span>{detail}</span>
                <span className="text-white/25">·</span>
                <span>{title.genres.join(", ")}</span>
                <span className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-white/70">
                  HD
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <Link
                  href={`/watch/${title.slug}`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 text-[14px] font-bold text-white shadow-[0_10px_30px_-10px_rgba(109,40,255,0.9)] transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Play className="size-4" fill="currentColor" aria-hidden />
                  {isLive ? "Watch Live" : isSeries ? "Play S1 E1" : "Play Movie"}
                </Link>
                <MyListButton slug={title.slug} name={title.name} />
                <ShareButton name={title.name} />
              </div>
            </div>
          </div>

          <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
                About {isSeries ? "the show" : "the movie"}
              </h2>
              <p className="mt-3 max-w-[72ch] text-[14px] leading-relaxed text-white/70">
                {title.synopsis}
              </p>

              <dl className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
                    Cast
                  </dt>
                  <dd className="mt-1.5 text-[13px] leading-relaxed text-white/65">
                    {title.cast.join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
                    {isSeries ? "Created by" : "Directed by"}
                  </dt>
                  <dd className="mt-1.5 text-[13px] text-white/65">{title.creator}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
                    Genres
                  </dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {title.genres.map((genre) => (
                      <Link
                        key={genre}
                        href={`${browseHref}?genre=${encodeURIComponent(genre)}`}
                        className="rounded-full border border-white/12 px-2.5 py-1 text-[11.5px] font-medium text-white/60 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        {genre}
                      </Link>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
                    Details
                  </dt>
                  <dd className="mt-1.5 text-[13px] leading-relaxed text-white/65">
                    {title.rating} · {title.year} · {detail} · English
                  </dd>
                </div>
              </dl>
            </div>

            <aside className="h-fit rounded-2xl border border-white/[0.09] bg-white/[0.025] p-5">
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                Free with ads
              </p>
              <h2 className="mt-4 text-[16px] font-bold text-white">
                No subscription needed
              </h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/45">
                Press play and watch instantly. Ads keep this title free for
                everyone, on every device.
              </p>
              <Link
                href={`/watch/${title.slug}`}
                className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] text-[13px] font-semibold text-white transition hover:border-white/35 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Play className="size-3.5" fill="currentColor" aria-hidden />
                {isLive ? "Join the live channel" : "Start watching free"}
              </Link>
              <p className="mt-3 text-center text-[11px] text-white/30">
                Available in HD · English audio
              </p>
            </aside>
          </div>

          {isSeries ? <EpisodeList title={title} /> : null}
        </div>
      </section>

      {related.length > 0 ? (
        <div className="mt-14">
          <TitleRow title="More Like This" subtitle={`Because you looked at ${title.name}`}>
            {related.map((item) => (
              <PosterCard key={item.slug} title={item} className={posterSize} />
            ))}
          </TitleRow>
        </div>
      ) : null}

      <p className="mx-auto mt-10 w-full max-w-[1600px] px-4 text-[11px] text-white/25 sm:px-6 md:px-8 xl:px-12">
        Browse more{" "}
        <Link href={browseHref} className="font-semibold text-white/50 hover:text-white">
          {browseLabel}
        </Link>
        .
      </p>
    </article>
  );
}
