import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";
import { z } from "zod";

import type { AdminSessionInfo } from "@/lib/admin/movies";
import { logAudit } from "@/lib/admin/movies";
import type { ImportedTitle } from "@/lib/imported";
import { db } from "@/lib/db";
import { genres, movieGenres, movies, videoAssets } from "@/lib/db/schema";
import { getTmdbDetails, tmdbConfigured } from "@/lib/video/tmdb";

export const IMPORT_LIMITS = {
  maxRows: 2000,
  maxBytes: 5 * 1024 * 1024,
  maxIssues: 100,
};

export const IMPORT_COLUMNS: {
  name: string;
  required: boolean;
  description: string;
}[] = [
  { name: "title", required: true, description: "Display name. Alias: name." },
  {
    name: "synopsis",
    required: true,
    description: "Short description. Aliases: description, overview, summary.",
  },
  {
    name: "mp4Url",
    required: true,
    description:
      "Direct MP4 or HLS URL you are licensed to serve. Aliases: hlsUrl, streamUrl, videoUrl, mp4.",
  },
  {
    name: "licenseType",
    required: true,
    description: "owned | licensed | public_domain | creative_commons.",
  },
  {
    name: "rightsHolder",
    required: true,
    description: "Who granted the rights. Aliases: rights_holder, licensor.",
  },
  {
    name: "sourceUrl",
    required: true,
    description:
      "Link to the licence, contract or source page. Required unless licenseType is owned.",
  },
  { name: "year", required: false, description: "Release year, 1900–2100." },
  {
    name: "kind",
    required: false,
    description: "movie (default) or series. Alias: type.",
  },
  { name: "tagline", required: false, description: "One-line tagline." },
  {
    name: "genres",
    required: false,
    description: "Separate with | or commas. Up to 12.",
  },
  { name: "cast", required: false, description: "Separate with |. Up to 40 names." },
  { name: "creator", required: false, description: "Director or creator." },
  { name: "rating", required: false, description: "Age rating, e.g. PG-13." },
  {
    name: "score",
    required: false,
    description: "0–100. voteAverage (0–10) is also accepted.",
  },
  {
    name: "durationMinutes",
    required: false,
    description: "Minutes, or a value like 1h 52m. Aliases: runtime, duration.",
  },
  { name: "seasons", required: false, description: "Season count for series." },
  { name: "posterUrl", required: false, description: "Portrait artwork URL." },
  { name: "backdropUrl", required: false, description: "Wide artwork URL." },
  {
    name: "licenseTerritory",
    required: false,
    description: "Defaults to Worldwide.",
  },
  {
    name: "licenseExpiresAt",
    required: false,
    description: "ISO date. Dates in the past are rejected.",
  },
  {
    name: "tmdbId",
    required: false,
    description: "Optional. Fills missing artwork, cast and synopsis via TMDb.",
  },
  { name: "featured", required: false, description: "true/false homepage feature." },
  { name: "badge", required: false, description: "Small label, e.g. New." },
];

const LICENSE_VALUES = [
  "owned",
  "licensed",
  "public_domain",
  "creative_commons",
] as const;

type LicenseValue = (typeof LICENSE_VALUES)[number];

interface ImportRow {
  name: string;
  synopsis: string;
  kind: "movie" | "series";
  mp4Url: string | null;
  hlsUrl: string | null;
  licenseType: LicenseValue;
  rightsHolder: string;
  sourceUrl: string | null;
  year: number | null;
  tagline: string | null;
  genres: string[];
  cast: string[];
  creator: string | null;
  rating: string | null;
  badge: string | null;
  score: number;
  durationMinutes: number | null;
  seasons: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  licenseTerritory: string;
  licenseExpiresAt: Date | null;
  tmdbId: number | null;
  featured: boolean;
}

export interface ImportIssue {
  row: number;
  title: string;
  message: string;
}

export interface ImportReport {
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

export class ImportError extends Error {}

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => /^https?:\/\//i.test(value), {
    message: "Must be a full http(s) URL.",
  });

