import { useState, useEffect } from "react";
import { HeroCarousel } from "./hero-carousel";
import { CuratedRow } from "./curated-row";
import { ContinueWatchingRow } from "./continue-watching-row";
import { ShieldCheck, Clapperboard, Sparkles } from "lucide-react";
import { useProfile } from "@/lib/profile-context";

interface CuratedCollection {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  items: any[];
}

export function HomeView() {
  const { isKidsMode } = useProfile();
  const [collections, setCollections] = useState<CuratedCollection[]>([]);
  const [personalizedItems, setPersonalizedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadHomeContent() {
      try {
        setLoading(true);
        // Load 22 Curated collections
        const rowsPromise = fetch("/api/v1/home/curated-rows").then((r) =>
          r.ok ? r.json() : []
        );

        // Load personalized recommendations with repeat suppression
        const watchedHistory = JSON.parse(
          localStorage.getItem("familyflix_watch_progress") || "{}"
        );
        const watchedSlugs = Object.keys(watchedHistory);
        const seenSlugs = JSON.parse(
          sessionStorage.getItem("familyflix_seen_titles") || "[]"
        );

        const recPromise = fetch("/api/v1/home/personalized", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            history: watchedSlugs,
            seen: seenSlugs,
            preferredGenres: isKidsMode ? ["Animation", "Family"] : [],
            limit: 16,
          }),
        }).then((r) => (r.ok ? r.json() : []));

        const [rowsData, recData] = await Promise.all([rowsPromise, recPromise]);

        if (isMounted) {
          setCollections(rowsData);
          setPersonalizedItems(recData);

          // Update seen titles in session storage for repeat suppression
          const allNewSlugs = [
            ...recData.map((t: any) => t.slug),
            ...rowsData.flatMap((r: any) => (r.items || []).slice(0, 3).map((t: any) => t.slug)),
          ];
          const combinedSeen = Array.from(new Set([...seenSlugs, ...allNewSlugs])).slice(0, 200);
          sessionStorage.setItem("familyflix_seen_titles", JSON.stringify(combinedSeen));
        }
      } catch (err) {
        console.error("Failed to load curated home rows:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHomeContent();

    return () => {
      isMounted = false;
    };
  }, [isKidsMode]);

  return (
    <div className="min-h-screen bg-[#07050d] text-white">
      {/* 1. Tubi-Inspired Hero Carousel (5-8 rotating picks) */}
      <HeroCarousel />

      {/* 2. Continue Watching Row */}
      <div className="relative z-10 -mt-8 sm:-mt-12">
        <ContinueWatchingRow />
      </div>

      {/* 3. Personalized Recommendation Engine (Returning User Experience) */}
      {personalizedItems.length > 0 && (
        <div className="relative z-10 mt-6 md:mt-8">
          <CuratedRow
            title="Recommended For You"
            subtitle="Tailored to your watch patterns and genre preferences"
            badge="AI MATCH"
            items={personalizedItems}
            seeAllHref="/movies"
          />
        </div>
      )}

      {/* 4. Curated Homepage Collections (22 Rows) */}
      <div className="relative z-10 mt-6 space-y-8 pb-12 md:mt-8 md:space-y-10">
        {loading ? (
          <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 md:px-8 xl:px-12 py-12">
            <div className="flex items-center justify-center gap-3 text-white/50 text-sm font-semibold">
              <Sparkles size={18} className="animate-spin text-purple-400" />
              <span>Loading FamilyFlix collections...</span>
            </div>
          </div>
        ) : collections.length > 0 ? (
          collections.map((col) => (
            <CuratedRow
              key={col.id}
              title={col.title}
              subtitle={col.subtitle}
              badge={col.badge}
              items={col.items}
              seeAllHref={
                col.id.includes("tv") || col.id.includes("series")
                  ? "/tv-shows"
                  : "/movies"
              }
            />
          ))
        ) : (
          <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 md:px-8 xl:px-12 py-8 text-center text-white/40">
            <Clapperboard size={32} className="mx-auto mb-2 text-white/20" />
            <p>Curated rows are loading from the media catalog.</p>
          </div>
        )}

        {/* Free with Ads & Copyright Transparency Notice */}
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 md:px-8 xl:px-12 pt-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#120d24]/60 p-4 text-xs text-white/70 backdrop-blur-sm">
            <ShieldCheck size={20} className="shrink-0 text-emerald-400" />
            <span>
              <strong className="text-white">100% Free with Ads.</strong> FamilyFlix By DemureGram
              streams verified titles under Creative Commons and public domain terms. No credit card or subscription required.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
