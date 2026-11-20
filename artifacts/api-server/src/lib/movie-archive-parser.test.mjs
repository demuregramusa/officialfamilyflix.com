import assert from "node:assert/strict";
import { test } from "node:test";
import yazl from "yazl";
import { parseMovieArchive } from "./movie-archive-parser.ts";

function makeZip(files) {
  return new Promise((resolve, reject) => {
    const zip = new yazl.ZipFile();
    const chunks = [];
    zip.outputStream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    zip.outputStream.on("error", reject);
    zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    for (const [name, contents] of Object.entries(files)) {
      zip.addBuffer(Buffer.from(contents), name);
    }
    zip.end();
  });
}

function movie(id, overrides = {}) {
  return {
    id,
    title: `Example Film ${id}`,
    title_english: `Example Film ${id}`,
    imdb_code: `tt${String(id).padStart(7, "0")}`,
    url: `https://catalog.example.test/movies/${id}`,
    year: 2020,
    runtime: 95,
    genres: ["Drama"],
    summary: "Metadata is not rights evidence.",
    torrents: [{
      url: `magnet:?xt=urn:btih:${String(id).padStart(40, "a")}`,
      hash: String(id).padStart(40, "a"),
      quality: "720p",
      type: "web",
      seeds: 10,
      peers: 2,
      size: "1 GB",
      size_bytes: 1_000_000_000,
    }],
    ...overrides,
  };
}

function page(records) {
  return JSON.stringify({ status: "ok", data: { movies: records } });
}

test("parses catalog metadata and stores torrent references separately", async () => {
  const archive = await makeZip({
    "movies/movies_page_1.json": page([movie(1)]),
    "movies/readme.txt": "This file is ignored.",
  });

  const parsed = await parseMovieArchive(archive);
  assert.equal(parsed.archivePages, 1);
  assert.equal(parsed.totalRecords, 1);
  assert.equal(parsed.nonCatalogEntries, 1);
  assert.equal(parsed.records[0].sourceId, "1");
  assert.equal(parsed.records[0].metadata.summary, "Metadata is not rights evidence.");
  assert.equal("torrents" in parsed.records[0].metadata, false);
  assert.equal(parsed.records[0].torrents.length, 1);
  assert.equal(parsed.records[0].torrents[0].sourceUrl.startsWith("magnet:"), true);
  assert.equal("mediaUrl" in parsed.records[0], false);
});

test("recovers complete records from a truncated JSON page", async () => {
  const truncated = `{"status":"ok","data":{"movies":[${JSON.stringify(movie(2))},{"id":3,"title":"Cut off`;
  const archive = await makeZip({
    "movies/movies_page_1.json": truncated,
  });

  const parsed = await parseMovieArchive(archive);
  assert.equal(parsed.malformedPages, 1);
  assert.equal(parsed.recoveredRecords, 1);
  assert.equal(parsed.totalRecords, 1);
  assert.equal(parsed.records[0].sourceId, "2");
  assert.match(parsed.issues[0].message, /recovered 1 complete movie record/);
});

test("deduplicates source IDs and reports repeated IMDb IDs across pages", async () => {
  const first = movie(4);
  const duplicateSource = movie(4, { title: "Ignored duplicate source record" });
  const repeatedImdb = movie(5, { imdb_code: first.imdb_code });
  const archive = await makeZip({
    "movies/movies_page_1.json": page([first, duplicateSource]),
    "movies/movies_page_2.json": page([repeatedImdb]),
  });

  const parsed = await parseMovieArchive(archive);
  assert.equal(parsed.totalRecords, 2);
  assert.equal(parsed.duplicateSourceRecords, 1);
  assert.equal(parsed.duplicateImdbRecords, 1);
  assert.deepEqual(parsed.pages.map((item) => item.page), [1, 2]);
});

test("keeps records without a safe title as private placeholders", async () => {
  const archive = await makeZip({
    "movies/movies_page_1.json": page([
      movie(7, { title: "", title_english: "", title_long: " (2025)" }),
    ]),
  });
  const parsed = await parseMovieArchive(archive);
  assert.equal(parsed.totalRecords, 1);
  assert.equal(parsed.invalidRecords, 0);
  assert.equal(parsed.records[0].name, "Untitled archive record 7");
  assert.match(parsed.issues[0].message, /private placeholder/);
});

test("rejects archives that do not contain catalog page JSON", async () => {
  const archive = await makeZip({
    "movies/readme.txt": page([movie(6)]),
  });
  await assert.rejects(parseMovieArchive(archive), /No movies\/movies_page_N\.json files/);
});