function requireUrl(value: string, field: string) {
  const parsed = httpUrl.safeParse(value);
  if (!parsed.success) {
    throw new ImportError(`${field} must be a full http(s) URL.`);
  }
  return parsed.data;
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cell(row: Record<string, unknown>, ...names: string[]) {
  const lookup = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    lookup.set(normalizeKey(key), value);
  }
  for (const name of names) {
    const key = normalizeKey(name);
    if (!lookup.has(key)) continue;
    const value = lookup.get(key);
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.map((item) => String(item)).join("|");
    if (typeof value === "boolean") return value ? "true" : "false";
    return String(value);
  }
  return "";
}

function parseCsv(text: string): Record<string, unknown>[] {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine =
    clean.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  const delimiter = !firstLine.includes(",") && firstLine.includes("\t") ? "\t" : ",";

  const records: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (quoted) {
      if (char === '"') {
        if (clean[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      records.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }
  if (value.length || row.length) {
    row.push(value);
    records.push(row);
  }

  const [header, ...body] = records.filter((entry) =>
    entry.some((entryValue) => entryValue.trim().length > 0),
  );
  if (!header) throw new ImportError("The file has no header row.");

  const keys = header.map((name) => name.trim());
  return body.map((entry) => {
    const mapped: Record<string, unknown> = {};
    keys.forEach((key, position) => {
      if (key) mapped[key] = entry[position] ?? "";
    });
    return mapped;
  });
}

const JSON_ARRAY_KEYS = [
  "titles",
  "movies",
  "results",
  "data",
  "items",
  "films",
  "content",
];

function parseJson(text: string): Record<string, unknown>[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError("The JSON could not be parsed.");
  }

  const asList = (value: unknown): unknown[] | null => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    for (const key of JSON_ARRAY_KEYS) {
      const candidate = record[key];
      if (Array.isArray(candidate)) return candidate;
    }
    return null;
  };

  let list = asList(parsed);

  if (!list && parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>;
    if ("title" in record || "name" in record) list = [parsed];
  }

  if (!list) {
    throw new ImportError(
      "Expected a JSON array, a single title object, or an object with a titles, movies, results, data, items, films or content array.",
    );
  }

  return list.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new ImportError("Every entry must be an object.");
    }
    return entry as Record<string, unknown>;
  });
}

function parseRows(text: string): Record<string, unknown>[] {
  const trimmed = text.trim();
  if (!trimmed) throw new ImportError("Paste a CSV or JSON file first.");
  return trimmed.startsWith("[") || trimmed.startsWith("{")
    ? parseJson(trimmed)
    : parseCsv(trimmed);
}

function splitList(value: string, max: number) {
  const list = value
    .split(/[|;]+/)
    .flatMap((part) => (part.includes(",") ? part.split(",") : [part]))
    .map((part) => part.trim())
    .filter(Boolean);
  return Array.from(new Set(list)).slice(0, max);
}

function parseDuration(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const minutes = Number(trimmed);
    return minutes > 0 && minutes <= 1000 ? minutes : null;
  }
  const match = trimmed.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/);
  if (!match) return null;
  const minutes = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
  return minutes > 0 && minutes <= 1000 ? minutes : null;
}

