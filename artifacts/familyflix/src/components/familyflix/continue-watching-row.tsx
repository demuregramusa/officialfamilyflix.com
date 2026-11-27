import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Play, X, Clock, Sparkles } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import { cn } from "@/lib/utils";

export interface WatchProgressItem {
  slug: string;
  name: string;
  posterUrl?: string;
  backdropUrl?: string;
  progressSeconds: number;
  durationSeconds: number;
  episodeId?: string;
  episodeName?: string;
  lastUpdated: number;
  rating?: string;
  genres?: string[];
}

export function formatTimeHms(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatRemainingTime(progressSeconds: number, durationSeconds: number): string {
  const remaining = Math.max(0, durationSeconds - progressSeconds);
  const m = Math.round(remaining / 60);
  if (m <= 1) return "Less than 1m left";
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return remM > 0 ? `${h}h ${remM}m left` : `${h}h left`;
}

export function saveWatchProgress(profileId: string, item: Omit<WatchProgressItem, "lastUpdated">) {
  try {
    const key = `ff_progress_${profileId}`;
    const globalKey = "ff_progress_global";
    const existingStr = localStorage.getItem(key) || localStorage.getItem(globalKey) || "[]";
    let list: WatchProgressItem[] = JSON.parse(existingStr);
    if (!Array.isArray(list)) list = [];

    // Filter out item if already exists
    list = list.filter((i) => !(i.slug === item.slug && (item.episodeId ? i.episodeId === item.episodeId : !i.episodeId)));

    // Do not save if virtually completed (> 95%)
    if (item.durationSeconds > 0 && item.progressSeconds / item.durationSeconds < 0.95 && item.progressSeconds > 10) {
      list.unshift({
        ...item,
        lastUpdated: Date.now(),
      });
    }

    // Keep top 20 items
    list = list.slice(0, 20);
    localStorage.setItem(key, JSON.stringify(list));
    localStorage.setItem(globalKey, JSON.stringify(list));
    window.dispatchEvent(new Event("ff_progress_updated"));
  } catch {}
}

export function removeWatchProgress(profileId: string, slug: string, episodeId?: string) {
  try {
    const key = `ff_progress_${profileId}`;
    const globalKey = "ff_progress_global";
    const existingStr = localStorage.getItem(key) || localStorage.getItem(globalKey) || "[]";
    let list: WatchProgressItem[] = JSON.parse(existingStr);
    if (Array.isArray(list)) {
      list = list.filter((i) => !(i.slug === slug && (episodeId ? i.episodeId === episodeId : !i.episodeId)));
      localStorage.setItem(key, JSON.stringify(list));
      localStorage.setItem(globalKey, JSON.stringify(list));
      window.dispatchEvent(new Event("ff_progress_updated"));
    }
  } catch {}
}

export function clearAllWatchProgress(profileId: string) {
  try {
    localStorage.removeItem(`ff_progress_${profileId}`);
    localStorage.removeItem("ff_progress_global");
    window.dispatchEvent(new Event("ff_progress_updated"));
  } catch {}
}

export function getSavedWatchProgress(profileId: string, slug: string, episodeId?: string): number {
  try {
    const key = `ff_progress_${profileId}`;
    const globalKey = "ff_progress_global";
    const existingStr = localStorage.getItem(key) || localStorage.getItem(globalKey) || "[]";
    const list: WatchProgressItem[] = JSON.parse(existingStr);
    if (Array.isArray(list)) {
      const match = list.find((i) => i.slug === slug && (episodeId ? i.episodeId === episodeId : !i.episodeId));
      if (match && typeof match.progressSeconds === "number" && match.progressSeconds > 0) {
        // If > 95% finished or remaining < 20s, start over like Tubi
        if (match.durationSeconds > 0 && match.progressSeconds / match.durationSeconds >= 0.95) {
          return 0;
        }
        return match.progressSeconds;
      }
    }
  } catch {}
  return 0;
}

export function ContinueWatchingRow() {
  const { activeProfile, isKidsMode } = useProfile();
  const [items, setItems] = useState<WatchProgressItem[]>([]);

  useEffect(() => {
    function load() {
      try {
        const key = `ff_progress_${activeProfile.id}`;
        const globalKey = "ff_progress_global";
        const saved = localStorage.getItem(key) || localStorage.getItem(globalKey) || "[]";
        let parsed: WatchProgressItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (isKidsMode) {
            const blockedRatings = ["R", "TV-MA", "NC-17", "18+"];
            parsed = parsed.filter(
              (i) => !i.rating || !blockedRatings.includes(i.rating.toUpperCase())
            );
          }
          setItems(parsed);
        }
      } catch {
        setItems([]);
      }
    }

    load();
    window.addEventListener("ff_progress_updated", load);
    return () => window.removeEventListener("ff_progress_updated", load);
  }, [activeProfile.id, isKidsMode]);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-[1600px] px-4 pt-4 sm:px-6 md:px-8 xl:px-12 animate-fade-in" data-testid="section-continue-watching">
      <div className="mb-3.5 flex items-baseline justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black tracking-tight text-white sm:text-xl lg:text-2xl">
              Continue Watching
            </h2>
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
              {items.length} in progress
            </span>
          </div>
          <p className="mt-0.5 text-xs text-white/50">
            Pick up right where you left off on any device
          </p>
        </div>
      </div>

      <div className="relative -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 pt-1 scrollbar-none sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 xl:-mx-12 xl:px-12">
        {items.map((item) => {
          const percent = Math.min(100, Math.max(1, Math.round((item.progressSeconds / item.durationSeconds) * 100)));
          const timeHms = formatTimeHms(item.progressSeconds);
          const remainingText = formatRemainingTime(item.progressSeconds, item.durationSeconds);
          const targetUrl = item.episodeId
            ? `/watch/${item.slug}/${item.episodeId}`
            : `/watch/${item.slug}`;

          return (
            <div
              key={`${item.slug}-${item.episodeId || "movie"}`}
              className="group/card relative w-[240px] shrink-0 sm:w-[280px] md:w-[320px] rounded-2xl border border-white/10 bg-[#12161b] p-2 transition hover:border-white/25 hover:shadow-2xl"
              data-testid={`card-continue-${item.slug}`}
            >
              {/* Dismiss Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeWatchProgress(activeProfile.id, item.slug, item.episodeId);
                }}
                className="absolute right-3.5 top-3.5 z-20 grid size-7 place-items-center rounded-full bg-black/90 text-white border border-white/20 opacity-0 backdrop-blur-md transition hover:bg-rose-600 hover:text-white hover:border-rose-400 group-hover/card:opacity-100"
                title="Remove from Continue Watching"
                aria-label={`Remove ${item.name} from continue watching`}
              >
                <X size={14} />
              </button>

              <Link href={targetUrl} className="block outline-none">
                {/* Artwork Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/60 shadow-inner">
                  {item.backdropUrl || item.posterUrl ? (
                    <img
                      src={item.backdropUrl || item.posterUrl}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-300 group-hover/card:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-950 to-[#0a0714] text-white/30">
                      <Sparkles size={28} />
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 transition group-hover/card:opacity-100">
                    <span className="grid size-12 place-items-center rounded-full bg-white text-black shadow-xl transition transform group-hover/card:scale-110">
                      <Play size={20} fill="currentColor" className="ml-1" />
                    </span>
                  </div>

                  {/* Time Badge */}
                  <div className="absolute bottom-2 left-2 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-md">
                    Resumes {timeHms}
                  </div>

                  <div className="absolute bottom-2 right-2 rounded-md bg-purple-950/80 px-2 py-0.5 text-[10px] font-semibold text-purple-200 backdrop-blur-md">
                    {remainingText}
                  </div>

                  {/* Progress Bar */}
                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/60">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="mt-2.5 px-1 pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-bold text-white group-hover/card:text-purple-300 transition">
                      {item.name}
                    </h3>
                    <span className="shrink-0 text-[11px] font-bold text-white/40">
                      {percent}%
                    </span>
                  </div>
                  {item.episodeName && (
                    <p className="line-clamp-1 text-xs text-purple-400 mt-0.5 font-medium">
                      {item.episodeName}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
