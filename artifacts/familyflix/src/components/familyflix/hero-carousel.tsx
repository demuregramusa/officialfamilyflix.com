import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Play, Plus, Check, Info, ChevronLeft, ChevronRight, Share2, Volume2, VolumeX, Sparkles } from "lucide-react";
import { BackdropArt } from "./art";
import { MyListButton } from "./my-list-button";
import { cn } from "@/lib/utils";
import type { Title } from "@/lib/catalog-types";

interface HeroCarouselProps {
  titles?: Title[];
}

export function HeroCarousel({ titles: propTitles }: HeroCarouselProps = {}) {
  const [internalTitles, setInternalTitles] = useState<Title[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!propTitles || propTitles.length === 0) {
      fetch("/api/v1/home/featured-hero")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setInternalTitles(data);
          }
        })
        .catch(console.error);
    }
  }, [propTitles]);

  const activeTitles = propTitles && propTitles.length > 0 ? propTitles : internalTitles;
  const heroTitles = activeTitles.slice(0, 8);
  const current = heroTitles[currentIndex] || heroTitles[0];

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % heroTitles.length);
  }, [heroTitles.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + heroTitles.length) % heroTitles.length);
  }, [heroTitles.length]);

  // 8-second auto-rotation
  useEffect(() => {
    if (isPaused || heroTitles.length <= 1) return;
    timerRef.current = window.setInterval(nextSlide, 8000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, nextSlide, heroTitles.length]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevSlide, nextSlide]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 50) nextSlide();
    else if (diff < -50) prevSlide();
    setTouchStartX(null);
  };

  if (!current) return null;

  return (
    <section
      aria-label="Featured on FamilyFlix"
      className="group/hero relative h-[72vh] min-h-[520px] w-full overflow-hidden bg-[#08060f] sm:h-[76vh] lg:h-[82vh] lg:max-h-[780px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Backdrops with cross-fade */}
      {heroTitles.map((item, idx) => (
        <div
          key={item.slug}
          aria-hidden={idx !== currentIndex}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 ease-out",
            idx === currentIndex ? "opacity-100 z-0" : "opacity-0 pointer-events-none"
          )}
        >
          <BackdropArt title={item} />
        </div>
      ))}

      {/* Cinematic Vignettes */}
      <div className="absolute inset-0 hero-fade pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#08060f]/80 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#08060f] via-[#08060f]/60 to-transparent pointer-events-none" />

      {/* Hero Content Box */}
      <div className="relative mx-auto flex h-full w-full max-w-[1600px] flex-col justify-end px-4 pb-12 sm:px-6 sm:pb-14 md:px-8 lg:pb-16 xl:px-12 z-10">
        <div key={current.slug} className="max-w-[620px] xl:max-w-[700px] animate-fade-up">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="rounded-[5px] bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
              Featured Pick
            </span>
            {current.type === "series" ? (
              <span className="rounded-[5px] bg-purple-600/90 border border-purple-400/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                TV Series
              </span>
            ) : (
              <span className="rounded-[5px] border border-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80">
                Movie
              </span>
            )}
            <span className="rounded-sm bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80">
              Verified Rights
            </span>
            {current.year > 0 && current.year >= 2024 && (
              <span className="rounded-sm bg-amber-400 px-1.5 py-0.5 text-[10px] font-black uppercase text-black">
                New
              </span>
            )}
          </div>

          {/* Title Heading */}
          <h1 className="text-[clamp(2.2rem,5.2vw,4.6rem)] font-black uppercase leading-[0.9] tracking-[-0.04em] text-white text-shadow-hero">
            {current.name}
          </h1>

          {/* Synopsis */}
          <p className="mt-3.5 line-clamp-3 max-w-[54ch] text-[13.5px] leading-relaxed text-white/75 sm:text-[15px]">
            {current.synopsis}
          </p>

          {/* Metadata line */}
          <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] font-medium text-white/60">
            {current.score > 0 && (
              <span className="font-extrabold text-emerald-400">{current.score}% Score</span>
            )}
            {current.year > 0 && <span>{current.year}</span>}
            {current.rating && (
              <span className="rounded border border-white/25 px-1.5 py-px text-[10px] font-bold text-white/80">
                {current.rating}
              </span>
            )}
            {current.type === "series" && current.seasons ? (
              <span>{current.seasons} {current.seasons === 1 ? "Season" : "Seasons"}</span>
            ) : null}
            <span className="text-white/30">·</span>
            <span>{(current.genres ?? []).slice(0, 3).join(", ")}</span>
          </div>

          {/* Action CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={current.type === "live" ? `/watch/${current.slug}` : `/watch/${current.slug}`}
              className="group/play inline-flex items-center gap-2.5 rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-black shadow-xl shadow-white/10 transition-all hover:bg-white/90 hover:scale-105 active:scale-95"
            >
              <Play className="size-4 fill-current ml-0.5 transition-transform group-hover/play:scale-110" />
              <span>Watch Now Free</span>
            </Link>

            <MyListButton
              slug={current.slug}
              name={current.name}
              className="h-11 rounded-xl border border-white/20 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20 transition hover:scale-105 active:scale-95"
            />

            <Link
              href={`/title/${current.slug}`}
              className="inline-flex size-11 items-center justify-center rounded-xl border border-white/20 bg-black/40 text-white backdrop-blur-md hover:bg-white/15 transition hover:scale-105"
              title="More info & episodes"
            >
              <Info className="size-5" />
            </Link>
          </div>
        </div>

        {/* Carousel Pagination & Controls Row */}
        <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
          {/* Animated Pagination Dots */}
          <div className="flex items-center gap-2">
            {heroTitles.map((t, idx) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  idx === currentIndex
                    ? "w-8 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                    : "w-2 bg-white/25 hover:bg-white/50"
                )}
                aria-label={`Go to slide ${idx + 1}: ${t.name}`}
              />
            ))}
          </div>

          {/* Prev / Next Arrows */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevSlide}
              className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-white hover:text-black hover:scale-110 active:scale-95"
              aria-label="Previous featured title"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="grid size-9 place-items-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-white hover:text-black hover:scale-110 active:scale-95"
              aria-label="Next featured title"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