function parseDate(value: string): Date | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeRow(row: Record<string, unknown>): ImportRow {
  const title = cell(row, "title", "name").trim();
  if (!title) throw new ImportError("Missing title.");

  const kindValue = cell(row, "kind", "type").trim().toLowerCase();
  const kind: "movie" | "series" =
    kindValue === "series" || kindValue === "tv" || kindValue === "tvshow"
      ? "series"
      : "movie";

  const mp4Raw = cell(row, "mp4Url", "mp4", "streamUrl", "videoUrl").trim();
  const hlsRaw = cell(row, "hlsUrl", "hls").trim();
  const mp4Url = mp4Raw ? requireUrl(mp4Raw, "mp4Url") : null;
  const hlsUrl = hlsRaw ? requireUrl(hlsRaw, "hlsUrl") : null;
  if (!mp4Url && !hlsUrl) {
    throw new ImportError("Add a stream URL (mp4Url or hlsUrl).");
  }

  const licenseRaw = cell(row, "licenseType", "license", "licenceType")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!LICENSE_VALUES.includes(licenseRaw as LicenseValue)) {
    throw new ImportError(
      `licenseType must be one of ${LICENSE_VALUES.join(", ")} (got “${
        licenseRaw || "blank"
      }”).`,
    );
  }
  const licenseType = licenseRaw as LicenseValue;

  const rightsHolder = cell(row, "rightsHolder", "rights_holder", "licensor").trim();
  if (!rightsHolder) throw new ImportError("Add the rights holder.");

  const sourceRaw = cell(row, "sourceUrl", "source_url", "licenseUrl").trim();
  const sourceUrl = sourceRaw ? requireUrl(sourceRaw, "sourceUrl") : null;
  if (!sourceUrl && licenseType !== "owned") {
    throw new ImportError("Add sourceUrl (the licence or contract link).");
  }

  const synopsis = cell(row, "synopsis", "description", "overview", "summary").trim();
  if (!synopsis) throw new ImportError("Add a synopsis.");

  const licenseExpiresAt = parseDate(
    cell(row, "licenseExpiresAt", "license_expires_at", "expiresAt"),
  );
  if (licenseExpiresAt && licenseExpiresAt.getTime() < Date.now()) {
    throw new ImportError("The licence expiry date is in the past.");
  }

  const posterRaw = cell(row, "posterUrl", "poster", "poster_url", "cover").trim();
  const posterUrl = posterRaw ? requireUrl(posterRaw, "posterUrl") : null;
  const backdropRaw = cell(row, "backdropUrl", "backdrop", "background").trim();
  const backdropUrl = backdropRaw ? requireUrl(backdropRaw, "backdropUrl") : null;

  const yearRaw = Number(cell(row, "year"));
  const year =
    Number.isInteger(yearRaw) && yearRaw >= 1900 && yearRaw <= 2100 ? yearRaw : null;

  const scoreRaw = Number(cell(row, "score"));
  const voteAverage = Number(cell(row, "voteAverage"));
  const score = Number.isFinite(voteAverage)
    ? Math.round(voteAverage * 10)
    : Number.isFinite(scoreRaw)
      ? Math.round(scoreRaw)
      : 0;

  const seasonsRaw = Number(cell(row, "seasons"));
  const tmdbRaw = Number(cell(row, "tmdbId", "tmdb_id"));

  return {
    name: title,
    synopsis,
    kind,
    mp4Url,
    hlsUrl,
    licenseType,
    rightsHolder,
    sourceUrl,
    year,
    tagline: cell(row, "tagline").trim() || null,
    genres: splitList(cell(row, "genres", "genre"), 12),
    cast: splitList(cell(row, "cast", "actors", "stars"), 40),
    creator: cell(row, "creator", "director").trim() || null,
    rating: cell(row, "rating", "certificate").trim() || null,
    badge: cell(row, "badge").trim() || null,
    score: Math.max(0, Math.min(100, score)),
    durationMinutes: parseDuration(
      cell(row, "durationMinutes", "runtime", "duration"),
    ),
    seasons:
      Number.isInteger(seasonsRaw) && seasonsRaw > 0 && seasonsRaw <= 100
        ? seasonsRaw
        : null,
    posterUrl,
    backdropUrl,
    licenseTerritory: cell(row, "licenseTerritory", "territory").trim() || "Worldwide",
    licenseExpiresAt,
    tmdbId: Number.isInteger(tmdbRaw) && tmdbRaw > 0 ? tmdbRaw : null,
    featured: ["true", "1", "yes", "y"].includes(
      cell(row, "featured").trim().toLowerCase(),
    ),
  };
}

const PALETTES: Record<string, [string, string]> = {
  Action: ["#1a0505", "#ef4444"],
  Adventure: ["#07120a", "#22c55e"],
  Animation: ["#2a0a2e", "#d946ef"],
  Comedy: ["#241205", "#f59e0b"],
  Crime: ["#0c1224", "#3b82f6"],
  Documentary: ["#14101f", "#a78bfa"],
  Drama: ["#141018", "#e11d48"],
  Family: ["#1d0a2e", "#f472b6"],
  Fantasy: ["#12002e", "#a855f7"],
  Horror: ["#0a0a0a", "#ef4444"],
  Mystery: ["#0b0d17", "#38bdf8"],
  Romance: ["#2b0b1f", "#fb7185"],
  "Science Fiction": ["#04122b", "#0ea5e9"],
  Thriller: ["#0b0d17", "#38bdf8"],
  Western: ["#2c1600", "#f59e0b"],
};

