import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clapperboard,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  FileSpreadsheet,
  History,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Table2,
  Upload,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TenPointVerificationResult {
  passed: boolean;
  checkedAt: string;
  checks: {
    titleExists: boolean;
    idAndSlugMatch: boolean;
    classificationMatches: boolean;
    metadataValid: boolean;
    rightsApproved: boolean;
    playbackBindingValid: boolean;
    statusPublished: boolean;
    discoverableInPublicCatalog: boolean;
    watchPageReady: boolean;
    mediaEndpointResponds: boolean;
    seriesSeasonsAndEpisodesVerified?: boolean;
  };
  details: {
    productionId: string | null;
    slug: string | null;
    kind: string | null;
    status: string | null;
    streamType: string | null;
    streamUrl: string | null;
    approvedRightsCount: number;
    verifiedSeasonsCount: number;
    verifiedEpisodesCount: number;
    watchUrl: string | null;
    detailUrl: string | null;
    playbackApiUrl: string | null;
  };
  errors: string[];
}

interface ProductionImportEpisodeLedger {
  episodeId: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  rightsId: string;
  rightsStatus: string;
  status: string;
  streamUrl: string;
}

interface ProductionImportItemResult {
  row: number;
  normalizedName: string;
  requestedSlug: string;
  kind: "movie" | "series" | "live";
  year: number | null;
  imdbCode: string | null;
  status: string;
  duplicateMatchBasis: string | null;
  existingMovieId: string | null;
  productionMovieId: string | null;
  productionSlug: string | null;
  rightsIds: string[];
  rightsReviewStatus: string;
  reviewerId: string | null;
  reviewerEmail: string | null;
  reviewedAt: string | null;
  reviewerNote: string | null;
  publishedAt: string | null;
  missingPoster: boolean;
  missingBackdrop: boolean;
  missingMediaSource: boolean;
  missingMetadataFields: string[];
  seasonsCount: number;
  episodesCount: number;
  importedEpisodes: ProductionImportEpisodeLedger[];
  warnings: string[];
  errors: string[];
  verification: TenPointVerificationResult | null;
}

interface ProductionImportMetrics {
  totalRecordsSubmitted: number;
  newTitlesDetected: number;
  existingDuplicatesSkipped: number;
  batchDuplicatesSkipped: number;
  successfullyImported: number;
  pendingRightsReview: number;
  approvedTitles: number;
  publishedTitles: number;
  verifiedLiveTitles: number;
  failedImports: number;
  missingMediaAssets: number;
  missingMetadata: number;
  tvSeasonsImported: number;
  tvEpisodesImported: number;
  playbackSourcesAwaitingApproval: number;
}

interface ProductionImportBatchRecord {
  batchIndex: number;
  rowNumbers: number[];
  payloadBytes: number;
  dryRun: boolean;
  created: number;
  updated: number;
  skipped: number;
  issues: { row: number; title: string | null; message: string }[];
  completedAt: string;
}

interface ProductionImportAuditEvent {
  timestamp: string;
  phase: string;
  actorId: string;
  actorEmail: string;
  summary: string;
}

interface ProductionImportJob {
  id: string;
  name: string;
  payloadSha256: string;
  status: string;
  updateExisting: boolean;
  createdBy: string;
  createdByEmail: string;
  metrics: ProductionImportMetrics;
  items: ProductionImportItemResult[];
  batches: ProductionImportBatchRecord[];
  auditTrail: ProductionImportAuditEvent[];
  createdAt: string;
  updatedAt: string;
}

type StudioImportTab = "batch" | "archive" | "ledger";
type PipelineStep = 1 | 2 | 3 | 4;

const EMPTY_METRICS: ProductionImportMetrics = {
  totalRecordsSubmitted: 0,
  newTitlesDetected: 0,
  existingDuplicatesSkipped: 0,
  batchDuplicatesSkipped: 0,
  successfullyImported: 0,
  pendingRightsReview: 0,
  approvedTitles: 0,
  publishedTitles: 0,
  verifiedLiveTitles: 0,
  failedImports: 0,
  missingMediaAssets: 0,
  missingMetadata: 0,
  tvSeasonsImported: 0,
  tvEpisodesImported: 0,
  playbackSourcesAwaitingApproval: 0,
};

const PIPELINE_STEPS: { id: PipelineStep; title: string; subtitle: string }[] = [
  { id: 1, title: "Upload & Validate", subtitle: "Preflight & Dry Run" },
  { id: 2, title: "Production Import", subtitle: "Insert Draft Records" },
  { id: 3, title: "Rights Review", subtitle: "Chain-of-Title Audit" },
  { id: 4, title: "Publish & Verify", subtitle: "10-Point Live Check" },
];

