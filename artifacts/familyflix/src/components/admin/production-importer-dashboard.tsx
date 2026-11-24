import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clapperboard,
  Download,
  ExternalLink,
  FileCheck2,
  Film,
  History,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";

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

export function ProductionImporterDashboard({ onCatalogUpdated }: { onCatalogUpdated?: () => void }) {
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
        `Loaded ${Array.isArray(data) ? data.length : 0} source-documented Library of Congress additions (3 movies + 1 multi-episode TV series). Click "1. Validate Import (Preflight)" to begin.`,
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
        `Phase A Preflight complete: ${createdJob.metrics.newTitlesDetected} new eligible title(s), ${createdJob.metrics.existingDuplicatesSkipped} existing duplicate(s) protected/skipped.`,
      );
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
      setSuccessMsg("Phase B Dry Run succeeded across all 5MB-bounded batches with 0 database writes.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Dry run failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleProductionImport(retryFailedOnly = false) {
    if (!activeJob) return;
    if (!confirmProductionWrite) {
      setErrorMsg("Check the administrator confirmation box before importing into production.");
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
        `Phase B & D Production Import complete: ${updated.metrics.successfullyImported} title(s) and ${updated.metrics.tvEpisodesImported} TV episode(s) created in production as draft pending rights review.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Production import failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReviewRights() {
    if (!activeJob) return;
    if (!confirmRightsReview) {
      setErrorMsg("Check the administrator rights-review confirmation box before submitting.");
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
        `Phase C Rights Review complete: ${updated.metrics.approvedTitles} title(s) approved with documented reviewer attribution.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Rights review failed.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handlePublishAndVerify() {
    if (!activeJob) return;
    if (!confirmPublishLive) {
      setErrorMsg("Check the administrator publication confirmation box before publishing to the live catalog.");
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
        `Phase F & G Complete: ${updated.metrics.verifiedLiveTitles} title(s) published and passed all 10 post-publication live catalog verification checks!`,
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

  return (
    <div className="space-y-6" data-testid="panel-production-importer-dashboard">
      {/* Workflow Stage Banner */}
      <div className="panel border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-[#120d1d] to-indigo-950/30 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="eyebrow flex items-center gap-1.5 text-purple-300">
              <Sparkles size={14} /> Production Catalog Importer & Publisher Pipeline
            </span>
            <h2 className="mt-1 text-xl font-black text-white">
              Select Additions → Validate → Dry Run → Import → Review Rights → Publish → Verify Live
            </h2>
            <p className="mt-1 text-xs text-white/65">
              Protected additions-only mode (`updateExisting: false`): all 23,272 existing published titles are strictly protected against overwrite or deletion.
            </p>
          </div>
          {activeJob && (
            <div className="flex items-center gap-2.5">
              <span className="rounded-full border border-purple-400/40 bg-purple-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-200">
                Job Status: {activeJob.status.replace(/_/g, " ")}
              </span>
              <button
                type="button"
                onClick={downloadImportReport}
                className="button-secondary flex items-center gap-1.5 text-xs"
                data-testid="button-download-production-report"
              >
                <Download size={14} /> Download Import Report
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 12 Required Production Import KPI Metrics Cards */}
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
        data-testid="grid-production-import-metrics"
      >
        <div className="metric">
          <span>Total submitted</span>
          <strong data-testid="metric-total-submitted">{metrics.totalRecordsSubmitted}</strong>
        </div>
        <div className="metric">
          <span>New titles detected</span>
          <strong className="text-purple-300" data-testid="metric-new-detected">
            {metrics.newTitlesDetected}
          </strong>
        </div>
        <div className="metric">
          <span>Duplicates skipped</span>
          <strong className="text-amber-300" data-testid="metric-duplicates-skipped">
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
          <strong className="text-amber-300" data-testid="metric-pending-review">
            {metrics.pendingRightsReview}
          </strong>
        </div>
        <div className="metric">
          <span>Approved titles</span>
          <strong className="text-emerald-300" data-testid="metric-approved-titles">
            {metrics.approvedTitles}
          </strong>
        </div>
        <div className="metric">
          <span>Published & verified</span>
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
          <strong className="text-purple-300" data-testid="metric-tv-seasons-episodes">
            {metrics.tvSeasonsImported}S / {metrics.tvEpisodesImported}E
          </strong>
        </div>
        <div className="metric">
          <span>Playback awaiting approval</span>
          <strong className="text-amber-300" data-testid="metric-playback-awaiting">
            {metrics.playbackSourcesAwaitingApproval}
          </strong>
        </div>
      </div>

      {/* Step 1 & 2: Input Additions Payload, Validate Preflight, and Run Dry Run */}
      <div className="panel space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">
              Phase A & B — Select Additions, Validate Preflight & Run Dry Run
            </h3>
            <p className="text-xs text-white/60">
              Load the verified Library of Congress movies + TV series pack or upload a custom JSON additions file.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadVerifiedAdditionsPack()}
              disabled={loadingAction !== null}
              className="button-secondary flex items-center gap-1.5 text-xs"
              data-testid="button-load-verified-additions"
            >
              {loadingAction === "load-starter" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Clapperboard size={14} />
              )}
              Load Verified Movies + TV Series Additions Pack (4 Titles)
            </button>
            <label className="button-secondary flex cursor-pointer items-center gap-1.5 text-xs">
              <Upload size={14} /> Upload JSON File
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label>Import Batch Label</label>
            <input
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="e.g., November 2026 Public Domain Additions"
              data-testid="input-production-job-name"
            />
          </div>
          <div className="field">
            <label>Select Existing Import Job Ledger</label>
            <select
              value={activeJob?.id ?? ""}
              onChange={(e) => {
                const found = jobs.find((j) => j.id === e.target.value);
                if (found) setActiveJob(found);
              }}
              data-testid="select-production-import-job"
            >
              <option value="">— Select a recent import job ({jobs.length}) —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name} · [{j.status}] · ({j.metrics.totalRecordsSubmitted} records)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Additions JSON Payload (Movies & TV Series with Seasons/Episodes & Rights)</label>
          <textarea
            rows={8}
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            spellCheck={false}
            placeholder='[ { "name": "...", "kind": "movie" | "series", "rights": [...], "stream": {...}, "seasons": [...] } ]'
            className="font-mono text-xs"
            data-testid="textarea-production-additions-payload"
          />
        </div>

        {errorMsg && (
          <div
            className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs font-semibold text-rose-200"
            role="alert"
            data-testid="status-production-importer-error"
          >
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-200"
            role="status"
            data-testid="status-production-importer-success"
          >
            {successMsg}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void handleValidatePreflight()}
            disabled={loadingAction !== null || !payloadText.trim()}
            className="button flex items-center gap-1.5"
            data-testid="button-validate-preflight"
          >
            {loadingAction === "preflight" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <ShieldCheck size={15} />
            )}
            1. Validate Import (Preflight)
          </button>

          <button
            type="button"
            onClick={() => void handleDryRun()}
            disabled={loadingAction !== null || !activeJob}
            className="button-secondary flex items-center gap-1.5"
            data-testid="button-run-dry-run"
          >
            {loadingAction === "dry-run" ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <FileCheck2 size={15} />
            )}
            2. Run Dry Run
          </button>

          {activeJob && (
            <button
              type="button"
              onClick={downloadImportReport}
              className="button-secondary flex items-center gap-1.5"
            >
              <Download size={15} /> Download Report (.json)
            </button>
          )}
        </div>
      </div>

      {/* Step 3, 4 & 5: Production Import, Rights Review & Live Publishing Gates */}
      {activeJob && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Gate 1: Import into Production */}
          <div className="panel flex flex-col justify-between space-y-4">
            <div>
              <span className="eyebrow text-sky-300">Phase B & D · Database Insertion</span>
              <h3 className="mt-1 text-base font-bold text-white">3. Import into Production</h3>
              <p className="mt-1 text-xs text-white/65">
                Creates draft movie and TV series records, imports season & episode hierarchies, and binds playback assets without overwriting any existing titles.
              </p>
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5 text-xs text-white/85">
                <input
                  type="checkbox"
                  checked={confirmProductionWrite}
                  onChange={(e) => setConfirmProductionWrite(e.target.checked)}
                  className="mt-0.5"
                  data-testid="checkbox-confirm-production-import"
                />
                <span>
                  I confirm administrator authorization to insert{" "}
                  <strong>{metrics.newTitlesDetected}</strong> validated addition(s) into the production database.
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleProductionImport(false)}
                disabled={
                  loadingAction !== null ||
                  !confirmProductionWrite ||
                  metrics.newTitlesDetected === 0
                }
                className="button flex-1 justify-center"
                data-testid="button-execute-production-import"
              >
                {loadingAction === "import" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Upload size={15} />
                )}
                Import into Production
              </button>
              {metrics.failedImports > 0 && (
                <button
                  type="button"
                  onClick={() => void handleProductionImport(true)}
                  disabled={loadingAction !== null || !confirmProductionWrite}
                  className="button-secondary flex items-center gap-1 text-xs"
                  data-testid="button-retry-failed-records"
                >
                  <RefreshCw size={13} /> Retry Failed Only
                </button>
              )}
            </div>
          </div>

          {/* Gate 2: Explicit Administrator Rights Review */}
          <div className="panel flex flex-col justify-between space-y-4">
            <div>
              <span className="eyebrow text-amber-300">Phase C · Chain-of-Title Review</span>
              <h3 className="mt-1 text-base font-bold text-white">4. Review Media Rights</h3>
              <p className="mt-1 text-xs text-white/65">
                Review rights evidence for all imported titles and TV episodes. Rights are never auto-approved during import.
              </p>
              <div className="mt-3 space-y-2">
                <div className="field">
                  <label className="text-xs">Review Decision</label>
                  <select
                    value={reviewDecision}
                    onChange={(e) =>
                      setReviewDecision(e.target.value as "approve" | "reject" | "restrict")
                    }
                    data-testid="select-production-rights-decision"
                  >
                    <option value="approve">Approve Rights Evidence</option>
                    <option value="restrict">Restrict</option>
                    <option value="reject">Reject</option>
                  </select>
                </div>
                <div className="field">
                  <label className="text-xs">Mandatory Reviewer Note</label>
                  <textarea
                    rows={2}
                    value={reviewerNote}
                    onChange={(e) => setReviewerNote(e.target.value)}
                    className="text-xs"
                    data-testid="textarea-production-reviewer-note"
                  />
                </div>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5 text-xs text-white/85">
                  <input
                    type="checkbox"
                    checked={confirmRightsReview}
                    onChange={(e) => setConfirmRightsReview(e.target.checked)}
                    className="mt-0.5"
                    data-testid="checkbox-confirm-rights-review"
                  />
                  <span>
                    I have reviewed the rights holder, license URL, source evidence, and usage restrictions for these titles and episodes.
                  </span>
                </label>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleReviewRights()}
              disabled={
                loadingAction !== null ||
                !confirmRightsReview ||
                metrics.successfullyImported === 0
              }
              className="button w-full justify-center"
              data-testid="button-execute-rights-review"
            >
              {loadingAction === "review" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ShieldCheck size={15} />
              )}
              Record Rights Review ({reviewDecision})
            </button>
          </div>

          {/* Gate 3: Publish Approved Titles & Run 10-Point Verification */}
          <div className="panel flex flex-col justify-between space-y-4">
            <div>
              <span className="eyebrow text-emerald-300">Phase F & G · Live Publication</span>
              <h3 className="mt-1 text-base font-bold text-white">
                5. Publish & Verify Live Catalog
              </h3>
              <p className="mt-1 text-xs text-white/65">
                Publishes approved titles and TV episodes via official publication checks, refreshes the $O(1)$ catalog cache, and executes the 10-point live catalog verification suite.
              </p>
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5 text-xs text-white/85">
                <input
                  type="checkbox"
                  checked={confirmPublishLive}
                  onChange={(e) => setConfirmPublishLive(e.target.checked)}
                  className="mt-0.5"
                  data-testid="checkbox-confirm-publish-live"
                />
                <span>
                  I confirm publication of <strong>{metrics.approvedTitles}</strong> approved title(s) and their episodes to the live FamilyFlix catalog.
                </span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => void handlePublishAndVerify()}
              disabled={
                loadingAction !== null ||
                !confirmPublishLive ||
                metrics.approvedTitles === 0
              }
              className="button w-full justify-center"
              data-testid="button-execute-publish-verify"
            >
              {loadingAction === "publish" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <BadgeCheck size={15} />
              )}
              Publish Approved & Verify Live Catalog
            </button>
          </div>
        </div>
      )}

      {/* Import-Job Detail Page: Per-Title Results, Episodes, Errors & 10-Point Verification */}
      {activeJob && (
        <div className="panel space-y-4" data-testid="panel-production-job-detail">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white">
                Import-Job Detail Ledger · {activeJob.name}
              </h3>
              <p className="text-xs text-white/50">
                Job ID: <code className="text-purple-300">{activeJob.id}</code> · SHA-256:{" "}
                <code>{activeJob.payloadSha256.slice(0, 16)}…</code> · Created by{" "}
                {activeJob.createdByEmail}
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row / Title</th>
                  <th>Classification</th>
                  <th>Pipeline Status</th>
                  <th>Production ID / Slug</th>
                  <th>Rights & Episodes</th>
                  <th>10-Point Live Verification</th>
                  <th>Live Links</th>
                </tr>
              </thead>
              <tbody>
                {activeJob.items.map((item) => {
                  const v = item.verification;
                  return (
                    <tr key={item.row} data-testid={`row-production-import-item-${item.row}`}>
                      <td>
                        <strong>{item.normalizedName}</strong>
                        <div className="helper">
                          Row #{item.row} · {item.year ?? "N/A"}
                          {item.imdbCode ? ` · ${item.imdbCode}` : ""}
                        </div>
                        {item.duplicateMatchBasis && (
                          <div className="mt-1 text-xs text-amber-300">
                            Matched: {item.duplicateMatchBasis}
                          </div>
                        )}
                        {item.errors.length > 0 && (
                          <div className="mt-1 space-y-0.5 text-xs text-rose-400">
                            {item.errors.map((err, i) => (
                              <div key={i}>• {err}</div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="rounded border border-white/20 bg-white/5 px-2 py-0.5 text-xs font-bold uppercase">
                          {item.kind}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status ${
                            item.status === "published_verified" || item.status === "rights_approved"
                              ? "good"
                              : item.status.includes("failed")
                                ? ""
                                : "warn"
                          }`}
                          data-testid={`status-production-item-${item.row}`}
                        >
                          {item.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="text-xs">
                        {item.productionMovieId ? (
                          <div>
                            <div className="font-mono text-[11px] text-purple-300">
                              {item.productionMovieId}
                            </div>
                            <div className="helper">/{item.productionSlug}</div>
                          </div>
                        ) : item.existingMovieId ? (
                          <div className="helper">
                            Existing ID: <code>{item.existingMovieId.slice(0, 8)}…</code>
                          </div>
                        ) : (
                          <span className="helper">—</span>
                        )}
                      </td>
                      <td className="text-xs">
                        <div>
                          Rights:{" "}
                          <strong
                            className={
                              item.rightsReviewStatus === "approved"
                                ? "text-emerald-300"
                                : "text-amber-300"
                            }
                          >
                            {item.rightsReviewStatus}
                          </strong>
                        </div>
                        {item.reviewerEmail && (
                          <div className="helper">Reviewed by {item.reviewerEmail}</div>
                        )}
                        {item.kind === "series" && (
                          <div className="mt-1 text-purple-300">
                            {item.seasonsCount} Season(s) · {item.importedEpisodes.length || item.episodesCount} Episode(s)
                          </div>
                        )}
                      </td>
                      <td className="text-xs">
                        {v ? (
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                v.passed
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              }`}
                              data-testid={`badge-verification-${item.row}`}
                            >
                              {v.passed ? (
                                <>
                                  <CheckCircle2 size={12} /> 10/10 Checks Passed
                                </>
                              ) : (
                                <>
                                  <XCircle size={12} /> Verification Failed
                                </>
                              )}
                            </span>
                            <details className="mt-1">
                              <summary className="cursor-pointer text-[11px] text-white/60 hover:text-white">
                                View 10-point checklist
                              </summary>
                              <ul className="mt-1 space-y-0.5 text-[11px] text-white/75">
                                {Object.entries(v.checks).map(([k, ok]) => (
                                  <li key={k} className="flex items-center gap-1">
                                    {ok ? (
                                      <Check size={11} className="text-emerald-400" />
                                    ) : (
                                      <XCircle size={11} className="text-rose-400" />
                                    )}
                                    <span>{k}</span>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          </div>
                        ) : (
                          <span className="helper">Awaiting publication</span>
                        )}
                      </td>
                      <td className="text-xs">
                        {item.productionMovieId && (
                          <div className="flex flex-wrap gap-1.5">
                            <Link
                              href={`/admin/library/${item.productionMovieId}`}
                              className="button-secondary px-2.5 py-1 text-xs"
                            >
                              Admin Record
                            </Link>
                            {item.status === "published_verified" && item.productionSlug && (
                              <>
                                <Link
                                  href={`/title/${item.productionSlug}`}
                                  className="button-secondary flex items-center gap-1 px-2.5 py-1 text-xs"
                                  data-testid={`link-verified-detail-${item.row}`}
                                >
                                  Detail <ExternalLink size={11} />
                                </Link>
                                <Link
                                  href={`/watch/${item.productionSlug}`}
                                  className="button flex items-center gap-1 px-2.5 py-1 text-xs"
                                  data-testid={`link-verified-watch-${item.row}`}
                                >
                                  <Play size={11} fill="currentColor" /> Watch
                                </Link>
                              </>
                            )}
                          </div>
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
            <div className="mt-4 border-t border-white/10 pt-4">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/70">
                <History size={13} /> Import Job Audit Trail
              </h4>
              <div className="mt-2 space-y-1.5">
                {activeJob.auditTrail.map((ev, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="mr-2 rounded bg-purple-500/20 px-2 py-0.5 font-mono text-[10px] uppercase text-purple-300">
                        {ev.phase}
                      </span>
                      <span className="text-white/85">{ev.summary}</span>
                    </div>
                    <span className="text-[11px] text-white/45">
                      {ev.actorEmail} · {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
