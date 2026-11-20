"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface SubtitleRow {
  id: string;
  language: string;
  label: string;
  url: string;
  isDefault: boolean;
}

const inputClass =
  "h-10 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[13px] text-white placeholder:text-white/25 transition focus:border-[#8b5cff] focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-brand/20";
const labelClass = "mb-1.5 block text-[11.5px] font-semibold text-white/60";

export function SubtitleManager({
  movieId,
  subtitles,
}: {
  movieId: string;
  subtitles: SubtitleRow[];
}) {
  const router = useRouter();
  const [language, setLanguage] = useState("");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/movies/${movieId}/subtitles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, label, url, isDefault }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not save the subtitle track.");
      toast.success("Subtitle track saved.");
      setLanguage("");
      setLabel("");
      setUrl("");
      setIsDefault(false);
      router.refresh();
    } catch (issue) {
      const message =
        issue instanceof Error ? issue.message : "Could not save the subtitle track.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/movies/${movieId}/subtitles/${id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not delete the subtitle track.");
      toast.success("Subtitle track deleted.");
      setConfirmId(null);
      router.refresh();
    } catch (issue) {
      const message =
        issue instanceof Error ? issue.message : "Could not delete the subtitle track.";
      setError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-[13px] font-semibold text-white">Subtitles</h2>
        <p className="mt-0.5 text-[11.5px] text-white/35">
          WebVTT tracks served with the player. One track per language.
        </p>
      </div>

      <div className="space-y-3 p-4">
        {subtitles.length ? (
          <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.06]">
            {subtitles.map((track) => (
              <li key={track.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="inline-flex min-w-10 justify-center rounded border border-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/60">
                  {track.language}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-white">
                    {track.label}
                    {track.isDefault ? (
                      <span className="ml-1.5 text-[10px] font-semibold text-emerald-300">
                        default
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-[10.5px] text-white/30">{track.url}</p>
                </div>
                {confirmId === track.id ? (
                  <span className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => remove(track.id)}
                      disabled={deletingId === track.id}
                      className="inline-flex h-8 items-center gap-1 rounded-full bg-red-500 px-2.5 text-[11px] font-semibold text-white transition hover:bg-red-400 disabled:opacity-60"
                    >
                      {deletingId === track.id ? (
                        <Loader2 className="size-3 animate-spin" aria-hidden />
                      ) : null}
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="inline-flex h-8 items-center rounded-full border border-white/15 px-2.5 text-[11px] font-semibold text-white/60 transition hover:text-white"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(track.id)}
                    aria-label={`Delete ${track.label} subtitles`}
                    className="grid size-8 place-items-center rounded-full text-white/35 transition hover:bg-white/[0.06] hover:text-red-300"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-white/35">
            No subtitle tracks yet. Add one below.
          </p>
        )}

        {error ? (
          <p
            role="alert"
            className="flex gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12px] leading-relaxed text-red-200"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="sub-language" className={labelClass}>
              Language code
            </label>
            <input
              id="sub-language"
              type="text"
              required
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className={inputClass}
              placeholder="en or es-MX"
            />
          </div>
          <div>
            <label htmlFor="sub-label" className={labelClass}>
              Label
            </label>
            <input
              id="sub-label"
              type="text"
              required
              maxLength={60}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className={inputClass}
              placeholder="English"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="sub-url" className={labelClass}>
              WebVTT URL
            </label>
            <input
              id="sub-url"
              type="text"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className={inputClass}
              placeholder="https://…/english.vtt or /subtitles/english.vtt"
            />
          </div>
          <label className="flex items-center gap-2.5 text-[12px] text-white/65">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(event) => setIsDefault(event.target.checked)}
              className="size-4 rounded border-white/25 bg-white/10 accent-[#6d28ff]"
            />
            Use as the default track
          </label>
          <div className="flex items-end justify-end">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-[12.5px] font-semibold text-white transition hover:bg-brand-hover disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <Plus className="size-3.5" aria-hidden />
                  Add track
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
