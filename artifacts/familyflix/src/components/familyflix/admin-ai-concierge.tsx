import { useState, useEffect } from "react";
import {
  Bot,
  Sparkles,
  Zap,
  Volume2,
  DollarSign,
  Shield,
  Check,
  Save,
  RefreshCw,
  Users,
  MessageSquare,
  Key,
} from "lucide-react";

export function AdminAiConciergePage() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [conciergeEnabled, setConciergeEnabled] = useState(true);
  const [defaultAssistant, setDefaultAssistant] = useState<"raven" | "princeton">("raven");
  const [voiceModel, setVoiceModel] = useState("natural-hd");
  const [freeAllowance, setFreeAllowance] = useState(100);
  const [basicAllowance, setBasicAllowance] = useState(500);
  const [vipAllowance, setVipAllowance] = useState(2000);
  const [textCost, setTextCost] = useState(1);
  const [voiceCost, setVoiceCost] = useState(2);
  const [apiKey, setApiKey] = useState("");
  const [metrics, setMetrics] = useState({
    totalInteractions: 1420,
    activeWallets: 388,
    totalCreditsGranted: 84200,
    totalCreditsConsumed: 12940,
    popularActions: ["Play Comedy", "Resume Playback", "Check Credits", "Search Action"],
  });

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-purple-400 text-xs font-black uppercase tracking-widest">
            <Bot size={16} />
            <span>AI Concierge Management</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            RAVEN & PRINCETON Controls
          </h1>
          <p className="text-xs text-white/50 mt-1 max-w-xl">
            Configure autonomous voice concierges, Siri-style playback tools, credit pricing, plan allowances, and external AI provider keys.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 text-xs font-bold transition shadow-lg disabled:opacity-50"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
          <span>{saved ? "Settings Saved" : "Save Configuration"}</span>
        </button>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between text-white/50 text-[11px] font-semibold">
            <span>Total Queries</span>
            <MessageSquare size={14} className="text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{metrics.totalInteractions.toLocaleString()}</div>
          <span className="text-[10px] text-green-400 font-bold">+18% this week</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between text-white/50 text-[11px] font-semibold">
            <span>Active Wallets</span>
            <Users size={14} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{metrics.activeWallets.toLocaleString()}</div>
          <span className="text-[10px] text-white/40">Registered accounts</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between text-white/50 text-[11px] font-semibold">
            <span>Credits Granted</span>
            <Sparkles size={14} className="text-purple-300" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{metrics.totalCreditsGranted.toLocaleString()}</div>
          <span className="text-[10px] text-white/40">Monthly allowances</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between text-white/50 text-[11px] font-semibold">
            <span>Credits Consumed</span>
            <Zap size={14} className="text-amber-300" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{metrics.totalCreditsConsumed.toLocaleString()}</div>
          <span className="text-[10px] text-purple-300">15.3% burn rate</span>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Assistant Personas & Availability */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <Bot size={16} className="text-purple-400" />
            <h3 className="text-sm font-black text-white">Assistant Personas</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Enable AI Concierge Site-Wide</div>
              <div className="text-[11px] text-white/50">Widget renders on Profile, Terms, About, and Developers</div>
            </div>
            <button
              type="button"
              onClick={() => setConciergeEnabled((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${conciergeEnabled ? "bg-purple-600" : "bg-white/20"}`}
            >
              <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${conciergeEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">Default Assistant for New Visitors</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDefaultAssistant("raven")}
                className={`rounded-xl border p-2.5 text-left text-xs transition ${
                  defaultAssistant === "raven"
                    ? "border-purple-500 bg-purple-950/50 text-white font-bold"
                    : "border-white/10 bg-white/[0.02] text-white/60"
                }`}
              >
                RAVEN (Female · Default)
              </button>
              <button
                type="button"
                onClick={() => setDefaultAssistant("princeton")}
                className={`rounded-xl border p-2.5 text-left text-xs transition ${
                  defaultAssistant === "princeton"
                    ? "border-purple-500 bg-purple-950/50 text-white font-bold"
                    : "border-white/10 bg-white/[0.02] text-white/60"
                }`}
              >
                PRINCETON (Male · Alternative)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">Voice Synthesis Engine</label>
            <select
              value={voiceModel}
              onChange={(e) => setVoiceModel(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white"
            >
              <option value="natural-hd">High-Definition Natural Conversational (Google HD TTS)</option>
              <option value="webspeech">Native Client Web Speech API (Low Latency)</option>
              <option value="hybrid">Hybrid HD Engine (Instant client preview + server buffer)</option>
            </select>
          </div>
        </div>

        {/* Credit Allowances & Consumption Rules */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <DollarSign size={16} className="text-amber-400" />
            <h3 className="text-sm font-black text-white">Credit Allowances by Tier</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-white/60 mb-1">Free Allowance</label>
              <input
                type="number"
                value={freeAllowance}
                onChange={(e) => setFreeAllowance(Number(e.target.value))}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-white/60 mb-1">Basic Tier</label>
              <input
                type="number"
                value={basicAllowance}
                onChange={(e) => setBasicAllowance(Number(e.target.value))}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-white/60 mb-1">VIP Tier</label>
              <input
                type="number"
                value={vipAllowance}
                onChange={(e) => setVipAllowance(Number(e.target.value))}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <div className="text-xs font-bold text-white mb-2">Consumption Rules</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Text Query Cost</label>
                <input
                  type="number"
                  value={textCost}
                  onChange={(e) => setTextCost(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Voice Query Cost</label>
                <input
                  type="number"
                  value={voiceCost}
                  onChange={(e) => setVoiceCost(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
