"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileUp,
  Info,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

interface ImportColumn {
  name: string;
  required: boolean;
  description: string;
}

interface ImportIssue {
  row: number;
  title: string;
  message: string;
}

interface ImportReport {
  dryRun: boolean;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  issues: ImportIssue[];
  imported: { slug: string; name: string }[];
  snapshot: "written" | "failed" | "skipped";
  warnings: string[];
}

const labelClass = "mb-1.5 block text-[11.5px] font-semibold text-white/60";

function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-white/85">{label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-white/35">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition disabled:opacity-50",
          checked ? "bg-brand" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "size-5 rounded-full bg-white shadow transition",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

export function ImportForm({
  columns,
  template,
  jsonTemplate,
}: {
  columns: ImportColumn[];
  template: string;
  jsonTemplate: string;
}) {
  const [text, setText] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  const canSubmit = text.trim().length > 0 && !pending && (dryRun || confirmed);

  function downloadTemplate() {
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "familyflix-import-template.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function downloadJsonTemplate() {
    const blob = new Blob([jsonTemplate], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "familyflix-import-example.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function loadFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setError(null);
      setReport(null);
      toast.success(`Loaded ${file.name}.`);
    };
    reader.onerror = () => toast.error("Could not read that file.");
    reader.readAsText(file);
  }

  function clear() {
    setText("");
    setError(null);
    setReport(null);
    setConfirmed(false);
  }

  async function runImport() {
    if (!text.trim() || pending) return;
    if (!dryRun && !confirmed) {
      setError("Confirm the titles are licensed to FamilyFlix before importing.");
      return;
    }

    setPending(true);
    setError(null);
    setReport(null);
    try {
      const response = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, dryRun, updateExisting }),
      });
      const payload = (await response.json()) as {
        report?: ImportReport;
        error?: string;
      };
      if (!response.ok || !payload.report) {
        throw new Error(payload.error ?? "The import could not be processed.");
      }
      setReport(payload.report);
      toast.success(
        payload.report.dryRun
          ? "Dry run complete."
          : "Import complete.",
      );
    } catch (issue) {
      const message =
        issue instanceof Error ? issue.message : "The import could not be processed.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  const importedCount = report ? report.created + report.updated : 0;

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-white">CSV or JSON</h2>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/35">
            Paste the file below or load one. Every title needs a stream URL you are
            licensed to serve.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-[11.5px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
          >
            <Download className="size-3.5" aria-hidden />
            CSV template
          </button>
          <button
            type="button"
            onClick={downloadJsonTemplate}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-[11.5px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
          >
            <Download className="size-3.5" aria-hidden />
            JSON example
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <label htmlFor="import-text" className={labelClass}>
            Titles
          </label>
          <textarea
            id="import-text"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setError(null);
              setReport(null);
              setConfirmed(false);
            }}
            rows={10}
            spellCheck={false}
            className="w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-white placeholder:text-white/25 transition focus:border-[#8b5cff] focus:bg-white/[0.04] focus:outline-none focus:ring-4 focus:ring-brand/20"
            placeholder={`title,year,kind,synopsis,mp4Url,licenseType,rightsHolder,sourceUrl\nYour Licensed Film,2024,movie,"A short description.",https://cdn.example.com/film.mp4,licensed,Your Studio Ltd,https://example.com/licence.pdf`}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-[11.5px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white">
              <FileUp className="size-3.5" aria-hidden />
              Load file
              <input
                type="file"
                accept=".csv,.json,.txt,text/csv,application/json"
                className="sr-only"
                onChange={(event) => loadFile(event.target.files?.[0])}
              />
            </label>
            <button
              type="button"
              onClick={clear}
              disabled={pending || !text.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3.5 text-[11.5px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Clear
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Switch
            checked={dryRun}
            onChange={(value) => {
              setDryRun(value);
              setReport(null);
            }}
            label="Dry run"
            description="Validate without writing anything. Safe first step."
          />
          <Switch
            checked={updateExisting}
            onChange={setUpdateExisting}
            label="Update existing titles"
            description="Replace titles whose slug already exists instead of skipping them."
          />
        </div>

        {!dryRun ? (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2.5 text-[12px] leading-relaxed text-amber-100">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-amber-400"
            />
            <span>
              I confirm these titles are owned by or licensed to FamilyFlix, and each
              stream URL is one I am authorised to serve. Publishing pirated content is
              prohibited.
            </span>
          </label>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="flex gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12px] leading-relaxed text-red-200"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={runImport}
            disabled={!canSubmit}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[12.5px] font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Play className="size-4" aria-hidden />
            )}
            {pending
              ? "Running…"
              : dryRun
                ? "Validate (dry run)"
                : "Import titles"}
          </button>
          <p className="text-[11px] leading-relaxed text-white/30">
            {pending ? "Processing, this can take a moment…" : "Nothing is written during a dry run."}
          </p>
        </div>

        {report ? (
          <div className="space-y-3">
            <div
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 text-[12.5px]",
                report.skipped > 0 || report.issues.length > 0
                  ? "border-amber-400/25 bg-amber-500/[0.06] text-amber-100"
                  : "border-emerald-400/25 bg-emerald-500/[0.06] text-emerald-100",
              )}
            >
              {report.dryRun ? (
                <Info className="size-4 shrink-0" aria-hidden />
              ) : report.skipped > 0 || report.issues.length > 0 ? (
                <AlertCircle className="size-4 shrink-0" aria-hidden />
              ) : (
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              )}
              <span>
                {report.dryRun ? "Dry run:" : "Import:"}{" "}
                <strong>{report.total}</strong> rows ·{" "}
                <strong>{report.created}</strong> would create ·{" "}
                <strong>{report.updated}</strong> would update ·{" "}
                <strong>{report.skipped}</strong> skipped
                {report.dryRun ? "" : ` · ${importedCount} written`}
              </span>
            </div>

            {report.issues.length > 0 ? (
              <div className="rounded-xl border border-white/[0.07] bg-black/20">
                <div className="border-b border-white/[0.06] px-3 py-2">
                  <p className="text-[11.5px] font-semibold text-white/70">
                    Issues ({report.issues.length})
                  </p>
                </div>
                <ul className="max-h-64 divide-y divide-white/[0.05] overflow-y-auto">
                  {report.issues.map((issue, index) => (
                    <li
                      key={`${issue.row}-${index}`}
                      className="flex items-start gap-2 px-3 py-2 text-[11.5px] leading-relaxed"
                    >
                      <span className="mt-0.5 shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/50">
                        #{issue.row}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium text-white/75">{issue.title}</span>
                        <span className="text-white/40"> — {issue.message}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {report.warnings.length > 0 ? (
              <ul className="space-y-1.5">
                {report.warnings.map((warning) => (
                  <li
                    key={warning}
                    className="flex gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[11.5px] leading-relaxed text-white/45"
                  >
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {warning}
                  </li>
                ))}
              </ul>
            ) : null}

            {report.imported.length > 0 ? (
              <p className="text-[11px] leading-relaxed text-white/30">
                {report.imported
                  .slice(0, 6)
                  .map((title) => title.name)
                  .join(", ")}
                {report.imported.length > 6
                  ? ` and ${report.imported.length - 6} more`
                  : ""}
                .
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[11.5px] leading-relaxed text-white/45">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-white/40" aria-hidden />
          <span>
            Imports publish immediately with rights confirmed and are recorded in the
            activity log. Use “Dry run” to review before writing.
          </span>
        </div>

        <details className="rounded-xl border border-white/[0.07] bg-black/20">
          <summary className="cursor-pointer select-none px-3 py-2 text-[11.5px] font-semibold text-white/60">
            All accepted columns
          </summary>
          <ul className="grid gap-x-4 gap-y-1.5 border-t border-white/[0.06] px-3 py-2.5 sm:grid-cols-2">
            {columns.map((column) => (
              <li key={column.name} className="text-[11px] leading-relaxed">
                <span className="font-mono text-white/75">
                  {column.name}
                  {column.required ? (
                    <span className="ml-1 text-red-300">*</span>
                  ) : null}
                </span>
                <span className="text-white/35"> — {column.description}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
