import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Info, Play } from "lucide-react";

import { BackdropArt } from "@/components/familyflix/art";
import { MyListButton } from "@/components/familyflix/my-list-button";
import { backdropUrl } from "@/lib/art-utils";
import type { Title } from "@/lib/catalog-types";
import { cn } from "@/lib/utils";

export function Hero({ titles }: { titles: Title[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = titles[index];

  const goTo = useCallback((next: number) => {
    setIndex((current) => (next + titles.length) % titles.length);
  }, [titles.length]);

  useEffect(() => {
    if (paused || titles.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % titles.length);
    }, 9000);
    return () => window.clearInterval(timer);
  }, [paused, titles.length]);

  if (!active) return null;

  const detail =
    active.type === "series"
      ? active.seasons
        ? `${active.seasons} ${active.seasons === 1 ? "Season" : "Seasons"}`
        : ""
      : active.duration;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured on FamilyFlix"
      className="relative h-[74vh] min-h-[540px] w-full overflow-hidden bg-ink sm:h-[76vh] lg:h-[82vh] lg:max-h-[780px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {titles.map((title, slide) => (
        <div
          key={title.slug}
          aria-hidden={slide !== index}
          className={cn(
            "absolute inset-0 transition-opacity duration-[900ms] ease-out",
            slide === index ? "opacity-100" : "opacity-0",
          )}
        >
          <BackdropArt title={title} />
        </div>
      ))}

      <div className="absolute inset-0 hero-fade pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#08060f]/70 to-transparent pointer-events-none" />

      <div className="relative mx-auto flex h-full w-full max-w-[1600px] flex-col justify-end px-4 pb-10 sm:px-6 sm:pb-12 md:px-8 lg:pb-16 xl:px-12">
        <div key={active.slug} className="relative z-10 max-w-[580px] xl:max-w-[640px] animate-fade-up">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.35)]">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
            {active.badge ? (
              <span className="rounded-[5px] bg-white px-2 py-1 text-[10px] font-black uppercase leading-none tracking-[0.12em] text-black">
                {active.badge}
              </span>
            ) : null}
            <span className="rounded-[5px] border border-white/25 px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-white/80">
              {active.type === "series" ? "Series" : "Movie"}
            </span>
            <span className="rounded-sm bg-white/10 px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
              Rights reviewed
            </span>
          </div>

          <h1 className="mt-4 text-[clamp(2.3rem,5.4vw,4.8rem)] font-black uppercase leading-[0.88] tracking-[-0.045em] text-white text-shadow-hero">
            {active.name}
          </h1>

          <p className="mt-3 max-w-[54ch] text-[13.5px] leading-relaxed text-white/70 sm:text-[15px]">
            {active.synopsis}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] font-medium text-white/55">
            {active.score > 0 ? (
              <span className="font-bold text-emerald-400">{active.score}%</span>
            ) : null}
            {active.year > 0 ? <span>{active.year}</span> : null}
            {active.rating ? <span className="rounded border border-white/25 px-1.5 py-px text-[10px] font-semibold text-white/70">{active.rating}</span> : null}
            {detail ? <span>{detail}</span> : null}
            <span className="text-white/25">·</span>
            <span>{(active.genres ?? []).join(", ")}</span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/watch/${active.slug}`}
              className="inline-flex h-12 items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-7 text-[14px] font-black text-black border border-amber-300/60 shadow-xl shadow-amber-500/35 transition hover:from-amber-300 hover:via-amber-400 hover:to-orange-400 hover:shadow-amber-500/60 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Play className="size-4 fill-current text-black" aria-hidden />
              Start Watching Free
            </Link>
            <MyListButton slug={active.slug} name={active.name} />
            <Link
              href={`/title/${active.slug}`}
              aria-label={`More information about ${active.name}`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-5 text-[13.5px] font-semibold text-white backdrop-blur transition hover:border-white/40 hover:bg-white/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Info className="size-4" aria-hidden />
              More Info
            </Link>
          </div>
        </div>

        {/* Desktop Carousel Indicators - Only shown on wide screens to prevent overlapping */}
        <div className="absolute bottom-12 right-4 hidden items-end gap-2.5 md:right-8 2xl:flex 2xl:right-12 z-20">
          {titles.map((title, slide) => (
            <button
              key={title.slug}
              type="button"
              onClick={() => goTo(slide)}
              aria-label={`Feature ${title.name}`}
              aria-current={slide === index}
              className={cn(
                "group relative w-[130px] xl:w-[150px] overflow-hidden rounded-lg border text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                slide === index
                  ? "border-white/80 bg-white/10"
                  : "border-white/15 opacity-65 hover:opacity-100",
              )}
            >
              <span className="block aspect-video w-full">
                <span
                  className="block h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url("${backdropUrl(title)}")` }}
                />
              </span>
              <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 line-clamp-1 p-2 text-[11px] font-semibold text-white">
                {title.name}
              </span>
              {slide === index && !paused ? (
                <span className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-white/20">
                  <span
                    key={`${title.slug}-progress`}
                    className="block h-full bg-brand"
                    style={{ animation: "ad-progress 9s linear forwards" }}
                  />
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-2 xl:hidden z-10">
          {titles.map((title, slide) => (
            <button
              key={title.slug}
              type="button"
              onClick={() => goTo(slide)}
              aria-label={`Feature ${title.name}`}
              aria-current={slide === index}
              className={cn(
                "h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                slide === index ? "w-7 bg-white" : "w-1.5 bg-white/30 hover:bg-white/50",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
