import { useState, useEffect } from "react";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Sliders,
  Sparkles,
} from "lucide-react";
import { DeveloperNav } from "./developer-nav";
import { cn } from "@/lib/utils";

interface ApiKeyItem {
  id: string;
  keyName: string;
  keyPrefix: string;
  environment: "live" | "test";
  scopes: string[];
  rateLimitTier: string;
  status: "active" | "revoked" | "expired";
  createdAt: string;
  lastUsedAt?: string | null;
}

export function DeveloperKeys() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Form states
  const [keyName, setKeyName] = useState("");
  const [environment, setEnvironment] = useState<"live" | "test">("live");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "movies:read",
    "ai:search",
    "ai:recommend",
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dev/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(Array.isArray(data) ? data : Array.isArray(data?.keys) ? data.keys : []);
      }
    } catch (err) {
      console.error("Failed to load API keys:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/dev/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyName: keyName.trim(),
          environment,
          scopes: selectedScopes,
          rateLimitTier: "starter",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create API key");
      }
      setNewKeyResult(data.rawKey || data.secret || "");
      fetchKeys();
    } catch (err: any) {
      setActionError(err.message || "Failed to generate key");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? Applications using it will immediately fail.")) {
      return;
    }
    try {
      const res = await fetch(`/api/dev/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      }
    } catch (err) {
      console.error("Failed to revoke key:", err);
    }
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#08060f] text-white">
      <DeveloperNav activeTab="api keys" />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-white/10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              API Credentials & Secrets
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Manage your secret Bearer tokens. Keep your keys private and never commit them to client-side code.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setKeyName("");
              setNewKeyResult(null);
              setActionError(null);
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:brightness-110 transition"
          >
            <Plus size={15} />
            <span>Create Secret Key</span>
          </button>
        </div>

        {/* Security Alert */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200">
          <AlertTriangle size={18} className="shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-bold text-white">Authentication Architecture:</strong>
            <p className="text-white/80">
              Pass your API key as a Bearer token in the <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-amber-300">Authorization: Bearer ff_live_...</code> header.
              All public endpoints enforce rate limiting (<code className="rounded bg-black/40 px-1 py-0.5 font-mono text-amber-300">X-RateLimit-*</code>) and verify dual credit balances.
            </p>
          </div>
        </div>

        {/* Keys List */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#110c22]/60 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-purple-400" />
              <h2 className="font-bold text-base text-white">Active Keys</h2>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
                {keys.length}
              </span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Key Token</th>
                  <th className="pb-3 font-semibold">Environment</th>
                  <th className="pb-3 font-semibold">Scopes</th>
                  <th className="pb-3 font-semibold">Created</th>
                  <th className="pb-3 font-semibold">Last Used</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(Array.isArray(keys) ? keys : []).map((k) => (
                  <tr key={k.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 font-bold text-white">
                      {k.keyName || (k as any).name || "API Key"}
                    </td>
                    <td className="py-3 font-mono font-medium text-purple-300">
                      {k.keyPrefix || (k as any).key_prefix || "ff_live_"}...
                    </td>
                    <td className="py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          (k.environment || "live") === "live"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        )}
                      >
                        {k.environment || "live"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(k.scopes) ? k.scopes : ["*"]).map((scope) => (
                          <span
                            key={scope}
                            className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 text-white/50">{new Date(k.createdAt || (k as any).created_at || Date.now()).toLocaleDateString()}</td>
                    <td className="py-3 text-white/50">
                      {k.lastUsedAt || (k as any).last_used_at ? new Date(k.lastUsedAt || (k as any).last_used_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRevokeKey(k.id)}
                        className="rounded p-1.5 text-white/40 hover:bg-rose-500/20 hover:text-rose-400 transition"
                        title="Revoke key"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Create Key */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#120d24] p-6 shadow-2xl">
              {!newKeyResult ? (
                <form onSubmit={handleCreateKey}>
                  <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                    <Key size={18} className="text-purple-400" />
                    <h3 className="font-bold text-lg text-white">Create Secret API Key</h3>
                  </div>

                  {actionError && (
                    <div className="mt-4 rounded-xl bg-rose-500/20 border border-rose-500/40 p-3 text-xs text-rose-300">
                      {actionError}
                    </div>
                  )}

                  <div className="mt-4 space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-white/80 uppercase tracking-wider mb-1.5">
                        Key Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Production Server, Mobile Backend, Test Runner"
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        required
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-white/80 uppercase tracking-wider mb-1.5">
                        Environment
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEnvironment("live")}
                          className={cn(
                            "rounded-xl border p-2.5 text-left font-bold transition",
                            environment === "live"
                              ? "border-purple-500 bg-purple-600/20 text-purple-200"
                              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                          )}
                        >
                          <div>Live (Production)</div>
                          <p className="text-[10px] font-normal text-white/40 mt-0.5">
                            Real rate limits and credit billing
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEnvironment("test")}
                          className={cn(
                            "rounded-xl border p-2.5 text-left font-bold transition",
                            environment === "test"
                              ? "border-purple-500 bg-purple-600/20 text-purple-200"
                              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                          )}
                        >
                          <div>Test (Sandbox)</div>
                          <p className="text-[10px] font-normal text-white/40 mt-0.5">
                            Safe staging and mock runs
                          </p>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-white/80 uppercase tracking-wider mb-1.5">
                        Scopes & Permissions
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "movies:read", label: "Read Movies Catalog" },
                          { id: "ai:search", label: "AI Semantic Search" },
                          { id: "ai:recommend", label: "AI Recommendations" },
                          { id: "ai:enrich", label: "AI Metadata Enrichment" },
                        ].map((s) => {
                          const active = selectedScopes.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleScope(s.id)}
                              className={cn(
                                "flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs font-semibold transition",
                                active
                                  ? "border-purple-500/40 bg-purple-600/15 text-purple-200"
                                  : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                              )}
                            >
                              <div
                                className={cn(
                                  "flex size-4 items-center justify-center rounded border",
                                  active
                                    ? "border-purple-400 bg-purple-600 text-white"
                                    : "border-white/20"
                                )}
                              >
                                {active && <Check size={12} />}
                              </div>
                              <span>{s.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setCreateModalOpen(false)}
                      className="rounded-xl px-4 py-2 text-xs font-semibold text-white/60 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !keyName.trim()}
                      className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-50"
                    >
                      {submitting ? "Generating..." : "Generate Secret Key"}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 pb-3 border-b border-white/10">
                    <ShieldCheck size={22} />
                    <h3 className="font-bold text-lg text-white">Save Your API Key</h3>
                  </div>

                  <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                    <strong>Important:</strong> Please copy your secret key now. You will not be able to see it again!
                  </div>

                  <div className="mt-4">
                    <label className="block font-bold text-white/60 uppercase tracking-wider text-[11px] mb-1">
                      Secret Key Token
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/60 p-3">
                      <code className="flex-1 font-mono text-xs text-purple-300 break-all select-all">
                        {newKeyResult}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(newKeyResult)}
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500"
                      >
                        {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                        <span>{copiedKey ? "Copied!" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateModalOpen(false);
                        setNewKeyResult(null);
                      }}
                      className="rounded-xl bg-white/10 px-5 py-2 text-xs font-bold text-white hover:bg-white/20"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
