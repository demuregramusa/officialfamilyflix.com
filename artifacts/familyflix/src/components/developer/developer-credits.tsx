import { useState, useEffect } from "react";
import {
  Coins,
  Sparkles,
  Layers,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Check,
  DollarSign,
  TrendingDown,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { DeveloperNav } from "./developer-nav";
import { cn } from "@/lib/utils";

interface WalletItem {
  id: string;
  walletType: "movies_api" | "ai_api";
  balanceCredits: string;
  currency: string;
  autoRecharge: boolean;
  rechargeThresholdCredits: string;
  rechargeAmountCredits: string;
  updatedAt: string;
}

interface TransactionItem {
  id: string;
  walletId: string;
  transactionType: string;
  amountCredits: string;
  balanceAfterCredits: string;
  description: string;
  createdAt: string;
}

export function DeveloperCredits() {
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Top-up modal state
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [selectedWalletType, setSelectedWalletType] = useState<"movies_api" | "ai_api">("movies_api");
  const [topupAmount, setTopupAmount] = useState<number>(25);
  const [submittingTopup, setSubmittingTopup] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState<string | null>(null);

  const fetchWalletsAndTransactions = async () => {
    try {
      setLoading(true);
      const [wRes, tRes] = await Promise.all([
        fetch("/api/dev/wallets"),
        fetch("/api/dev/wallets/transactions"),
      ]);
      if (wRes.ok) {
        const wData = await wRes.json();
        setWallets(Array.isArray(wData) ? wData : []);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTransactions(Array.isArray(tData) ? tData : []);
      }
    } catch (err) {
      console.error("Failed to load wallets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletsAndTransactions();
  }, []);

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTopup(true);
    setTopupSuccess(null);
    try {
      const res = await fetch("/api/dev/wallets/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletType: selectedWalletType,
          amountCents: topupAmount * 100,
        }),
      });
      if (res.ok) {
        setTopupSuccess(`Added $${topupAmount}.00 to ${selectedWalletType === "movies_api" ? "Movies API" : "AI API"} Wallet!`);
        fetchWalletsAndTransactions();
        setTimeout(() => {
          setTopupSuccess(null);
          setTopupModalOpen(false);
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to top-up wallet:", err);
    } finally {
      setSubmittingTopup(false);
    }
  };

  const moviesWallet = wallets.find((w) => w.walletType === "movies_api");
  const aiWallet = wallets.find((w) => w.walletType === "ai_api");

  return (
    <div className="min-h-screen bg-[#08060f] text-white">
      <DeveloperNav activeTab="credit wallets" />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Coins size={24} className="text-amber-400" />
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                Dual Credit Wallets
              </h1>
            </div>
            <p className="mt-1 text-sm text-white/60">
              Strictly segregated balances for streaming catalog and Demure AI inference workloads.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setTopupSuccess(null);
              setTopupModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-pink-500 px-4 py-2 text-xs font-bold text-black shadow-md hover:brightness-110 transition"
          >
            <Plus size={15} />
            <span>Add Credits</span>
          </button>
        </div>

        {/* Isolation Notice Banner */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 text-xs">
          <ShieldCheck size={20} className="shrink-0 text-purple-400 mt-0.5" />
          <div className="space-y-1 text-white/80">
            <strong className="font-bold text-white">Segregation & Non-Transferability Guarantee:</strong>
            <p>
              In accordance with commercial billing specifications, <strong>Movies API Credits</strong> and{" "}
              <strong>AI API Credits</strong> remain strictly separate. Media catalog queries draw only from your Movies wallet,
              while semantic AI discovery and vector searches draw exclusively from your AI wallet. Balances cannot be co-mingled or transferred.
            </p>
          </div>
        </div>

        {/* Dual Wallet Display Cards */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Wallet 1: Movies API */}
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-b from-[#190f30]/90 to-[#0e081c]/90 p-6 backdrop-blur-md">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-purple-600/30 text-purple-300">
                  <Layers size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-base text-white">Movies API Wallet</h2>
                  <span className="text-[11px] text-white/50">Catalog & Playback Metering</span>
                </div>
              </div>
              <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-purple-300 border border-purple-500/30">
                Independent
              </span>
            </div>

            <div className="mt-6">
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                Available Balance
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">
                  ${Number(moviesWallet?.balanceCredits || 25).toFixed(2)}
                </span>
                <span className="text-sm font-bold text-white/40">USD Credits</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/5 bg-black/40 p-3 text-xs space-y-1.5">
              <div className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                Cost Per Action
              </div>
              <div className="flex justify-between text-white/60">
                <span>GET /v1/movies/search</span>
                <strong className="text-purple-300">$0.001 / req</strong>
              </div>
              <div className="flex justify-between text-white/60">
                <span>GET /v1/movies/:id</span>
                <strong className="text-purple-300">$0.0005 / req</strong>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Playback Availability Check</span>
                <strong className="text-purple-300">$0.001 / req</strong>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/10">
              <span className="text-xs text-white/50">
                Auto-recharge:{" "}
                <strong className="text-white">
                  {moviesWallet?.autoRecharge ? "Enabled" : "Off"}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedWalletType("movies_api");
                  setTopupModalOpen(true);
                }}
                className="flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300"
              >
                <span>Add Movies Credits</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>

          {/* Wallet 2: AI API */}
          <div className="relative overflow-hidden rounded-2xl border border-pink-500/30 bg-gradient-to-b from-[#250d27]/90 to-[#0e081c]/90 p-6 backdrop-blur-md">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-pink-600/30 text-pink-300">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-base text-white">AI API Wallet</h2>
                  <span className="text-[11px] text-white/50">Inference & Semantic Search</span>
                </div>
              </div>
              <span className="rounded-full bg-pink-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-pink-300 border border-pink-500/30">
                Independent
              </span>
            </div>

            <div className="mt-6">
              <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                Available Balance
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-black text-pink-300">
                  ${Number(aiWallet?.balanceCredits || 50).toFixed(2)}
                </span>
                <span className="text-sm font-bold text-white/40">USD Credits</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/5 bg-black/40 p-3 text-xs space-y-1.5">
              <div className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                Cost Per Action
              </div>
              <div className="flex justify-between text-white/60">
                <span>POST /v1/ai/search</span>
                <strong className="text-pink-300">$0.01 / query</strong>
              </div>
              <div className="flex justify-between text-white/60">
                <span>POST /v1/ai/recommendations</span>
                <strong className="text-pink-300">$0.015 / run</strong>
              </div>
              <div className="flex justify-between text-white/60">
                <span>POST /v1/ai/metadata/enrich</span>
                <strong className="text-pink-300">$0.02 / call</strong>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/10">
              <span className="text-xs text-white/50">
                Auto-recharge:{" "}
                <strong className="text-white">
                  {aiWallet?.autoRecharge ? "Enabled" : "Off"}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedWalletType("ai_api");
                  setTopupModalOpen(true);
                }}
                className="flex items-center gap-1 text-xs font-bold text-pink-400 hover:text-pink-300"
              >
                <span>Add AI Credits</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Ledger */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-[#110c22]/60 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-purple-400" />
              <h2 className="font-bold text-base text-white">Credit Transaction Ledger</h2>
            </div>
            <span className="text-xs text-white/50">Full audit trail</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Date & Time</th>
                  <th className="pb-3 font-semibold">Wallet</th>
                  <th className="pb-3 font-semibold">Description</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.length > 0 ? (
                  transactions.map((tx) => {
                    const isPositive = Number(tx.amountCredits) > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 text-white/60">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span
                            className={cn(
                              "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                              tx.description?.toLowerCase().includes("ai")
                                ? "bg-pink-500/20 text-pink-300"
                                : "bg-purple-500/20 text-purple-300"
                            )}
                          >
                            {tx.description?.toLowerCase().includes("ai") ? "AI API" : "Movies API"}
                          </span>
                        </td>
                        <td className="py-3 font-medium text-white/90">{tx.description}</td>
                        <td className="py-3">
                          <span
                            className={cn(
                              "font-mono font-bold",
                              isPositive ? "text-emerald-400" : "text-white/60"
                            )}
                          >
                            {isPositive ? "+" : ""}
                            ${Math.abs(Number(tx.amountCredits)).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono text-white/60">
                          ${Number(tx.balanceAfterCredits).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-white/40">
                      No credit transactions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Top-up */}
        {topupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#120d24] p-6 shadow-2xl">
              <form onSubmit={handleTopup}>
                <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                  <Coins size={20} className="text-amber-400" />
                  <h3 className="font-bold text-lg text-white">Purchase Credits</h3>
                </div>

                {topupSuccess && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-3 text-xs text-emerald-200">
                    <Check size={16} />
                    <span>{topupSuccess}</span>
                  </div>
                )}

                <div className="mt-4 space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-white/80 uppercase tracking-wider mb-2">
                      Destination Wallet
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedWalletType("movies_api")}
                        className={cn(
                          "rounded-xl border p-3 text-left font-bold transition",
                          selectedWalletType === "movies_api"
                            ? "border-purple-500 bg-purple-600/20 text-purple-200"
                            : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                        )}
                      >
                        <Layers size={16} className="text-purple-400 mb-1" />
                        <div>Movies API</div>
                        <p className="text-[10px] font-normal text-white/40">Catalog endpoints</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedWalletType("ai_api")}
                        className={cn(
                          "rounded-xl border p-3 text-left font-bold transition",
                          selectedWalletType === "ai_api"
                            ? "border-pink-500 bg-pink-600/20 text-pink-200"
                            : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                        )}
                      >
                        <Sparkles size={16} className="text-pink-400 mb-1" />
                        <div>AI API</div>
                        <p className="text-[10px] font-normal text-white/40">Semantic inference</p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-white/80 uppercase tracking-wider mb-2">
                      Amount (USD)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[10, 25, 50, 100].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopupAmount(amt)}
                          className={cn(
                            "rounded-xl border py-2.5 font-bold transition text-center",
                            topupAmount === amt
                              ? "border-amber-400 bg-amber-400/20 text-amber-300"
                              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                          )}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-black/40 p-3 text-[11px] text-white/50">
                    Credits never expire. Top-up will be charged to your primary payment method.
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setTopupModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-white/60 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingTopup}
                    className="rounded-xl bg-gradient-to-r from-amber-500 to-pink-500 px-5 py-2 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50"
                  >
                    {submittingTopup ? "Processing..." : `Charge $${topupAmount}.00`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
