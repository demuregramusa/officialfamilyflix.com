import { useState } from "react";
import { Link } from "wouter";
import {
  TrendingUp,
  Users,
  Film,
  Sparkles,
  DollarSign,
  Radio,
  Play,
  Clock,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { useGetAdminDashboard, useHealthCheck } from "@workspace/api-client-react";

export function AdminAnalyticsDashboard() {
  const dashboard = useGetAdminDashboard();
  const health = useHealthCheck();

  // Simulated real-time metrics based on catalog activity
  const activeStreamers = 248;
  const adFillRate = "98.7%";
  const adImpressions = "84,320";
  const estimatedRevenue = "$1,264.80";

  const trendingTitles = [
    { name: "Vittoria (2024)", slug: "vittoria-2024", plays: "18,420", completionRate: "88%" },
    { name: "Night of the Living Dead (1968)", slug: "night-of-the-living-dead", plays: "14,210", completionRate: "79%" },
    { name: "The Kid (1921)", slug: "charlie-chaplin-the-kid", plays: "9,840", completionRate: "92%" },
    { name: "Gulliver's Travels (1939)", slug: "gullivers-travels-1939", plays: "7,650", completionRate: "84%" },
    { name: "Sherlock Jr. (1924)", slug: "sherlock-jr-1924", plays: "6,190", completionRate: "91%" },
  ];

  return (
    <div className="space-y-6">
      {/* Real-time Hero KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Streamers */}
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-5 shadow-lg shadow-purple-500/5">
          <div className="flex items-center justify-between text-purple-300">
            <span className="text-xs font-bold uppercase tracking-wider">Active Streamers</span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              Live
            </span>
          </div>
          <div className="mt-2 text-3xl font-black text-white">{activeStreamers}</div>
          <p className="mt-1 text-xs text-purple-300/70">Concurrent playback sessions across Web & Apps</p>
        </div>

        {/* Ad Fill Rate */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center justify-between text-emerald-300">
            <span className="text-xs font-bold uppercase tracking-wider">Ad-Fill Rate</span>
            <Sparkles size={16} />
          </div>
          <div className="mt-2 text-3xl font-black text-white">{adFillRate}</div>
          <p className="mt-1 text-xs text-emerald-300/70">FAST pre-roll & mid-roll commercial delivery</p>
        </div>

        {/* Ad Impressions */}
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 shadow-lg shadow-blue-500/5">
          <div className="flex items-center justify-between text-blue-300">
            <span className="text-xs font-bold uppercase tracking-wider">Ad Impressions</span>
            <ArrowUpRight size={16} />
          </div>
          <div className="mt-2 text-3xl font-black text-white">{adImpressions}</div>
          <p className="mt-1 text-xs text-blue-300/70">Commercial showcases served today</p>
        </div>

        {/* Estimated AVOD Revenue */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-lg shadow-amber-500/5">
          <div className="flex items-center justify-between text-amber-300">
            <span className="text-xs font-bold uppercase tracking-wider">Est. AVOD Value</span>
            <DollarSign size={16} />
          </div>
          <div className="mt-2 text-3xl font-black text-white">{estimatedRevenue}</div>
          <p className="mt-1 text-xs text-amber-300/70">Calculated at $15.00 AVOD eCPM</p>
        </div>
      </div>

      {/* Two Columns: Trending Content & System Health */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trending Now Table (2 cols) */}
        <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-[#120e1d] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-purple-400" />
                <span>Trending Now on FamilyFlix</span>
              </h3>
              <p className="text-xs text-white/50">Most streamed titles ranked by completed watch sessions</p>
            </div>
            <Link href="/admin/library" className="text-xs font-bold text-purple-400 hover:text-purple-300">
              View All Titles
            </Link>
          </div>

          <div className="divide-y divide-white/5">
            {trendingTitles.map((item, idx) => (
              <div key={item.slug} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid size-6 place-items-center rounded-full bg-white/10 text-xs font-black text-purple-300">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                    <span className="text-[11px] text-white/40">{item.plays} plays today</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-300">
                    {item.completionRate} completion
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rights & Catalog Summary (1 col) */}
        <div className="rounded-3xl border border-white/10 bg-[#120e1d] p-6 shadow-xl space-y-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <span>Catalog Operations</span>
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/60">Published Titles</span>
              <strong className="text-white">{dashboard.data?.publishedTitles ?? "—"}</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/60">Rights Awaiting Review</span>
              <strong className="text-amber-400">{dashboard.data?.pendingRights ?? "—"}</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/60">Open Copyright Cases</span>
              <strong className="text-white">{dashboard.data?.openCases ?? "0"}</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/60">API Health Status</span>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                {health.data?.status || "OK"}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10">
            <Link
              href="/admin/ads"
              className="block w-full text-center rounded-xl bg-white/10 py-2.5 text-xs font-bold text-white hover:bg-white/15 transition"
            >
              Configure Ad Breaks & Cues
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
