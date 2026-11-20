import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  discoverTmdb,
  getTmdbGenres,
  getTmdbList,
  tmdbConfigured,
  type TmdbListItem,
  type TmdbListKind,
} from "@/lib/video/tmdb";

const DEFAULT_LISTS: TmdbListKind[] = [
  "trending_day",
  "trending_week",
  "popular",
  "now_playing",
  "top_rated",
];

const DECADES = [1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

function arg(name: string, fallback: string) {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function main() {
  if (!tmdbConfigured()) {
    throw new Error(
      "TMDb is not configured. Add TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN to .env.",
    );
  }

  const lists = arg("lists", DEFAULT_LISTS.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is TmdbListKind =>
      DEFAULT_LISTS.includes(value as TmdbListKind),
    );
  const pages = Math.max(1, Math.min(20, Number(arg("pages", "2")) || 2));
  const withDecades = arg("decades", "1") !== "0";
  const out = arg("out", "data/tmdb-candidates.csv");

  const genres = await getTmdbGenres();
  const genreName = new Map(genres.map((genre) => [genre.id, genre.name]));
  const seen = new Map<number, TmdbListItem & { source: string }>();

  for (const list of lists.length ? lists : DEFAULT_LISTS) {
    for (let page = 1; page <= pages; page += 1) {
      const result = await getTmdbList(list, page);
      for (const item of result.items) {
        if (!seen.has(item.tmdbId)) seen.set(item.tmdbId, { ...item, source: list });
      }
      if (page >= result.totalPages) break;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  if (withDecades) {
    for (const decade of DECADES) {
      const result = await discoverTmdb({
        page: 1,
        yearFrom: decade,
        yearTo: decade + 9,
        minVotes: 250,
      });
      for (const item of result.items) {
        if (!seen.has(item.tmdbId)) seen.set(item.tmdbId, { ...item, source: `${decade}s` });
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  const rows = [...seen.values()].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  const header = [
    "tmdbId",
    "title",
    "year",
    "genres",
    "posterUrl",
    "backdropUrl",
    "mp4Url",
    "licenseType",
    "rightsHolder",
    "sourceUrl",
    "tmdbSource",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.tmdbId,
        row.name,
        row.year ?? "",
        row.genreIds.map((id) => genreName.get(id) ?? "").filter(Boolean).join("|"),
        row.posterUrl ?? "",
        row.backdropUrl ?? "",
        "",
        "licensed",
        "",
        "",
        row.source,
      ]
        .map(csvCell)
        .join(","),
    );
  }

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${lines.join("\n")}\n`);
  console.log(
    `Wrote ${rows.length} TMDB candidates to ${out}. Fill mp4Url (and rightsHolder) for the titles you have licensed, then run: bun run import:licensed --file=${out}`,
  );

  if (!rows.length) console.log("No rows returned; check your key and list names.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
