import { useRef, useState } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { PosterCard } from "./poster-card";
import { cn } from "@/lib/utils";
import type { Title } from "@/lib/catalog-types";

interface CuratedRowProps {
  title: string;
  subtitle?: string;
  categorySlug?: string;
  badge?: string;
  seeAllHref?: string;
  titles?: Title[];
  items?: Title[];
  className?: string;
}

export function CuratedRow({
  title,
  subtitle,
  categorySlug,
  badge,
  seeAllHref,
  titles,
  items,
  className,
}: CuratedRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const rowTitles = titles || items || [];
  if (rowTitles.length === 0) return null;

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      // Step across ~4-5 posters (approx 750px on desktop)
      const step = scrollRef.current.clientWidth * 0.75;
      const target = direction === "left"
        ? scrollRef.current.scrollLeft - step
        : scrollRef.current.scrollLeft + step;

      scrollRef.current.scrollTo({ left: target, behavior: "smooth" });
      setTimeout(checkScroll, 350);
    }
  };

  const linkHref = seeAllHref || (categorySlug ? `/category/${categorySlug}` : undefined);

  return (
    <section className={cn("group/row relative py-4 sm:py-5", className)}>
      {/* Row Header */}
      <div className="mx-auto flex max-w-[1600px] items-end justify-between gap-3 px-4 pb-3 sm:px-6 md:px-8 xl:px-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black uppercase tracking-tight text-white sm:text-xl md:text-2xl">
              {title}
            </h2>
            {badge && (
              <span className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
                {badge}
              </span>
            )}
            {rowTitles.length > 0 && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/60">
                {rowTitles.length}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs text-white/50">{subtitle}</p>
          )}
        </div>

        {linkHref && (
          <Link
            href={linkHref}
            className="flex shrink-0 whitespace-nowrap items-center gap-1 text-xs font-bold text-[#00d2ff] hover:text-white transition group-hover/row:translate-x-0.5"
          >
            <span>See All</span>
            <ChevronRight size={14} />
          </Link>
        )}
      </div>

      {/* Row Container with Left/Right Arrows */}
      <div className="relative">
        {/* Left Scroll Arrow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label={`Scroll ${title} left`}
            className="absolute left-0 top-1/2 z-20 -translate-y-1/2 grid size-11 place-items-center rounded-r-xl bg-black/80 text-white backdrop-blur shadow-2xl transition hover:bg-white hover:text-black hover:scale-110 opacity-0 group-hover/row:opacity-100"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* Right Scroll Arrow */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label={`Scroll ${title} right`}
            className="absolute right-0 top-1/2 z-20 -translate-y-1/2 grid size-11 place-items-center rounded-l-xl bg-black/80 text-white backdrop-blur shadow-2xl transition hover:bg-white hover:text-black hover:scale-110 opacity-0 group-hover/row:opacity-100"
          >
            <ChevronRight size={22} />
          </button>
        )}

        {/* Posters Container */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-3 overflow-x-auto px-4 pb-2 pt-1 scrollbar-none sm:gap-4 sm:px-6 md:px-8 xl:px-12"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {rowTitles.map((t, idx) => (
            <div
              key={t.slug || idx}
              className="w-[145px] shrink-0 sm:w-[170px] md:w-[190px] lg:w-[210px]"
              style={{ scrollSnapAlign: "start" }}
            >
              <PosterCard title={t} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
