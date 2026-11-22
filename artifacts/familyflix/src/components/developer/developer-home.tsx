import { useState } from "react";
import { Link } from "wouter";
import {
  Code2,
  Key,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  Check,
  Zap,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Sliders,
  DollarSign,
  Copy,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function DeveloperHome() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [activeTab, setActiveTab] = useState<"curl" | "js" | "python">("curl");
  const [copied, setCopied] = useState(false);

  const codeSnippets = {
    curl: `# Search 23,000+ public domain titles
curl -X GET "https://api.familyflix.com/v1/movies/search?q=space" \\
  -H "Authorization: Bearer ff_live_your_api_key"

# AI Semantic Search
curl -X POST "https://api.familyflix.com/v1/ai/search" \\
  -H "Authorization: Bearer ff_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "90s feel-good comedy set in New York"}'`,

    js: `// FamilyFlix JavaScript / TypeScript SDK
import { FamilyFlix } from "@familyflix/sdk";

const client = new FamilyFlix({ apiKey: process.env.FAMILYFLIX_API_KEY });

// Search movies
const movies = await client.movies.list({
  genre: "Sci-Fi",
  yearMin: 1980,
  limit: 20
});

// Semantic AI Discovery
const aiRecommendations = await client.ai.recommend({
  mood: "exciting",
  seedTitles: ["Rules of the Game"]
});`,

    python: `# FamilyFlix Python SDK
from familyflix import FamilyFlixClient
import os

client = FamilyFlixClient(api_key=os.getenv("FAMILYFLIX_API_KEY"))

# Query catalog
movies = client.movies.search(
    query="adventure",
    sort="popular",
    limit=10
)

# AI Natural-Language Search
ai_results = client.ai.search(
    query="hilarious slapstick comedies from the 1970s"
)
for movie in ai_results.data:
    print(movie.title, movie.release_year)`
  };

  const copyCode = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#08060f] text-white">
      {/* Developer Hero */}
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-[#180e2b] via-[#0d0718] to-[#08060f] px-4 py-16 sm:px-6 md:px-8 lg:px-12 lg:py-24">
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[600px] rounded-full bg-purple-600/20 blur-[120px]" />
        <div aria-hidden className="pointer-events-none absolute -left-40 bottom-0 size-[500px] rounded-full bg-pink-500/15 blur-[120px]" />

        <div className="relative mx-auto max-w-[1400px]">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-600/15 px-3.5 py-1 text-xs font-bold text-purple-300 mb-6 backdrop-blur-md">
              <Sparkles size={14} className="text-amber-400" />
              <span>FamilyFlix Developer Platform By DemureGram</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-[1.05]">
              The Developer API For Public Domain Streaming & AI Discovery
            </h1>

            <p className="mt-6 text-base sm:text-lg text-white/70 leading-relaxed max-w-2xl">
              Integrate over 23,000 verified public domain and creative commons movies, television series, and episodes into your applications with production-grade APIs, sub-millisecond latencies, and state-of-the-art cinematic AI models.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/developers/dashboard"
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-purple-600/30 hover:bg-purple-500 transition hover:scale-105 active:scale-95"
              >
                <Terminal size={18} />
                <span>Open Developer Dashboard</span>
              </Link>

              <Link
                href="/developers/playground"
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3.5 text-sm font-bold text-white hover:bg-white/[0.12] transition hover:scale-105"
              >
                <Code2 size={18} />
                <span>Interactive API Playground</span>
              </Link>

              <Link
                href="/developers/docs"
                className="flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold text-white/70 hover:text-white transition"
              >
                <span>Read API Reference</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Code Snippets Preview */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 md:px-8 lg:px-12">
        <div className="rounded-3xl border border-white/15 bg-[#120e1d]/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Quickstart</span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">Start Building in Seconds</h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] p-1">
                {(["curl", "js", "python"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "rounded-lg px-3 py-1 text-xs font-bold uppercase transition",
                      activeTab === tab ? "bg-purple-600 text-white" : "text-white/60 hover:text-white"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={copyCode}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white transition"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-black/60 p-5 font-mono text-xs sm:text-sm text-purple-200 overflow-x-auto border border-white/5">
            <pre className="leading-relaxed">{codeSnippets[activeTab]}</pre>
          </div>
        </div>
      </section>

      {/* Products Showcase: Movies API & AI API */}
      <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 md:px-8 lg:px-12">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Two Independent Products</span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-black uppercase text-white">Engineered For Streaming & AI</h2>
          <p className="mt-3 text-sm sm:text-base text-white/60">
            Choose the Movies API for high-throughput metadata and catalog discovery, or the AI API for semantic embeddings and natural language reasoning.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Movies API Card */}
          <div className="flex flex-col justify-between rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-8 shadow-xl hover:border-purple-500/40 transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="grid size-12 place-items-center rounded-2xl border border-purple-500/30 bg-purple-600/20 text-purple-300">
                  <Film size={24} />
                </div>
                <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300">
                  From $19/mo
                </span>
              </div>

              <h3 className="text-2xl font-black uppercase text-white">FamilyFlix Movies & TV API</h3>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">
                Full programmatic access to 23,000+ public domain and creative commons movies, series, cast, crew, ratings, and real-time streaming availability.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-white/80">
                <li className="flex items-center gap-2"><Check size={16} className="text-emerald-400" /> 23,272 titles with verified copyright provenance</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-emerald-400" /> Movies, TV Series, Seasons, and Episode endpoints</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-emerald-400" /> All 44 main categories & 20 specialized subgenres</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-emerald-400" /> Sub-50ms global API gateway response times</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-emerald-400" /> Authorized streaming availability and rights status</li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
              <Link href="/developers/docs#movies" className="text-xs font-bold text-purple-400 hover:text-purple-300">
                View Movies API Endpoints →
              </Link>
              <Link href="/developers/billing" className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 transition">
                Subscribe
              </Link>
            </div>
          </div>

          {/* AI Intelligence API Card */}
          <div className="flex flex-col justify-between rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-8 shadow-xl hover:border-pink-500/40 transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="grid size-12 place-items-center rounded-2xl border border-pink-500/30 bg-pink-600/20 text-pink-300">
                  <Cpu size={24} />
                </div>
                <span className="rounded-full bg-pink-500/20 px-3 py-1 text-xs font-bold text-pink-300">
                  From $29/mo
                </span>
              </div>

              <h3 className="text-2xl font-black uppercase text-white">FamilyFlix AI Intelligence API</h3>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">
                State-of-the-art semantic discovery models: Demure Recommendation Engine (demure-rec-v1), Natural Language Search (demure-search-v1), and Metadata Enrichment.
              </p>

              <ul className="mt-6 space-y-2.5 text-xs text-white/80">
                <li className="flex items-center gap-2"><Check size={16} className="text-pink-400" /> Conversational queries to catalog matching</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-pink-400" /> Semantic taste-matching and mood vector affinity</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-pink-400" /> Automatic genre taxonomy & content advisory tagging</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-pink-400" /> 32,768 token context window on demure-rec-v1</li>
                <li className="flex items-center gap-2"><Check size={16} className="text-pink-400" /> Model registry with transparent token pricing</li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
              <Link href="/developers/docs#ai" className="text-xs font-bold text-pink-400 hover:text-pink-300">
                View AI Models & Registry →
              </Link>
              <Link href="/developers/billing" className="rounded-xl bg-pink-600 px-4 py-2 text-xs font-bold text-white hover:bg-pink-500 transition">
                Subscribe
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Matrix Preview */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 md:px-8 lg:px-12 border-t border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Transparent Pricing</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white">Choose Your Plan</h2>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] p-1.5">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={cn("rounded-xl px-4 py-1.5 text-xs font-bold transition", billingCycle === "monthly" ? "bg-white text-black font-extrabold" : "text-white/60 hover:text-white")}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={cn("rounded-xl px-4 py-1.5 text-xs font-bold transition flex items-center gap-1.5", billingCycle === "yearly" ? "bg-purple-600 text-white font-extrabold shadow-md shadow-purple-600/30" : "text-white/60 hover:text-white")}
            >
              <span>Yearly Billing</span>
              <span className="rounded bg-amber-400 px-1 py-0.2 text-[9px] font-black uppercase text-black">Save 17%</span>
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Starter Plan */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 shadow-lg flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-white/50">Starter</span>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{billingCycle === "monthly" ? "$19" : "$190"}</span>
                <span className="text-xs text-white/50">{billingCycle === "monthly" ? "/month" : "/year"}</span>
              </div>
              <p className="mt-2 text-xs text-white/60">Ideal for independent developers and student projects.</p>

              <ul className="mt-6 space-y-2.5 text-xs text-white/80">
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> 100,000 requests / month</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> 120 req/min rate limit</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Full 23,000+ movie & TV metadata</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Standard API key management</li>
              </ul>
            </div>

            <Link href="/developers/billing" className="mt-8 block w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-center text-xs font-bold text-white hover:bg-white/10 transition">
              Get Started
            </Link>
          </div>

          {/* Professional Plan (Popular) */}
          <div className="rounded-3xl border-2 border-purple-500 bg-purple-950/20 p-7 shadow-2xl shadow-purple-600/20 relative flex flex-col justify-between">
            <span className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
              Most Popular
            </span>
            <div>
              <span className="text-xs font-bold uppercase text-purple-300">Professional</span>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{billingCycle === "monthly" ? "$79" : "$790"}</span>
                <span className="text-xs text-white/50">{billingCycle === "monthly" ? "/month" : "/year"}</span>
              </div>
              <p className="mt-2 text-xs text-white/60">For production applications, streaming aggregators, and media hubs.</p>

              <ul className="mt-6 space-y-2.5 text-xs text-white/80">
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> 1,000,000 requests / month</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> 600 req/min high-burst rate limit</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Real-time availability & rights verification</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Webhooks & real-time catalog sync</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Priority developer support</li>
              </ul>
            </div>

            <Link href="/developers/billing" className="mt-8 block w-full rounded-xl bg-purple-600 py-2.5 text-center text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition">
              Upgrade to Professional
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 shadow-lg flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase text-white/50">Enterprise</span>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{billingCycle === "monthly" ? "$299" : "$2,990"}</span>
                <span className="text-xs text-white/50">{billingCycle === "monthly" ? "/month" : "/year"}</span>
              </div>
              <p className="mt-2 text-xs text-white/60">Custom SLAs, unlimited project keys, and dedicated support.</p>

              <ul className="mt-6 space-y-2.5 text-xs text-white/80">
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> 10,000,000 requests / month</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> 3,000 req/min ultra-burst limit</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> 99.9% Uptime Service Level Agreement</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Custom scopes & organization roles</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400" /> Dedicated technical account manager</li>
              </ul>
            </div>

            <Link href="/developers/billing" className="mt-8 block w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-center text-xs font-bold text-white hover:bg-white/10 transition">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
