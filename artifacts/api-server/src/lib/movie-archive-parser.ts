import * as yauzl from "yauzl";
import type { Entry, ZipFile } from "yauzl";

const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 2_500;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 120 * 1024 * 1024;
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
const MAX_MOVIE_RECORDS = 100_000;
const MAX_TORRENTS_PER_MOVIE = 30;
const MAX_REPORTED_ISSUES = 100;

const METADATA_FIELDS = [
  "url",
  "imdb_code",
  "title",
  "title_english",
  "title_long",
  "slug",
  "year",
  "rating",
  "runtime",
  "genres",
  "summary",
  "description_full",
  "synopsis",
  "yt_trailer_code",
  "language",
  "mpa_rating",
  "background_image",
  "background_image_original",
  "small_cover_image",
  "medium_cover_image",
  "large_cover_image",
  "state",
  "date_uploaded",
  "date_uploaded_unix",
  "like_count",
  "download_count",
] as const;

export interface ImportedTorrentRecord {
  sourceIndex: number;
  sourceUrl: string | null;
  infoHash: string | null;
  quality: string | null;
  sourceType: string | null;
  isRepack: boolean | null;
  videoCodec: string | null;
  bitDepth: string | null;
  audioChannels: string | null;
  seeders: number | null;
  peers: number | null;
  size: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
  metadata: Record<string, unknown>;
}

export interface ImportedMovieRecord {
  sourceId: string;
  name: string;
  imdbCode: string | null;
  sourceUrl: string | null;
  year: number | null;
  runtime: number | null;
  genres: string[];
  metadata: Record<string, unknown>;
  torrents: ImportedTorrentRecord[];
}

export interface ArchiveParseIssue {
  page: number;
  sourceId?: string | null;
  message: string;
}

export interface ParsedMovieArchive {
  archivePages: number;
  totalRecords: number;
  duplicateSourceRecords: number;
  duplicateImdbRecords: number;
  invalidRecords: number;
  malformedPages: number;
  recoveredRecords: number;
  nonCatalogEntries: number;
  torrentSourceCount: number;
  records: ImportedMovieRecord[];
  pages: Array<{ page: number; records: ImportedMovieRecord[] }>;
  issues: ArchiveParseIssue[];
}

interface PageEntry {
  entry: Entry;
  page: number;
}

function addIssue(issues: ArchiveParseIssue[], issue: ArchiveParseIssue) {
  if (issues.length < MAX_REPORTED_ISSUES) issues.push(issue);
}

function openArchive(buffer: Buffer): Promise<ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(
      buffer,
      {
        lazyEntries: true,
        autoClose: false,
        decodeStrings: true,
        validateEntrySizes: true,
        strictFileNames: true,
      },
      (error, zip) => {
        if (error || !zip) {
          reject(error ?? new Error("The ZIP archive could not be opened."));
          return;
        }
        resolve(zip);
      },
    );
  });
}

function listPages(zip: ZipFile): Promise<{ pages: PageEntry[]; nonCatalogEntries: number }> {
  return new Promise((resolve, reject) => {
    const pages: PageEntry[] = [];
    const pageNumbers = new Set<number>();
    let entryCount = 0;
    let uncompressedBytes = 0;
    let nonCatalogEntries = 0;
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      zip.close();
      reject(error);
    };

    zip.on("error", (error) => fail(error));
    zip.on("entry", (entry) => {
      if (settled) return;
      entryCount += 1;
      uncompressedBytes += entry.uncompressedSize;
      if (entryCount > MAX_ARCHIVE_ENTRIES) {
        fail(new Error("The archive contains too many entries."));
        return;
      }
      if (
        !Number.isSafeInteger(uncompressedBytes) ||
        uncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES
      ) {
        fail(new Error("The archive expands beyond the allowed size."));
        return;
      }
      if (!Number.isSafeInteger(entry.uncompressedSize) || entry.uncompressedSize < 0) {
        fail(new Error("The archive contains an invalid file size."));
        return;
      }
      const filename = String(entry.fileName).replace(/\\/g, "/");
      const unsafePath =
        entry.fileName !== filename ||
        filename.startsWith("/") ||
        filename.split("/").some((part) => part === "..");
      const match = /^movies\/movies_page_(\d+)\.json$/i.exec(filename);
      if (unsafePath || !match) {
        nonCatalogEntries += 1;
        zip.readEntry();
        return;
      }
      const page = Number(match[1]);
      if (!Number.isSafeInteger(page) || page < 1 || pageNumbers.has(page)) {
        nonCatalogEntries += 1;
        zip.readEntry();
        return;
      }
      if (entry.uncompressedSize > MAX_PAGE_BYTES) {
        fail(new Error(`Archive page ${page} exceeds the per-file size limit.`));
        return;
      }
      pageNumbers.add(page);
      pages.push({ entry, page });
      zip.readEntry();
    });
    zip.on("end", () => {
      if (settled) return;
      settled = true;
      pages.sort((left, right) => left.page - right.page);
      resolve({ pages, nonCatalogEntries });
    });
    zip.readEntry();
  });
}

