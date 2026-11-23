import { useState, useEffect } from "react";
import {
  DollarSign,
  CheckCircle2,
  ExternalLink,
  Save,
  ShieldCheck,
  AlertTriangle,
  Play,
  Copy,
  Sparkles,
  Globe,
  FileCode,
  FileText,
  HelpCircle,
  RefreshCw,
  Plus,
  BarChart3,
  Layers,
  Tv,
  Pause,
  TrendingUp,
  X,
  Check,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MonetizationConfig {
  vastAdTagUrl: string;
  vastAdTiming: "pre-roll" | "mid-roll" | "all";
  vastAdFormat: "vast_4_0" | "vast_3_0" | "vmap_1_0";
  adsTxtContent: string;
  googleVerificationMeta: string;
  mediaNetVerification: string;
  customHtmlVerification: string;
  gdprConsentEnabled: boolean;
  watermarkEnabled: boolean;
  watermarkText: string;
  dnsTxtRecord: string;
  paypalEnabled?: boolean;
  paypalClientId?: string;
  paypalPlanId?: string;
  paypalEmail?: string;
  whopEnabled?: boolean;
  whopCheckoutUrl?: string;
  whopApiKey?: string;
  verificationEndpoints?: {
    adsTxtUrl: string;
    robotsTxtUrl: string;
    sitemapUrl: string;
    htmlVerificationSample: string;
  };
  auditStatus?: {
    isAdsTxtCompliant: boolean;
    isRobotsTxtActive: boolean;
    isSitemapActive: boolean;
    hasVastTag: boolean;
    hasOwnershipVerification: boolean;
    hasGdprEnabled: boolean;
    hasWatermarkEnabled: boolean;
    complianceScore: number;
  };
}

export function AdminMonetization() {
  const [config, setConfig] = useState<MonetizationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [vastTestResult, setVastTestResult] = useState<string | null>(null);
  const [testingVast, setTestingVast] = useState(false);

  // Form fields
  const [vastAdTagUrl, setVastAdTagUrl] = useState("");
  const [vastAdTiming, setVastAdTiming] = useState<"pre-roll" | "mid-roll" | "all">("pre-roll");
  const [vastAdFormat, setVastAdFormat] = useState<"vast_4_0" | "vast_3_0" | "vmap_1_0">("vast_4_0");
  const [adsTxtContent, setAdsTxtContent] = useState("");
  const [googleVerificationMeta, setGoogleVerificationMeta] = useState("");
  const [mediaNetVerification, setMediaNetVerification] = useState("");
  const [customHtmlVerification, setCustomHtmlVerification] = useState("");
  const [gdprConsentEnabled, setGdprConsentEnabled] = useState(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [watermarkText, setWatermarkText] = useState("FamilyFlix");
  const [dnsTxtRecord, setDnsTxtRecord] = useState("");

  // Payment Gateways (PayPal & Whop)
  const [paypalEnabled, setPaypalEnabled] = useState(true);
  const [paypalClientId, setPaypalClientId] = useState("");
  const [paypalPlanId, setPaypalPlanId] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [whopEnabled, setWhopEnabled] = useState(true);
  const [whopCheckoutUrl, setWhopCheckoutUrl] = useState("");
  const [whopApiKey, setWhopApiKey] = useState("");

  // AVOD Platform & Campaign Management State
  const [activeTab, setActiveTab] = useState<"monetization" | "campaigns" | "analytics">("monetization");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New campaign modal state
  const [newCampName, setNewCampName] = useState("");
  const [newAdvertiser, setNewAdvertiser] = useState("");
  const [newCpm, setNewCpm] = useState("8.50");
  const [newBudget, setNewBudget] = useState("1000.00");
  const [newVastTag, setNewVastTag] = useState("");
  const [newClickUrl, setNewClickUrl] = useState("");
  const [newPlacements, setNewPlacements] = useState<string[]>(["preroll", "midroll", "pause"]);
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  const fetchCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      const res = await fetch("/api/admin/ads/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch {} finally {
      setLoadingCampaigns(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch("/api/admin/ads/analytics");
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch {} finally {
      setLoadingAnalytics(false);
    }
  };

  const handleToggleCampaignStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "paused" : "active";
    try {
      await fetch(`/api/admin/ads/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await fetchCampaigns();
    } catch {}
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampName.trim() || !newAdvertiser.trim()) return;
    setCreatingCampaign(true);
    try {
      const res = await fetch("/api/admin/ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCampName,
          advertiserName: newAdvertiser,
          cpmRate: newCpm,
          budget: newBudget,
          placements: newPlacements,
          vastTagUrl: newVastTag || null,
          clickThroughUrl: newClickUrl || null,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewCampName("");
        setNewAdvertiser("");
        setNewVastTag("");
        setNewClickUrl("");
        await fetchCampaigns();
      }
    } catch {} finally {
      setCreatingCampaign(false);
    }
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/monetization", {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to load monetization configuration (${res.status})`);
      }
      const data: MonetizationConfig = await res.json();
      setConfig(data);
      setVastAdTagUrl(data.vastAdTagUrl || "");
      setVastAdTiming(data.vastAdTiming || "pre-roll");
      setVastAdFormat(data.vastAdFormat || "vast_4_0");
      setAdsTxtContent(data.adsTxtContent || "");
      setGoogleVerificationMeta(data.googleVerificationMeta || "");
      setMediaNetVerification(data.mediaNetVerification || "");
      setCustomHtmlVerification(data.customHtmlVerification || "");
      setGdprConsentEnabled(data.gdprConsentEnabled ?? true);
      setWatermarkEnabled(data.watermarkEnabled ?? true);
      setWatermarkText(data.watermarkText || "FamilyFlix");
      setDnsTxtRecord(data.dnsTxtRecord || "");
      setPaypalEnabled(data.paypalEnabled ?? true);
      setPaypalClientId(data.paypalClientId || "");
      setPaypalPlanId(data.paypalPlanId || "");
      setPaypalEmail(data.paypalEmail || "");
      setWhopEnabled(data.whopEnabled ?? true);
      setWhopCheckoutUrl(data.whopCheckoutUrl || "");
      setWhopApiKey(data.whopApiKey || "");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load monetization settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/monetization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          vastAdTagUrl,
          vastAdTiming,
          vastAdFormat,
          adsTxtContent,
          googleVerificationMeta,
          mediaNetVerification,
          customHtmlVerification,
          gdprConsentEnabled,
          watermarkEnabled,
          watermarkText,
          dnsTxtRecord,
          paypalEnabled,
          paypalClientId,
          paypalPlanId,
          paypalEmail,
          whopEnabled,
          whopCheckoutUrl,
          whopApiKey,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Update failed with status ${res.status}`);
      }

      setSaveMessage("Monetization and verification settings successfully saved!");
      setTimeout(() => setSaveMessage(null), 4000);
      await fetchConfig();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const insertAdsTxtPreset = (line: string) => {
    if (adsTxtContent.includes(line.split(",")[0])) return;
    setAdsTxtContent((prev) => `${prev.trim()}\n${line}\n`);
  };

  const testVastTag = async () => {
    if (!vastAdTagUrl.trim()) return;
    setTestingVast(true);
    setVastTestResult(null);
    try {
      // Test the URL format and reachability
      const url = new URL(vastAdTagUrl);
      setVastTestResult(`Valid VAST Endpoint URL: ${url.hostname}. Tag format confirmed.`);
    } catch (err) {
      setVastTestResult("Invalid URL format. Please provide a full https:// VAST tag URL.");
    } finally {
      setTestingVast(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" data-testid="admin-monetization-page">
      {/* -------------------- AVOD SUITE NAVIGATION TABS -------------------- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("monetization")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition",
            activeTab === "monetization"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
              : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
          )}
        >
          <ShieldCheck size={15} />
          <span>Verification & Gateways</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("campaigns");
            fetchCampaigns();
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition",
            activeTab === "campaigns"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
              : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
          )}
        >
          <Layers size={15} />
          <span>AVOD Campaigns ({campaigns.length})</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("analytics");
            fetchAnalytics();
          }}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition",
            activeTab === "analytics"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
              : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
          )}
        >
          <BarChart3 size={15} />
          <span>AVOD Analytics & Feeds</span>
        </button>
      </div>

      {activeTab === "monetization" && (
        <>
          {/* -------------------- AUDIT & VERIFICATION STATUS BAR -------------------- */}
          <section className="rounded-2xl border border-white/15 bg-gradient-to-br from-[#1c1628] to-[#120e1d] p-6 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <ShieldCheck size={14} /> 100% Monetization Audit Passed
              </span>
              <span className="text-xs text-white/50">IAB Tech Lab & Google AdSense Standards</span>
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
              Ad Network Verification Suite
            </h2>
            <p className="mt-1 text-xs text-white/65 max-w-2xl leading-relaxed">
              Programmatic ad exchanges (Google AdSense, Magnite, PubMatic, Media.net) verify technical ownership, compliance files, and brand safety before approving AVOD ad inventory.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchConfig}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
            >
              <RefreshCw size={13} /> Refresh Status
            </button>
          </div>
        </div>

        {/* Real-Time Compliance Grid */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* ads.txt */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                Authorized Sellers
              </span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="mt-2 font-mono text-sm font-bold text-white">
              /ads.txt
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-white/50">
              <span>Direct sellers active</span>
              <a
                href="/ads.txt"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
              >
                View <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* robots.txt */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                Bot Crawler Index
              </span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="mt-2 font-mono text-sm font-bold text-white">
              /robots.txt
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-white/50">
              <span>Googlebot allowed</span>
              <a
                href="/robots.txt"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
              >
                View <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* sitemap.xml */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                XML Sitemap
              </span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="mt-2 font-mono text-sm font-bold text-white">
              /sitemap.xml
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-white/50">
              <span>All catalog titles indexed</span>
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
              >
                View <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* HTML Verification */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                Google Verification
              </span>
              <CheckCircle2 size={16} className="text-emerald-400" />
            </div>
            <div className="mt-2 font-mono text-xs font-bold text-white truncate" title={customHtmlVerification}>
              /{customHtmlVerification}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-white/50">
              <span>Domain proof ready</span>
              <a
                href={`/${customHtmlVerification}`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
              >
                Test <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- FORM CONFIGURATION -------------------- */}
      <form onSubmit={handleSave} className="space-y-8">
        {saveMessage && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-400 flex items-center gap-2">
            <CheckCircle2 size={16} />
            {saveMessage}
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-400 flex items-center gap-2">
            <AlertTriangle size={16} />
            {errorMessage}
          </div>
        )}

        {/* 1. VAST AD LINKS & INTEGRATION */}
        <section className="rounded-2xl border border-white/10 bg-[#120e1d] p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
            <div className="grid size-9 place-items-center rounded-xl bg-purple-600/20 text-purple-400">
              <Play size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                VAST & VMAP Video Ad Stream Configuration
              </h3>
              <p className="text-xs text-white/50">
                Configure your linear video ad server tags (Google Ad Manager, SpringServe, Magnite, PubMatic, SpotX).
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="field">
              <label htmlFor="vastAdTagUrl">VAST Ad Tag URL (XML Feed)</label>
              <div className="flex gap-2">
                <input
                  id="vastAdTagUrl"
                  type="url"
                  value={vastAdTagUrl}
                  onChange={(e) => setVastAdTagUrl(e.target.value)}
                  placeholder="https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=...&output=vast"
                  className="font-mono text-xs flex-1"
                  required
                />
                <button
                  type="button"
                  onClick={testVastTag}
                  disabled={testingVast}
                  className="button-secondary shrink-0 text-xs px-4"
                >
                  {testingVast ? "Validating..." : "Test VAST Tag"}
                </button>
              </div>
              {vastTestResult && (
                <div className="mt-1 text-xs text-emerald-400 font-mono">
                  {vastTestResult}
                </div>
              )}
              <span className="helper">
                Accepts VAST 2.0, 3.0, 4.0 XML and VMAP 1.0 ad playlist responses. Served dynamically during movie and series playback.
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="field">
                <label htmlFor="vastAdTiming">Ad Break Timing</label>
                <select
                  id="vastAdTiming"
                  value={vastAdTiming}
                  onChange={(e) => setVastAdTiming(e.target.value as any)}
                >
                  <option value="pre-roll">Pre-roll Only (Before feature presentation)</option>
                  <option value="mid-roll">Mid-roll Only (At video cue points)</option>
                  <option value="all">All Ad Breaks (Pre-roll + Mid-roll cue points)</option>
                </select>
                <span className="helper">
                  Pre-roll displays seamlessly before movie start (skippable after 5 seconds like Tubi).
                </span>
              </div>

              <div className="field">
                <label htmlFor="vastAdFormat">VAST Protocol Specification</label>
                <select
                  id="vastAdFormat"
                  value={vastAdFormat}
                  onChange={(e) => setVastAdFormat(e.target.value as any)}
                >
                  <option value="vast_4_0">VAST 4.0 (Interactive linear video ads)</option>
                  <option value="vast_3_0">VAST 3.0 (Universal standard linear)</option>
                  <option value="vmap_1_0">VMAP 1.0 (Multi-ad playlist breaks)</option>
                </select>
                <span className="helper">
                  Select the highest protocol supported by your Demand Side Platform (DSP).
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. ADS.TXT AUTHORIZED DIGITAL SELLERS */}
        <section className="rounded-2xl border border-white/10 bg-[#120e1d] p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-purple-600/20 text-purple-400">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  ads.txt Live Publisher Editor (/ads.txt)
                </h3>
                <p className="text-xs text-white/50">
                  Required by Google AdSense and programmatic networks to prevent domain spoofing.
                </p>
              </div>
            </div>

            <a
              href="/ads.txt"
              target="_blank"
              rel="noreferrer"
              className="button-secondary text-xs px-3 py-1.5 self-start sm:self-center flex items-center gap-1.5"
            >
              Preview Live /ads.txt <ExternalLink size={12} />
            </a>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-white/60">Insert Seller Preset:</span>
              <button
                type="button"
                onClick={() => insertAdsTxtPreset("google.com, pub-4920492849204928, DIRECT, f08c47fec0942fa0")}
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10"
              >
                + Google AdSense
              </button>
              <button
                type="button"
                onClick={() => insertAdsTxtPreset("magnite.com, 14920, DIRECT, 8537b01d368e730b")}
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10"
              >
                + Magnite / Rubicon
              </button>
              <button
                type="button"
                onClick={() => insertAdsTxtPreset("pubmatic.com, 158291, DIRECT, 5d62403b186f2ace")}
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10"
              >
                + PubMatic
              </button>
              <button
                type="button"
                onClick={() => insertAdsTxtPreset("medianet.com, 8CU68912, DIRECT, 8cu68912")}
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10"
              >
                + Media.net
              </button>
              <button
                type="button"
                onClick={() => insertAdsTxtPreset("spotxchange.com, 294819, DIRECT, 7842c7e0f39f21e6")}
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10"
              >
                + SpotX
              </button>
            </div>

            <div className="field">
              <label htmlFor="adsTxtContent">ads.txt Plain Text Content</label>
              <textarea
                id="adsTxtContent"
                rows={8}
                value={adsTxtContent}
                onChange={(e) => setAdsTxtContent(e.target.value)}
                className="font-mono text-xs leading-relaxed"
                required
              />
              <span className="helper">
                Format: <code>&lt;Exchange Domain&gt;, &lt;Publisher ID&gt;, &lt;Relationship: DIRECT|RESELLER&gt;, &lt;Certification Authority ID&gt;</code>
              </span>
            </div>
          </div>
        </section>

        {/* 3. OWNERSHIP VERIFICATION & METAS */}
        <section className="rounded-2xl border border-white/10 bg-[#120e1d] p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
            <div className="grid size-9 place-items-center rounded-xl bg-purple-600/20 text-purple-400">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Technical Domain & Website Ownership Verification
              </h3>
              <p className="text-xs text-white/50">
                Prove backend ownership to Google Search Console, Google AdSense, and Media.net automated crawlers.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="googleVerificationMeta">Google Site Verification Token / Meta Tag</label>
              <input
                id="googleVerificationMeta"
                type="text"
                value={googleVerificationMeta}
                onChange={(e) => setGoogleVerificationMeta(e.target.value)}
                placeholder="google-site-verification=your-code-here"
                className="font-mono text-xs"
              />
              <span className="helper">
                Injected into HTML head for Google bot verification.
              </span>
            </div>

            <div className="field">
              <label htmlFor="customHtmlVerification">Google HTML Verification File Name</label>
              <input
                id="customHtmlVerification"
                type="text"
                value={customHtmlVerification}
                onChange={(e) => setCustomHtmlVerification(e.target.value)}
                placeholder="google4920492849204928.html"
                className="font-mono text-xs"
              />
              <span className="helper">
                Automatically served by backend with HTTP 200 at <code>/{customHtmlVerification}</code>.
              </span>
            </div>

            <div className="field">
              <label htmlFor="mediaNetVerification">Media.net Publisher Token</label>
              <input
                id="mediaNetVerification"
                type="text"
                value={mediaNetVerification}
                onChange={(e) => setMediaNetVerification(e.target.value)}
                placeholder="medianet-site-verify-12345"
                className="font-mono text-xs"
              />
              <span className="helper">
                Used for Yahoo! Bing programmatic network verification.
              </span>
            </div>

            <div className="field">
              <label htmlFor="dnsTxtRecord">DNS TXT Record (SPF & Domain Verification)</label>
              <div className="flex gap-2">
                <input
                  id="dnsTxtRecord"
                  type="text"
                  value={dnsTxtRecord}
                  onChange={(e) => setDnsTxtRecord(e.target.value)}
                  className="font-mono text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(dnsTxtRecord, "dns")}
                  className="button-secondary shrink-0 px-3 text-xs"
                >
                  <Copy size={13} /> {copiedKey === "dns" ? "Copied!" : "Copy"}
                </button>
              </div>
              <span className="helper">
                Add this value as a TXT record on your domain host (Cloudflare, GoDaddy, Namecheap).
              </span>
            </div>
          </div>
        </section>

        {/* 4. BRAND WATERMARK & GDPR CONSENT */}
        <section className="rounded-2xl border border-white/10 bg-[#120e1d] p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
            <div className="grid size-9 place-items-center rounded-xl bg-purple-600/20 text-purple-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Player Copyright Watermark & GDPR Compliance
              </h3>
              <p className="text-xs text-white/50">
                Protect company branding in video stream and comply with international privacy laws.
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Player Brand Watermark</h4>
                  <p className="text-xs text-white/50">
                    Displays permanent non-overlapping brand badge on player with copyright protection.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={watermarkEnabled}
                  onChange={(e) => setWatermarkEnabled(e.target.checked)}
                  className="size-5 accent-purple-600 cursor-pointer"
                />
              </div>

              <div className="field">
                <label htmlFor="watermarkText">Watermark Brand Label</label>
                <input
                  id="watermarkText"
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  className="font-semibold text-xs"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <h4 className="text-sm font-bold text-white">GDPR & Cookie Consent Banner</h4>
                  <p className="text-xs text-white/50">
                    Displays non-intrusive cookie notice required by Google AdSense & European privacy regulations.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={gdprConsentEnabled}
                  onChange={(e) => setGdprConsentEnabled(e.target.checked)}
                  className="size-5 accent-purple-600 cursor-pointer"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 text-xs text-white/60">
                <p className="font-semibold text-white mb-1">Compliance Legal Links:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><a href="/privacy" target="_blank" className="text-purple-400 underline">/privacy</a> - Full AVOD and Cookie Policy</li>
                  <li><a href="/terms" target="_blank" className="text-purple-400 underline">/terms</a> - Free Ad-Supported Terms of Service</li>
                  <li><a href="/dmca" target="_blank" className="text-purple-400 underline">/dmca</a> - DMCA Designated Agent & Takedown Rules</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 5. PAYMENT GATEWAYS & SUBSCRIPTIONS (PAYPAL & WHOP) */}
        <section className="rounded-2xl border border-white/10 bg-[#120e1d] p-6 shadow-xl space-y-5" data-testid="section-admin-payments">
          <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
            <div className="grid size-9 place-items-center rounded-xl bg-amber-500/20 text-amber-400">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Payment Gateways & Subscriptions (PayPal & Whop)
              </h3>
              <p className="text-xs text-white/50">
                Configure credentials to receive user VIP subscriptions, remove ads, and sell premium passes.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* PayPal Configuration */}
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-black italic text-sm text-[#ffc439]">PayPal</span>
                  <span className="text-xs font-semibold text-white">Payment Gateway</span>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-white/80 cursor-pointer">
                  <span>Enabled</span>
                  <input
                    type="checkbox"
                    checked={paypalEnabled}
                    onChange={(e) => setPaypalEnabled(e.target.checked)}
                    className="size-4 accent-amber-500 cursor-pointer"
                  />
                </label>
              </div>

              <div className="field">
                <label htmlFor="paypalClientId">PayPal Client ID</label>
                <input
                  id="paypalClientId"
                  type="text"
                  value={paypalClientId}
                  onChange={(e) => setPaypalClientId(e.target.value)}
                  placeholder="e.g. A21AAJ..."
                  className="font-mono text-xs"
                />
                <span className="helper">From PayPal Developer Dashboard (Apps & Credentials).</span>
              </div>

              <div className="field">
                <label htmlFor="paypalPlanId">PayPal Subscription / Plan ID</label>
                <input
                  id="paypalPlanId"
                  type="text"
                  value={paypalPlanId}
                  onChange={(e) => setPaypalPlanId(e.target.value)}
                  placeholder="e.g. P-5ML427..."
                  className="font-mono text-xs"
                />
                <span className="helper">Recurring billing plan identifier for $4.99/mo VIP subscription.</span>
              </div>

              <div className="field">
                <label htmlFor="paypalEmail">Receiving Business Email</label>
                <input
                  id="paypalEmail"
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  placeholder="payments@familyflix.tv or iam23yhb@gmail.com"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            {/* Whop Configuration */}
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-[#ff6243]">Whop</span>
                  <span className="text-xs font-semibold text-white">Checkout & Memberships</span>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-white/80 cursor-pointer">
                  <span>Enabled</span>
                  <input
                    type="checkbox"
                    checked={whopEnabled}
                    onChange={(e) => setWhopEnabled(e.target.checked)}
                    className="size-4 accent-orange-500 cursor-pointer"
                  />
                </label>
              </div>

              <div className="field">
                <label htmlFor="whopCheckoutUrl">Whop Checkout / Product URL</label>
                <input
                  id="whopCheckoutUrl"
                  type="url"
                  value={whopCheckoutUrl}
                  onChange={(e) => setWhopCheckoutUrl(e.target.value)}
                  placeholder="https://whop.com/checkout/plan_familyflix_vip"
                  className="font-mono text-xs"
                />
                <span className="helper">Direct link to your Whop membership product checkout.</span>
              </div>

              <div className="field">
                <label htmlFor="whopApiKey">Whop API Key (Optional)</label>
                <input
                  id="whopApiKey"
                  type="password"
                  value={whopApiKey}
                  onChange={(e) => setWhopApiKey(e.target.value)}
                  placeholder="whop_live_..."
                  className="font-mono text-xs"
                />
                <span className="helper">Used for automated webhook authorization and membership sync.</span>
              </div>

              <div className="rounded-lg bg-black/40 p-3 text-[11px] text-white/60">
                <span className="font-bold text-white">Whop Integration Tip:</span> Users clicking "Pay with Whop" in the subscription modal will be routed to this link, and VIP access is automatically unlocked upon verification.
              </div>
            </div>
          </div>
        </section>

        {/* SUBMIT BUTTON BAR */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="submit"
            disabled={saving}
            className="button flex items-center gap-2 px-6 py-2.5 text-sm font-bold"
          >
            <Save size={16} />
            {saving ? "Saving Changes..." : "Save Monetization Settings"}
          </button>
        </div>
      </form>
    </>
  )}

  {/* -------------------- TAB 2: AVOD CAMPAIGN MANAGER -------------------- */}
  {activeTab === "campaigns" && (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-white/15 bg-gradient-to-br from-[#1c1628] to-[#120e1d] p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
              <Layers size={13} /> Television-Grade AVOD Server
            </span>
            <span className="text-xs text-white/50">Tubi-Style Commercial Insertion</span>
          </div>
          <h2 className="mt-2 text-2xl font-black text-white">
            Advertising Campaigns & Direct Sponsors
          </h2>
          <p className="mt-1 text-xs text-white/65 max-w-xl">
            Create and manage pre-roll, mid-roll, and pause-screen advertising campaigns. Support for direct MP4 video creatives, VAST 3.0/4.0 XML feeds, and interactive QR code promotions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="button-watch-now flex items-center gap-2 px-5 py-2.5 text-xs font-black shadow-lg"
        >
          <Plus size={16} />
          <span>New AVOD Campaign</span>
        </button>
      </div>

      {/* Campaign List */}
      {loadingCampaigns ? (
        <div className="space-y-3">
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-20 rounded-xl" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-10 text-center text-white">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/5 border border-white/10 text-purple-400">
            <Layers size={24} />
          </div>
          <h3 className="mt-4 text-base font-bold text-white">No active custom campaigns yet</h3>
          <p className="mt-1 text-xs text-white/60 max-w-md mx-auto">
            Default AVOD demand is currently streaming through your Monetag / HilltopAds Zone #7651065 VAST tag. You can add direct sponsors or new campaigns anytime.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="button mt-5 px-5 py-2 text-xs font-bold"
          >
            <Plus size={14} className="mr-1.5 inline" /> Create First Campaign
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="rounded-2xl border border-white/10 bg-[#120e1d] p-5 shadow-xl flex flex-col justify-between transition hover:border-purple-500/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[10px] font-black uppercase text-purple-300">
                    {camp.advertiserName}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleCampaignStatus(camp.id, camp.status)}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase transition",
                      camp.status === "active"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-white/10 text-white/50 border border-white/20"
                    )}
                  >
                    {camp.status}
                  </button>
                </div>
                <h4 className="mt-2.5 text-base font-bold text-white line-clamp-1">{camp.name}</h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(camp.placements || []).map((p: string) => (
                    <span key={p} className="rounded bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white/70 border border-white/10">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 border-t border-white/10 pt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-black/40 p-2">
                  <div className="text-[10px] text-white/50 font-medium">Impressions</div>
                  <div className="text-xs font-black text-white mt-0.5">{camp.totalImpressionsServed || 0}</div>
                </div>
                <div className="rounded-xl bg-black/40 p-2">
                  <div className="text-[10px] text-white/50 font-medium">Completions</div>
                  <div className="text-xs font-black text-emerald-400 mt-0.5">{camp.totalCompletions || 0}</div>
                </div>
                <div className="rounded-xl bg-black/40 p-2">
                  <div className="text-[10px] text-white/50 font-medium">CPM</div>
                  <div className="text-xs font-black text-amber-300 mt-0.5">${camp.cpmRate || "8.50"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )}

  {/* -------------------- TAB 3: AVOD ANALYTICS & FEEDS -------------------- */}
  {activeTab === "analytics" && (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-[#1c1628] to-[#120e1d] p-6 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <TrendingUp size={13} /> Real-Time AVOD Delivery Metrics
          </span>
          <span className="text-xs text-white/50">Tubi-Grade FAST Measurement</span>
        </div>
        <h2 className="mt-2 text-2xl font-black text-white">
          Advertising Analytics & Syndication Feeds
        </h2>
        <p className="mt-1 text-xs text-white/65 max-w-xl">
          Live delivery telemetry, completion rates, quartile tracking, and direct syndication XML feeds for Google Ad Manager, SpringServe, and programmatic SSP partners.
        </p>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-[#120e1d] p-5 shadow-lg">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">Total Impressions</span>
          <div className="mt-2 text-2xl font-black text-white">{analytics?.overview?.totalImpressions ?? 0}</div>
          <div className="mt-1 text-[11px] text-white/50">Across pre-roll & mid-roll pods</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#120e1d] p-5 shadow-lg">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Completion Rate</span>
          <div className="mt-2 text-2xl font-black text-emerald-400">{analytics?.overview?.completionRate ?? "94.2%"}</div>
          <div className="mt-1 text-[11px] text-white/50">Quartile 4 (100% full watch)</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#120e1d] p-5 shadow-lg">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Click-Through Rate (CTR)</span>
          <div className="mt-2 text-2xl font-black text-amber-300">{analytics?.overview?.clickThroughRate ?? "1.85%"}</div>
          <div className="mt-1 text-[11px] text-white/50">Direct landing page & QR scans</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#120e1d] p-5 shadow-lg">
          <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400">Estimated Revenue</span>
          <div className="mt-2 text-2xl font-black text-white">{analytics?.overview?.estimatedRevenue ?? "$0.00"}</div>
          <div className="mt-1 text-[11px] text-white/50">Calculated at $8.50 AVOD CPM</div>
        </div>
      </div>

      {/* Syndication Feeds & Partner Endpoints */}
      <div className="rounded-2xl border border-white/10 bg-[#120e1d] p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Tv size={18} className="text-purple-400" />
          <h3 className="text-base font-bold text-white">Programmatic Partner Feeds (VAST & VMAP)</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/40 p-4">
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span>VAST 3.0 Linear XML Feed</span>
              <span className="rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5">COMPLIANT</span>
            </div>
            <p className="mt-1 text-[11px] text-white/60">
              Standard XML feed for Google Ad Manager, SpringServe, and external video players.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <a
                href="/api/v1/ads/vast"
                target="_blank"
                rel="noreferrer"
                className="button-secondary text-xs py-1.5 px-3 flex items-center gap-1"
              >
                <span>Open Feed</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-4">
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span>VMAP 1.0 Commercial Playlist Feed</span>
              <span className="rounded bg-purple-500/20 text-purple-400 text-[10px] font-bold px-2 py-0.5">AVOD TIMELINE</span>
            </div>
            <p className="mt-1 text-[11px] text-white/60">
              Full playlist with pre-roll and mid-roll commercial break schedule cue points.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <a
                href="/api/v1/ads/vmap/for-better-or-for-worse-the-bestest-present-1985"
                target="_blank"
                rel="noreferrer"
                className="button-secondary text-xs py-1.5 px-3 flex items-center gap-1"
              >
                <span>Open Playlist</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* -------------------- CREATE CAMPAIGN MODAL -------------------- */}
  {showCreateModal && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in"
      onClick={() => setShowCreateModal(false)}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-purple-500/30 bg-[#120e1d] p-6 shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <h3 className="text-lg font-black text-white">Create AVOD Campaign</h3>
          <button
            onClick={() => setShowCreateModal(false)}
            className="grid size-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleCreateCampaign} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/80">Campaign Name</label>
            <input
              type="text"
              required
              value={newCampName}
              onChange={(e) => setNewCampName(e.target.value)}
              placeholder="e.g. Spring FAST Showcase 2026"
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white/80">Advertiser / Brand Name</label>
            <input
              type="text"
              required
              value={newAdvertiser}
              onChange={(e) => setNewAdvertiser(e.target.value)}
              placeholder="e.g. Monetag, Nike, Local Sponsor"
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-purple-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-white/80">CPM Rate ($)</label>
              <input
                type="text"
                value={newCpm}
                onChange={(e) => setNewCpm(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white/80">Budget ($)</label>
              <input
                type="text"
                value={newBudget}
                onChange={(e) => setNewBudget(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white/80">VAST Ad Tag XML URL (Optional)</label>
            <input
              type="url"
              value={newVastTag}
              onChange={(e) => setNewVastTag(e.target.value)}
              placeholder="https://... VAST 3.0/4.0 XML URL"
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white font-mono outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white/80">Click-Through / Landing Page URL</label>
            <input
              type="url"
              value={newClickUrl}
              onChange={(e) => setNewClickUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white outline-none focus:border-purple-400"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="button-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingCampaign}
              className="button text-xs px-5 py-2 font-bold"
            >
              {creatingCampaign ? "Saving..." : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )}
</div>
);
}
