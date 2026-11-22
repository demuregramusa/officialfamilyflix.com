import { useState } from "react";
import { Sparkles, Sliders, CheckCircle2, Clock, DollarSign, Shield } from "lucide-react";

export function AdBreakManager() {
  const [preRollEnabled, setPreRollEnabled] = useState(true);
  const [preRollDuration, setPreRollDuration] = useState("15");
  const [midRoll1, setMidRoll1] = useState(true);
  const [midRoll2, setMidRoll2] = useState(true);
  const [midRoll3, setMidRoll3] = useState(false);
  const [postRoll, setPostRoll] = useState(false);
  const [adFrequency, setAdFrequency] = useState("15");
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const config = {
        preRollEnabled,
        preRollDuration: Number(preRollDuration),
        cuePoints: [
          ...(midRoll1 ? [900] : []),
          ...(midRoll2 ? [1800] : []),
          ...(midRoll3 ? [2700] : []),
        ],
        postRoll,
        adFrequencyMinutes: Number(adFrequency),
      };
      localStorage.setItem("ff_ad_config", JSON.stringify(config));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="rounded-3xl border border-white/10 bg-[#120e1d] p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="grid size-10 place-items-center rounded-xl bg-purple-600/20 text-purple-400">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">AVOD Ad-Break Manager</h2>
            <p className="text-xs text-white/50">
              Configure automated commercial insertion cue points, pre-roll timers, and ad frequency rules.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-6">
          {/* Pre-Roll Commercials */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Pre-Roll Showcase</h3>
                <p className="text-xs text-white/50">Commercial played immediately before the main feature starts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preRollEnabled}
                  onChange={(e) => setPreRollEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {preRollEnabled && (
              <div className="pt-2 flex items-center gap-4">
                <label className="text-xs font-semibold text-white/70">Commercial Duration:</label>
                <select
                  value={preRollDuration}
                  onChange={(e) => setPreRollDuration(e.target.value)}
                  className="rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white outline-none focus:border-purple-400"
                >
                  <option value="15">15 Seconds (Standard Tubi FAST)</option>
                  <option value="30">30 Seconds (Extended Brand Showcase)</option>
                </select>
              </div>
            )}
          </div>

          {/* Mid-Roll Cue Points */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Automated Mid-Roll Cue Points</h3>
              <p className="text-xs text-white/50">
                Cue points trigger commercial pods during lengthy feature films and television episodes
              </p>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-purple-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Cue Point 1: 15:00 Mark</div>
                    <div className="text-[11px] text-white/40">15 minutes into feature (1x 30s ad)</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={midRoll1}
                  onChange={(e) => setMidRoll1(e.target.checked)}
                  className="rounded border-white/20 text-purple-600 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-purple-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Cue Point 2: 30:00 Mark</div>
                    <div className="text-[11px] text-white/40">30 minutes into feature (1x 30s ad)</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={midRoll2}
                  onChange={(e) => setMidRoll2(e.target.checked)}
                  className="rounded border-white/20 text-purple-600 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-purple-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Cue Point 3: 45:00 Mark</div>
                    <div className="text-[11px] text-white/40">45 minutes into feature (1x 30s ad)</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={midRoll3}
                  onChange={(e) => setMidRoll3(e.target.checked)}
                  className="rounded border-white/20 text-purple-600 focus:ring-0"
                />
              </label>
            </div>
          </div>

          {/* Ad Frequency Cap */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">Viewer Ad Frequency Capping</h3>
              <p className="text-xs text-white/50">Minimum interval between commercial pods per viewer</p>
            </div>
            <select
              value={adFrequency}
              onChange={(e) => setAdFrequency(e.target.value)}
              className="rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white outline-none focus:border-purple-400"
            >
              <option value="12">Every 12 Minutes</option>
              <option value="15">Every 15 Minutes (Recommended)</option>
              <option value="20">Every 20 Minutes (Light AVOD)</option>
            </select>
          </div>

          {saved && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>Ad break rules saved and synchronized with FAST player engine!</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
            >
              Save Ad Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