function readEntry(zip: ZipFile, entry: Entry): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error || !stream) {
        reject(error ?? new Error("A ZIP entry could not be read."));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      stream.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_PAGE_BYTES) {
          stream.destroy(new Error("An archive page exceeded the size limit while reading."));
          return;
        }
        chunks.push(chunk);
      });
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks, size)));
    });
  });
}

function findObjectEnd(text: string, start: number): number | null {
  let curlyDepth = 0;
  let squareDepth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === "\"") inString = false;
      continue;
    }
    if (char === "\"") {
      inString = true;
      continue;
    }
    if (char === "{") curlyDepth += 1;
    else if (char === "}") {
      curlyDepth -= 1;
      if (curlyDepth === 0 && squareDepth === 0) return index + 1;
    } else if (char === "[") squareDepth += 1;
    else if (char === "]") squareDepth -= 1;
    if (curlyDepth < 0 || squareDepth < 0) return null;
  }
  return null;
}

function recoverMovieObjects(text: string): unknown[] {
  const arrayStart = /"movies"\s*:\s*\[/m.exec(text);
  if (!arrayStart) return [];
  let cursor = arrayStart.index + arrayStart[0].length;
  const recovered: unknown[] = [];
  while (cursor < text.length && recovered.length < MAX_MOVIE_RECORDS) {
    while (/\s|,/.test(text[cursor] ?? "")) cursor += 1;
    if (text[cursor] === "]") break;
    if (text[cursor] !== "{") break;
    const end = findObjectEnd(text, cursor);
    if (end === null) break;
    try {
      recovered.push(JSON.parse(text.slice(cursor, end)) as unknown);
    } catch {
      // Skip a balanced but invalid object and continue with the following record.
    }
    cursor = end;
  }
  return recovered;
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function safeScalar(value: unknown, maxLength = 2048): unknown {
  if (typeof value === "string") return value.slice(0, maxLength);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value) && value.length <= 50) {
    return value
      .filter((item) => typeof item === "string" || typeof item === "number")
      .map((item) => typeof item === "string" ? item.slice(0, 240) : item);
  }
  return undefined;
}

function normalizeTorrent(value: unknown, sourceIndex: number): ImportedTorrentRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const metadata: Record<string, unknown> = {};
  for (const key of [
    "url", "hash", "quality", "type", "is_repack", "video_codec", "bit_depth",
    "audio_channels", "seeds", "peers", "size", "size_bytes", "date_uploaded",
    "date_uploaded_unix",
  ]) {
    const field = safeScalar(raw[key]);
    if (field !== undefined) metadata[key] = field;
  }
  const sizeBytes = raw.size_bytes;
  return {
    sourceIndex,
    sourceUrl: boundedString(raw.url, 2048),
    infoHash: boundedString(raw.hash, 256),
    quality: boundedString(raw.quality, 80),
    sourceType: boundedString(raw.type, 40),
    isRepack: typeof raw.is_repack === "boolean" ? raw.is_repack : null,
    videoCodec: boundedString(raw.video_codec, 80),
    bitDepth: boundedString(raw.bit_depth, 40),
    audioChannels: boundedString(raw.audio_channels, 40),
    seeders: Number.isSafeInteger(raw.seeds) && Number(raw.seeds) >= 0 ? Number(raw.seeds) : null,
    peers: Number.isSafeInteger(raw.peers) && Number(raw.peers) >= 0 ? Number(raw.peers) : null,
    size: boundedString(raw.size, 80),
    sizeBytes: Number.isSafeInteger(sizeBytes) && Number(sizeBytes) >= 0 ? Number(sizeBytes) : null,
    uploadedAt: boundedString(raw.date_uploaded, 80),
    metadata,
  };
}

