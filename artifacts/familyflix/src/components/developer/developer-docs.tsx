import { useState } from "react";
import { Link } from "wouter";
import {
  BookOpen,
  Code2,
  Copy,
  Check,
  Sparkles,
  Layers,
  ShieldCheck,
  Terminal,
  ExternalLink,
  ChevronRight,
  Hash,
  Search,
} from "lucide-react";
import { DeveloperNav } from "./developer-nav";
import { cn } from "@/lib/utils";

interface DocSection {
  id: string;
  title: string;
  category: "overview" | "movies" | "tv" | "ai" | "rights";
}

const SECTIONS: DocSection[] = [
  { id: "quickstart", title: "Quickstart & Auth", category: "overview" },
  { id: "rate-limits", title: "Rate Limits & Headers", category: "overview" },
  { id: "movies-list", title: "List Movies", category: "movies" },
  { id: "movies-search", title: "Search Movies", category: "movies" },
  { id: "movies-trending", title: "Trending & Popular", category: "movies" },
  { id: "movies-detail", title: "Movie Details & Credits", category: "movies" },
  { id: "tv-list", title: "List TV Series", category: "tv" },
  { id: "tv-episodes", title: "Seasons & Episodes", category: "tv" },
  { id: "categories", title: "Categories & Genres", category: "movies" },
  { id: "ai-models", title: "AI Model Registry", category: "ai" },
  { id: "ai-search", title: "AI Semantic Search", category: "ai" },
  { id: "ai-recommendations", title: "AI Recommendations", category: "ai" },
  { id: "ai-enrich", title: "AI Metadata Enrichment", category: "ai" },
  { id: "rights-check", title: "Rights & Playback Verification", category: "rights" },
];

