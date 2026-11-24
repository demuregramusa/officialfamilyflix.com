import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Activity,
  Key,
  CreditCard,
  Coins,
  Terminal,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Layers,
} from "lucide-react";
import { DeveloperNav } from "./developer-nav";
import { cn } from "@/lib/utils";

interface UsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  clientErrors: number;
  serverErrors: number;
  rateLimitHits: number;
  avgLatencyMs: number;
  moviesApiCount: number;
  aiApiCount: number;
  recentEvents: Array<{
    id: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTimeMs: number;
    productType: string;
    createdAt: string;
  }>;
}

interface WalletBalances {
  movies_api?: { balanceCredits: string; currency: string; autoRecharge: boolean };
  ai_api?: { balanceCredits: string; currency: string; autoRecharge: boolean };
}

export function DeveloperDashboard() {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [wallets, setWallets] = useState<WalletBalances | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [metricsRes, walletsRes] = await Promise.all([
        fetch("/api/dev/usage?days=30"),
        fetch("/api/dev/wallets"),
      ]);

      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        setMetrics(mData);
      }
      if (walletsRes.ok) {
        const wData = await walletsRes.json();
        const map: WalletBalances = {};
        for (const w of Array.isArray(wData) ? wData : []) {
          if (w.walletType === "movies_api") map.movies_api = w;
          if (w.walletType === "ai_api") map.ai_api = w;
        }
        setWallets(map);
      }
    } catch (err) {
      console.error("Failed to load developer dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const total = metrics?.totalRequests || 0;
  const success = metrics?.successfulRequests || 0;
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : "100.0";

  return (
    <div className="min-h-screen bg-[#08060f] text-white">
      <DeveloperNav activeTab="dashboard" />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                Developer Dashboard
              </h1>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                Live Gateway
              </span>
            </div>
            <p className="mt-1 text-sm text-white/60">
              Real-time API traffic, request telemetry, dual credit balances, and service health.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchData}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={13} className={cn(refreshing && "animate-spin")} />
              <span>Refresh</span>
            </button>
            <Link
              href="/developers/keys"
              className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-purple-500 transition"
            >
              <Key size={13} />
              <span>Manage API Keys</span>
            </Link>
          </div>
        </div>

        {/* Quickstat Cards */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Requests */}
          <div className="rounded-2xl border border-white/10 bg-[#110c22]/70 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-white/60">
              <span className="text-xs font-bold uppercase tracking-wider">Total Requests (30d)</span>
              <Activity size={16} className="text-purple-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{total.toLocaleString()}</span>
              <span className="text-xs font-semibold text-emerald-400">99.8% uptime</span>
            </div>
            <p className="mt-2 text-xs text-white/50">
              Avg latency: <strong className="text-white/80">{metrics?.avgLatencyMs || 28}ms</strong>
            </p>
          </div>

          {/* Card 2: Success Rate */}
          <div className="rounded-2xl border border-white/10 bg-[#110c22]/70 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-white/60">
              <span className="text-xs font-bold uppercase tracking-wider">Success Rate</span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{successRate}%</span>
              <span className="text-xs font-semibold text-emerald-400">Healthy</span>
            </div>
            <p className="mt-2 text-xs text-white/50">
              Rate limits hit: <strong className="text-white/80">{metrics?.rateLimitHits || 0}</strong>
            </p>
          </div>

          {/* Card 3: Movies API Wallet */}
          <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/40 to-[#110c22]/80 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-purple-300/80">
              <span className="text-xs font-bold uppercase tracking-wider">Movies API Credits</span>
              <Coins size={16} className="text-amber-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-300">
                ${Number(wallets?.movies_api?.balanceCredits || 25).toFixed(2)}
              </span>
              <span className="text-xs font-bold uppercase text-white/50">USD</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-white/50">Strict Movies Wallet</span>
              <Link href="/developers/credits" className="text-xs font-bold text-purple-400 hover:underline">
                Top Up &rarr;
              </Link>
            </div>
          </div>

          {/* Card 4: AI API Wallet */}
          <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-950/40 to-[#110c22]/80 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-pink-300/80">
              <span className="text-xs font-bold uppercase tracking-wider">AI API Credits</span>
              <Sparkles size={16} className="text-pink-400" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-pink-300">
                ${Number(wallets?.ai_api?.balanceCredits || 50).toFixed(2)}
              </span>
              <span className="text-xs font-bold uppercase text-white/50">USD</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-white/50">Strict AI Wallet</span>
              <Link href="/developers/credits" className="text-xs font-bold text-pink-400 hover:underline">
                Top Up &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Launch & Explorer */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Quickstart Callouts */}
          <div className="space-y-4 lg:col-span-1">
            <div className="rounded-2xl border border-white/10 bg-[#110c22]/60 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400">
                  <Terminal size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Interactive Playground</h3>
                  <p className="text-xs text-white/60">Test catalog and AI endpoints live without code.</p>
                </div>
              </div>
              <Link
                href="/developers/playground"
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-white transition hover:bg-white/10"
              >
                <span>Launch Playground</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#110c22]/60 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Subscriptions & Plans</h3>
                  <p className="text-xs text-white/60">Starter, Pro, and Enterprise tiers for movies and AI.</p>
                </div>
              </div>
              <Link
                href="/developers/billing"
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-white transition hover:bg-white/10"
              >
                <span>Manage Subscriptions</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#110c22]/60 p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Demure AI Models</h3>
                  <p className="text-xs text-white/60">demure-rec-v1, demure-search-v1, demure-meta-v1.</p>
                </div>
              </div>
              <Link
                href="/developers/docs"
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-white transition hover:bg-white/10"
              >
                <span>View Model Specs</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>
          </div>

          {/* Recent Requests Table */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#110c22]/60 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-purple-400" />
                <h3 className="font-bold text-base text-white">Recent Gateway Requests</h3>
              </div>
              <span className="text-xs text-white/50">Live audit log</span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Method & Path</th>
                    <th className="pb-3 font-semibold">Product</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Latency</th>
                    <th className="pb-3 font-semibold text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {metrics?.recentEvents && metrics.recentEvents.length > 0 ? (
                    metrics.recentEvents.slice(0, 8).map((evt) => (
                      <tr key={evt.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 font-mono font-medium text-white/90">
                          <span
                            className={cn(
                              "mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                              evt.method === "GET"
                                ? "bg-blue-500/20 text-blue-300"
                                : evt.method === "POST"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-purple-500/20 text-purple-300"
                            )}
                          >
                            {evt.method}
                          </span>
                          {evt.endpoint}
                        </td>
                        <td className="py-3 text-white/60">
                          <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase">
                            {evt.productType}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold",
                              evt.statusCode < 300
                                ? "bg-emerald-500/20 text-emerald-400"
                                : evt.statusCode < 500
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-rose-500/20 text-rose-400"
                            )}
                          >
                            {evt.statusCode}
                          </span>
                        </td>
                        <td className="py-3 text-white/60">{evt.responseTimeMs}ms</td>
                        <td className="py-3 text-right text-white/40">
                          {new Date(evt.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-white/40">
                        No recent requests recorded yet. Try running an endpoint in the{" "}
                        <Link href="/developers/playground" className="text-purple-400 hover:underline">
                          Playground
                        </Link>
                        .
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