const FALLBACK_PALETTE: [string, string] = ["#12062e", "#6d28ff"];
const FALLBACK_IMAGE = "photo-1489599849927-2ee91cede3ba";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

async function enrichRow(row: ImportRow): Promise<ImportRow> {
  if (!row.tmdbId || row.kind !== "movie" || !tmdbConfigured()) return row;
  if (row.posterUrl && row.durationMinutes && row.cast.length) return row;

  try {
    const details = await getTmdbDetails("movie", row.tmdbId);
    return {
      ...row,
      tagline: row.tagline || details.tagline || null,
      year: row.year ?? details.year,
      rating: row.rating || details.rating || null,
      score: row.score || Math.round((details.voteAverage ?? 0) * 10),
      durationMinutes: row.durationMinutes ?? details.durationMinutes,
      genres: row.genres.length ? row.genres : details.genres.slice(0, 4),
      cast: row.cast.length ? row.cast : details.cast.slice(0, 6),
      creator: row.creator || details.creator || null,
      posterUrl: row.posterUrl ?? details.posterUrl,
      backdropUrl: row.backdropUrl ?? details.backdropUrl,
    };
  } catch {
    return row;
  }
}

function movieValues(row: ImportRow, slug: string, session: AdminSessionInfo) {
  return {
    slug,
    name: row.name,
    kind: row.kind,
    tagline: row.tagline,
    synopsis: row.synopsis,
    year: row.year,
    rating: row.rating,
    score: row.score,
    durationMinutes: row.durationMinutes,
    seasons: row.seasons,
    badge: row.badge,
    tmdbId: row.tmdbId,
    palette: PALETTES[row.genres[0] ?? ""] ?? FALLBACK_PALETTE,
    posterUrl: row.posterUrl,
    backdropUrl: row.backdropUrl,
    cast: row.cast,
    creator: row.creator,
    episodes: [],
    live: null,
    featured: row.featured,
    status: "published" as const,
    publishedAt: new Date(),
    rightsHolder: row.rightsHolder,
    licenseType: row.licenseType,
    licenseTerritory: row.licenseTerritory,
    licenseExpiresAt: row.licenseExpiresAt,
    sourceUrl: row.sourceUrl,
    rightsConfirmedAt: new Date(),
    createdBy: session.userId,
    updatedAt: new Date(),
  };
}

function snapshotEntry(row: ImportRow, slug: string): ImportedTitle {
  const poster = row.posterUrl ?? undefined;
  const backdrop = row.backdropUrl ?? undefined;
  const duration = row.durationMinutes
    ? row.durationMinutes >= 60
      ? `${Math.floor(row.durationMinutes / 60)}h ${String(
          row.durationMinutes % 60,
        ).padStart(2, "0")}m`
      : `${row.durationMinutes}m`
    : undefined;

  const tagline =
    row.tagline ?? (`${row.year ?? ""}`.trim() ? `${row.year} feature` : "Now streaming");

  return {
    slug,
    name: row.name,
    tagline,
    year: row.year ?? new Date().getFullYear(),
    type: row.kind,
    rating: row.rating ?? "NR",
    score: row.score,
    ...(duration ? { duration } : {}),
    ...(row.seasons ? { seasons: row.seasons } : {}),
    genres: row.genres.length ? row.genres : ["Drama"],
    synopsis: row.synopsis,
    cast: row.cast,
    creator: row.creator ?? "",
    image: poster ?? backdrop ?? FALLBACK_IMAGE,
    ...(poster ? { poster } : {}),
    ...(backdrop ? { backdrop } : {}),
    palette: PALETTES[row.genres[0] ?? ""] ?? FALLBACK_PALETTE,
    ...(row.badge ? { badge: row.badge } : {}),
    ...(row.featured ? { featured: true } : {}),
    ...(row.hlsUrl ? { hlsUrl: row.hlsUrl } : {}),
    ...(row.mp4Url ? { mp4Url: row.mp4Url } : {}),
    rightsHolder: row.rightsHolder,
    license: row.licenseType,
    sourceUrl: row.sourceUrl ?? "",
  };
}

