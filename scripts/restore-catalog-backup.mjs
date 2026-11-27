#!/usr/bin/env node
/**
 * FamilyFlix Catalog Backup & Restore Utility
 *
 * Restores all 23,275+ movies, TV shows, series, episodes, torrent hashes,
 * curated homepage rows, and categories from backups/*.json.gz into Cloudflare D1.
 *
 * Usage:
 *   node scripts/restore-catalog-backup.mjs --target=familyflix-db
 *   node scripts/restore-catalog-backup.mjs --target=familyflix-db-backup
 *   node scripts/restore-catalog-backup.mjs --target=both
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BACKUP_DIR = path.join(ROOT, "catalog-backup");
const APP_DIR = path.join(ROOT, "artifacts", "familyflix");

const targetArg =
  process.argv.find((a) => a.startsWith("--target="))?.split("=")[1] ||
  "familyflix-db";
const targets =
  targetArg === "both"
    ? ["familyflix-db", "familyflix-db-backup"]
    : [targetArg];

const esc = (v) => {
  if (v === null || v === undefined) return "''";
  return `'${String(v).replace(/'/g, "''").replace(/\u0000/g, "")}'`;
};

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS titles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'movie',
  year INTEGER NOT NULL DEFAULT 0,
  rating TEXT NOT NULL DEFAULT 'NR',
  score INTEGER NOT NULL DEFAULT 70,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  tagline TEXT NOT NULL DEFAULT '',
  synopsis TEXT NOT NULL DEFAULT '',
  genres_json TEXT NOT NULL DEFAULT '[]',
  genres_lower TEXT NOT NULL DEFAULT '',
  cast_json TEXT NOT NULL DEFAULT '[]',
  creator_attribution TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0,
  poster_url TEXT NOT NULL DEFAULT '',
  backdrop_url TEXT NOT NULL DEFAULT '',
  stream_url TEXT NOT NULL DEFAULT '',
  info_hash TEXT NOT NULL DEFAULT '',
  magnet_url TEXT NOT NULL DEFAULT '',
  quality TEXT NOT NULL DEFAULT '',
  seeders INTEGER NOT NULL DEFAULT 0,
  episodes_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_titles_kind_year ON titles(kind, year DESC, score DESC);
CREATE INDEX IF NOT EXISTS idx_titles_score ON titles(score DESC, year DESC);
CREATE INDEX IF NOT EXISTS idx_titles_name ON titles(name);
CREATE INDEX IF NOT EXISTS idx_titles_featured ON titles(featured DESC, year DESC);
CREATE TABLE IF NOT EXISTS kv_cache (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

function readGzJson(filePath) {
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(filePath)).toString("utf8"));
}

const full = readGzJson(
  path.join(BACKUP_DIR, "familyflix-full-catalog.json.gz"),
).titles;
const collections = readGzJson(
  path.join(BACKUP_DIR, "familyflix-collections-snapshot.json.gz"),
);
const seedPath = path.join(APP_DIR, "public", "catalog-seed.json");
const seed = fs.existsSync(seedPath)
  ? JSON.parse(fs.readFileSync(seedPath, "utf8"))
  : [];

const bySlug = new Map();
for (const t of full) {
  if (!t || !t.slug) continue;
  const tg = t.playbackSource?.torrentGateway || {};
  const eps = Array.isArray(t.episodes)
    ? t.episodes.map((e) => ({
        id: e.id,
        seasonNumber: e.seasonNumber || 1,
        episodeNumber: e.episodeNumber || 1,
        name: e.name || `Episode ${e.episodeNumber || 1}`,
        synopsis: (e.synopsis || "").slice(0, 400),
        durationMinutes: e.durationMinutes || 45,
        stillUrl: e.stillUrl || t.backdropUrl || t.posterUrl || "",
        streamUrl:
          e.playback?.streamUrl ||
          `/api/playback/${t.slug}/episodes/${e.id}/media`,
      }))
    : [];
  bySlug.set(t.slug, {
    id: String(t.id || t.slug),
    slug: String(t.slug),
    name: String(t.name || t.slug),
    kind: t.kind === "series" ? "series" : "movie",
    year: Number(t.year) || 0,
    rating: String(t.rating || "NR"),
    score: Number(t.score) || 70,
    durationMinutes: Number(t.durationMinutes) || 90,
    tagline: String(t.tagline || "").slice(0, 260),
    synopsis: String(t.synopsis || "").slice(0, 900),
    genres: Array.isArray(t.genres) ? t.genres : [],
    cast: Array.isArray(t.cast) ? t.cast.slice(0, 10) : [],
    creatorAttribution: String(
      t.creatorAttribution || `${t.name} (${t.year || ""})`,
    ),
    featured: t.featured ? 1 : 0,
    posterUrl: String(t.posterUrl || ""),
    backdropUrl: String(t.backdropUrl || t.posterUrl || ""),
    streamUrl: String(
      t.playbackSource?.hlsUrl ||
        t.playbackSource?.directMp4Url ||
        t.urls?.mediaStreamUrl ||
        `/api/playback/${t.slug}/media`,
    ),
    infoHash: String(tg.infoHash || ""),
    magnetUrl: String(tg.magnetUrl || ""),
    quality: String(tg.quality || ""),
    seeders: Number(tg.seeders) || 0,
    episodes: eps,
  });
}

for (const s of seed) {
  if (!s || !s.slug || bySlug.has(s.slug)) continue;
  bySlug.set(s.slug, {
    id: String(s.id || s.slug),
    slug: String(s.slug),
    name: String(s.name || s.slug),
    kind: s.kind === "series" ? "series" : "movie",
    year: Number(s.year) || 0,
    rating: String(s.rating || "TV-PG"),
    score: Number(s.score) || 78,
    durationMinutes: Number(s.durationMinutes) || 90,
    tagline: String(s.tagline || "").slice(0, 260),
    synopsis: String(s.synopsis || "").slice(0, 900),
    genres: Array.isArray(s.genres) ? s.genres : [],
    cast: Array.isArray(s.cast) ? s.cast.slice(0, 10) : [],
    creatorAttribution: String(s.creatorAttribution || s.name),
    featured: s.featured ? 1 : 0,
    posterUrl: String(s.posterUrl || ""),
    backdropUrl: String(s.backdropUrl || s.posterUrl || ""),
    streamUrl: String(s.streamUrl || ""),
    infoHash: "",
    magnetUrl: "",
    quality: "HD HLS",
    seeders: 0,
    episodes: Array.isArray(s.episodes) ? s.episodes : [],
  });
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "familyflix-restore-"));
try {
  const schemaFile = path.join(tmpDir, "00-schema.sql");
  fs.writeFileSync(schemaFile, SCHEMA_SQL.trim() + "\n");

  const all = Array.from(bySlug.values());
  const batchFiles = [schemaFile];
  const BATCH_FILE_SIZE = 4000;
  const STMT_ROWS = 10;
  let idx = 1;

  for (let i = 0; i < all.length; i += BATCH_FILE_SIZE) {
    const chunk = all.slice(i, i + BATCH_FILE_SIZE);
    const stmts = [];
    for (let j = 0; j < chunk.length; j += STMT_ROWS) {
      const sub = chunk.slice(j, j + STMT_ROWS);
      const vals = sub.map((r) => {
        const genresLower = `|${r.genres.map((g) => g.toLowerCase()).join("|")}|`;
        return `(${esc(r.id)},${esc(r.slug)},${esc(r.name)},${esc(r.kind)},${r.year},${esc(r.rating)},${r.score},${r.durationMinutes},${esc(r.tagline)},${esc(r.synopsis)},${esc(JSON.stringify(r.genres))},${esc(genresLower)},${esc(JSON.stringify(r.cast))},${esc(r.creatorAttribution)},${r.featured},${esc(r.posterUrl)},${esc(r.backdropUrl)},${esc(r.streamUrl)},${esc(r.infoHash)},${esc(r.magnetUrl)},${esc(r.quality)},${r.seeders},${esc(JSON.stringify(r.episodes))})`;
      });
      stmts.push(`INSERT OR REPLACE INTO titles VALUES ${vals.join(",")};`);
    }
    const f = path.join(tmpDir, `01-batch-${String(idx++).padStart(2, "0")}.sql`);
    fs.writeFileSync(f, stmts.join("\n") + "\n");
    batchFiles.push(f);
  }

  const now = Date.now();
  const kvStmts = [
    `INSERT OR REPLACE INTO kv_cache VALUES (${esc("featured-hero")}, ${esc(JSON.stringify(collections.featuredHero))}, ${now});`,
    `INSERT OR REPLACE INTO kv_cache VALUES (${esc("categories")}, ${esc(JSON.stringify(collections.categories))}, ${now});`,
    ...collections.curatedRows.map(
      (row, i) =>
        `INSERT OR REPLACE INTO kv_cache VALUES (${esc(`curated-row-${String(i).padStart(2, "0")}`)}, ${esc(JSON.stringify(row))}, ${now});`,
    ),
  ];
  const kvFile = path.join(tmpDir, "02-kv-cache.sql");
  fs.writeFileSync(kvFile, kvStmts.join("\n") + "\n");
  batchFiles.push(kvFile);

  for (const dbName of targets) {
    console.log(`\nRestoring ${all.length} titles into D1 database: ${dbName}`);
    for (const file of batchFiles) {
      console.log(`  -> ${path.basename(file)}`);
      execFileSync(
        "npx",
        ["--yes", "wrangler", "d1", "execute", dbName, "--remote", "--yes", `--file=${file}`],
        { cwd: APP_DIR, stdio: "inherit" },
      );
    }
  }
  console.log("\nRestore complete.");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
