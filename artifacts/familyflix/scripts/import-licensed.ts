import "dotenv/config";

import { readFile, writeFile } from "node:fs/promises";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { genres, movieGenres, movies, videoAssets } from "@/lib/db/schema";
import {
  getTmdbDetails,
  searchTmdb,
  tmdbConfigured,
  type TmdbDetails,
} from "@/lib/video/tmdb";

type LicenseValue = "licensed" | "public_domain" | "creative_commons" | "owned";

interface CsvRow {
  tmdbId: string;
  title: string;
  year: string;
  genres: string;
  posterUrl: string;
  backdropUrl: string;
  mp4Url: string;
  licenseType: string;
  rightsHolder: string;
  sourceUrl: string;
}

interface ImportedEntry {
  slug: string;
  name: string;
  tagline: string;
  year: number;
  type: "movie";
  rating: string;
  score: number;
  duration?: string;
  genres: string[];
  synopsis: string;
  cast: string[];
  creator: string;
  image: string;
  poster?: string;
  backdrop?: string;
  palette: [string, string];
  badge?: string;
  mp4Url: string;
  rightsHolder: string;
  license: LicenseValue;
  sourceUrl: string;
  tmdbId: number;
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
  History: ["#1a1408", "#a16207"],
  Horror: ["#0a0a0a", "#ef4444"],
  Music: ["#1a0426", "#e879f9"],
  Mystery: ["#0b0d17", "#38bdf8"],
  Romance: ["#2b0b1f", "#fb7185"],
  "Science Fiction": ["#04122b", "#0ea5e9"],
  Thriller: ["#0b0d17", "#38bdf8"],
  War: ["#1a1408", "#a16207"],
  Western: ["#2c1600", "#f59e0b"],
};

function arg(name: string, fallback: string) {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((value) => value.trim().length));
}

