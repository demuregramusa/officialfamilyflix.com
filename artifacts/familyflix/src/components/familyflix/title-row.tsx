"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function TitleRow({
  title,
  subtitle,
  seeAllHref,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  children: ReactNode;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const update = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    update();
    const el = scroller.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  function scroll(direction: -1 | 1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.82, behavior: "smooth" });
  }

  return (
    <section className={cn("group/row", className)}>
      <div className="mx-auto flex w-full max-w-[1600px] items-end justify-between gap-4 px-4 sm:px-6 md:px-8 xl:px-12">
        <div>
          <h2 className="text-[19px] font-bold tracking-[-0.02em] text-white md:text-[22px]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 hidden text-[12.5px] text-white/45 sm:block">{subtitle}</p>
          ) : null}
        </div>
        {seeAllHref ? (
          <Link
            href={seeAllHref}
            className="inline-flex shrink-0 items-center gap-0.5 pb-0.5 text-[12.5px] font-semibold text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            See all
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="relative mt-3">
        <button
          type="button"
          aria-label={`Scroll ${title} left`}
          onClick={() => scroll(-1)}
          disabled={!canScrollLeft}
          className="absolute left-1 top-[38%] z-20 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/80 text-white shadow-xl backdrop-blur transition hover:bg-white hover:text-black disabled:pointer-events-none disabled:opacity-0 md:grid lg:size-10"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={`Scroll ${title} right`}
          onClick={() => scroll(1)}
          disabled={!canScrollRight}
          className="absolute right-1 top-[38%] z-20 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/80 text-white shadow-xl backdrop-blur transition hover:bg-white hover:text-black disabled:pointer-events-none disabled:opacity-0 md:grid lg:size-10"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>

        <div
          ref={scroller}
          className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 sm:px-6 md:px-8 xl:px-12"
        >
          {children}
        </div>
      </div>
    </section>
  );
}