function semanticStatusTone(status: string): "good" | "warn" | "error" | "neutral" {
  const s = status.toLowerCase();
  if (
    s.includes("verified") ||
    s.includes("published") ||
    s.includes("approved") ||
    s === "completed"
  ) {
    return "good";
  }
  if (s.includes("failed") || s.includes("reject") || s.includes("error")) {
    return "error";
  }
  if (s.includes("pending") || s.includes("review") || s.includes("await") || s.includes("restrict")) {
    return "warn";
  }
  return "neutral";
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function CopyBadge({ value, label, truncate = 12 }: { value: string; label?: string; truncate?: number }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  const display = value.length > truncate ? `${value.slice(0, truncate)}…` : value;

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${label ?? "value"}: ${value}`}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/[0.1] bg-[#0B0D12] px-2 py-1 font-mono text-[11.5px] text-slate-300 transition hover:border-[#00D2FF]/50 hover:text-white"
    >
      {label && <span className="font-sans text-[11px] font-medium text-slate-500">{label}</span>}
      <span>{display}</span>
      {copied ? (
        <Check size={11} className="shrink-0 text-emerald-400" />
      ) : (
        <Copy size={11} className="shrink-0 text-slate-500" />
      )}
    </button>
  );
}

export function ProductionImporterDashboard({
  onCatalogUpdated,
  archiveCsvTabContent,
}: {
  onCatalogUpdated?: () => void;
  archiveCsvTabContent?: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<StudioImportTab>("batch");
  const [activeStep, setActiveStep] = useState<PipelineStep>(1);

  const [jobName, setJobName] = useState("Production Catalog Additions Batch");
  const [payloadText, setPayloadText] = useState("");
  const [jobs, setJobs] = useState<ProductionImportJob[]>([]);
  const [activeJob, setActiveJob] = useState<ProductionImportJob | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Administrator confirmation gates
  const [confirmProductionWrite, setConfirmProductionWrite] = useState(false);
  const [confirmRightsReview, setConfirmRightsReview] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<"approve" | "reject" | "restrict">("approve");
  const [reviewerNote, setReviewerNote] = useState(
    "Independently verified Library of Congress item-level public-domain rights documentation and HLS playback streams.",
  );
  const [confirmPublishLive, setConfirmPublishLive] = useState(false);

  async function fetchJobs(selectLatest = false) {
    try {
      const res = await fetch("/api/admin/production-importer/jobs", { credentials: "include" });
      if (!res.ok) return;
      const list = (await res.json()) as ProductionImportJob[];
      setJobs(list);
      if (selectLatest && list.length > 0 && !activeJob) {
        setActiveJob(list[0]!);
      } else if (activeJob) {
        const updated = list.find((j) => j.id === activeJob.id);
        if (updated) setActiveJob(updated);
      }
    } catch {
      // ignore background poll error
    }
  }

  useEffect(() => {
    void fetchJobs(true);
  }, []);

  async function loadVerifiedAdditionsPack() {
    setLoadingAction("load-starter");
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/admin/production-importer/starter-additions", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Could not load verified additions pack.");
      const data = await res.json();
      setPayloadText(JSON.stringify(data, null, 2));
      setSuccessMsg(
        `Loaded ${Array.isArray(data) ? data.length : 0} source-documented Library of Congress additions (3 movies + 1 multi-episode TV series). Run Preflight Validation to continue.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load starter additions.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleValidatePreflight() {
    if (!payloadText.trim()) {
      setErrorMsg("Load or paste a JSON array of movie/series additions first.");
      return;
    }
    setLoadingAction("preflight");
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/admin/production-importer/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: jobName,
          payload: payloadText,
          updateExisting: false,
          probeStreams: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preflight validation failed.");
      const createdJob = data as ProductionImportJob;
      setActiveJob(createdJob);
      setConfirmProductionWrite(false);
      setConfirmRightsReview(false);
      setConfirmPublishLive(false);
      await fetchJobs(false);
      setSuccessMsg(
        `Preflight complete: ${createdJob.metrics.newTitlesDetected} new eligible title(s) detected, ${createdJob.metrics.existingDuplicatesSkipped} existing duplicate(s) protected.`,
      );
      if (createdJob.metrics.newTitlesDetected > 0) {
        setActiveStep(2);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Preflight validation failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDryRun() {
    if (!activeJob) return;
    setLoadingAction("dry-run");
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/admin/production-importer/jobs/${activeJob.id}/dry-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dry run failed.");
      setActiveJob(data as ProductionImportJob);
      await fetchJobs(false);
      setSuccessMsg("Dry run succeeded across all 5MB-bounded batches with 0 database writes.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Dry run failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleProductionImport(retryFailedOnly = false) {
    if (!activeJob) return;
    if (!confirmProductionWrite) {
      setErrorMsg("Confirm administrator authorization before importing into production.");
      return;
    }
    setLoadingAction(retryFailedOnly ? "retry" : "import");
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const endpoint = retryFailedOnly
        ? `/api/admin/production-importer/jobs/${activeJob.id}/retry-failed`
        : `/api/admin/production-importer/jobs/${activeJob.id}/import`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirmedByAdmin: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Production import failed.");
      const updated = data as ProductionImportJob;
      setActiveJob(updated);
      await fetchJobs(false);
      onCatalogUpdated?.();
      setSuccessMsg(
        `Production import complete: ${updated.metrics.successfullyImported} title(s) and ${updated.metrics.tvEpisodesImported} TV episode(s) staged as draft pending rights review.`,
      );
      if (updated.metrics.successfullyImported > 0) {
        setActiveStep(3);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Production import failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReviewRights() {
    if (!activeJob) return;
    if (!confirmRightsReview) {
      setErrorMsg("Confirm the administrator rights-review attestation before submitting.");
      return;
    }
    if (!reviewerNote.trim()) {
      setErrorMsg("Enter a reviewer note documenting your rights evidence review.");
      return;
    }
    setLoadingAction("review");
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/admin/production-importer/jobs/${activeJob.id}/review-rights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          decision: reviewDecision,
          note: reviewerNote,
          confirmedByAdmin: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rights review failed.");
      const updated = data as ProductionImportJob;
      setActiveJob(updated);
      await fetchJobs(false);
      onCatalogUpdated?.();
      setSuccessMsg(
        `Rights review recorded: ${updated.metrics.approvedTitles} title(s) approved with reviewer attribution.`,
      );
      if (updated.metrics.approvedTitles > 0) {
        setActiveStep(4);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Rights review failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handlePublishAndVerify() {
    if (!activeJob) return;
    if (!confirmPublishLive) {
      setErrorMsg("Confirm live catalog publication before running publish and verification.");
      return;
    }
    setLoadingAction("publish");
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(
        `/api/admin/production-importer/jobs/${activeJob.id}/publish-and-verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ confirmedByAdmin: true }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publication and verification failed.");
      const updated = data as ProductionImportJob;
      setActiveJob(updated);
      await fetchJobs(false);
      onCatalogUpdated?.();
      setSuccessMsg(
        `Publication complete: ${updated.metrics.verifiedLiveTitles} title(s) published and passed all 10 live catalog verification checks.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Publication failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  function downloadImportReport() {
    if (!activeJob) return;
    window.open(`/api/admin/production-importer/jobs/${activeJob.id}/report`, "_blank");
  }

  const metrics = activeJob?.metrics ?? EMPTY_METRICS;

  const stepCompleted: Record<PipelineStep, boolean> = {
    1: Boolean(activeJob),
    2: metrics.successfullyImported > 0,
    3: metrics.approvedTitles > 0,
    4: metrics.verifiedLiveTitles > 0,
  };

  const activeJobTone = activeJob ? semanticStatusTone(activeJob.status) : "neutral";

  return (
    <div className="space-y-6" data-testid="panel-production-importer-dashboard">
      {/* Studio Tab Bar + Active Job Context */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#161922] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Catalog importer workspaces"
          className="flex flex-wrap items-center gap-1.5 rounded-lg bg-[#0B0D12] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "batch"}
            onClick={() => setActiveTab("batch")}
            data-testid="tab-importer-batch"
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md px-3.5 text-[13.5px] font-semibold transition",
              activeTab === "batch"
                ? "bg-[#161922] text-white shadow-[0_1px_8px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.12]"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            <Layers size={15} className={activeTab === "batch" ? "text-[#00D2FF]" : "text-slate-500"} />
            <span>JSON Batch Importer</span>
          </button>

          {archiveCsvTabContent && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "archive"}
              onClick={() => setActiveTab("archive")}
              data-testid="tab-importer-archive"
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-md px-3.5 text-[13.5px] font-semibold transition",
                activeTab === "archive"
                  ? "bg-[#161922] text-white shadow-[0_1px_8px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.12]"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              <FileSpreadsheet
                size={15}
                className={activeTab === "archive" ? "text-[#00D2FF]" : "text-slate-500"}
              />
              <span>Archive / CSV Importer</span>
            </button>
          )}

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "ledger"}
            onClick={() => setActiveTab("ledger")}
            data-testid="tab-importer-ledger"
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md px-3.5 text-[13.5px] font-semibold transition",
              activeTab === "ledger"
                ? "bg-[#161922] text-white shadow-[0_1px_8px_rgba(0,0,0,0.45)] ring-1 ring-white/[0.12]"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            <Table2 size={15} className={activeTab === "ledger" ? "text-[#00D2FF]" : "text-slate-500"} />
            <span>Job Audit Ledger</span>
            {activeJob && (
              <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                {activeJob.items.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeJob ? (
            <>
              <span
                className={cn(
                  "status",
                  activeJobTone === "good" && "good",
                  activeJobTone === "warn" && "warn",
                  activeJobTone === "error" && "error",
                )}
              >
                {formatStatusLabel(activeJob.status)}
              </span>
              <button
                type="button"
                onClick={downloadImportReport}
                className="button-secondary flex items-center gap-1.5"
                data-testid="button-download-production-report"
              >
                <Download size={14} />
                <span>Report (.json)</span>
              </button>
            </>
          ) : (
            <span className="text-[12.5px] text-slate-400">
              Additions-only protection · existing catalog locked
            </span>
          )}
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {errorMsg && (
        <div
          className="flex items-start gap-3 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-[13.5px] font-medium text-rose-200"
          role="alert"
          data-testid="status-production-importer-error"
        >
          <XCircle size={17} className="mt-0.5 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div
          className="flex items-start gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-[13.5px] font-medium text-emerald-200"
          role="status"
          data-testid="status-production-importer-success"
        >
          <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TAB 1: JSON BATCH IMPORTER */}
      {activeTab === "batch" && (
        <div className="space-y-6">
          {/* Strict CSS Grid KPI Stat Cards */}
          <div
            className="metric-grid"
            data-testid="grid-production-import-metrics"
          >
            <div className="metric">
              <span>Total submitted</span>
              <strong data-testid="metric-total-submitted">{metrics.totalRecordsSubmitted}</strong>
            </div>
            <div className="metric">
              <span>New titles detected</span>
              <strong className="text-[#00D2FF]" data-testid="metric-new-detected">
                {metrics.newTitlesDetected}
              </strong>
            </div>
            <div className="metric">
              <span>Duplicates skipped</span>
              <strong className="text-amber-400" data-testid="metric-duplicates-skipped">
                {metrics.existingDuplicatesSkipped + metrics.batchDuplicatesSkipped}
              </strong>
            </div>
            <div className="metric">
              <span>Successfully imported</span>
              <strong className="text-sky-300" data-testid="metric-successfully-imported">
                {metrics.successfullyImported}
              </strong>
            </div>
            <div className="metric">
              <span>Pending rights review</span>
              <strong className="text-amber-400" data-testid="metric-pending-review">
                {metrics.pendingRightsReview}
              </strong>
            </div>
            <div className="metric">
              <span>Approved titles</span>
              <strong className="text-emerald-400" data-testid="metric-approved-titles">
                {metrics.approvedTitles}
              </strong>
            </div>
            <div className="metric">
              <span>Published &amp; verified</span>
              <strong className="text-emerald-400" data-testid="metric-published-titles">
                {metrics.verifiedLiveTitles} / {metrics.publishedTitles}
              </strong>
            </div>
            <div className="metric">
              <span>Failed imports</span>
              <strong className="text-rose-400" data-testid="metric-failed-imports">
                {metrics.failedImports}
              </strong>
            </div>
            <div className="metric">
              <span>Missing media assets</span>
              <strong data-testid="metric-missing-media">{metrics.missingMediaAssets}</strong>
            </div>
            <div className="metric">
              <span>Missing metadata</span>
              <strong data-testid="metric-missing-metadata">{metrics.missingMetadata}</strong>
            </div>
            <div className="metric">
              <span>TV seasons / episodes</span>
              <strong className="text-[#00D2FF]" data-testid="metric-tv-seasons-episodes">
                {metrics.tvSeasonsImported}S / {metrics.tvEpisodesImported}E
              </strong>
            </div>
            <div className="metric">
              <span>Playback awaiting approval</span>
              <strong className="text-amber-400" data-testid="metric-playback-awaiting">
                {metrics.playbackSourcesAwaitingApproval}
              </strong>
            </div>
          </div>

          {/* 4-Step Horizontal Progressive Stepper */}
          <div className="panel space-y-6">
            <nav aria-label="Import pipeline steps">
              <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {PIPELINE_STEPS.map((step) => {
                  const isActive = activeStep === step.id;
                  const isDone = stepCompleted[step.id];
                  return (
                    <li key={step.id}>
                      <button
                        type="button"
                        onClick={() => setActiveStep(step.id)}
                        data-testid={`stepper-step-${step.id}`}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition",
                          isActive
                            ? "border-[#FF3B5C]/60 bg-[#FF3B5C]/[0.08] shadow-[0_0_0_1px_rgba(255,59,92,0.25)]"
                            : isDone
                              ? "border-emerald-500/30 bg-emerald-500/[0.06] hover:border-emerald-400/50"
                              : "border-white/[0.08] bg-[#0B0D12] hover:border-white/20",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-8 shrink-0 place-items-center rounded-lg text-[13px] font-bold",
                            isActive
                              ? "bg-gradient-to-br from-[#FF3B5C] to-[#E11D48] text-white"
                              : isDone
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-white/[0.06] text-slate-400",
                          )}
                        >
                          {isDone && !isActive ? <Check size={15} /> : step.id}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[13.5px] font-semibold text-white">
                            {step.title}
                          </div>
                          <div className="truncate text-[12px] text-slate-400">{step.subtitle}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>

            {/* STEP 1: UPLOAD & VALIDATE */}
            {activeStep === 1 && (
              <div className="space-y-6 border-t border-white/[0.08] pt-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[17px] font-semibold text-white">
                      Step 1 · Upload &amp; Validate Payload
                    </h3>
                    <p className="mt-1 text-[13.5px] text-slate-400">
                      Load the source-documented Library of Congress pack or upload a custom JSON batch. Existing published titles are strictly protected (
                      <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[12px] text-slate-200">
                        updateExisting: false
                      </code>
                      ).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => void loadVerifiedAdditionsPack()}
                      disabled={loadingAction !== null}
                      className="button-secondary flex items-center gap-2"
                      data-testid="button-load-verified-additions"
                    >
                      {loadingAction === "load-starter" ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Clapperboard size={15} className="text-[#00D2FF]" />
                      )}
                      <span>Load Verified Pack (4 Titles)</span>
                    </button>
                    <label className="button-secondary inline-flex cursor-pointer items-center gap-2">
                      <Upload size={15} />
                      <span>Upload JSON</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setJobName(`Import: ${file.name}`);
                            file.text().then(setPayloadText);
                          }
                        }}
                        data-testid="input-production-additions-file"
                      />
                    </label>
                  </div>
                </div>

                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="prod-job-name">Import batch label</label>
                    <input
                      id="prod-job-name"
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                      placeholder="e.g., November 2026 Public Domain Additions"
                      data-testid="input-production-job-name"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="prod-job-select">Resume existing import job</label>
                    <select
                      id="prod-job-select"
                      value={activeJob?.id ?? ""}
                      onChange={(e) => {
                        const found = jobs.find((j) => j.id === e.target.value);
                        if (found) setActiveJob(found);
                      }}
                      data-testid="select-production-import-job"
                    >
                      <option value="">Select a recent import job ({jobs.length})</option>
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.name} · {formatStatusLabel(j.status)} ({j.metrics.totalRecordsSubmitted} records)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="prod-payload-json">
                    Additions JSON payload (movies, series, seasons, episodes &amp; rights)
                  </label>
                  <textarea
                    id="prod-payload-json"
                    rows={9}
                    value={payloadText}
                    onChange={(e) => setPayloadText(e.target.value)}
                    spellCheck={false}
                    placeholder='[ { "name": "...", "kind": "movie" | "series", "rights": [...], "stream": {...}, "seasons": [...] } ]'
                    className="font-mono text-[12.5px]"
                    data-testid="textarea-production-additions-payload"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => void handleValidatePreflight()}
                      disabled={loadingAction !== null || !payloadText.trim()}
                      className="button flex items-center gap-2"
                      data-testid="button-validate-preflight"
                    >
                      {loadingAction === "preflight" ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={15} />
                      )}
                      <span>1. Validate Import (Preflight)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDryRun()}
                      disabled={loadingAction !== null || !activeJob}
                      className="button-secondary flex items-center gap-2"
                      data-testid="button-run-dry-run"
                    >
                      {loadingAction === "dry-run" ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <FileCheck2 size={15} />
                      )}
                      <span>Run Dry Run</span>
                    </button>
                  </div>

                  {activeJob && (
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="button-secondary flex items-center gap-2"
                    >
                      <span>Continue to Production Import</span>
                      <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: PRODUCTION IMPORT */}
            {activeStep === 2 && (
              <div className="space-y-6 border-t border-white/[0.08] pt-6">
                <div>
                  <h3 className="text-[17px] font-semibold text-white">
                    Step 2 · Import into Production Database
                  </h3>
                  <p className="mt-1 text-[13.5px] text-slate-400">
                    Inserts validated movies, TV series, seasons, episodes, and playback bindings as unpublished drafts pending rights review. Existing catalog titles are never overwritten.
                  </p>
                </div>

                {!activeJob ? (
                  <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-6 text-center">
                    <p className="text-[14px] text-slate-300">
                      Run Step 1 Preflight Validation or select an existing import job first.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveStep(1)}
                      className="button-secondary mt-4 inline-flex items-center gap-2"
                    >
                      <ArrowLeft size={15} />
                      <span>Return to Step 1</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-4">
                        <span className="text-[12px] font-medium text-slate-400">Eligible new titles</span>
                        <div className="mt-1.5 text-2xl font-bold text-[#00D2FF]">
                          {metrics.newTitlesDetected}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-4">
                        <span className="text-[12px] font-medium text-slate-400">Protected duplicates skipped</span>
                        <div className="mt-1.5 text-2xl font-bold text-amber-400">
                          {metrics.existingDuplicatesSkipped + metrics.batchDuplicatesSkipped}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-4">
                        <span className="text-[12px] font-medium text-slate-400">Staged in production</span>
                        <div className="mt-1.5 text-2xl font-bold text-emerald-400">
                          {metrics.successfullyImported}
                        </div>
                      </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.1] bg-[#0B0D12] p-4 text-[13.5px] text-slate-200 transition hover:border-white/20">
                      <input
                        type="checkbox"
                        checked={confirmProductionWrite}
                        onChange={(e) => setConfirmProductionWrite(e.target.checked)}
                        className="mt-1 size-4 shrink-0 accent-[#FF3B5C]"
                        data-testid="checkbox-confirm-production-import"
                      />
                      <span>
                        I confirm administrator authorization to insert{" "}
                        <strong className="text-white">{metrics.newTitlesDetected}</strong> validated addition(s) into the production database as draft records.
                      </span>
                    </label>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-5">
                      <button
                        type="button"
                        onClick={() => setActiveStep(1)}
                        className="button-secondary flex items-center gap-2"
                      >
                        <ArrowLeft size={15} />
                        <span>Back</span>
                      </button>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {metrics.failedImports > 0 && (
                          <button
                            type="button"
                            onClick={() => void handleProductionImport(true)}
                            disabled={loadingAction !== null || !confirmProductionWrite}
                            className="button-secondary flex items-center gap-2"
                            data-testid="button-retry-failed-records"
                          >
                            <RefreshCw size={14} />
                            <span>Retry Failed Only</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleProductionImport(false)}
                          disabled={
                            loadingAction !== null ||
                            !confirmProductionWrite ||
                            metrics.newTitlesDetected === 0
                          }
                          className="button flex items-center gap-2"
                          data-testid="button-execute-production-import"
                        >
                          {loadingAction === "import" ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Database size={15} />
                          )}
                          <span>Import into Production</span>
                        </button>
                        {metrics.successfullyImported > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveStep(3)}
                            className="button-secondary flex items-center gap-2"
                          >
                            <span>Continue to Rights Review</span>
                            <ArrowRight size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 3: RIGHTS REVIEW */}
            {activeStep === 3 && (
              <div className="space-y-6 border-t border-white/[0.08] pt-6">
                <div>
                  <h3 className="text-[17px] font-semibold text-white">
                    Step 3 · Chain-of-Title Rights Review
                  </h3>
                  <p className="mt-1 text-[13.5px] text-slate-400">
                    Review rights holder attribution, license URLs, and playback streams for all staged titles and episodes. Rights are never auto-approved during import.
                  </p>
                </div>

                {!activeJob || metrics.successfullyImported === 0 ? (
                  <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-6 text-center">
                    <p className="text-[14px] text-slate-300">
                      Complete Step 2 Production Import to stage records before submitting a rights decision.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="button-secondary mt-4 inline-flex items-center gap-2"
                    >
                      <ArrowLeft size={15} />
                      <span>Return to Step 2</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="field-grid">
                      <div className="field">
                        <label htmlFor="rights-decision">Review decision</label>
                        <select
                          id="rights-decision"
                          value={reviewDecision}
                          onChange={(e) =>
                            setReviewDecision(e.target.value as "approve" | "reject" | "restrict")
                          }
                          data-testid="select-production-rights-decision"
                        >
                          <option value="approve">Approve rights evidence</option>
                          <option value="restrict">Restrict</option>
                          <option value="reject">Reject</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Records awaiting decision</label>
                        <div className="flex h-10 items-center justify-between rounded-lg border border-white/[0.1] bg-[#0B0D12] px-3 text-[13.5px] text-slate-200">
                          <span>Pending review</span>
                          <strong className="text-amber-400">{metrics.pendingRightsReview}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="field">
                      <label htmlFor="rights-reviewer-note">Mandatory reviewer note</label>
                      <textarea
                        id="rights-reviewer-note"
                        rows={3}
                        value={reviewerNote}
                        onChange={(e) => setReviewerNote(e.target.value)}
                        data-testid="textarea-production-reviewer-note"
                      />
                    </div>

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.1] bg-[#0B0D12] p-4 text-[13.5px] text-slate-200 transition hover:border-white/20">
                      <input
                        type="checkbox"
                        checked={confirmRightsReview}
                        onChange={(e) => setConfirmRightsReview(e.target.checked)}
                        className="mt-1 size-4 shrink-0 accent-[#FF3B5C]"
                        data-testid="checkbox-confirm-rights-review"
                      />
                      <span>
                        I have independently reviewed the rights holder, license URL, source documentation, and usage restrictions for these titles and TV episodes.
                      </span>
                    </label>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-5">
                      <button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="button-secondary flex items-center gap-2"
                      >
                        <ArrowLeft size={15} />
                        <span>Back</span>
                      </button>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => void handleReviewRights()}
                          disabled={
                            loadingAction !== null ||
                            !confirmRightsReview ||
                            !reviewerNote.trim() ||
                            metrics.successfullyImported === 0
                          }
                          className="button flex items-center gap-2"
                          data-testid="button-execute-rights-review"
                        >
                          {loadingAction === "review" ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <ShieldCheck size={15} />
                          )}
                          <span>Record Rights Review ({reviewDecision})</span>
                        </button>
                        {metrics.approvedTitles > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveStep(4)}
                            className="button-secondary flex items-center gap-2"
                          >
                            <span>Continue to Publish &amp; Verify</span>
                            <ArrowRight size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 4: PUBLISH & VERIFY */}
            {activeStep === 4 && (
              <div className="space-y-6 border-t border-white/[0.08] pt-6">
                <div>
                  <h3 className="text-[17px] font-semibold text-white">
                    Step 4 · Publish Approved Titles &amp; Run 10-Point Verification
                  </h3>
                  <p className="mt-1 text-[13.5px] text-slate-400">
                    Publishes approved titles and TV episodes to the public FamilyFlix catalog, refreshes the O(1) catalog cache, and runs the 10-point live verification suite.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-4">
                    <span className="text-[12px] font-medium text-slate-400">Approved &amp; ready</span>
                    <div className="mt-1.5 text-2xl font-bold text-emerald-400">
                      {metrics.approvedTitles}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-4">
                    <span className="text-[12px] font-medium text-slate-400">Published titles</span>
                    <div className="mt-1.5 text-2xl font-bold text-white">
                      {metrics.publishedTitles}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-4">
                    <span className="text-[12px] font-medium text-slate-400">10/10 verified live</span>
                    <div className="mt-1.5 text-2xl font-bold text-[#00D2FF]">
                      {metrics.verifiedLiveTitles}
                    </div>
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.1] bg-[#0B0D12] p-4 text-[13.5px] text-slate-200 transition hover:border-white/20">
                  <input
                    type="checkbox"
                    checked={confirmPublishLive}
                    onChange={(e) => setConfirmPublishLive(e.target.checked)}
                    disabled={metrics.approvedTitles === 0}
                    className="mt-1 size-4 shrink-0 accent-[#FF3B5C]"
                    data-testid="checkbox-confirm-publish-live"
                  />
                  <span>
                    I confirm publication of{" "}
                    <strong className="text-white">{metrics.approvedTitles}</strong> approved title(s) and their episodes to the live FamilyFlix catalog.
                    {metrics.approvedTitles === 0 && (
                      <span className="mt-1 block text-[12.5px] text-amber-400">
                        Approve rights in Step 3 before publishing.
                      </span>
                    )}
                  </span>
                </label>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-5">
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="button-secondary flex items-center gap-2"
                  >
                    <ArrowLeft size={15} />
                    <span>Back</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => void handlePublishAndVerify()}
                      disabled={
                        loadingAction !== null ||
                        !confirmPublishLive ||
                        metrics.approvedTitles === 0
                      }
                      className="button flex items-center gap-2"
                      data-testid="button-execute-publish-verify"
                    >
                      {loadingAction === "publish" ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <BadgeCheck size={15} />
                      )}
                      <span>Publish Approved &amp; Verify Live Catalog</span>
                    </button>

                    {activeJob && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("ledger")}
                        className="button-secondary flex items-center gap-2"
                      >
                        <Table2 size={15} />
                        <span>Inspect Job Audit Ledger</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ARCHIVE / CSV IMPORTER */}
      {activeTab === "archive" && archiveCsvTabContent && (
        <div className="space-y-6" data-testid="panel-archive-csv-tab">
          {archiveCsvTabContent}
        </div>
      )}

      {/* TAB 3: JOB AUDIT LEDGER */}
      {activeTab === "ledger" && (
        <div className="space-y-6" data-testid="panel-production-job-detail">
          <div className="panel space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <h3 className="text-[17px] font-semibold text-white">
                  {activeJob ? activeJob.name : "Import-Job Detail Ledger"}
                </h3>
                {activeJob ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <CopyBadge label="Job" value={activeJob.id} truncate={12} />
                    <CopyBadge label="SHA-256" value={activeJob.payloadSha256} truncate={14} />
                    <span className="text-[12.5px] text-slate-400">
                      Created by {activeJob.createdByEmail}
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-[13.5px] text-slate-400">
                    Run a preflight validation or select an existing import job to inspect row-level results and audit events.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:flex-nowrap">
                <div className="field w-full sm:w-64">
                  <select
                    aria-label="Select import job ledger"
                    value={activeJob?.id ?? ""}
                    onChange={(e) => {
                      const found = jobs.find((j) => j.id === e.target.value);
                      if (found) setActiveJob(found);
                    }}
                  >
                    <option value="">Select import job ({jobs.length})</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.name} · {formatStatusLabel(j.status)}
                      </option>
                    ))}
                  </select>
                </div>
                {activeJob && (
                  <button
                    type="button"
                    onClick={downloadImportReport}
                    className="button-secondary flex shrink-0 items-center gap-1.5"
                  >
                    <Download size={14} />
                    <span>Export JSON</span>
                  </button>
                )}
              </div>
            </div>

            {!activeJob ? (
              <div className="rounded-xl border border-white/[0.08] bg-[#0B0D12] p-10 text-center">
                <p className="text-[14px] text-slate-300">No import job selected yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("batch")}
                  className="button mt-4 inline-flex items-center gap-2"
                >
                  <Layers size={15} />
                  <span>Open JSON Batch Importer</span>
                </button>
              </div>
            ) : (
              <>
                <div className="table-wrap rounded-xl border border-white/[0.08] bg-[#0B0D12]">
                  <table className="data-table min-w-[880px]">
                    <thead>
                      <tr>
                        <th>Row / Title</th>
                        <th>Type</th>
                        <th>Pipeline status</th>
                        <th>Production ID &amp; slug</th>
                        <th>Rights &amp; episodes</th>
                        <th>10-Point verification</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeJob.items.map((item) => {
                        const v = item.verification;
                        const statusTone = semanticStatusTone(item.status);
                        const rightsTone = semanticStatusTone(item.rightsReviewStatus);
                        return (
                          <tr key={item.row} data-testid={`row-production-import-item-${item.row}`}>
                            <td>
                              <div className="font-semibold text-white">{item.normalizedName}</div>
                              <div className="mt-0.5 text-[12px] text-slate-400">
                                Row #{item.row} · {item.year ?? "N/A"}
                                {item.imdbCode ? ` · ${item.imdbCode}` : ""}
                              </div>
                              {item.duplicateMatchBasis && (
                                <div className="mt-1 text-[12px] text-amber-400">
                                  Matched: {item.duplicateMatchBasis}
                                </div>
                              )}
                              {item.errors.length > 0 && (
                                <div className="mt-1 space-y-0.5 text-[12px] text-rose-400">
                                  {item.errors.map((err, i) => (
                                    <div key={i}>• {err}</div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td>
                              <span className="status">{item.kind}</span>
                            </td>
                            <td>
                              <span
                                className={cn(
                                  "status",
                                  statusTone === "good" && "good",
                                  statusTone === "warn" && "warn",
                                  statusTone === "error" && "error",
                                )}
                                data-testid={`status-production-item-${item.row}`}
                              >
                                {formatStatusLabel(item.status)}
                              </span>
                            </td>
                            <td>
                              {item.productionMovieId ? (
                                <div className="space-y-1">
                                  <CopyBadge value={item.productionMovieId} truncate={12} />
                                  {item.productionSlug && (
                                    <div className="font-mono text-[11.5px] text-slate-400">
                                      /{item.productionSlug}
                                    </div>
                                  )}
                                </div>
                              ) : item.existingMovieId ? (
                                <CopyBadge label="Existing" value={item.existingMovieId} truncate={10} />
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                            <td>
                              <span
                                className={cn(
                                  "status",
                                  rightsTone === "good" && "good",
                                  rightsTone === "warn" && "warn",
                                  rightsTone === "error" && "error",
                                )}
                              >
                                {formatStatusLabel(item.rightsReviewStatus)}
                              </span>
                              {item.reviewerEmail && (
                                <div className="mt-1 text-[12px] text-slate-400">
                                  {item.reviewerEmail}
                                </div>
                              )}
                              {item.kind === "series" && (
                                <div className="mt-1 text-[12px] text-[#00D2FF]">
                                  {item.seasonsCount} season(s) · {item.importedEpisodes.length || item.episodesCount} episode(s)
                                </div>
                              )}
                            </td>
                            <td>
                              {v ? (
                                <div>
                                  <span
                                    className={cn("status", v.passed ? "good" : "error")}
                                    data-testid={`badge-verification-${item.row}`}
                                  >
                                    {v.passed ? (
                                      <>
                                        <CheckCircle2 size={12} /> 10/10 Passed
                                      </>
                                    ) : (
                                      <>
                                        <XCircle size={12} /> Failed
                                      </>
                                    )}
                                  </span>
                                  <details className="mt-1.5">
                                    <summary className="cursor-pointer text-[12px] text-slate-400 hover:text-white">
                                      View checklist
                                    </summary>
                                    <ul className="mt-1.5 space-y-1 text-[11.5px] text-slate-300">
                                      {Object.entries(v.checks).map(([k, ok]) => (
                                        <li key={k} className="flex items-center gap-1.5 font-mono">
                                          {ok ? (
                                            <Check size={11} className="shrink-0 text-emerald-400" />
                                          ) : (
                                            <XCircle size={11} className="shrink-0 text-rose-400" />
                                          )}
                                          <span>{k}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </details>
                                </div>
                              ) : (
                                <span className="text-[12.5px] text-slate-500">Awaiting publication</span>
                              )}
                            </td>
                            <td>
                              {item.productionMovieId ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Link
                                    href={`/admin/library/${item.productionMovieId}`}
                                    className="inline-flex h-8 items-center rounded-md border border-white/[0.12] bg-[#161922] px-2.5 text-[12px] font-semibold text-slate-200 transition hover:border-[#00D2FF]/50 hover:text-white"
                                  >
                                    Record
                                  </Link>
                                  {item.status === "published_verified" && item.productionSlug && (
                                    <>
                                      <Link
                                        href={`/title/${item.productionSlug}`}
                                        className="inline-flex h-8 items-center gap-1 rounded-md border border-white/[0.12] bg-[#161922] px-2.5 text-[12px] font-semibold text-slate-200 transition hover:border-[#00D2FF]/50 hover:text-white"
                                        data-testid={`link-verified-detail-${item.row}`}
                                      >
                                        <span>Detail</span>
                                        <ExternalLink size={11} />
                                      </Link>
                                      <Link
                                        href={`/watch/${item.productionSlug}`}
                                        className="inline-flex h-8 items-center gap-1 rounded-md bg-[#FF3B5C] px-2.5 text-[12px] font-semibold text-white transition hover:bg-[#FF4D6D]"
                                        data-testid={`link-verified-watch-${item.row}`}
                                      >
                                        <Play size={11} fill="currentColor" />
                                        <span>Watch</span>
                                      </Link>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Audit Trail History */}
                {activeJob.auditTrail.length > 0 && (
                  <div className="space-y-3 border-t border-white/[0.08] pt-5">
                    <h4 className="flex items-center gap-2 text-[14px] font-semibold text-white">
                      <History size={15} className="text-[#00D2FF]" />
                      <span>Import Job Audit Trail</span>
                    </h4>
                    <div className="space-y-2">
                      {activeJob.auditTrail.map((ev, idx) => (
                        <div
                          key={idx}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.08] bg-[#0B0D12] px-3.5 py-2.5 text-[13px]"
                        >
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="rounded-md border border-[#00D2FF]/30 bg-[#00D2FF]/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-[#00D2FF]">
                              {ev.phase}
                            </span>
                            <span className="text-slate-200">{ev.summary}</span>
                          </div>
                          <span className="text-[12px] text-slate-400">
                            {ev.actorEmail} · {new Date(ev.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
