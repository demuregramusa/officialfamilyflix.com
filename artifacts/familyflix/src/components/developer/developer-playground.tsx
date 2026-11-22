import { useState } from "react";
import {
  Terminal,
  Play,
  Copy,
  Check,
  Code2,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  Key,
} from "lucide-react";
import { DeveloperNav } from "./developer-nav";
import { cn } from "@/lib/utils";

interface EndpointDef {
  id: string;
  name: string;
  method: "GET" | "POST";
  path: string;
  product: "movies_api" | "ai_api";
  description: string;
  defaultParams?: Record<string, string>;
  defaultBody?: any;
}

const ENDPOINTS: EndpointDef[] = [
  {
    id: "movies_search",
    name: "Search Movies",
    method: "GET",
    path: "/v1/movies/search",
    product: "movies_api",
    description: "Search 23,000+ public domain titles by keyword, genre, and year.",
    defaultParams: { q: "sherlock", limit: "5" },
  },
  {
    id: "movies_trending",
    name: "Trending Movies",
    method: "GET",
    path: "/v1/movies/trending",
    product: "movies_api",
    description: "Retrieve titles currently trending across active streaming audiences.",
    defaultParams: { limit: "5" },
  },
  {
    id: "movies_popular",
    name: "Popular Movies",
    method: "GET",
    path: "/v1/movies/popular",
    product: "movies_api",
    description: "Most played public domain classics and crowd favorites.",
    defaultParams: { limit: "5" },
  },
  {
    id: "categories_list",
    name: "All 44 Categories",
    method: "GET",
    path: "/v1/categories",
    product: "movies_api",
    description: "Get all 44 Tubi-inspired main categories with title counts.",
  },
  {
    id: "tv_list",
    name: "List TV Shows",
    method: "GET",
    path: "/v1/tv",
    product: "movies_api",
    description: "List multi-episode series and docuseries.",
    defaultParams: { limit: "5" },
  },
  {
    id: "ai_models",
    name: "AI Models Registry",
    method: "GET",
    path: "/v1/ai/models",
    product: "ai_api",
    description: "List active Demure AI models and their capabilities.",
  },
  {
    id: "ai_search",
    name: "AI Semantic Search",
    method: "POST",
    path: "/v1/ai/search",
    product: "ai_api",
    description: "Natural-language semantic movie discovery with intent understanding.",
    defaultBody: {
      query: "hilarious fast-paced slapstick comedy set in the 1920s",
      limit: 5,
    },
  },
  {
    id: "ai_recommendations",
    name: "AI Recommendations",
    method: "POST",
    path: "/v1/ai/recommendations",
    product: "ai_api",
    description: "Generate tailored recommendations from mood, seed titles, or genres.",
    defaultBody: {
      mood: "nostalgic and adventurous",
      preferredGenres: ["Adventure", "Classics"],
      limit: 5,
    },
  },
  {
    id: "ai_enrich",
    name: "AI Metadata Enrichment",
    method: "POST",
    path: "/v1/ai/metadata/enrich",
    product: "ai_api",
    description: "Extract thematic tags, mood tone, and age rating rationale.",
    defaultBody: {
      title: "Night of the Living Dead",
      synopsis: "A ragtag group of Pennsylvanians barricade themselves in an old farmhouse to remain safe from a bloodthirsty, flesh-eating breed of monsters.",
    },
  },
];