function normalizeMovie(
  value: unknown,
  page: number,
  issues: ArchiveParseIssue[],
): ImportedMovieRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = raw.id;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || Number(id) <= 0) return null;
  const sourceId = String(Number(id));
  const primaryTitle = boundedString(raw.title_english, 250) ?? boundedString(raw.title, 250);
  const longTitle = boundedString(raw.title_long, 250)
    ?.replace(/\s*\([^()]*\)\s*$/, "")
    .trim();
  const candidate = primaryTitle || longTitle || null;
  const title = candidate && !/(?:https?:\/\/|magnet:|\.torrent\b)/i.test(candidate)
    ? candidate
    : `Untitled archive record ${sourceId}`;
  if (title.startsWith("Untitled archive record ")) {
    addIssue(issues, {
      page,
      sourceId,
      message: "No safe display title was supplied; kept the source record with a private placeholder.",
    });
  }

  const metadata: Record<string, unknown> = { id: Number(id) };
  for (const key of METADATA_FIELDS) {
    const field = safeScalar(raw[key]);
    if (field !== undefined) metadata[key] = field;
  }
  const genres = Array.isArray(raw.genres)
    ? [...new Set(raw.genres
      .filter((genre): genre is string => typeof genre === "string")
      .map((genre) => genre.trim().slice(0, 80))
      .filter((genre) => Boolean(genre) && !/(?:https?:\/\/|magnet:|\.torrent\b)/i.test(genre)))]
      .slice(0, 12)
    : [];
  if (genres.length) metadata.genres = genres;
  const sourceUrl = boundedString(raw.url, 2048);
  const imdbCode = boundedString(raw.imdb_code, 24);
  const imdb = imdbCode && /^tt\d{5,16}$/i.test(imdbCode) ? imdbCode : null;
  const torrents = Array.isArray(raw.torrents)
    ? raw.torrents.slice(0, MAX_TORRENTS_PER_MOVIE)
      .map((torrent, index) => normalizeTorrent(torrent, index))
      .filter((torrent): torrent is ImportedTorrentRecord => torrent !== null)
    : [];

  return {
    sourceId,
    name: title,
    imdbCode: imdb,
    sourceUrl,
    year: Number.isInteger(raw.year) && Number(raw.year) >= 1870 && Number(raw.year) <= 2100
      ? Number(raw.year)
      : null,
    runtime: Number.isInteger(raw.runtime) && Number(raw.runtime) > 0 && Number(raw.runtime) <= 1000
      ? Number(raw.runtime)
      : null,
    genres,
    metadata,
    torrents,
  };
}

function pageMovies(text: string, page: number, issues: ArchiveParseIssue[]) {
  try {
    const parsed = JSON.parse(text) as { data?: { movies?: unknown } };
    if (Array.isArray(parsed?.data?.movies)) {
      return { movies: parsed.data.movies, malformed: false, recovered: 0 };
    }
  } catch {
    // A truncated final page may still contain complete movie objects.
  }
  const recovered = recoverMovieObjects(text);
  addIssue(issues, {
    page,
    message: recovered.length
      ? `Malformed page; recovered ${recovered.length} complete movie record(s).`
      : "Malformed page; no complete movie records could be recovered.",
  });
  return { movies: recovered, malformed: true, recovered: recovered.length };
}

export async function parseMovieArchive(buffer: Buffer): Promise<ParsedMovieArchive> {
  if (buffer.length === 0 || buffer.length > MAX_ARCHIVE_BYTES) {
    throw new Error("Choose a non-empty ZIP archive no larger than 20 MB.");
  }
  const zip = await openArchive(buffer);
  let pages: PageEntry[] = [];
  let nonCatalogEntries = 0;
  const issues: ArchiveParseIssue[] = [];
  try {
    const listed = await listPages(zip);
    pages = listed.pages;
    nonCatalogEntries = listed.nonCatalogEntries;
    if (pages.length === 0) {
      throw new Error("No movies/movies_page_N.json files were found in the archive.");
    }
    if (pages.length > 2_000) throw new Error("The archive contains too many movie pages.");

    const records: ImportedMovieRecord[] = [];
    const parsedPages: Array<{ page: number; records: ImportedMovieRecord[] }> = [];
    const seenSourceIds = new Set<string>();
    const seenImdbCodes = new Set<string>();
    let duplicateSourceRecords = 0;
    let duplicateImdbRecords = 0;
    let invalidRecords = 0;
    let malformedPages = 0;
    let recoveredRecords = 0;
    let torrentSourceCount = 0;

    for (const page of pages) {
      const pageBuffer = await readEntry(zip, page.entry);
      const result = pageMovies(pageBuffer.toString("utf8"), page.page, issues);
      if (result.malformed) malformedPages += 1;
      recoveredRecords += result.recovered;
      const pageRecords: ImportedMovieRecord[] = [];
      for (const item of result.movies) {
        const normalized = normalizeMovie(item, page.page, issues);
        if (!normalized) {
          invalidRecords += 1;
          addIssue(issues, { page: page.page, message: "Skipped a record with an invalid source ID or title." });
          continue;
        }
        if (seenSourceIds.has(normalized.sourceId)) {
          duplicateSourceRecords += 1;
          continue;
        }
        seenSourceIds.add(normalized.sourceId);
        if (normalized.imdbCode && seenImdbCodes.has(normalized.imdbCode)) {
          duplicateImdbRecords += 1;
        }
        if (normalized.imdbCode) seenImdbCodes.add(normalized.imdbCode);
        torrentSourceCount += normalized.torrents.length;
        records.push(normalized);
        pageRecords.push(normalized);
        if (records.length > MAX_MOVIE_RECORDS) {
          throw new Error("The archive contains more than 100,000 movie records.");
        }
      }
      parsedPages.push({ page: page.page, records: pageRecords });
    }
    return {
      archivePages: pages.length,
      totalRecords: records.length,
      duplicateSourceRecords,
      duplicateImdbRecords,
      invalidRecords,
      malformedPages,
      recoveredRecords,
      nonCatalogEntries,
      torrentSourceCount,
      records,
      pages: parsedPages,
      issues,
    };
  } finally {
    zip.close();
  }
}
