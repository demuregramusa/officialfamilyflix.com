import fs from "node:fs";
import readline from "node:readline";
import pg from "pg";

const { Pool } = pg;
const inputPath = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (process.env.NODE_ENV !== "development") {
  throw new Error("This staging script only runs with NODE_ENV=development.");
}
if (!dryRun && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}
if (!inputPath) {
  throw new Error("Pass the sanitized JSONL file path as the first argument.");
}

function slugify(value) {
  return value.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function makePlaceholders(rowCount, columnCount) {
  return Array.from({ length: rowCount }, (_, row) =>
    `(${Array.from({ length: columnCount }, (_, column) =>
      `$${row * columnCount + column + 1}`).join(", ")})`,
  ).join(", ");
}

const pool = dryRun ? null : new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const reader = readline.createInterface({
  input: fs.createReadStream(inputPath, { encoding: "utf8" }),
  crlfDelay: Infinity,
});

let batch = [];
let imported = 0;
let alreadyPresent = 0;
let validated = 0;
const seenIds = new Set();

async function writeBatch(rows) {
  if (!rows.length) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const values = [];
    for (const row of rows) {
      values.push(
        `yts-${row.id}`,
        row.name,
        "movie",
        "Metadata-only import; rights and media are unverified.",
        "Description omitted. Rights evidence and a playable media source are required.",
        row.year,
        row.durationMinutes,
        "Unverified metadata",
        "draft",
        "unlicensed",
      );
    }
    const insertResult = await client.query(
      `INSERT INTO movies
        (slug, name, kind, tagline, synopsis, year, duration_minutes, badge, status, license_type)
       VALUES ${makePlaceholders(rows.length, 10)}
       ON CONFLICT (slug) DO NOTHING
       RETURNING id, slug`,
      values,
    );
    const insertedBySlug = new Map(insertResult.rows.map((row) => [row.slug, row.id]));
    const newRows = rows.filter((row) => insertedBySlug.has(`yts-${row.id}`));
    alreadyPresent += rows.length - newRows.length;

    const genresBySlug = new Map();
    for (const name of newRows.flatMap((row) => row.genres)) {
      const slug = slugify(name);
      if (slug && !genresBySlug.has(slug)) genresBySlug.set(slug, name);
    }
    const genreNames = [...genresBySlug.values()];
    const genreSlugs = [...genresBySlug.keys()];
    if (genreSlugs.length) {
      const genreValues = [];
      for (const name of genreNames) {
        const slug = slugify(name);
        if (slug) genreValues.push(name, slug);
      }
      await client.query(
        `INSERT INTO genres (name, slug)
         VALUES ${makePlaceholders(genreValues.length / 2, 2)}
         ON CONFLICT (slug) DO NOTHING`,
        genreValues,
      );
      const genreResult = await client.query(
        "SELECT id, slug FROM genres WHERE slug = ANY($1::text[])",
        [genreSlugs],
      );
      const genreIds = new Map(genreResult.rows.map((genre) => [genre.slug, genre.id]));
      const linkValues = [];
      for (const row of newRows) {
        const movieId = insertedBySlug.get(`yts-${row.id}`);
        for (const name of row.genres) {
          const genreId = genreIds.get(slugify(name));
          if (movieId && genreId) linkValues.push(movieId, genreId);
        }
      }
      if (linkValues.length) {
        await client.query(
          `INSERT INTO movie_genres (movie_id, genre_id)
           VALUES ${makePlaceholders(linkValues.length / 2, 2)}
           ON CONFLICT DO NOTHING`,
          linkValues,
        );
      }
    }

    await client.query("COMMIT");
    imported += newRows.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

try {
  for await (const line of reader) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (
      !Number.isSafeInteger(row.id) ||
      row.id <= 0 ||
      typeof row.name !== "string" ||
      !row.name.trim() ||
      /(?:https?:\/\/|magnet:|torrent:|\.torrent\b)/i.test(row.name) ||
      !Array.isArray(row.genres) ||
      Object.keys(row).some((key) => !["id", "name", "year", "durationMinutes", "genres"].includes(key))
    ) {
      throw new Error("The input contains an unexpected metadata row; no torrent or URL fields are allowed.");
    }
    if (seenIds.has(row.id)) throw new Error(`Duplicate source identifier ${row.id}.`);
    seenIds.add(row.id);
    batch.push({
      id: row.id,
      name: row.name.trim().slice(0, 250),
      year: Number.isInteger(row.year) && row.year >= 1870 && row.year <= 2100 ? row.year : null,
      durationMinutes: Number.isInteger(row.durationMinutes) && row.durationMinutes > 0 && row.durationMinutes <= 600
        ? row.durationMinutes
        : null,
      genres: row.genres
        .filter((genre) => typeof genre === "string")
        .map((genre) => genre.trim().slice(0, 80))
        .filter((genre) => Boolean(genre) && !/(?:https?:\/\/|magnet:|torrent:|\.torrent\b)/i.test(genre))
        .filter((genre, index, all) => all.indexOf(genre) === index)
        .slice(0, 12),
    });
    if (batch.length >= 300) {
      if (dryRun) validated += batch.length;
      else await writeBatch(batch);
      batch = [];
    }
  }
  if (dryRun) validated += batch.length;
  else await writeBatch(batch);
  console.log(JSON.stringify({ dryRun, validated, imported, alreadyPresent, status: "draft", mediaRightsCreated: 0, videoAssetsCreated: 0 }));
} finally {
  reader.close();
  if (pool) await pool.end();
}