export function DeveloperDocs() {
  const [activeSection, setActiveSection] = useState("quickstart");
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const filteredSections = SECTIONS.filter((s) =>
    s.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#08060f] text-white">
      <DeveloperNav activeTab="documentation" />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Navigation Sidebar (3 cols) */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="sticky top-24 rounded-2xl border border-white/10 bg-[#110c22]/70 p-4 backdrop-blur-md">
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-3 text-white/40" />
                <input
                  type="text"
                  placeholder="Filter documentation..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="font-bold text-[10px] uppercase tracking-wider text-white/40 mb-2">
                    Overview
                  </div>
                  <div className="space-y-1">
                    {filteredSections
                      .filter((s) => s.category === "overview")
                      .map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setActiveSection(s.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition font-semibold",
                            activeSection === s.id
                              ? "bg-purple-600/30 text-purple-200 border border-purple-500/30"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <span>{s.title}</span>
                          {activeSection === s.id && <ChevronRight size={12} />}
                        </button>
                      ))}
                  </div>
                </div>

                <div>
                  <div className="font-bold text-[10px] uppercase tracking-wider text-white/40 mb-2">
                    Movies & Categories API
                  </div>
                  <div className="space-y-1">
                    {filteredSections
                      .filter((s) => s.category === "movies")
                      .map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setActiveSection(s.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition font-semibold",
                            activeSection === s.id
                              ? "bg-purple-600/30 text-purple-200 border border-purple-500/30"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <span>{s.title}</span>
                          {activeSection === s.id && <ChevronRight size={12} />}
                        </button>
                      ))}
                  </div>
                </div>

                <div>
                  <div className="font-bold text-[10px] uppercase tracking-wider text-white/40 mb-2">
                    Demure AI API
                  </div>
                  <div className="space-y-1">
                    {filteredSections
                      .filter((s) => s.category === "ai")
                      .map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setActiveSection(s.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition font-semibold",
                            activeSection === s.id
                              ? "bg-pink-600/30 text-pink-200 border border-pink-500/30"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <span>{s.title}</span>
                          {activeSection === s.id && <ChevronRight size={12} />}
                        </button>
                      ))}
                  </div>
                </div>

                <div>
                  <div className="font-bold text-[10px] uppercase tracking-wider text-white/40 mb-2">
                    Rights & Compliance
                  </div>
                  <div className="space-y-1">
                    {filteredSections
                      .filter((s) => s.category === "rights")
                      .map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setActiveSection(s.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition font-semibold",
                            activeSection === s.id
                              ? "bg-emerald-600/30 text-emerald-200 border border-emerald-500/30"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <span>{s.title}</span>
                          {activeSection === s.id && <ChevronRight size={12} />}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Content Documentation Body (9 cols) */}
          <div className="lg:col-span-9 space-y-8">
            {/* Section: Quickstart */}
            <section id="quickstart" className="rounded-2xl border border-white/10 bg-[#110c22]/60 p-6">
              <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                <Hash size={18} className="text-purple-400" />
                <h2 className="text-xl font-black uppercase text-white">Getting Started & Authentication</h2>
              </div>
              <p className="mt-4 text-xs text-white/70 leading-relaxed">
                The <strong>FamilyFlix Developer Platform By DemureGram</strong> provides high-performance REST APIs
                for querying 23,000+ verified public domain movies, TV series, categorized genres, and cutting-edge Demure AI discovery models.
              </p>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/50 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="font-mono text-xs text-white/60">Base Gateway URL</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("base-url", "https://familyflix.demuregram.com/api/v1")}
                    className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300"
                  >
                    {copiedSnippet === "base-url" ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedSnippet === "base-url" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <code className="mt-2 block font-mono text-xs text-purple-300">https://familyflix.demuregram.com/api/v1</code>
              </div>

              <div className="mt-4">
                <h3 className="font-bold text-sm text-white mb-2">Bearer Authentication</h3>
                <p className="text-xs text-white/70 mb-3">
                  All requests to <code className="text-purple-300">/v1/*</code> require an API key passed in the Authorization header:
                </p>
                <pre className="rounded-xl bg-black/60 p-3 font-mono text-xs text-emerald-300 overflow-x-auto">
                  Authorization: Bearer ff_live_your_secret_api_key
                </pre>
              </div>
            </section>

            {/* Section: Rate Limits */}
            <section id="rate-limits" className="rounded-2xl border border-white/10 bg-[#110c22]/60 p-6">
              <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                <Hash size={18} className="text-purple-400" />
                <h2 className="text-xl font-black uppercase text-white">Rate Limits & Headers</h2>
              </div>
              <p className="mt-4 text-xs text-white/70 leading-relaxed">
                Every request returns rate-limit metadata in standard response headers. Exceeding your plan limit returns an <code className="text-amber-400 font-mono">HTTP 429 Too Many Requests</code> response.
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 uppercase">
                      <th className="pb-2">Header</th>
                      <th className="pb-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-white/80">
                    <tr>
                      <td className="py-2 text-purple-300">X-RateLimit-Limit</td>
                      <td className="py-2 text-white/60 font-sans">Maximum permitted requests per minute</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-purple-300">X-RateLimit-Remaining</td>
                      <td className="py-2 text-white/60 font-sans">Remaining requests in the current 60-second window</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-purple-300">X-RateLimit-Reset</td>
                      <td className="py-2 text-white/60 font-sans">Unix epoch timestamp when the current quota refreshes</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section: Movies API */}
            <section id="movies-search" className="rounded-2xl border border-white/10 bg-[#110c22]/60 p-6">
              <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                <Layers size={18} className="text-purple-400" />
                <h2 className="text-xl font-black uppercase text-white">Search & Filter Movies</h2>
              </div>
              <div className="mt-3 flex items-center gap-2 font-mono text-xs">
                <span className="rounded bg-blue-500/20 px-2 py-0.5 font-bold text-blue-300">GET</span>
                <span className="text-purple-300">/v1/movies/search</span>
              </div>
              <p className="mt-2 text-xs text-white/70">
                Search the catalog using keywords, category filters, release years, and sort algorithms.
              </p>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                  <span className="text-white/50">Example Request</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        "curl-movies",
                        `curl -X GET "https://familyflix.demuregram.com/api/v1/movies/search?q=space&genre=Sci-Fi&limit=10" \\\n  -H "Authorization: Bearer ff_live_..."`
                      )
                    }
                    className="flex items-center gap-1 text-[11px] text-purple-400"
                  >
                    {copiedSnippet === "curl-movies" ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedSnippet === "curl-movies" ? "Copied" : "Copy cURL"}</span>
                  </button>
                </div>
                <pre className="mt-2 font-mono text-xs text-white/90 overflow-x-auto">
                  {`curl -X GET "https://familyflix.demuregram.com/api/v1/movies/search?q=space&genre=Sci-Fi&limit=10" \\
  -H "Authorization: Bearer ff_live_..."`}
                </pre>
              </div>
            </section>

            {/* Section: Demure AI Semantic Discovery */}
            <section id="ai-search" className="rounded-2xl border border-pink-500/20 bg-gradient-to-b from-[#180a22]/70 to-[#0e0716]/70 p-6">
              <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                <Sparkles size={18} className="text-pink-400" />
                <h2 className="text-xl font-black uppercase text-white">Demure AI Semantic Search</h2>
              </div>
              <div className="mt-3 flex items-center gap-2 font-mono text-xs">
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-300">POST</span>
                <span className="text-pink-300">/v1/ai/search</span>
              </div>
              <p className="mt-2 text-xs text-white/70">
                Uses <strong>demure-search-v1</strong> to interpret natural language intentions, tone, eras, and plot tropes.
              </p>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-4">
                <pre className="font-mono text-xs text-pink-200 overflow-x-auto">
{`curl -X POST "https://familyflix.demuregram.com/api/v1/ai/search" \\
  -H "Authorization: Bearer ff_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "gritty 1940s film noir with a cynical detective and rainy streets",
    "limit": 5
  }'`}
                </pre>
              </div>
            </section>

            {/* Section: AI Recommendations */}
            <section id="ai-recommendations" className="rounded-2xl border border-pink-500/20 bg-gradient-to-b from-[#180a22]/70 to-[#0e0716]/70 p-6">
              <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                <Sparkles size={18} className="text-pink-400" />
                <h2 className="text-xl font-black uppercase text-white">Demure AI Recommendations</h2>
              </div>
              <div className="mt-3 flex items-center gap-2 font-mono text-xs">
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-300">POST</span>
                <span className="text-pink-300">/v1/ai/recommendations</span>
              </div>
              <p className="mt-2 text-xs text-white/70">
                Generates personalized recommendations using <strong>demure-rec-v1</strong> with repeat suppression.
              </p>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-4">
                <pre className="font-mono text-xs text-pink-200 overflow-x-auto">
{`curl -X POST "https://familyflix.demuregram.com/api/v1/ai/recommendations" \\
  -H "Authorization: Bearer ff_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "mood": "nostalgic evening",
    "seedTitles": ["Night of the Living Dead"],
    "preferredGenres": ["Horror", "Mystery"],
    "limit": 6
  }'`}
                </pre>
              </div>
            </section>

            {/* Section: Rights Verification */}
            <section id="rights-check" className="rounded-2xl border border-white/10 bg-[#110c22]/60 p-6">
              <div className="flex items-center gap-2 pb-4 border-b border-white/10">
                <ShieldCheck size={18} className="text-emerald-400" />
                <h2 className="text-xl font-black uppercase text-white">Rights & Playback Enforcement</h2>
              </div>
              <p className="mt-4 text-xs text-white/70 leading-relaxed">
                FamilyFlix strictly enforces copyright clearance and playable stream verification. Developers can inspect title eligibility
                before presenting playback targets to end users.
              </p>
              <div className="mt-3 font-mono text-xs text-white/80 space-y-1">
                <div><code className="text-blue-300 font-bold">GET</code> /v1/availability/:id</div>
                <div><code className="text-blue-300 font-bold">GET</code> /v1/rights/:id/status</div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
