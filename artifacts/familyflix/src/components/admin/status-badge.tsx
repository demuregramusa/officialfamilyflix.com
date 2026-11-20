import { cn } from "@/lib/utils";

const MOVIE_STYLES: Record<string, string> = {
  published: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
  draft: "border-amber-400/25 bg-amber-500/10 text-amber-200",
  archived: "border-white/15 bg-white/5 text-white/50",
};

const STREAM_STYLES: Record<string, string> = {
  ready: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
  processing: "border-sky-400/25 bg-sky-500/10 text-sky-200",
  pending_upload: "border-sky-400/25 bg-sky-500/10 text-sky-200",
  error: "border-red-400/25 bg-red-500/10 text-red-200",
  disabled: "border-white/15 bg-white/5 text-white/50",
  missing: "border-amber-400/25 bg-amber-500/10 text-amber-200",
};

export function MovieStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold capitalize",
        MOVIE_STYLES[status] ?? MOVIE_STYLES.archived,
      )}
    >
      <span className="size-1 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}

export function StreamStatusBadge({
  status,
  provider,
}: {
  status: string | null;
  provider?: string | null;
}) {
  const value = status ?? "missing";
  const label =
    value === "pending_upload" ? "uploading" : value === "missing" ? "no stream" : value;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold capitalize",
          STREAM_STYLES[value] ?? STREAM_STYLES.missing,
        )}
      >
        {label}
      </span>
      {provider ? (
        <span className="text-[10.5px] uppercase tracking-[0.1em] text-white/25">
          {provider}
        </span>
      ) : null}
    </span>
  );
}
