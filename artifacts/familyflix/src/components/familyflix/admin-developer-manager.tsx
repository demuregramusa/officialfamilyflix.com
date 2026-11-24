import { useState, useEffect } from "react";
import {
  Code2,
  Key,
  Coins,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DevKeySummary {
  id: string;
  keyName: string;
  keyPrefix: string;
  environment: string;
  scopes: string[];
  status: string;
  createdAt: string;
  lastUsedAt?: string | null;
}

interface AIModelItem {
  id: string;
  modelIdentifier: string;
  name: string;
  description: string;
  family: string;
  status: string;
  costPer1kCredits: string;
}

export function AdminDeveloperManager() {
  const [keys, setKeys] = useState<DevKeySummary[]>([]);
  const [models, setModels] = useState<AIModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"keys" | "ai" | "credits">("keys");

  // Grant credits state
  const [grantWalletType, setGrantWalletType] = useState<"movies_api" | "ai_api">("movies_api");
  const [grantAmount, setGrantAmount] = useState<number>(50);
  const [grantReason, setGrantReason] = useState<string>("Admin Promotional Grant");
  const [granting, setGranting] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null);

  const fetchAdminDevData = async () => {
    try {
      setLoading(true);
      const [keysRes, modelsRes] = await Promise.all([
        fetch("/api/dev/keys"),
        fetch("/v1/ai/models", {
          headers: { Authorization: "Bearer ff_live_84ab9fda6d4988e2020c9b44876d9f895f949f250a5b2970" },
        }),
      ]);

      if (keysRes.ok) {
        const kData = await keysRes.json();
        setKeys(Array.isArray(kData) ? kData : Array.isArray(kData?.keys) ? kData.keys : []);
      }
      if (modelsRes.ok) {
        const mData = await modelsRes.json();
        setModels(Array.isArray(mData?.data) ? mData.data : Array.isArray(mData) ? mData : []);
      }
    } catch (err) {
      console.error("Failed to load admin dev data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDevData();
  }, []);

  const handleGrantCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    setGranting(true);
    setGrantSuccess(null);
    try {
      const res = await fetch("/api/dev/wallets/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletType: grantWalletType,
          amountCents: grantAmount * 100,
          description: grantReason,
        }),
      });
      if (res.ok) {
        setGrantSuccess(`Successfully granted $${grantAmount}.00 to ${grantWalletType === "movies_api" ? "Movies API" : "AI API"} wallet!`);
        setTimeout(() => setGrantSuccess(null), 4000);
      }
    } catch (err) {
      console.error("Failed to grant credits:", err);
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/10 bg-[#120d24] p-6">
        <div>
          <div className="flex items-center gap-2">
            <Code2 size={24} className="text-purple-400" />
            <h1 className="text-xl font-black uppercase tracking-tight text-white">
              Developer Platform Administration
            </h1>
          </div>
          <p className="mt-1 text-xs text-white/60">
            FamilyFlix By DemureGram Developer Ecosystem, API Gateway keys, AI models, and credit reserves.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAdminDevData}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10"
        >
          <RefreshCw size={13} className={cn(loading && "animate-spin")} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-3">
        {[
          { id: "keys", label: "API Key Management", icon: Key },
          { id: "ai", label: "Demure AI Model Registry", icon: Sparkles },
          { id: "credits", label: "Credit Allocation & Wallets", icon: Coins },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition",
                active
                  ? "bg-purple-600 text-white shadow"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Keys */}
      {activeTab === "keys" && (
        <div className="rounded-2xl border border-white/10 bg-[#120d24] p-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <h2 className="font-bold text-sm text-white">Active Developer Keys</h2>
            <span className="text-xs text-white/50">{keys.length} keys registered</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/40 uppercase">
                  <th className="pb-3">Key Name</th>
                  <th className="pb-3">Token Prefix</th>
                  <th className="pb-3">Env</th>
                  <th className="pb-3">Scopes</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(Array.isArray(keys) ? keys : []).map((k) => (
                  <tr key={k.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-bold text-white">{k.keyName || (k as any).name || "API Key"}</td>
                    <td className="py-3 font-mono text-purple-300">{k.keyPrefix || (k as any).key_prefix || "ff_live_"}...</td>
                    <td className="py-3 uppercase text-[10px] font-bold text-emerald-400">
                      {k.environment || "live"}
                    </td>
                    <td className="py-3 text-white/60">
                      {(Array.isArray(k.scopes) ? k.scopes : ["*"]).join(", ")}
                    </td>
                    <td className="py-3">
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                        {k.status || "active"}
                      </span>
                    </td>
                    <td className="py-3 text-white/40">
                      {new Date(k.createdAt || (k as any).created_at || Date.now()).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: AI Models */}
      {activeTab === "ai" && (
        <div className="rounded-2xl border border-white/10 bg-[#120d24] p-6">
          <div className="pb-4 border-b border-white/10">
            <h2 className="font-bold text-sm text-white">Demure AI Models Registry</h2>
            <p className="mt-0.5 text-xs text-white/50">
              Configured inference models for semantic search, recommendation vectors, and catalog enrichments.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {models.map((m) => (
              <div
                key={m.id || m.modelIdentifier}
                className="rounded-xl border border-purple-500/20 bg-black/40 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-pink-300">
                    {m.modelIdentifier}
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    {m.status}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-white">{m.name}</h4>
                <p className="text-xs text-white/60">{m.description}</p>
                <div className="pt-2 border-t border-white/5 flex justify-between text-[11px] text-white/40">
                  <span>Architecture: {m.family}</span>
                  <span className="text-purple-300 font-bold">
                    ${Number(m.costPer1kCredits).toFixed(3)} / 1k tokens
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Credits Grant */}
      {activeTab === "credits" && (
        <div className="rounded-2xl border border-white/10 bg-[#120d24] p-6">
          <div className="pb-4 border-b border-white/10">
            <h2 className="font-bold text-sm text-white">Manual Credit Grant & Adjustment</h2>
            <p className="mt-0.5 text-xs text-white/60">
              Credit funds to organization wallets for promotional trials, enterprise pilots, or SLA credits.
            </p>
          </div>

          {grantSuccess && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-3 text-xs text-emerald-200">
              <Check size={16} />
              <span>{grantSuccess}</span>
            </div>
          )}

          <form onSubmit={handleGrantCredits} className="mt-6 max-w-lg space-y-4 text-xs">
            <div>
              <label className="block font-bold text-white/80 uppercase mb-2">
                Target Wallet (Strict Separation)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGrantWalletType("movies_api")}
                  className={cn(
                    "rounded-xl border p-3 text-left font-bold transition",
                    grantWalletType === "movies_api"
                      ? "border-purple-500 bg-purple-600/20 text-white"
                      : "border-white/10 bg-white/5 text-white/60"
                  )}
                >
                  <Layers size={16} className="text-purple-400 mb-1" />
                  <div>Movies API Wallet</div>
                </button>
                <button
                  type="button"
                  onClick={() => setGrantWalletType("ai_api")}
                  className={cn(
                    "rounded-xl border p-3 text-left font-bold transition",
                    grantWalletType === "ai_api"
                      ? "border-pink-500 bg-pink-600/20 text-white"
                      : "border-white/10 bg-white/5 text-white/60"
                  )}
                >
                  <Sparkles size={16} className="text-pink-400 mb-1" />
                  <div>AI API Wallet</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-white/80 uppercase mb-1">
                Grant Amount (USD Credits)
              </label>
              <input
                type="number"
                min="5"
                max="5000"
                value={grantAmount}
                onChange={(e) => setGrantAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-white/80 uppercase mb-1">
                Reason / Audit Note
              </label>
              <input
                type="text"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
              />
            </div>

            <button
              type="submit"
              disabled={granting}
              className="mt-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 disabled:opacity-50"
            >
              {granting ? "Granting Credits..." : `Grant $${grantAmount}.00 Credits`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
