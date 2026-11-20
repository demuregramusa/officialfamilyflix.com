"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { BrowseHeader, EmptyResults, PosterGrid } from "@/components/familyflix/browse";
import {
  movies,
  popularSearches,
  searchCatalog,
  series,
} from "@/lib/catalog";

const popular = [...movies, ...series]
  .sort((a, b) => b.score - a.score)
  .slice(0, 12);

export function SearchExperience({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const results = searchCatalog(query);
  const trimmed = query.trim();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const target = trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search";
      router.replace(target, { scroll: false });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [trimmed, router]);

  return (
    <>
      <BrowseHeader
        eyebrow="Find something to watch"
        title="Search"
        description="Search classic films, licensed titles and the people in them."
        count={trimmed ? results.length : undefined}
      />

      <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-6 sm:px-6 md:px-8 xl:px-12">
        <div className="relative max-w-2xl">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-white/35"
            aria-hidden
          />
          <label htmlFor="catalog-search" className="sr-only">
            Search movies, shows, actors or genres
          </label>
          <input
            ref={inputRef}
            id="catalog-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movies, shows, actors or genres"
            autoComplete="off"
            autoFocus
            className="h-14 w-full rounded-full border border-white/15 bg-white/[0.05] pl-12 pr-12 text-[15px] text-white placeholder:text-white/35 transition focus:border-[#8b5cff] focus:bg-white/[0.07] focus:outline-none focus:ring-4 focus:ring-brand/25 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>

        {trimmed ? (
          <div className="mt-8">
            <p className="text-[13px] text-white/50">
              {results.length > 0
                ? `${results.length} ${results.length === 1 ? "result" : "results"} for “${trimmed}”`
                : "No matches"}
            </p>
            {results.length > 0 ? (
              <div className="mt-4">
                <PosterGrid items={results} />
              </div>
            ) : (
              <div className="mt-4">
                <EmptyResults query={trimmed}>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {popularSearches.slice(0, 5).map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setQuery(term)}
                        className="rounded-full border border-white/15 px-3 py-1.5 text-[12px] font-medium text-white/65 transition hover:border-white/35 hover:text-white"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </EmptyResults>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            <section aria-labelledby="trending-searches">
              <h2
                id="trending-searches"
                className="text-[16px] font-bold tracking-[-0.01em] text-white"
              >
                Trending searches
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[12.5px] font-medium text-white/70 transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </section>

            <section aria-labelledby="popular-search">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2
                    id="popular-search"
                    className="text-[19px] font-bold tracking-[-0.02em] text-white md:text-[22px]"
                  >
                    Popular right now
                  </h2>
                  <p className="mt-0.5 text-[12.5px] text-white/45">
                    The titles people are pressing play on
                  </p>
                </div>
                <Link
                  href="/movies"
                  className="shrink-0 text-[12.5px] font-semibold text-white/55 transition hover:text-white"
                >
                  See all
                </Link>
              </div>
              <div className="mt-4">
                <PosterGrid items={popular} />
              </div>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