export function DeveloperPlayground() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef>(ENDPOINTS[0]);
  const [apiKey, setApiKey] = useState("ff_live_84ab9fda6d4988e2020c9b44876d9f895f949f250a5b2970");
  const [queryParams, setQueryParams] = useState<Record<string, string>>(ENDPOINTS[0].defaultParams || {});
  const [requestBody, setRequestBody] = useState<string>(
    ENDPOINTS[0].defaultBody ? JSON.stringify(ENDPOINTS[0].defaultBody, null, 2) : ""
  );

  const [loading, setLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [responseData, setResponseData] = useState<any>(null);
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [codeTab, setCodeTab] = useState<"curl" | "js" | "python">("curl");

  const handleSelectEndpoint = (ep: EndpointDef) => {
    setSelectedEndpoint(ep);
    setQueryParams(ep.defaultParams || {});
    setRequestBody(ep.defaultBody ? JSON.stringify(ep.defaultBody, null, 2) : "");
    setResponseData(null);
    setResponseStatus(null);
    setLatency(null);
  };

  const handleRunRequest = async () => {
    setLoading(true);
    setResponseData(null);
    setResponseStatus(null);
    const start = performance.now();

    try {
      const url = new URL(selectedEndpoint.path, window.location.origin);
      if (selectedEndpoint.method === "GET") {
        Object.entries(queryParams).forEach(([k, v]) => {
          if (v) url.searchParams.set(k, v);
        });
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey.trim()}`,
      };
      if (selectedEndpoint.method === "POST") {
        headers["Content-Type"] = "application/json";
      }

      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers,
      };

      if (selectedEndpoint.method === "POST" && requestBody) {
        options.body = requestBody;
      }

      const res = await fetch(url.toString(), options);
      const elapsed = Math.round(performance.now() - start);
      setLatency(elapsed);
      setResponseStatus(res.status);

      const rHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        if (k.startsWith("x-ratelimit-") || k === "content-type") {
          rHeaders[k] = v;
        }
      });
      setResponseHeaders(rHeaders);

      const data = await res.json();
      setResponseData(data);
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start);
      setLatency(elapsed);
      setResponseStatus(500);
      setResponseData({ error: err.message || "Network Error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (!responseData) return;
    navigator.clipboard.writeText(JSON.stringify(responseData, null, 2));
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  // Generate code snippet
  const fullUrl = (() => {
    const u = new URL(selectedEndpoint.path, "https://api.familyflix.com");
    if (selectedEndpoint.method === "GET") {
      Object.entries(queryParams).forEach(([k, v]) => {
        if (v) u.searchParams.set(k, v);
      });
    }
    return u.toString();
  })();

  const generateSnippet = (type: "curl" | "js" | "python") => {
    if (type === "curl") {
      if (selectedEndpoint.method === "GET") {
        return `curl -X GET "${fullUrl}" \\\n  -H "Authorization: Bearer ${apiKey}"`;
      }
      return `curl -X POST "${fullUrl}" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody.replace(/'/g, "'\\''")}'`;
    }
    if (type === "js") {
      if (selectedEndpoint.method === "GET") {
        return `const res = await fetch("${fullUrl}", {\n  headers: {\n    "Authorization": "Bearer ${apiKey}"\n  }\n});\nconst data = await res.json();\nconsole.log(data);`;
      }
      return `const res = await fetch("${fullUrl}", {\n  method: "POST",\n  headers: {\n    "Authorization": "Bearer ${apiKey}",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify(${requestBody || "{}"})\n});\nconst data = await res.json();\nconsole.log(data);`;
    }
    if (type === "python") {
      if (selectedEndpoint.method === "GET") {
        return `import requests\n\nurl = "${fullUrl}"\nheaders = {"Authorization": "Bearer ${apiKey}"}\nresponse = requests.get(url, headers=headers)\nprint(response.json())`;
      }
      return `import requests\n\nurl = "${fullUrl}"\nheaders = {\n    "Authorization": "Bearer ${apiKey}",\n    "Content-Type": "application/json"\n}\npayload = ${requestBody || "{}"}\nresponse = requests.post(url, headers=headers, json=payload)\nprint(response.json())`;
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-[#08060f] text-white">
      <DeveloperNav activeTab="playground" />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="pb-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Terminal size={24} className="text-purple-400" />
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              API Playground & Console
            </h1>
          </div>
          <p className="mt-1 text-sm text-white/60">
            Execute real-time requests against public streaming and Demure AI endpoints with live metering.
          </p>
        </div>

        {/* API Key Bar */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-2xl border border-white/10 bg-[#110c22]/70 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/70 shrink-0">
            <Key size={14} className="text-amber-400" />
            <span>API Secret Key:</span>
          </div>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="ff_live_... or ff_test_..."
            className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-purple-300 placeholder-white/30 focus:border-purple-500 focus:outline-none"
          />
          <span className="text-[11px] text-white/40 shrink-0 hidden lg:inline">
            Bearer authentication required
          </span>
        </div>

        {/* Main Console Grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Endpoint Picker & Input (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#110c22]/60 p-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                Select API Endpoint
              </label>
              <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                {ENDPOINTS.map((ep) => {
                  const isSelected = ep.id === selectedEndpoint.id;
                  return (
                    <button
                      key={ep.id}
                      type="button"
                      onClick={() => handleSelectEndpoint(ep)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border p-2.5 text-left transition",
                        isSelected
                          ? "border-purple-500/60 bg-purple-600/20 text-white"
                          : "border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                            ep.method === "GET"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          )}
                        >
                          {ep.method}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white">{ep.name}</div>
                          <div className="text-[10px] font-mono text-white/40">{ep.path}</div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                          ep.product === "ai_api"
                            ? "bg-pink-500/20 text-pink-300"
                            : "bg-purple-500/20 text-purple-300"
                        )}
                      >
                        {ep.product === "ai_api" ? "AI" : "Movies"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Endpoint Description */}
              <div className="mt-4 rounded-xl border border-white/5 bg-black/30 p-3 text-xs text-white/60">
                <p className="font-semibold text-white/80">{selectedEndpoint.description}</p>
              </div>

              {/* Parameters / Request Body Editor */}
              {selectedEndpoint.method === "GET" ? (
                <div className="mt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                    Query Parameters
                  </label>
                  <div className="space-y-2">
                    {Object.entries(queryParams).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="w-20 font-mono text-xs text-white/60 text-right">{k}:</span>
                        <input
                          type="text"
                          value={v}
                          onChange={(e) =>
                            setQueryParams((prev) => ({ ...prev, [k]: e.target.value }))
                          }
                          className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-xs text-white focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                    JSON Request Body
                  </label>
                  <textarea
                    rows={6}
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs text-emerald-300 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Execute Action */}
              <button
                type="button"
                onClick={handleRunRequest}
                disabled={loading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 text-xs font-bold text-white shadow-lg hover:brightness-110 transition disabled:opacity-50"
              >
                <Play size={14} className={cn(loading && "animate-spin")} />
                <span>{loading ? "Calling API Gateway..." : "Send Request"}</span>
              </button>
            </div>

            {/* Code Generator Card */}
            <div className="rounded-2xl border border-white/10 bg-[#110c22]/60 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                  Export Code
                </span>
                <div className="flex gap-1">
                  {(["curl", "js", "python"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setCodeTab(tab)}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase transition",
                        codeTab === tab
                          ? "bg-purple-600 text-white"
                          : "text-white/50 hover:text-white"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-black/50 p-3 font-mono text-[11px] text-white/80 select-all">
                {generateSnippet(codeTab)}
              </pre>
            </div>
          </div>

          {/* Right: Response Inspector (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="h-full rounded-2xl border border-white/10 bg-[#110c22]/60 p-5 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-sm text-white">Response Output</h3>
                  {responseStatus !== null && (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-bold",
                        responseStatus < 300
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      )}
                    >
                      {responseStatus} {responseStatus === 200 ? "OK" : "Error"}
                    </span>
                  )}
                  {latency !== null && (
                    <span className="flex items-center gap-1 text-xs font-mono text-white/50">
                      <Clock size={12} />
                      <span>{latency}ms</span>
                    </span>
                  )}
                </div>

                {responseData && (
                  <button
                    type="button"
                    onClick={handleCopyResponse}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 hover:bg-white/10"
                  >
                    {copiedResponse ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedResponse ? "Copied" : "Copy JSON"}</span>
                  </button>
                )}
              </div>

              {/* Gateway Rate Limit Headers */}
              {Object.keys(responseHeaders).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-mono text-white/60 bg-black/30 p-2 rounded-lg border border-white/5">
                  {Object.entries(responseHeaders).map(([k, v]) => (
                    <span key={k} className="bg-white/5 px-2 py-0.5 rounded">
                      <strong className="text-purple-300">{k}:</strong> {v}
                    </span>
                  ))}
                </div>
              )}

              {/* JSON Output Viewer */}
              <div className="mt-4 flex-1 min-h-[420px] rounded-xl border border-white/10 bg-[#07050d] p-4 font-mono text-xs overflow-auto">
                {responseData ? (
                  <pre className="text-purple-200 select-all leading-relaxed">
                    {JSON.stringify(responseData, null, 2)}
                  </pre>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-white/40">
                    <Terminal size={36} className="mb-2 text-white/20" />
                    <p className="font-semibold text-sm">No response yet</p>
                    <p className="text-xs max-w-sm mt-1 text-white/30">
                      Select an endpoint on the left, verify your API key, and hit "Send Request" to preview live response data.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