const SNAPSHOT_PATH = path.join(process.cwd(), "src", "lib", "imported-titles.json");

async function writeSnapshot(entries: ImportedTitle[]) {
  let current: ImportedTitle[] = [];
  try {
    const parsed: unknown = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
    if (Array.isArray(parsed)) current = parsed as ImportedTitle[];
  } catch {
    current = [];
  }

  const replaced = new Set(entries.map((entry) => entry.slug));
  const next = [
    ...current.filter((entry) => !replaced.has(entry.slug)),
    ...entries,
  ].sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));

  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

export async function importTitles(options: {
  text: string;
  session: AdminSessionInfo;
  dryRun?: boolean;
  updateExisting?: boolean;
}): Promise<ImportReport> {
  const { text, session } = options;
  const dryRun = options.dryRun ?? false;
  const updateExisting = options.updateExisting ?? false;

  if (Buffer.byteLength(text, "utf8") > IMPORT_LIMITS.maxBytes) {
    throw new ImportError("That file is larger than 5 MB. Split it into batches.");
  }

  const rawRows = parseRows(text);
  if (rawRows.length > IMPORT_LIMITS.maxRows) {
    throw new ImportError(
      `Import ${IMPORT_LIMITS.maxRows} titles at a time or fewer (file has ${rawRows.length}).`,
    );
  }

  const existingSlugs = new Set(
    (await db.select({ slug: movies.slug }).from(movies)).map((row) => row.slug),
  );

  const report: ImportReport = {
    dryRun,
    total: rawRows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    issues: [],
    imported: [],
    snapshot: dryRun ? "skipped" : "written",
    warnings: [],
  };

  const pushIssue = (issue: ImportIssue) => {
    report.skipped += 1;
    if (report.issues.length < IMPORT_LIMITS.maxIssues) report.issues.push(issue);
  };

  const snapshotEntries: ImportedTitle[] = [];

  for (const [index, rawRow] of rawRows.entries()) {
    const rowNumber = index + 1;
    const title = cell(rawRow, "title", "name").trim() || "Untitled";

    let parsedRow: ImportRow;
    try {
      parsedRow = normalizeRow(rawRow);
    } catch (error) {
      pushIssue({
        row: rowNumber,
        title,
        message: error instanceof Error ? error.message : "Invalid row.",
      });
      continue;
    }

    parsedRow = await enrichRow(parsedRow);

    const slug = slugify(parsedRow.name) || `title-${rowNumber}`;
    const isUpdate = existingSlugs.has(slug);

    if (isUpdate && !updateExisting) {
      pushIssue({
        row: rowNumber,
        title: parsedRow.name,
        message: `“${slug}” already exists. Tick “Update existing titles” to replace it.`,
      });
      continue;
    }

    if (dryRun) {
      existingSlugs.add(slug);
      if (isUpdate) report.updated += 1;
      else report.created += 1;
      report.imported.push({ slug, name: parsedRow.name });
      continue;
    }

    try {
      const values = movieValues(parsedRow, slug, session);
      const { createdBy, ...updateValues } = values;
      void createdBy;

      const movieId = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(movies)
          .values(values)
          .onConflictDoUpdate({ target: movies.slug, set: updateValues })
          .returning({ id: movies.id });

        await tx.delete(movieGenres).where(eq(movieGenres.movieId, row.id));
        for (const name of parsedRow.genres) {
          const [genreRow] = await tx
            .insert(genres)
            .values({ name, slug: slugify(name) || "genre" })
            .onConflictDoUpdate({ target: genres.slug, set: { name } })
            .returning({ id: genres.id });
          await tx
            .insert(movieGenres)
            .values({ movieId: row.id, genreId: genreRow.id })
            .onConflictDoNothing();
        }

        const assetValues = {
          movieId: row.id,
          provider: "manual" as const,
          status: "ready" as const,
          hlsUrl:
            parsedRow.hlsUrl ??
            (parsedRow.mp4Url?.includes(".m3u8") ? parsedRow.mp4Url : null),
          mp4Url:
            parsedRow.mp4Url && !parsedRow.mp4Url.includes(".m3u8")
              ? parsedRow.mp4Url
              : null,
          signedPlayback: false,
          createdBy: session.userId,
          error: null,
          updatedAt: new Date(),
        };

        await tx
          .insert(videoAssets)
          .values(assetValues)
          .onConflictDoUpdate({
            target: videoAssets.movieId,
            set: assetValues,
          });

        return row.id;
      });

      if (!movieId) throw new ImportError("The title could not be saved.");

      existingSlugs.add(slug);
      snapshotEntries.push(snapshotEntry(parsedRow, slug));
      if (isUpdate) report.updated += 1;
      else report.created += 1;
      report.imported.push({ slug, name: parsedRow.name });
    } catch (error) {
      pushIssue({
        row: rowNumber,
        title: parsedRow.name,
        message:
          error instanceof Error ? error.message : "Could not save this title.",
      });
    }
  }

  if (!dryRun) {
    if (snapshotEntries.length) {
      try {
        await writeSnapshot(snapshotEntries);
      } catch {
        report.snapshot = "failed";
        report.warnings.push(
          "Titles were saved to the database, but the public catalog snapshot could not be written. Browse pages update after the next build or restart.",
        );
      }
    } else {
      report.snapshot = "skipped";
    }

    if (report.created || report.updated) {
      try {
        await logAudit(session, "movie.import", "movie", null, {
          created: report.created,
          updated: report.updated,
          skipped: report.skipped,
          sample: report.imported.slice(0, 5).map((entry) => entry.slug),
        });
      } catch {
        report.warnings.push("The audit entry could not be written.");
      }
    }
  }

  if (report.skipped > report.issues.length) {
    report.warnings.push(
      `${report.skipped - report.issues.length} more rows were skipped; only the first ${
        IMPORT_LIMITS.maxIssues
      } are listed.`,
    );
  }

  return report;
}

