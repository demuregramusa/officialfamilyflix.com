import { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  ChevronRight,
  Filter,
  Sparkles,
  SlidersHorizontal,
  Film,
  Tv,
  Layers,
  RotateCcw,
} from "lucide-react";
import { MAIN_CATEGORIES } from "@/lib/categories-data";
import { CategoryIcon } from "./category-icon";
import { PosterCard } from "./poster-card";
import { cn } from "@/lib/utils";
import type { Title } from "@/lib/catalog-types";

interface CategoryResponse {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string;
    contentType: "movies" | "series" | "both";
    icon: string;
    subgenres: string[];
  };
  total: number;
  moviesCount: number;
  seriesCount: number;
  page: number;
  limit: number;
  items: Array<{
    id: string;
    slug: string;
    name: string;
    kind: "movie" | "series" | "live";
    synopsis: string;
    year?: number;
    rating?: string;
    score: number;
    genres: string[];
    posterUrl?: string;
    backdropUrl?: string;
    creatorAttribution?: string;
    featured?: boolean;
  }>;
}

export function CategoryPage({ slug }: { slug: string }) {
  const metaCategory = MAIN_CATEGORIES.find((c) => c.slug === slug);

  const [contentType, setContentType] = useState<"all" | "movies" | "series">("all");
  const [selectedSubgenre, setSelectedSubgenre] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"popular" | "recent" | "score" | "title">("popular");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<CategoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse year filter range
  const getYearRange = (filter: string): { yearMin?: number; yearMax?: number } => {
    switch (filter) {
      case "2020s": return { yearMin: 2020, yearMax: 2026 };
      case "2010s": return { yearMin: 2010, yearMax: 2019 };
      case "2000s": return { yearMin: 2000, yearMax: 2009 };
      case "1990s": return { yearMin: 1990, yearMax: 1999 };
      case "1980s": return { yearMin: 1980, yearMax: 1989 };
      case "classics": return { yearMax: 1979 };
      default: return {};
    }
  };

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const { yearMin, yearMax } = getYearRange(yearFilter);
    const params = new URLSearchParams();
    if (contentType !== "all") params.set("contentType", contentType);
    if (selectedSubgenre) {
      const subSlug = selectedSubgenre.toLowerCase().replace(/[^a-z0-9]/g, "-");
      params.set("subgenre", subSlug);
    }
    if (yearMin) params.set("yearMin", String(yearMin));
    if (yearMax) params.set("yearMax", String(yearMax));
    params.set("sort", sortBy);
    params.set("page", String(page));
    params.set("limit", "48");

    fetch(`/api/v1/categories/${slug}?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Category not found or failed to load");
        return res.json();
      })
      .then((json: CategoryResponse) => {
        if (!isCancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err.message || "Failed to load category");
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [slug, contentType, selectedSubgenre, yearFilter, sortBy, page]);

  const catName = data?.category?.name || metaCategory?.name || slug;
  const catDesc = data?.category?.description || metaCategory?.description || "Browse top streaming titles on FamilyFlix.";
  const catIcon = data?.category?.icon || metaCategory?.iconName || "Film";
  const subgenreList = metaCategory?.subgenres || [];

  const catalogItems: Title[] = (data?.items || []).map((item) => {
    const rawPoster = item.posterUrl;
    const poster = rawPoster ? rawPoster.replace("https://yts.pw/", "https://img.yts.pw/") : undefined;
    const rawBackdrop = item.backdropUrl;
    const backdrop = rawBackdrop ? rawBackdrop.replace("https://yts.pw/", "https://img.yts.pw/") : poster;
    return {
      slug: item.slug,
      name: item.name,
      tagline: "",
      type: item.kind,
      synopsis: item.synopsis || "",
      year: item.year || 0,
      rating: item.rating || "PG",
      score: item.score || 8.0,
      genres: item.genres || [],
      duration: "Feature",
      creator: item.creatorAttribution || "Classic Cinema",
      cast: [],
      poster,
      backdrop,
      image: poster || "photo-1489599849927-2ee91cede3ba",
      palette: ["#120e1d", "#7c3aed"],
    };
  });

  const resetFilters = () => {
    setContentType("all");
    setSelectedSubgenre("");
    setYearFilter("all");
    setSortBy("popular");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#08060f] pb-24 text-white">
      {/* Category Hero Banner */}
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#1b1233] via-[#0f0a1d] to-[#08060f] px-4 py-12 sm:px-6 md:px-8 lg:px-12">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-96 rounded-full bg-purple-600/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-20 bottom-0 size-80 rounded-full bg-pink-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-[1600px]">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs font-semibold text-white/50 mb-6">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <ChevronRight size={13} />
            <Link href="/categories" className="hover:text-white transition">Categories</Link>
            <ChevronRight size={13} />
            <span className="text-purple-400 font-bold">{catName}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="grid size-16 sm:size-20 shrink-0 place-items-center rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-600/40 to-pink-600/20 shadow-xl shadow-purple-600/20">
                <CategoryIcon name={catIcon} className="size-8 sm:size-10 text-purple-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-2">
                  <span className="rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-purple-300">
                    Category
                  </span>
                  {data && (
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/75">
                      {data.total.toLocaleString()} Titles Available
                    </span>
                  )}
                  {data && data.moviesCount > 0 && (
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-white/60">
                      {data.moviesCount.toLocaleString()} Movies
                    </span>
                  )}
                  {data && data.seriesCount > 0 && (
                    <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-white/60">
                      {data.seriesCount.toLocaleString()} Series
                    </span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white">
                  {catName}
                </h1>
                <p className="mt-2 max-w-3xl text-sm sm:text-base text-white/70 leading-relaxed">
                  {catDesc}
                </p>
              </div>
            </div>

            {/* Content Type Filter Switcher (Tubi Style) */}
            <div className="flex shrink-0 items-center rounded-2xl border border-white/10 bg-white/[0.04] p-1 shadow-inner backdrop-blur-md">
              {[
                { id: "all", label: "All Content", icon: Layers },
                { id: "movies", label: "Movies", icon: Film },
                { id: "series", label: "TV Shows", icon: Tv },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = contentType === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setContentType(tab.id as any);
                      setPage(1);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition",
                      isActive
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                        : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                    )}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Subgenres & Refinements Bar */}
      <section className="sticky top-14 z-30 border-b border-white/10 bg-[#08060f]/95 px-4 py-3 shadow-lg backdrop-blur-xl sm:px-6 md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          {/* Subgenre Chips Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-white/40 shrink-0 flex items-center gap-1">
              <Filter size={12} />
              <span>Subgenres:</span>
            </span>

            <button
              type="button"
              onClick={() => { setSelectedSubgenre(""); setPage(1); }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap transition",
                selectedSubgenre === ""
                  ? "bg-white text-black font-extrabold shadow-sm"
                  : "border border-white/10 bg-white/[0.05] text-white/70 hover:border-white/30 hover:text-white"
              )}
            >
              All {catName}
            </button>

            {subgenreList.map((sub) => {
              const isSelected = selectedSubgenre === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    setSelectedSubgenre(isSelected ? "" : sub);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap transition",
                    isSelected
                      ? "bg-purple-600 text-white font-extrabold shadow-md shadow-purple-600/30"
                      : "border border-white/10 bg-white/[0.05] text-white/70 hover:border-white/30 hover:text-white"
                  )}
                >
                  {sub}
                </button>
              );
            })}
          </div>

          {/* Secondary Controls: Year Range & Sort */}
          <div className="flex items-center gap-2.5 shrink-0 ml-auto">
            {/* Year Range Dropdown */}
            <div className="relative">
              <select
                value={yearFilter}
                onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
                className="appearance-none rounded-xl border border-white/15 bg-white/[0.06] pl-3 pr-8 py-1.5 text-xs font-semibold text-white outline-none hover:border-white/30 transition cursor-pointer"
              >
                <option value="all" className="bg-[#120e1d] text-white">All Release Years</option>
                <option value="2020s" className="bg-[#120e1d] text-white">2020–2026 (New Releases)</option>
                <option value="2010s" className="bg-[#120e1d] text-white">2010–2019</option>
                <option value="2000s" className="bg-[#120e1d] text-white">2000–2009</option>
                <option value="1990s" className="bg-[#120e1d] text-white">1990–1999</option>
                <option value="1980s" className="bg-[#120e1d] text-white">1980–1989</option>
                <option value="classics" className="bg-[#120e1d] text-white">Classics (Pre-1980)</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
                className="appearance-none rounded-xl border border-white/15 bg-white/[0.06] pl-3 pr-8 py-1.5 text-xs font-semibold text-white outline-none hover:border-white/30 transition cursor-pointer"
              >
                <option value="popular" className="bg-[#120e1d] text-white">Most Popular</option>
                <option value="recent" className="bg-[#120e1d] text-white">Newest Release</option>
                <option value="score" className="bg-[#120e1d] text-white">Highest Rated</option>
                <option value="title" className="bg-[#120e1d] text-white">Title (A–Z)</option>
              </select>
            </div>

            {(selectedSubgenre || yearFilter !== "all" || contentType !== "all" || sortBy !== "popular") && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
                title="Reset all filters"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <main className="mx-auto max-w-[1600px] px-4 pt-8 sm:px-6 md:px-8 lg:px-12">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="aspect-[2/3] w-full rounded-xl bg-white/5" />
                <div className="h-3 w-3/4 rounded bg-white/5" />
                <div className="h-2 w-1/2 rounded bg-white/5" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-12 text-center my-12">
            <h3 className="text-xl font-bold text-rose-300">Category Error</h3>
            <p className="mt-2 text-sm text-white/60">{error}</p>
            <Link href="/categories" className="mt-6 inline-block rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white">
              Browse All Categories
            </Link>
          </div>
        ) : catalogItems.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center my-12">
            <Layers size={40} className="mx-auto text-white/20 mb-3" />
            <h3 className="text-lg font-bold text-white">No titles match these filters</h3>
            <p className="mt-1 text-sm text-white/50 max-w-md mx-auto">
              We couldn't find any {contentType === "movies" ? "movies" : contentType === "series" ? "TV series" : "titles"} in this category matching the selected subgenre or year range.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-purple-500 transition shadow-lg shadow-purple-600/30"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-white/50">
                Showing {catalogItems.length} of {data?.total.toLocaleString()} titles
                {selectedSubgenre ? ` in ${selectedSubgenre}` : ""}
              </span>
              <span className="text-xs text-white/40">
                100% Free with verified rights
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-4 lg:gap-5">
              {catalogItems.map((title) => (
                <PosterCard key={title.slug} title={title} />
              ))}
            </div>

            {/* Pagination Controls */}
            {data && data.total > data.limit && (
              <div className="mt-12 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                  className="rounded-xl border border-white/15 bg-white/[0.05] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.1] transition"
                >
                  Previous Page
                </button>
                <span className="text-xs font-semibold text-white/60">
                  Page {page} of {Math.ceil(data.total / data.limit)}
                </span>
                <button
                  type="button"
                  disabled={page * data.limit >= data.total}
                  onClick={() => {
                    setPage((p) => p + 1);
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                  className="rounded-xl border border-white/15 bg-white/[0.05] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.1] transition"
                >
                  Next Page
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
