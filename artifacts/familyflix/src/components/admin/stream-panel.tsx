"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CloudUpload,
  Link2,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import * as tus from "tus-js-client";
import { toast } from "sonner";

import { StreamStatusBadge } from "@/components/admin/status-badge";

export interface StreamAsset {
  id: string;
  provider: "cloudflare" | "manual" | "demo";
  providerAssetId: string | null;
  status: string;
  hlsUrl: string | null;
  mp4Url: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  error: string | null;
  signedPlayback: boolean;
}

const inputClass =
  "h-10 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[13px] text-white placeholder:text-white/25 transition focus:border-[#8b5cff] focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-brand/20";
const labelClass = "mb-1.5 block text-[11.5px] font-semibold text-white/60";

const MAX_UPLOAD_BYTES = 30 * 1024 * 1024 * 1024;

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function StreamPanel({
  movieId,
  kind,
  asset,
  cloudflareEnabled,
  signingEnabled,
}: {
  movieId: string;
  kind: "movie" | "series" | "live";
  asset: StreamAsset | null;
  cloudflareEnabled: boolean;
  signingEnabled: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showManual, setShowManual] = useState(asset?.provider === "manual");

  const [manual, setManual] = useState({
    hlsUrl: asset?.provider === "manual" ? (asset.hlsUrl ?? "") : "",
    mp4Url: asset?.provider === "manual" ? (asset.mp4Url ?? "") : "",
    thumbnailUrl: asset?.thumbnailUrl ?? "",
    durationSeconds: asset?.durationSeconds?.toString() ?? "",
    signedPlayback: asset?.signedPlayback ?? false,
  });
  const [savingManual, setSavingManual] = useState(false);

  function refresh() {
    router.refresh();
  }

  async function syncAsset(silent = false) {
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/movies/${movieId}/stream/sync`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not sync the stream.");
      if (!silent) toast.success("Stream status refreshed.");
      refresh();
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : "Could not sync the stream.";
      setError(message);
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  }

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Choose a file smaller than 30 GB.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const response = await fetch(`/api/admin/movies/${movieId}/stream/direct-upload`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        uploadUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.uploadUrl) {
        throw new Error(payload.error ?? "Could not start the upload.");
      }

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: payload.uploadUrl,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          chunkSize: 50 * 1024 * 1024,
          metadata: {
            filename: file.name,
            filetype: file.type || "video/mp4",
          },
          onProgress: (sent, total) => {
            if (total > 0) setProgress(Math.round((sent / total) * 100));
          },
          onSuccess: () => resolve(),
          onError: (issue) =>
            reject(issue instanceof Error ? issue : new Error("The upload failed.")),
        });
        upload.start();
      });

      toast.success("Upload complete. Processing has started.");
      await syncAsset(true);
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : "The upload failed.";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingManual(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/movies/${movieId}/stream`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hlsUrl: manual.hlsUrl,
          mp4Url: manual.mp4Url,
          thumbnailUrl: manual.thumbnailUrl,
          durationSeconds: manual.durationSeconds ? Number(manual.durationSeconds) : null,
          signedPlayback: manual.signedPlayback,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not attach the stream.");
      toast.success("Stream attached.");
      refresh();
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : "Could not attach the stream.";
      setError(message);
      toast.error(message);
    } finally {
      setSavingManual(false);
    }
  }

  async function removeStream() {
    setRemoving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/movies/${movieId}/stream`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not remove the stream.");
      toast.success("Stream removed.");
      setConfirmRemove(false);
      refresh();
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : "Could not remove the stream.";
      setError(message);
      toast.error(message);
    } finally {
      setRemoving(false);
    }
  }

  if (kind === "live") {
    return (
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
        <h2 className="text-[13px] font-semibold text-white">Stream</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-white/40">
          Live channels use their broadcast feed in the schedule instead of an
          on-demand file. Change the type to Movie or Series to attach a video.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-white">Stream</h2>
          <p className="mt-0.5 text-[11.5px] text-white/35">
            Upload a master or attach a hosted HLS / MP4 URL.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StreamStatusBadge status={asset?.status ?? null} provider={asset?.provider ?? null} />
          {asset?.provider === "cloudflare" ? (
            <button
              type="button"
              onClick={() => syncAsset()}
              disabled={syncing}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[11.5px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-3.5" aria-hidden />
              )}
              {syncing ? "Syncing…" : "Sync"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-4">
        {asset ? (
          <dl className="grid gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
                Provider
              </dt>
              <dd className="mt-0.5 text-[12px] capitalize text-white/70">{asset.provider}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
                Playback protection
              </dt>
              <dd className="mt-0.5 text-[12px] text-white/70">
                {asset.signedPlayback ? "Signed URLs" : "Public URL"}
              </dd>
            </div>
            {asset.durationSeconds ? (
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
                  Duration
                </dt>
                <dd className="mt-0.5 text-[12px] text-white/70">
                  {formatDuration(asset.durationSeconds)}
                </dd>
              </div>
            ) : null}
            {asset.hlsUrl ? (
              <div className="min-w-0">
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
                  HLS
                </dt>
                <dd className="mt-0.5 truncate text-[11px] text-white/55">{asset.hlsUrl}</dd>
              </div>
            ) : null}
            {asset.mp4Url ? (
              <div className="min-w-0">
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">
                  MP4
                </dt>
                <dd className="mt-0.5 truncate text-[11px] text-white/55">{asset.mp4Url}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-3 py-2.5 text-[12px] text-amber-100/80">
            No stream attached yet. Upload a file or paste a hosted URL below.
          </p>
        )}

        {asset?.error ? (
          <p
            role="alert"
            className="flex gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12px] leading-relaxed text-red-200"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {asset.error}
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="flex gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12px] leading-relaxed text-red-200"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-white/80">
                <CloudUpload className="size-3.5" aria-hidden />
                Upload a master
              </p>
              <p className="mt-0.5 text-[11px] text-white/35">
                {cloudflareEnabled
                  ? "Cloudflare Stream transcodes to adaptive HLS automatically."
                  : "Cloudflare Stream is not configured. Use a hosted URL instead."}
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              onChange={onFileSelected}
              disabled={!cloudflareEnabled || uploading}
              aria-label="Upload a video file"
              className="block w-full max-w-full text-[11px] text-white/50 file:mr-3 file:h-9 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:text-[11.5px] file:font-semibold file:text-white hover:file:bg-white/15 disabled:opacity-50 sm:w-auto"
            />
          </div>

          {uploading ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-white/50">
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  Uploading…
                </span>
                <span className="tabular-nums">{progress}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          {cloudflareEnabled && signingEnabled ? (
            <p className="mt-2 text-[10.5px] text-white/30">
              Uploads are protected with signed playback tokens.
            </p>
          ) : null}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowManual((current) => !current)}
            aria-expanded={showManual}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-white/55 transition hover:text-white"
          >
            <Link2 className="size-3.5" aria-hidden />
            {showManual ? "Hide manual URL form" : "Attach a hosted URL instead"}
          </button>

          {showManual ? (
            <form onSubmit={saveManual} className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="stream-hls" className={labelClass}>
                  HLS manifest URL
                </label>
                <input
                  id="stream-hls"
                  type="url"
                  value={manual.hlsUrl}
                  onChange={(event) =>
                    setManual((current) => ({ ...current, hlsUrl: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="https://…/master.m3u8"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="stream-mp4" className={labelClass}>
                  MP4 URL
                </label>
                <input
                  id="stream-mp4"
                  type="url"
                  value={manual.mp4Url}
                  onChange={(event) =>
                    setManual((current) => ({ ...current, mp4Url: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="https://…/movie.mp4"
                />
                <p className="mt-1 text-[11px] text-white/30">
                  Provide at least one. HLS is preferred for adaptive quality.
                </p>
              </div>
              <div>
                <label htmlFor="stream-thumb" className={labelClass}>
                  Thumbnail URL
                </label>
                <input
                  id="stream-thumb"
                  type="url"
                  value={manual.thumbnailUrl}
                  onChange={(event) =>
                    setManual((current) => ({ ...current, thumbnailUrl: event.target.value }))
                  }
                  className={inputClass}
                  placeholder="https://…/thumb.jpg"
                />
              </div>
              <div>
                <label htmlFor="stream-duration" className={labelClass}>
                  Duration (seconds)
                </label>
                <input
                  id="stream-duration"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={86400}
                  value={manual.durationSeconds}
                  onChange={(event) =>
                    setManual((current) => ({
                      ...current,
                      durationSeconds: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="6480"
                />
              </div>
              <label className="flex items-center gap-2.5 text-[12px] text-white/65 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={manual.signedPlayback}
                  onChange={(event) =>
                    setManual((current) => ({
                      ...current,
                      signedPlayback: event.target.checked,
                    }))
                  }
                  className="size-4 rounded border-white/25 bg-white/10 accent-[#6d28ff]"
                />
                This URL is signed and needs a token
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={savingManual}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand px-4 text-[12.5px] font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
                >
                  {savingManual ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      Attaching…
                    </>
                  ) : (
                    <>
                      <UploadCloud className="size-3.5" aria-hidden />
                      Attach stream
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : null}
        </div>

        {asset ? (
          <div className="border-t border-white/[0.06] pt-3">
            {confirmRemove ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 p-3">
                <p className="flex-1 text-[12px] text-red-100">
                  Remove this stream? Published playback will stop immediately.
                </p>
                <button
                  type="button"
                  onClick={removeStream}
                  disabled={removing}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-red-500 px-3 text-[11.5px] font-semibold text-white transition hover:bg-red-400 disabled:opacity-60"
                >
                  {removing ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="size-3.5" aria-hidden />
                  )}
                  {removing ? "Removing…" : "Remove stream"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(false)}
                  disabled={removing}
                  className="inline-flex h-9 items-center rounded-full border border-white/15 px-3 text-[11.5px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRemove(true)}
                className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-red-300/80 transition hover:text-red-200"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Remove stream
              </button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