export function templateCsv() {
  const header = [
    "title",
    "year",
    "kind",
    "synopsis",
    "genres",
    "cast",
    "creator",
    "rating",
    "score",
    "durationMinutes",
    "posterUrl",
    "backdropUrl",
    "mp4Url",
    "licenseType",
    "rightsHolder",
    "licenseTerritory",
    "licenseExpiresAt",
    "sourceUrl",
    "tmdbId",
    "featured",
    "badge",
  ];
  const sample = [
    "Your Licensed Film",
    "2024",
    "movie",
    "A short description of the film.",
    "Drama|Family",
    "Lead Actor|Supporting Actor",
    "Director Name",
    "PG-13",
    "78",
    "112",
    "https://cdn.example.com/posters/film.jpg",
    "https://cdn.example.com/backdrops/film.jpg",
    "https://cdn.example.com/videos/film.mp4",
    "licensed",
    "Your Studio Ltd",
    "Worldwide",
    "",
    "https://example.com/licence-agreement.pdf",
    "",
    "false",
    "New",
  ];
  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  return `${header.join(",")}\n${sample.map(escape).join(",")}\n`;
}

export function templateJson() {
  const example = {
    titles: [
      {
        title: "Your Licensed Film",
        year: 2024,
        kind: "movie",
        synopsis: "A short description of the film.",
        genres: ["Drama", "Family"],
        cast: ["Lead Actor", "Supporting Actor"],
        creator: "Director Name",
        rating: "PG-13",
        score: 78,
        durationMinutes: 112,
        posterUrl: "https://cdn.example.com/posters/film.jpg",
        backdropUrl: "https://cdn.example.com/backdrops/film.jpg",
        mp4Url: "https://cdn.example.com/videos/film.mp4",
        licenseType: "licensed",
        rightsHolder: "Your Studio Ltd",
        licenseTerritory: "Worldwide",
        sourceUrl: "https://example.com/licence-agreement.pdf",
        featured: false,
        badge: "New",
      },
    ],
  };
  return `${JSON.stringify(example, null, 2)}\n`;
}
