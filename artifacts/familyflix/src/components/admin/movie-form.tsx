"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export interface MovieFormValues {
  name: string;
  slug: string;
  kind: "movie" | "series" | "live";
  status: "draft" | "published" | "archived";
  tagline: string;
  synopsis: string;
  year: string;
  rating: string;
  score: string;
  durationMinutes: string;
  seasons: string;
  creator: string;
  cast: string;
  genres: string;
  posterUrl: string;
  backdropUrl: string;
  featured: boolean;
  rightsHolder: string;
  licenseType: "owned" | "public_domain" | "creative_commons" | "licensed" | "unlicensed";
  licenseTerritory: string;
  licenseExpiresAt: string;
  sourceUrl: string;
  rightsConfirmed: boolean;
}

export interface MoviePassThrough {
  episodes?: unknown[];
  live?: unknown;
  palette?: [string, string] | null;
  imageId?: string | null;
  tmdbId?: number | null;
}

interface TmdbCandidate {
  tmdbId: number;
  name: string;
  year: number | null;
  synopsis: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  voteAverage: number | null;
}

interface TmdbDetails {
  tmdbId: number;
  name: string;
  tagline: string;
  synopsis: string;
  year: number | null;
  rating: string;
  durationMinutes: number | null;
  seasons: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  cast: string[];
  creator: string;
}

const inputClass =
  "h-10 w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 text-[13px] text-white placeholder:text-white/25 transition focus:border-[#8b5cff] focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-brand/20";
const areaClass =
  "w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2.5 text-[13px] leading-relaxed text-white placeholder:text-white/25 transition focus:border-[#8b5cff] focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-brand/20";
const labelClass = "mb-1.5 block text-[11.5px] font-semibold text-white/60";
const hintClass = "mt-1 text-[11px] leading-relaxed text-white/30";