function formatDuration(minutes: number | null) {
  if (!minutes) return undefined;
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`
    : `${minutes}m`;
}

function normalizeLicense(value: string): LicenseValue {
  return value === "public_domain" ||
    value === "creative_commons" ||
    value === "owned"
    ? value
    : "licensed";
}

async function resolveDetails(row: CsvRow): Promise<TmdbDetails | null> {
  const id = Number(row.tmdbId);
  if (Number.isInteger(id) && id > 0) {
    try {
      return await getTmdbDetails("movie", id);
    } catch {
      return null;
    }
  }
  if (!row.title) return null;
  const results = await searchTmdb(row.title, "movie");
  if (!results.length) return null;
  const year = Number(row.year);
  const match =
    results.find((item) => year && item.year === year) ??
    results.find((item) => item.name.toLowerCase() === row.title.toLowerCase()) ??
    results[0];
  return getTmdbDetails("movie", match.tmdbId);
}

async function main() {
  if (!tmdbConfigured()) {
    throw new Error(
      "TMDb is not configured. Add TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN to .env.",
    );
  }

  const file = arg("file", "data/licensed-movies.csv");
  const prune = hasFlag("prune");

  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    throw new Error(
      `Could not read ${file}. Run "bun run tmdb:discover" first, add your licensed mp4Url values, then retry.`,
    );
  }

  const [header, ...dataRows] = parseCsv(text);
  if (!header) throw new Error(`${file} is empty.`);
  const index = new Map(header.map((name, position) => [name.trim(), position]));

  const existingSlugs = new Set(
    (await db.select({ slug: movies.slug }).from(movies)).map((row) => row.slug),
  );

  const imported: ImportedEntry[] = [];
  const failures: string[] = [];
  const seen = new Set<string>();

  for (const values of dataRows) {
    const cell = (name: string) =>
      (values[index.get(name) ?? -1] ?? "").trim();
    const row: CsvRow = {
      tmdbId: cell("tmdbId"),
      title: cell("title"),
      year: cell("year"),
      genres: cell("genres"),
      posterUrl: cell("posterUrl"),
      backdropUrl: cell("backdropUrl"),
      mp4Url: cell("mp4Url"),
      licenseType: cell("licenseType"),
      rightsHolder: cell("rightsHolder"),
      sourceUrl: cell("sourceUrl"),
    };

    if (!row.mp4Url) {
      failures.push(`${row.title || row.tmdbId}: missing mp4Url`);
      continue;
    }
    let parsed: URL;
    try {
      parsed = new URL(row.mp4Url);
    } catch {
      failures.push(`${row.title || row.tmdbId}: invalid mp4Url`);
      continue;
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      failures.push(`${row.title || row.tmdbId}: mp4Url must be http(s)`);
      continue;
    }
    if (seen.has(row.mp4Url)) {
      failures.push(`${row.title || row.tmdbId}: duplicate mp4Url`);
      continue;
    }
    seen.add(row.mp4Url);

    let details: TmdbDetails | null = null;
    try {
      details = await resolveDetails(row);
    } catch (error) {
      failures.push(
        `${row.title || row.tmdbId}: TMDB lookup failed (${error instanceof Error ? error.message : "unknown"})`,
      );
      continue;
    }
    if (!details) {
      failures.push(`${row.title || row.tmdbId}: no TMDB match`);
      continue;
    }

    const genreList = (details.genres.length
      ? details.genres
      : row.genres.split("|").map((value) => value.trim()).filter(Boolean)
    ).slice(0, 4);
    const year = details.year ?? (Number(row.year) || new Date().getFullYear());
    const baseSlug = slugify(`${details.name}-${year}`);
    let slug = baseSlug;
    let suffix = 2;
    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    existingSlugs.add(slug);

    const duration = formatDuration(details.durationMinutes);
    const palette = PALETTES[genreList[0] ?? ""] ?? ["#12062e", "#6d28ff"];
    const poster = details.posterUrl ?? (row.posterUrl || null);
    const backdrop = details.backdropUrl ?? (row.backdropUrl || null);
    const entry: ImportedEntry = {
      slug,
      name: details.name,
      tagline: details.tagline || `${year} · ${genreList[0] ?? "Feature film"}`,
      year,
      type: "movie",
      rating: details.rating || "NR",
      score: Math.max(0, Math.min(100, Math.round((details.voteAverage ?? 0) * 10))),
      ...(duration ? { duration } : {}),
      genres: genreList,
      synopsis: details.synopsis || row.title,
      cast: details.cast.slice(0, 6),
      creator: details.creator,
      image: poster ?? "",
      ...(poster ? { poster } : {}),
      ...(backdrop ? { backdrop } : {}),
      palette,
      mp4Url: row.mp4Url,
      rightsHolder: row.rightsHolder || "Licensed by FamilyFlix",
      license: normalizeLicense(row.licenseType),
      sourceUrl: row.sourceUrl,
      tmdbId: details.tmdbId,
    };

    const valuesForDb = {
      slug: entry.slug,
      name: entry.name,
      kind: "movie" as const,
      tagline: entry.tagline,
      synopsis: entry.synopsis,
      year: entry.year,
      rating: entry.rating,
      score: entry.score,
      durationMinutes: details.durationMinutes,
      badge: entry.badge ?? null,
      tmdbId: details.tmdbId,
      imageId: null,
      palette: entry.palette,
      posterUrl: entry.poster ?? null,
      backdropUrl: entry.backdrop ?? null,
      cast: entry.cast,
      creator: entry.creator,
      episodes: [],
      live: null,
      featured: false,
      status: "published" as const,
      publishedAt: new Date(),
      rightsHolder: entry.rightsHolder,
      licenseType: entry.license,
      licenseTerritory: "Worldwide",
      sourceUrl: entry.sourceUrl || null,
      rightsConfirmedAt: new Date(),
      updatedAt: new Date(),
    };

    const [movieRow] = await db
      .insert(movies)
      .values(valuesForDb)
      .onConflictDoUpdate({
        target: movies.slug,
        set: valuesForDb,
      })
      .returning({ id: movies.id });

    await db.delete(movieGenres).where(sql`${movieGenres.movieId} = ${movieRow.id}`);
    for (const name of entry.genres) {
      const [genreRow] = await db
        .insert(genres)
        .values({ name, slug: slugify(name) })
        .onConflictDoUpdate({ target: genres.slug, set: { name } })
        .returning({ id: genres.id });
      await db
        .insert(movieGenres)
        .values({ movieId: movieRow.id, genreId: genreRow.id })
        .onConflictDoNothing();
    }

    await db
      .insert(videoAssets)
      .values({
        movieId: movieRow.id,
        provider: "manual",
        status: "ready",
        mp4Url: entry.mp4Url,
        signedPlayback: false,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: videoAssets.movieId,
        set: {
          provider: "manual",
          status: "ready",
          mp4Url: entry.mp4Url,
          signedPlayback: false,
          error: null,
          updatedAt: new Date(),
        },
      });

    imported.push(entry);
  }

  let next = imported;
  if (!prune) {
    const { importedBySlug } = await import("@/lib/imported");
    next = [...importedBySlug.values()].filter(
      (entry) => !imported.some((row) => row.slug === entry.slug),
    ) as ImportedEntry[];
    next = [...next, ...imported];
  }

  next.sort((a, b) => b.year - a.year || a.name.localeCompare(b.name));
  await writeFile(
    "src/lib/imported-titles.json",
    `${JSON.stringify(next, null, 2)}\n`,
  );

  console.log(`Imported ${imported.length} licensed titles.`);
  if (failures.length) {
    console.log(`Skipped ${failures.length}:`);
    for (const failure of failures.slice(0, 20)) console.log(`  - ${failure}`);
    if (failures.length > 20) console.log(`  …and ${failures.length - 20} more`);
  }
  console.log(
    "Catalog snapshot written to src/lib/imported-titles.json. Browse pages update automatically.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
