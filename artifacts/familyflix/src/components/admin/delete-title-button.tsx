"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteTitleButton({
  movieId,
  name,
}: {
  movieId: string;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/movies/${movieId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not delete the title.");
      toast.success(`“${name}” deleted.`);
      router.push("/admin/library");
      router.refresh();
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : "Could not delete the title.";
      setError(message);
      toast.error(message);
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-red-400/20 bg-red-500/[0.04] p-4">
      <h2 className="text-[13px] font-semibold text-red-200">Danger zone</h2>
      <p className="mt-1 text-[11.5px] leading-relaxed text-white/40">
        Deleting a title also removes its stream, subtitles and provider asset. This
        cannot be undone. Archive it instead if you only want to hide it.
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-[11.5px] leading-relaxed text-red-300">
          {error}
        </p>
      ) : null}

      {open ? (
        <div className="mt-3 rounded-xl border border-red-400/25 bg-red-500/10 p-3">
          <p className="flex gap-2 text-[12px] leading-relaxed text-red-100">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Delete “{name}” permanently?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-red-500 px-3.5 text-[11.5px] font-semibold text-white transition hover:bg-red-400 disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-3.5" aria-hidden />
              )}
              {pending ? "Deleting…" : "Delete permanently"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="inline-flex h-9 items-center rounded-full border border-white/15 px-3.5 text-[11.5px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-red-400/30 px-3.5 text-[11.5px] font-semibold text-red-200 transition hover:border-red-300/50 hover:bg-red-500/10"
        >
          <Trash2 className="size-3.5" aria-hidden />
          Delete title
        </button>
      )}
    </section>
  );
}
