import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListMovieArchiveImportJobsQueryKey,
  useListMovieArchiveImportJobs,
} from "@workspace/api-client-react";
import type {
  ArchiveImportJob,
  ArchiveValidationReport,
} from "@workspace/api-client-react";
import { Info, ShieldCheck, Upload } from "lucide-react";

const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024;

async function requestError(response: Response) {
  try {
    const payload = await response.json() as { error?: unknown };
    if (typeof payload.error === "string") return payload.error;
  } catch {
    // Keep a useful status message when the server response is not JSON.
  }
  return `The request failed (${response.status}).`;
}

async function sendArchive(path: string, file: File) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/zip",
      "x-archive-name": encodeURIComponent(file.name),
    },
    body: file,
  });
  if (!response.ok) throw new Error(await requestError(response));
  return response.json();
}

function statusClass(status: ArchiveImportJob["status"]) {
  if (status === "completed") return "good";
  if (status === "running") return "warn";
  if (status === "failed") return "error";
  return "warn";
}

export function ArchiveImportPanel() {
  const queryClient = useQueryClient();
  const jobs = useListMovieArchiveImportJobs({
    query: { refetchInterval: 2500 },
  });
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ArchiveValidationReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function validateArchive() {
    if (!file) return;
    if (file.size === 0 || file.size > MAX_ARCHIVE_BYTES || !file.name.toLowerCase().endsWith(".zip")) {
      setMessage("Choose a non-empty ZIP file no larger than 20 MB.");
      return;
    }
    setBusy(true);
    setMessage("");
    setReport(null);
    try {
      const result = await sendArchive("/api/admin/import/archive/validate", file) as ArchiveValidationReport;
      setReport(result);
      await queryClient.invalidateQueries({ queryKey: getListMovieArchiveImportJobsQueryKey() });
      setMessage("Dry run finished. No title, source, or playback records were created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The archive could not be validated.");
    } finally {
      setBusy(false);
    }
  }

  async function startImport(jobId: string) {
    if (!file) {
      setMessage("Select the same ZIP file used for validation.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const job = await sendArchive(
        `/api/admin/import/archive-jobs/${encodeURIComponent(jobId)}/start`,
        file,
      ) as ArchiveImportJob;
      if (report?.job.id === jobId) setReport({ ...report, job });
      await queryClient.invalidateQueries({ queryKey: getListMovieArchiveImportJobsQueryKey() });
      setMessage(job.status === "running" ? "Import started. You can leave this page; progress is saved." : "Import request accepted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The archive import could not be started.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel" style={{ marginBottom: 18 }} data-testid="panel-archive-import">
      <h2>Import a movie catalog ZIP</h2>
      <p className="helper">
        Import metadata and private source references in restartable batches. This does not provide a license,
        create rights evidence, attach a video, or make any torrent or magnet playable.
      </p>
      <div className="notice" style={{ marginBottom: 14 }} data-testid="notice-archive-rights">
        <ShieldCheck size={17} />
        <span>
          A catalog entry or a Creative Commons claim is not proof of rights. Imported titles remain unlicensed
          drafts; torrent and magnet references stay admin-only, unverified, and disabled.
        </span>
      </div>
      <div className="field">
        <label htmlFor="movie-archive-zip">ZIP archive</label>
        <input
          id="movie-archive-zip"
          type="file"
          accept=".zip,application/zip"
          onChange={(event) => {
            setFile(event.currentTarget.files?.[0] ?? null);
            setReport(null);
            setMessage("");
          }}
          data-testid="input-movie-archive-zip"
        />
        <span className="helper">Up to 20 MB. The uploaded archive is processed temporarily and is not kept as a media file.</span>
      </div>
      <div className="form-actions">
        <button
          className="button"
          type="button"
          disabled={busy || !file}
          onClick={validateArchive}
          data-testid="button-validate-movie-archive"
        >
          <Upload size={16} /> {busy ? "Working…" : "Run dry run"}
        </button>
        {report && (
          <button
            className="button-secondary"
            type="button"
            disabled={busy || report.job.status !== "validated"}
            onClick={() => startImport(report.job.id)}
            data-testid="button-start-movie-archive"
          >
            Import private metadata
          </button>
        )}
      </div>
      {message && <p className="form-message" role="status" data-testid="status-movie-archive-message">{message}</p>}

      {report && (
        <div className="panel" style={{ marginTop: 18 }} data-testid="report-movie-archive">
          <h3>Dry-run report</h3>
          <div className="notice" style={{ marginBottom: 14 }}>
            <Info size={16} />
            <span>Review this report before importing. Protected titles with existing rights or publication status are skipped.</span>
          </div>
          <div className="metric-grid">
            <div className="metric"><span>JSON pages</span><strong>{report.archivePages}</strong></div>
            <div className="metric"><span>Unique source records</span><strong>{report.totalRecords}</strong></div>
            <div className="metric"><span>Already matched</span><strong>{report.expectedMatchedTitles}</strong></div>
            <div className="metric"><span>New draft titles</span><strong>{report.expectedNewTitles}</strong></div>
            <div className="metric"><span>Private torrent references</span><strong>{report.expectedTorrentSources}</strong></div>
            <div className="metric"><span>Protected titles skipped</span><strong>{report.protectedTitles}</strong></div>
          </div>
          <p className="helper">
            Duplicate source IDs: {report.duplicateSourceRecords} · duplicate IMDb IDs: {report.duplicateImdbRecords}
            {" · "}malformed pages: {report.malformedPages} · recovered records: {report.recoveredRecords}
            {" · "}invalid rows: {report.invalidRecords} · non-catalog files ignored: {report.nonCatalogEntries}
          </p>
          <p className="helper">Expected title, source, and torrent rows: {report.expectedDatabaseWrites}. Existing titles will not be overwritten.</p>
          {report.issues.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Page</th><th>Source ID</th><th>Issue</th></tr></thead>
                <tbody>
                  {report.issues.map((issue, index) => (
                    <tr key={`${issue.page}-${issue.sourceId ?? "page"}-${index}`}>
                      <td>{issue.page}</td>
                      <td>{issue.sourceId ?? "—"}</td>
                      <td>{issue.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h3>Recent archive imports</h3>
        {jobs.isLoading ? <div className="skeleton" style={{ height: 90 }} /> :
          jobs.isError ? <p className="form-message error">Could not load import progress.</p> :
            jobs.data?.length ? jobs.data.map((job) => (
              <div className="rights-row" key={job.id} data-testid={`row-movie-archive-job-${job.id}`}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{job.archiveName}</strong>
                  <div className="helper">
                    {job.processedRecords.toLocaleString()} / {job.totalRecords.toLocaleString()} records
                    {" · "}{job.nextPageIndex} / {job.totalPages} pages
                    {" · "}{job.importedTorrentSources.toLocaleString()} source references kept disabled
                  </div>
                  <div className="helper">
                    Imported source records: {job.importedSourceRecords.toLocaleString()}
                    {" · "}matched titles: {job.matchedTitles.toLocaleString()}
                    {" · "}new titles: {job.createdTitles.toLocaleString()}
                    {" · "}updated titles: {job.updatedTitles.toLocaleString()}
                    {" · "}skipped: {job.skippedRecords.toLocaleString()}
                    {" · "}failed: {job.failedRecords.toLocaleString()}
                  </div>
                  <progress max="100" value={job.progressPercent} aria-label={`${job.archiveName} import progress`} />
                  {job.lastError && <div className="helper">{job.lastError}</div>}
                  {job.issues.length > 0 && (
                    <details style={{ marginTop: 6 }}>
                      <summary className="helper" style={{ cursor: "pointer" }}>Import notes ({job.issues.length})</summary>
                      <ul className="helper">{job.issues.map((issue, index) => <li key={`${issue.page}-${index}`}>Page {issue.page}: {issue.message}</li>)}</ul>
                    </details>
                  )}
                </div>
                <span className={`status ${statusClass(job.status)}`}>{job.status}</span>
                {(job.status === "paused" || job.status === "failed") && (
                  <button
                    className="button-secondary"
                    type="button"
                    disabled={busy || !file}
                    onClick={() => startImport(job.id)}
                    data-testid={`button-resume-movie-archive-${job.id}`}
                  >
                    Resume with selected ZIP
                  </button>
                )}
              </div>
            )) : <p className="helper">No archive import jobs yet.</p>}
      </div>
    </section>
  );
}
