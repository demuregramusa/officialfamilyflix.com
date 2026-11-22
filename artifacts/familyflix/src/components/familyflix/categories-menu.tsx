import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { LayoutGrid, ChevronDown, Search, ArrowRight, Layers, Film, Tv } from "lucide-react";
import { MAIN_CATEGORIES } from "@/lib/categories-data";
import { CategoryIcon } from "./category-icon";
import { cn } from "@/lib/utils";

export function CategoriesMenu() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "movies" | "series">("all");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCategories = MAIN_CATEGORIES.filter((cat) => {
    if (filterType === "movies" && cat.contentType === "series") return false;
    if (filterType === "series" && cat.contentType === "movies") return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return cat.name.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:text-white",
          open ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/[0.08]"
        )}
        aria-expanded={open}
        aria-label="Browse categories"
        data-testid="button-categories-menu"
      >
        <LayoutGrid className="size-3.5 text-purple-400" />
        <span>Categories</span>
        <ChevronDown className={cn("size-3 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute left-0 top-full mt-2 w-[340px] sm:w-[560px] rounded-2xl border border-white/15 bg-[#120e1d]/98 p-4 shadow-2xl backdrop-blur-2xl z-50 animate-fade-in">
          {/* Header & Content Type Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                  Browse 44 Categories
                </span>
                <span className="rounded-full bg-purple-500/20 px-2 py-0.2 text-[9px] font-black uppercase text-purple-300">
                  Tubi Discovery
                </span>
              </div>
              <p className="text-[11px] text-white/40 mt-0.5">Explore movies, TV shows, and specialized genres</p>
            </div>

            {/* Content Type Filter */}
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-0.5 shrink-0">
              {[
                { id: "all", label: "All", icon: Layers },
                { id: "movies", label: "Movies", icon: Film },
                { id: "series", label: "TV", icon: Tv },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = filterType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilterType(t.id as any)}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition",
                      isActive
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-white/60 hover:text-white"
                    )}
                  >
                    <Icon size={11} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter categories (e.g. Action, Horror, Crime, Anime)..."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 outline-none focus:border-purple-500 focus:bg-white/[0.08] transition"
            />
          </div>

          {/* Scrollable Categories Grid */}
          <div className="mt-3 max-h-[360px] overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 scrollbar-thin">
            {filteredCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-2 transition hover:border-purple-500/40 hover:bg-purple-600/10 hover:translate-x-0.5 group"
              >
                <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-purple-300 group-hover:bg-purple-600 group-hover:text-white transition">
                  <CategoryIcon name={cat.iconName} className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs font-semibold text-white/90 group-hover:text-purple-300 transition">
                      {cat.name}
                    </p>
                    {cat.contentType === "series" ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">TV</span>
                    ) : cat.contentType === "movies" ? (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Movie</span>
                    ) : null}
                  </div>
                  <p className="truncate text-[10px] text-white/40 leading-tight">
                    {cat.subgenres[0] || cat.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom Footer Link to Categories Directory */}
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-white/40 text-[11px]">
              Showing {filteredCategories.length} categories
            </span>
            <Link
              href="/categories"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 font-bold text-purple-400 hover:text-purple-300 transition"
            >
              <span>View All 44 Categories Directory</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