const LICENSE_OPTIONS = [
  ["unlicensed", "Not confirmed"],
  ["licensed", "Licensed"],
  ["owned", "Owned outright"],
  ["public_domain", "Public domain"],
  ["creative_commons", "Creative Commons"],
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

function toDateInput(value: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export function movieToFormValues(movie: {
  name: string;
  slug: string;
  kind: "movie" | "series" | "live";
  status: "draft" | "published" | "archived";
  tagline: string | null;
  synopsis: string;
  year: number | null;
  rating: string | null;
  score: number;
  durationMinutes: number | null;
  seasons: number | null;
  creator: string | null;
  cast: string[];
  posterUrl: string | null;
  backdropUrl: string | null;
  featured: boolean;
  rightsHolder: string | null;
  licenseType: "owned" | "public_domain" | "creative_commons" | "licensed" | "unlicensed";
  licenseTerritory: string | null;
  licenseExpiresAt: Date | null;
  sourceUrl: string | null;
  rightsConfirmedAt: Date | null;
}, genres: string[]): MovieFormValues {
  return {
    name: movie.name,
    slug: movie.slug,
    kind: movie.kind,
    status: movie.status,
    tagline: movie.tagline ?? "",
    synopsis: movie.synopsis,
    year: movie.year?.toString() ?? "",
    rating: movie.rating ?? "",
    score: String(movie.score ?? 0),
    durationMinutes: movie.durationMinutes?.toString() ?? "",
    seasons: movie.seasons?.toString() ?? "",
    creator: movie.creator ?? "",
    cast: movie.cast.join(", "),
    genres: genres.join(", "),
    posterUrl: movie.posterUrl ?? "",
    backdropUrl: movie.backdropUrl ?? "",
    featured: movie.featured,
    rightsHolder: movie.rightsHolder ?? "",
    licenseType: movie.licenseType,
    licenseTerritory: movie.licenseTerritory ?? "",
    licenseExpiresAt: toDateInput(movie.licenseExpiresAt),
    sourceUrl: movie.sourceUrl ?? "",
    rightsConfirmed: Boolean(movie.rightsConfirmedAt),
  };
}

export const emptyMovieFormValues: MovieFormValues = {
  name: "",
  slug: "",
  kind: "movie",
  status: "draft",
  tagline: "",
  synopsis: "",
  year: "",
  rating: "",
  score: "0",
  durationMinutes: "",
  seasons: "",
  creator: "",
  cast: "",
  genres: "",
  posterUrl: "",
  backdropUrl: "",
  featured: false,
  rightsHolder: "",
  licenseType: "unlicensed",
  licenseTerritory: "Worldwide",
  licenseExpiresAt: "",
  sourceUrl: "",
  rightsConfirmed: false,
};

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function MovieForm({
  mode,
  movieId,
  initial,
  passThrough,
  tmdbEnabled,
  canManageRights,
  canPublish,
}: {
  mode: "create" | "edit";
  movieId?: string;
  initial: MovieFormValues;
  passThrough?: MoviePassThrough;
  tmdbEnabled: boolean;
  canManageRights: boolean;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<MovieFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbKind, setTmdbKind] = useState<"movie" | "series">(
    initial.kind === "series" ? "series" : "movie",
  );
  const [tmdbPending, setTmdbPending] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [tmdbResults, setTmdbResults] = useState<TmdbCandidate[] | null>(null);
  const [importingId, setImportingId] = useState<number | null>(null);

  function set<K extends keyof MovieFormValues>(key: K, value: MovieFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function onNameChange(value: string) {
    setValues((current) => ({
      ...current,
      name: value,
      slug: slugTouched ? current.slug : slugify(value),
    }));
  }

  async function runTmdbSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tmdbQuery.trim().length < 2) {
      setTmdbError("Enter at least two characters to search TMDb.");
      return;
    }
    setTmdbPending(true);
    setTmdbError(null);
    try {
      const response = await fetch(
        `/api/admin/tmdb/search?q=${encodeURIComponent(tmdbQuery.trim())}&kind=${tmdbKind}`,
      );
      const payload = (await response.json()) as { results?: TmdbCandidate[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "TMDb search failed.");
      setTmdbResults(payload.results ?? []);
    } catch (issue) {
      setTmdbError(issue instanceof Error ? issue.message : "TMDb search failed.");
      setTmdbResults(null);
    } finally {
      setTmdbPending(false);
    }
  }

  async function importCandidate(candidate: TmdbCandidate) {
    setImportingId(candidate.tmdbId);
    setTmdbError(null);
    try {
      const response = await fetch(
        `/api/admin/tmdb/details?kind=${tmdbKind}&id=${candidate.tmdbId}`,
      );
      const payload = (await response.json()) as { details?: TmdbDetails; error?: string };
      if (!response.ok || !payload.details) {
        throw new Error(payload.error ?? "Could not load the TMDb details.");
      }
      const details = payload.details;
      setValues((current) => ({
        ...current,
        name: details.name || current.name,
        slug: slugTouched
          ? current.slug
          : slugify(details.name || current.name),
        tagline: details.tagline || current.tagline,
        synopsis: details.synopsis || current.synopsis,
        year: details.year ? String(details.year) : current.year,
        rating: details.rating || current.rating,
        durationMinutes: details.durationMinutes
          ? String(details.durationMinutes)
          : current.durationMinutes,
        seasons: details.seasons ? String(details.seasons) : current.seasons,
        posterUrl: details.posterUrl || current.posterUrl,
        backdropUrl: details.backdropUrl || current.backdropUrl,
        genres: details.genres.length ? details.genres.join(", ") : current.genres,
        cast: details.cast.length ? details.cast.join(", ") : current.cast,
        creator: details.creator || current.creator,
        kind: tmdbKind === "series" ? "series" : current.kind === "live" ? "live" : "movie",
      }));
      toast.success(`Imported “${details.name}” from TMDb.`);
    } catch (issue) {
      setTmdbError(issue instanceof Error ? issue.message : "TMDb lookup failed.");
    } finally {
      setImportingId(null);
    }
  }

  function buildPayload() {
    return {
      name: values.name.trim(),
      slug: values.slug.trim(),
      kind: values.kind,
      status: values.status,
      tagline: values.tagline,
      synopsis: values.synopsis.trim(),
      year: numberOrNull(values.year),
      rating: values.rating,
      score: numberOrNull(values.score) ?? 0,
      durationMinutes: numberOrNull(values.durationMinutes),
      seasons: numberOrNull(values.seasons),
      creator: values.creator,
      cast: splitList(values.cast),
      genres: splitList(values.genres),
      posterUrl: values.posterUrl,
      backdropUrl: values.backdropUrl,
      featured: values.featured,
      ...(canManageRights
        ? {
            rightsHolder: values.rightsHolder,
            licenseType: values.licenseType,
            licenseTerritory: values.licenseTerritory,
            licenseExpiresAt: values.licenseExpiresAt
              ? new Date(`${values.licenseExpiresAt}T00:00:00.000Z`)
              : null,
            sourceUrl: values.sourceUrl,
            rightsConfirmed: values.rightsConfirmed,
          }
        : {}),
      episodes: passThrough?.episodes ?? [],
      live: passThrough?.live ?? null,
      palette: passThrough?.palette ?? null,
      imageId: passThrough?.imageId ?? null,
      tmdbId: passThrough?.tmdbId ?? null,
    };
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!values.name.trim()) {
      setError("Add a title name.");
      document.getElementById("movie-name")?.focus();
      return;
    }
    if (!values.slug.trim()) {
      setError("Add a slug.");
      document.getElementById("movie-slug")?.focus();
      return;
    }
    if (!values.synopsis.trim()) {
      setError("Add a synopsis.");
      document.getElementById("movie-synopsis")?.focus();
      return;
    }

    setPending(true);
    try {
      const response = await fetch(
        mode === "create" ? "/api/admin/movies" : `/api/admin/movies/${movieId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        },
      );
      const payload = (await response.json()) as {
        movie?: { id: string; name: string };
        error?: string;
      };
      if (!response.ok || !payload.movie) {
        throw new Error(payload.error ?? "Could not save the title.");
      }

      if (mode === "create") {
        toast.success(`“${payload.movie.name}” saved as a draft.`);
        router.push(`/admin/library/${payload.movie.id}`);
        router.refresh();
        return;
      }

      toast.success("Changes saved.");
      router.refresh();
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : "Could not save the title.";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <h2 className="text-[13px] font-semibold text-white">Details</h2>
            <p className="mt-0.5 text-[11.5px] text-white/35">
              The title, type and description shown across the catalog.
            </p>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="movie-name" className={labelClass}>
                Name
              </label>
              <input
                id="movie-name"
                type="text"
                required
                maxLength={160}
                value={values.name}
                onChange={(event) => onNameChange(event.target.value)}
                className={inputClass}
                placeholder="Harbor Lights"
              />
            </div>

            <div>
              <label htmlFor="movie-slug" className={labelClass}>
                Slug
              </label>
              <input
                id="movie-slug"
                type="text"
                required
                maxLength={160}
                value={values.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  set("slug", event.target.value);
                }}
                className={inputClass}
                placeholder="his-girl-friday"
              />
              <p className={hintClass}>Public URL: /title/{values.slug || "slug"}</p>
            </div>

            <div>
              <label htmlFor="movie-kind" className={labelClass}>
                Type
              </label>
              <select
                id="movie-kind"
                value={values.kind}
                onChange={(event) =>
                  set("kind", event.target.value as MovieFormValues["kind"])
                }
                className={inputClass}
              >
                <option value="movie">Movie</option>
                <option value="series">Series</option>
                <option value="live">Live channel</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="movie-tagline" className={labelClass}>
                Tagline <span className="font-normal text-white/30">(optional)</span>
              </label>
              <input
                id="movie-tagline"
                type="text"
                maxLength={220}
                value={values.tagline}
                onChange={(event) => set("tagline", event.target.value)}
                className={inputClass}
                placeholder="Every town keeps one secret too many."
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="movie-synopsis" className={labelClass}>
                Synopsis
              </label>
              <textarea
                id="movie-synopsis"
                required
                rows={4}
                maxLength={4000}
                value={values.synopsis}
                onChange={(event) => set("synopsis", event.target.value)}
                className={areaClass}
                placeholder="What is this title about?"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
              <div>
                <label htmlFor="movie-year" className={labelClass}>
                  Year
                </label>
                <input
                  id="movie-year"
                  type="number"
                  inputMode="numeric"
                  min={1900}
                  max={2100}
                  value={values.year}
                  onChange={(event) => set("year", event.target.value)}
                  className={inputClass}
                  placeholder="2025"
                />
              </div>
              <div>
                <label htmlFor="movie-rating" className={labelClass}>
                  Rating
                </label>
                <input
                  id="movie-rating"
                  type="text"
                  maxLength={20}
                  value={values.rating}
                  onChange={(event) => set("rating", event.target.value)}
                  className={inputClass}
                  placeholder="PG-13"
                />
              </div>
              <div>
                <label htmlFor="movie-score" className={labelClass}>
                  Match score
                </label>
                <input
                  id="movie-score"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={values.score}
                  onChange={(event) => set("score", event.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="movie-duration" className={labelClass}>
                  Minutes
                </label>
                <input
                  id="movie-duration"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  value={values.durationMinutes}
                  onChange={(event) => set("durationMinutes", event.target.value)}
                  className={inputClass}
                  placeholder="108"
                />
              </div>
            </div>

            {values.kind === "series" ? (
              <div>
                <label htmlFor="movie-seasons" className={labelClass}>
                  Seasons
                </label>
                <input
                  id="movie-seasons"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  value={values.seasons}
                  onChange={(event) => set("seasons", event.target.value)}
                  className={inputClass}
                  placeholder="2"
                />
              </div>
            ) : null}

            <div className={values.kind === "series" ? "" : "sm:col-span-2"}>
              <label htmlFor="movie-creator" className={labelClass}>
                Creator / director <span className="font-normal text-white/30">(optional)</span>
              </label>
              <input
                id="movie-creator"
                type="text"
                maxLength={160}
                value={values.creator}
                onChange={(event) => set("creator", event.target.value)}
                className={inputClass}
                placeholder="Ava Mercer"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="movie-genres" className={labelClass}>
                Genres
              </label>
              <input
                id="movie-genres"
                type="text"
                value={values.genres}
                onChange={(event) => set("genres", event.target.value)}
                className={inputClass}
                placeholder="Drama, Mystery, Thriller"
              />
              <p className={hintClass}>Comma separated. New genres are created automatically.</p>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="movie-cast" className={labelClass}>
                Cast
              </label>
              <input
                id="movie-cast"
                type="text"
                value={values.cast}
                onChange={(event) => set("cast", event.target.value)}
                className={inputClass}
                placeholder="Jordan Lee, Sam Rivera, Priya Nair"
              />
              <p className={hintClass}>Comma separated, up to 40 names.</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <h2 className="text-[13px] font-semibold text-white">Artwork</h2>
            <p className="mt-0.5 text-[11.5px] text-white/35">
              Leave blank to keep the demo artwork already on the site.
            </p>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <div>
              <label htmlFor="movie-poster" className={labelClass}>
                Poster URL
              </label>
              <input
                id="movie-poster"
                type="url"
                value={values.posterUrl}
                onChange={(event) => set("posterUrl", event.target.value)}
                className={inputClass}
                placeholder="https://…/poster.jpg"
              />
            </div>
            <div>
              <label htmlFor="movie-backdrop" className={labelClass}>
                Backdrop URL
              </label>
              <input
                id="movie-backdrop"
                type="url"
                value={values.backdropUrl}
                onChange={(event) => set("backdropUrl", event.target.value)}
                className={inputClass}
                placeholder="https://…/backdrop.jpg"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <h2 className="text-[13px] font-semibold text-white">Licensing &amp; rights</h2>
            <p className="mt-0.5 text-[11.5px] text-white/35">
              {canManageRights
                ? "A title cannot be published until these are recorded."
                : "Only administrators can view or change licensing and rights."}
            </p>
          </div>
          {canManageRights ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <div>
              <label htmlFor="movie-rights-holder" className={labelClass}>
                Rights holder
              </label>
              <input
                id="movie-rights-holder"
                type="text"
                maxLength={240}
                value={values.rightsHolder}
                onChange={(event) => set("rightsHolder", event.target.value)}
                className={inputClass}
                placeholder="Studio or distributor name"
              />
            </div>
            <div>
              <label htmlFor="movie-license-type" className={labelClass}>
                License type
              </label>
              <select
                id="movie-license-type"
                value={values.licenseType}
                onChange={(event) =>
                  set("licenseType", event.target.value as MovieFormValues["licenseType"])
                }
                className={inputClass}
              >
                {LICENSE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="movie-territory" className={labelClass}>
                Territory
              </label>
              <input
                id="movie-territory"
                type="text"
                maxLength={120}
                value={values.licenseTerritory}
                onChange={(event) => set("licenseTerritory", event.target.value)}
                className={inputClass}
                placeholder="Worldwide"
              />
            </div>
            <div>
              <label htmlFor="movie-expires" className={labelClass}>
                License expires
              </label>
              <input
                id="movie-expires"
                type="date"
                value={values.licenseExpiresAt}
                onChange={(event) => set("licenseExpiresAt", event.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="movie-source" className={labelClass}>
                Source / agreement URL
              </label>
              <input
                id="movie-source"
                type="url"
                value={values.sourceUrl}
                onChange={(event) => set("sourceUrl", event.target.value)}
                className={inputClass}
                placeholder="https://…/license-agreement"
              />
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={values.rightsConfirmed}
                onChange={(event) => set("rightsConfirmed", event.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-white/25 bg-white/10 accent-[#6d28ff]"
              />
              <span className="text-[12px] leading-relaxed text-white/65">
                I confirm FamilyFlix holds the rights to distribute this title in the
                listed territory.
              </span>
            </label>
          </div>
          ) : (
            <p className="flex items-start gap-2 p-4 text-[11.5px] leading-relaxed text-white/40">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-300" aria-hidden />
              Rights and licence fields are hidden. Ask an administrator to record them
              before the title can be published.
            </p>
          )}
        </section>
      </div>

      <div className="space-y-4">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="text-[13px] font-semibold text-white">Publishing</h2>

          <div className="mt-3 space-y-1.5">
            <label htmlFor="movie-status" className={labelClass}>
              Status
            </label>
            {canPublish ? (
              <select
                id="movie-status"
                value={values.status}
                onChange={(event) =>
                  set("status", event.target.value as MovieFormValues["status"])
                }
                className={inputClass}
              >
                <option value="draft">Draft</option>
                {mode === "edit" ? <option value="published">Published</option> : null}
                <option value="archived">Archived</option>
              </select>
            ) : (
              <>
                <p className="inline-flex h-10 w-full items-center rounded-lg border border-white/10 bg-white/[0.02] px-3 text-[12.5px] capitalize text-white/55">
                  {values.status}
                </p>
                <p className={hintClass}>
                  Publishing, archiving and deletion are administrator-only. Your edits
                  stay on the current status.
                </p>
              </>
            )}
            {mode === "create" ? (
              <p className={hintClass}>
                New titles start as drafts. Save, attach a stream, then publish.
              </p>
            ) : null}
          </div>

          <label className="mt-3 flex items-center gap-3 text-[12px] text-white/65">
            <input
              type="checkbox"
              checked={values.featured}
              onChange={(event) => set("featured", event.target.checked)}
              className="size-4 rounded border-white/25 bg-white/10 accent-[#6d28ff]"
            />
            Feature on the homepage
          </label>

          {error ? (
            <p
              role="alert"
              className="mt-3 flex gap-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-[12px] leading-relaxed text-red-200"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-[13px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : mode === "create" ? (
              "Save draft"
            ) : (
              "Save changes"
            )}
          </button>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
            <Sparkles className="size-3.5 text-[#b79dff]" aria-hidden />
            Import from TMDb
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-white/35">
            Fill the details and artwork from The Movie Database.
          </p>

          {!tmdbEnabled ? (
            <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11.5px] leading-relaxed text-white/45">
              Add TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN to enable import.
            </p>
          ) : (
            <>
              <form onSubmit={runTmdbSearch} className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="search"
                    value={tmdbQuery}
                    onChange={(event) => setTmdbQuery(event.target.value)}
                    aria-label="Search TMDb"
                    placeholder="Search TMDb"
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    disabled={tmdbPending}
                    aria-label="Search TMDb"
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/15 text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-50"
                  >
                    {tmdbPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Search className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
                <select
                  value={tmdbKind}
                  onChange={(event) =>
                    setTmdbKind(event.target.value === "series" ? "series" : "movie")
                  }
                  aria-label="TMDb type"
                  className={inputClass}
                >
                  <option value="movie">Movie</option>
                  <option value="series">Series</option>
                </select>
              </form>

              {tmdbError ? (
                <p role="alert" className="mt-2 text-[11.5px] leading-relaxed text-red-300">
                  {tmdbError}
                </p>
              ) : null}

              {tmdbResults ? (
                tmdbResults.length === 0 ? (
                  <p className="mt-3 text-[11.5px] text-white/40">
                    No titles matched that search.
                  </p>
                ) : (
                  <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
                    {tmdbResults.map((candidate) => (
                      <li key={candidate.tmdbId}>
                        <button
                          type="button"
                          onClick={() => importCandidate(candidate)}
                          disabled={importingId !== null}
                          className="flex w-full items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.02] p-2 text-left transition hover:border-white/25 hover:bg-white/[0.05] disabled:opacity-60"
                        >
                          <span className="relative h-14 w-9 shrink-0 overflow-hidden rounded bg-white/[0.06]">
                            {candidate.posterUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={candidate.posterUrl}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-medium text-white">
                              {candidate.name}
                            </span>
                            <span className="block text-[10.5px] text-white/35">
                              {candidate.year ?? "—"}
                              {candidate.voteAverage
                                ? ` · ${candidate.voteAverage.toFixed(1)}/10`
                                : ""}
                            </span>
                          </span>
                          {importingId === candidate.tmdbId ? (
                            <Loader2 className="size-3.5 shrink-0 animate-spin text-white/50" aria-hidden />
                          ) : (
                            <Download className="size-3.5 shrink-0 text-white/35" aria-hidden />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </>
          )}
        </section>

        <div className="flex items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-white/40">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-white/30" aria-hidden />
          Publishing is checked on the server. Missing rights or a stream will block it.
        </div>
      </div>
    </form>
  );
}
