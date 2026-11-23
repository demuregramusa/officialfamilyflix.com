import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, ChevronRight, Layers, Film, Tv, Sparkles } from "lucide-react";
import { MAIN_CATEGORIES, CATEGORY_SECTIONS, type CategoryItem } from "@/lib/categories-data";
import { CategoryIcon } from "./category-icon";
import { cn } from "@/lib/utils";

interface CategorySummaryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  contentType: "movies" | "series" | "both";
  icon: string;
  subgenres: string[];
  counts: { total: number; movies: number; series: number };
}

let cachedCategoryCounts: Record<string, { total: number; movies: number; series: number }> | null = null;

export function CategoriesDirectory() {
  const [activeSection, setActiveSection] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [countsMap, setCountsMap] = useState<Record<string, { total: number; movies: number; series: number }>>(() => cachedCategoryCounts || {});
  const [loading, setLoading] = useState(() => !cachedCategoryCounts);

  useEffect(() => {
    fetch("/api/v1/categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.categories) {
          const map: Record<string, { total: number; movies: number; series: number }> = {};
          for (const c of data.categories) {
            map[c.slug] = c.counts;
          }
          cachedCategoryCounts = map;
          setCountsMap(map);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = MAIN_CATEGORIES.filter((cat) => {
    if (activeSection !== "all" && cat.section !== activeSection) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = cat.name.toLowerCase().includes(q);
      const matchDesc = cat.description.toLowerCase().includes(q);
      const matchSub = cat.subgenres.some((s) => s.toLowerCase().includes(q));
      return matchName || matchDesc || matchSub;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#08060f] pb-24 text-white">
      {/* Directory Hero */}
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#19102f] via-[#0c0817] to-[#08060f] px-4 py-12 sm:px-6 md:px-8 lg:px-12">
        <div aria-hidden className="pointer-events-none absolute -right-16 top-0 size-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="relative mx-auto max-w-[1600px]">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/50 mb-4">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <ChevronRight size={13} />
            <span className="text-purple-400 font-bold">Categories Directory</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="rounded-full bg-purple-500/20 border border-purple-400/30 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-purple-300">
                44 Tubi-Inspired Categories
              </span>
              <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white">
                Explore All Categories
              </h1>
              <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/70">
                Discover over 23,000 public domain, creative commons, and classic cinema titles carefully indexed across all 44 main genres and 20 specialized subgenres.
              </p>
            </div>

            {/* Instant Search Bar */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search all 44 categories..."
                className="w-full rounded-2xl border border-white/15 bg-white/[0.06] pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/40 outline-none focus:border-purple-500 focus:bg-white/[0.1] transition shadow-inner"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section Filter Tabs */}
      <section className="sticky top-[68px] md:top-[72px] z-20 border-b border-white/10 bg-[#08060f]/95 px-4 py-3 backdrop-blur-xl sm:px-6 md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {CATEGORY_SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id;
            const count = sec.id === "all"
              ? MAIN_CATEGORIES.length
              : MAIN_CATEGORIES.filter((c) => c.section === sec.id).length;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold whitespace-nowrap transition",
                  isActive
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "border border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:text-white"
                )}
              >
                <span>{sec.label}</span>
                <span className={cn("rounded-full px-1.5 py-0.2 text-[10px]", isActive ? "bg-white/20 text-white" : "bg-white/10 text-white/60")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Category Cards Grid */}
      <main className="mx-auto max-w-[1600px] px-4 pt-8 sm:px-6 md:px-8 lg:px-12">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-semibold text-white/50">
            Showing {filtered.length} of {MAIN_CATEGORIES.length} categories
          </p>
          <span className="text-xs text-white/40">
            Click any category to browse its full title collection
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((cat) => {
            const counts = countsMap[cat.slug] || { total: 0, movies: 0, series: 0 };
            return (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-5 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-600/15"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="grid size-11 place-items-center rounded-xl border border-white/15 bg-purple-600/20 text-purple-300 transition group-hover:bg-purple-600 group-hover:text-white group-hover:scale-110 duration-300">
                      <CategoryIcon name={cat.iconName} className="size-5" />
                    </div>
                    {counts.total > 0 && (
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/80">
                        {counts.total.toLocaleString()} titles
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-black uppercase tracking-tight text-white group-hover:text-purple-300 transition">
                    {cat.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-white/60 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {cat.contentType === "series" ? (
                      <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300">TV Shows</span>
                    ) : cat.contentType === "movies" ? (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">Movies</span>
                    ) : (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/70">Movies & TV</span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-purple-400 group-hover:translate-x-1 transition-transform">
                    <span>Browse</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
