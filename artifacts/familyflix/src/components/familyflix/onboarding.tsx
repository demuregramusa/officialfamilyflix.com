"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, Clapperboard } from "lucide-react";

import { allGenres, byGenre, posterUrl } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const MIN_SELECTED = 3;

export function OnboardingExperience({
  initialGenres,
}: {
  initialGenres: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialGenres);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const genres = allGenres.map((name) => {
    const sample = byGenre(name)[0];
    return { name, image: sample ? posterUrl(sample) : null };
  });

  function toggle(name: string) {
    setSelected((current) =>
      current.includes(name)
        ? current.filter((genre) => genre !== name)
        : [...current, name],
    );
  }

  async function save(genresToSave: string[]) {
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favoriteGenres: genresToSave }),
      });

      if (res.status === 401) {
        router.replace("/auth/sign-in");
        return false;
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Could not save your preferences.");
        return false;
      }

      return true;
    } catch {
      setError("Something went wrong. Please try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function onContinue() {
    if (selected.length < MIN_SELECTED) return;
    if (await save(selected)) {
      router.replace("/");
      router.refresh();
    }
  }

  async function onSkip() {
    if (await save([])) {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#08060f]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand/25 blur-[120px]"
      />

      <div className="relative mx-auto w-full max-w-[1200px] px-4 pb-20 pt-12 sm:px-6 md:px-8 md:pt-16 xl:px-12">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b79dff]">
            <Clapperboard className="size-3.5" aria-hidden />
            Make it yours
          </div>
          <h1 className="mt-4 text-[34px] font-black leading-none tracking-[-0.04em] text-white sm:text-[44px]">
            Pick what you love
          </h1>
          <p className="mt-3 max-w-[54ch] text-[14px] leading-relaxed text-white/55">
            Choose at least {MIN_SELECTED} genres and we will tune your home feed
            around them. You can change these anytime.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {genres.map((genre) => {
            const active = selected.includes(genre.name);
            return (
              <button
                key={genre.name}
                type="button"
                onClick={() => toggle(genre.name)}
                aria-pressed={active}
                className={cn(
                  "group relative aspect-[2/3] overflow-hidden rounded-xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "border-brand ring-2 ring-brand"
                    : "border-white/10 hover:border-white/30",
                )}
              >
                {genre.image ? (
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                    style={{ backgroundImage: `url("${genre.image}")` }}
                  />
                ) : (
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-br from-[#1a0b3f] to-[#0b0714]"
                  />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />

                <span
                  className={cn(
                    "absolute right-2 top-2 grid size-6 place-items-center rounded-full border transition",
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-white/40 bg-black/40 text-transparent",
                  )}
                >
                  <Check className="size-3.5" aria-hidden />
                </span>

                <span className="absolute inset-x-0 bottom-0 p-3">
                  <span className="block text-[14px] font-bold text-white">
                    {genre.name}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12.5px] leading-relaxed text-red-200"
          >
            {error}
          </p>
        ) : null}

        <div className="sticky bottom-0 mt-8 flex flex-col items-center gap-3 border-t border-white/[0.06] bg-[#08060f]/95 py-4 backdrop-blur sm:flex-row sm:justify-between">
          <p className="text-[12.5px] text-white/45">
            {selected.length === 0
              ? `Select at least ${MIN_SELECTED} to continue`
              : `${selected.length} selected`}
          </p>
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <button
              type="button"
              onClick={onSkip}
              disabled={pending}
              className="inline-flex h-11 items-center justify-center rounded-full px-5 text-[13px] font-semibold text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={onContinue}
              disabled={pending || selected.length < MIN_SELECTED}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-brand px-6 text-[13.5px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              {pending ? "Saving…" : "Continue"}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
