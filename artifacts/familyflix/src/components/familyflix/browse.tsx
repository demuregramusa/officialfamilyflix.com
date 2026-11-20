import { Link } from "wouter";

import { PosterCard } from "@/components/familyflix/poster-card";
import type { Title } from "@/lib/catalog-types";
import { cn } from "@/lib/utils";

export function BrowseHeader({
  eyebrow,
  title,
  description,
  count,
  countLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  count?: number;
  countLabel?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/4 size-[380px] rounded-full bg-brand/25 blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-0 size-[260px] rounded-full bg-[#ff2e88]/10 blur-[100px]"
      />
      <div className="relative mx-auto w-full max-w-[1600px] px-4 pb-8 pt-10 sm:px-6 md:px-8 md:pb-9 md:pt-12 xl:px-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#a68bff]">
          {eyebrow}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[34px] font-black leading-none tracking-[-0.04em] text-white sm:text-[44px]">
              {title}
            </h1>
            <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-white/50">
              {description}
            </p>
          </div>
          {typeof count === "number" ? (
            <p className="shrink-0 text-[12px] font-medium text-white/40">
              {count} {countLabel ?? (count === 1 ? "title" : "titles")}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function GenreChips({
  genres,
  active,
  basePath,
}: {
  genres: string[];
  active: string;
  basePath: string;
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-5 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
      <Link
        href={basePath}
        aria-current={!active ? "page" : undefined}
        className={cn(
          "inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
          !active
            ? "border-transparent bg-white text-black"
            : "border-white/15 bg-white/[0.04] text-white/65 hover:border-white/30 hover:text-white",
        )}
      >
        All
      </Link>
      {genres.map((genre) => {
        const isActive = genre === active;
        return (
          <Link
            key={genre}
            href={`${basePath}?genre=${encodeURIComponent(genre)}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
              isActive
                ? "border-transparent bg-white text-black"
                : "border-white/15 bg-white/[0.04] text-white/65 hover:border-white/30 hover:text-white",
            )}
          >
            {genre}
          </Link>
        );
      })}
    </div>
  );
}

export function PosterGrid({ items }: { items: Title[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((title) => (
        <PosterCard key={title.slug} title={title} className="min-w-0" />
      ))}
    </div>
  );
}

export function EmptyResults({
  query,
  children,
}: {
  query: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-16 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-white/[0.06] text-white/40">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="size-5"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-bold text-white">No results for “{query}”</h2>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-white/45">
        Try a different title, genre or actor. Everything on FamilyFlix is free to
        watch.
      </p>
      {children}
    </div>
  );
}
