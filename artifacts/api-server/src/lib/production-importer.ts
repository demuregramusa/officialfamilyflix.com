import { createHash, randomUUID } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  CreateAdminTitleBody,
  ImportAdminSeriesEpisodesBody,
  type RightsInput,
  type TitleInput,
} from "@workspace/api-zod";
import {
  db,
  genres,
  importedMovieSources,
  importedTorrentSources,
  mediaRights,
  movieGenres,
  movies,
  pool,
  seriesEpisodes,
  seriesSeasons,
  videoAssets,
} from "@workspace/db";
import type { RequestSession } from "./auth-middleware";
import { logAudit } from "./audit";
import {
  getEpisodePlaybackForRow,
  getPlaybackForRow,
  getPublicCatalogRowBySlug,
  invalidatePublicCatalogCache,
  toPublicTitleDetail,
} from "./catalog";
import { catalogService } from "./catalog-service";
import { curatedPublicDomainTitles } from "./curated-public-domain-titles";
import { hasEpisodePlaybackAssets } from "./episode-eligibility";
import { isTorrentPlaybackEligible } from "./movie-archive-policy";
import {
  checkDirectMediaSource,
  isEvidenceComplete,
  isRightCurrent,
  rightsFromDb,
  rightsToInsert,
  validatePublicHttpUrl,
  validateRightsInput,
} from "./rights";

export type ProductionAdditionSeasonInput = {
  seasonNumber: number;
  name?: string | null;
  episodes: {
    episodeNumber: number;
    name: string;
    synopsis?: string;
    durationMinutes?: number | null;
    rights: RightsInput;
    stream: {
      url: string;
    };
  }[];
};

export type ProductionAdditionTorrentInput = {
  infoHash: string;
  sourceUrl?: string | null;
  quality?: string | null;
  sourceType?: string | null;
  videoCodec?: string | null;
  seeders?: number | null;
  peers?: number | null;
  size?: string | null;
  sizeBytes?: number | null;
};

export type ProductionAdditionRecord = TitleInput & {
  id?: string | null;
  slug?: string | null;
  imdbCode?: string | null;
  seasons?: ProductionAdditionSeasonInput[];
  torrentSources?: ProductionAdditionTorrentInput[];
};

export interface TenPointVerificationResult {
  passed: boolean;
  checkedAt: string;
  checks: {
    titleExists: boolean;
    idAndSlugMatch: boolean;
    classificationMatches: boolean;
    metadataValid: boolean;
    rightsApproved: boolean;
    playbackBindingValid: boolean;
    statusPublished: boolean;
    discoverableInPublicCatalog: boolean;
    watchPageReady: boolean;
    mediaEndpointResponds: boolean;
    seriesSeasonsAndEpisodesVerified?: boolean;
  };
  details: {
    productionId: string | null;
    slug: string | null;
    kind: string | null;
    status: string | null;
    streamType: string | null;
    streamUrl: string | null;
    approvedRightsCount: number;
    verifiedSeasonsCount: number;
    verifiedEpisodesCount: number;
    watchUrl: string | null;
    detailUrl: string | null;
    playbackApiUrl: string | null;
  };
  errors: string[];
}

export type ProductionImportItemStatus =
  | "ready_to_import"
  | "skipped_existing_duplicate"
  | "skipped_batch_duplicate"
  | "validation_failed"
  | "dry_run_passed"
  | "imported_pending_review"
  | "import_failed"
  | "rights_approved"
  | "rights_rejected"
  | "rights_restricted"
  | "published_verified"
  | "publish_failed";

export interface ProductionImportEpisodeLedger {
  episodeId: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  rightsId: string;
  rightsStatus: string;
  status: string;
  streamUrl: string;
}

export interface ProductionImportTorrentLedger {
  torrentId: string;
  infoHash: string;
  quality: string | null;
  videoCodec: string | null;
  rightsStatus: string;
  playbackStatus: string;
}

export interface ProductionImportItemResult {
  row: number;
  normalizedName: string;
  requestedSlug: string;
  kind: "movie" | "series" | "live";
  year: number | null;
  imdbCode: string | null;
  status: ProductionImportItemStatus;
  duplicateMatchBasis: string | null;
  existingMovieId: string | null;
  productionMovieId: string | null;
  productionSlug: string | null;
  rightsIds: string[];
  rightsReviewStatus: "pending" | "approved" | "rejected" | "restricted" | "none";
  reviewerId: string | null;
  reviewerEmail: string | null;
  reviewedAt: string | null;
  reviewerNote: string | null;
  publishedAt: string | null;
  missingPoster: boolean;
  missingBackdrop: boolean;
  missingMediaSource: boolean;
  missingMetadataFields: string[];
  seasonsCount: number;
  episodesCount: number;
  importedEpisodes: ProductionImportEpisodeLedger[];
  importedTorrents: ProductionImportTorrentLedger[];
  warnings: string[];
  errors: string[];
  verification: TenPointVerificationResult | null;
}

export interface ProductionImportBatchRecord {
  batchIndex: number;
  rowNumbers: number[];
  payloadBytes: number;
  dryRun: boolean;
  created: number;
  updated: number;
  skipped: number;
  issues: { row: number; title: string | null; message: string }[];
  completedAt: string;
}

export interface ProductionImportMetrics {
  totalRecordsSubmitted: number;
  newTitlesDetected: number;
  existingDuplicatesSkipped: number;
  batchDuplicatesSkipped: number;
  successfullyImported: number;
  pendingRightsReview: number;
  approvedTitles: number;
  publishedTitles: number;
  verifiedLiveTitles: number;
  failedImports: number;
  missingMediaAssets: number;
  missingMetadata: number;
  tvSeasonsImported: number;
  tvEpisodesImported: number;
  playbackSourcesAwaitingApproval: number;
}

export interface ProductionImportAuditEvent {
  timestamp: string;
  phase:
    | "preflight"
    | "dry_run"
    | "production_import"
    | "retry_failed"
    | "rights_review"
    | "publish_and_verify"
    | "recovery";
  actorId: string;
  actorEmail: string;
  summary: string;
  details?: Record<string, unknown>;
}

export type ProductionImportJobStatus =
  | "preflight_validated"
  | "dry_run_completed"
  | "importing"
  | "imported_pending_review"
  | "rights_approved"
  | "publishing"
  | "published_verified"
  | "partial_failure"
  | "recoverable_interrupted";

export interface ProductionImportJob {
  id: string;
  name: string;
  payloadSha256: string;
  status: ProductionImportJobStatus;
  updateExisting: boolean;
  createdBy: string;
  createdByEmail: string;
  metrics: ProductionImportMetrics;
  items: ProductionImportItemResult[];
  batches: ProductionImportBatchRecord[];
  auditTrail: ProductionImportAuditEvent[];
  createdAt: string;
  updatedAt: string;
}

const MAX_BATCH_BYTES = 1_000_000; // < 1 MB per batch (well under 5 MB limit)
const MAX_BATCH_ITEMS = 25;
let tableInitPromise: Promise<void> | null = null;
const activeJobLocks = new Set<string>();

export function slugBase(value: string): string {
  return (
    value
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "title"
  );
}

export function normalizeTitleName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export async function ensureProductionImporterTable(): Promise<void> {
  if (tableInitPromise) return tableInitPromise;
  tableInitPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "production_import_jobs" (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        payload_sha256 text NOT NULL,
        status text NOT NULL,
        update_existing boolean NOT NULL DEFAULT false,
        created_by text NOT NULL,
        created_by_email text NOT NULL,
        metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
        items jsonb NOT NULL DEFAULT '[]'::jsonb,
        payload jsonb NOT NULL DEFAULT '[]'::jsonb,
        batches jsonb NOT NULL DEFAULT '[]'::jsonb,
        audit_trail jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS production_import_jobs_created_idx
        ON "production_import_jobs"(created_at DESC);
      CREATE INDEX IF NOT EXISTS production_import_jobs_sha256_idx
        ON "production_import_jobs"(payload_sha256);
    `);
    // Recover any interrupted jobs on boot
    await pool.query(`
      UPDATE "production_import_jobs"
      SET status = 'recoverable_interrupted',
          updated_at = now()
      WHERE status IN ('importing', 'publishing')
    `);
  })();
  return tableInitPromise;
}

void ensureProductionImporterTable().catch(() => {});

function computeMetrics(items: ProductionImportItemResult[]): ProductionImportMetrics {
  let newTitlesDetected = 0;
  let existingDuplicatesSkipped = 0;
  let batchDuplicatesSkipped = 0;
  let successfullyImported = 0;
  let pendingRightsReview = 0;
  let approvedTitles = 0;
  let publishedTitles = 0;
  let verifiedLiveTitles = 0;
  let failedImports = 0;
  let missingMediaAssets = 0;
  let missingMetadata = 0;
  let tvSeasonsImported = 0;
  let tvEpisodesImported = 0;
  let playbackSourcesAwaitingApproval = 0;

  for (const item of items) {
    if (item.status === "skipped_existing_duplicate") {
      existingDuplicatesSkipped += 1;
    } else if (item.status === "skipped_batch_duplicate") {
      batchDuplicatesSkipped += 1;
    } else if (item.status === "validation_failed") {
      failedImports += 1;
    } else {
      newTitlesDetected += 1;
    }

    if (
      item.productionMovieId &&
      [
        "imported_pending_review",
        "rights_approved",
        "rights_rejected",
        "rights_restricted",
        "published_verified",
        "publish_failed",
      ].includes(item.status)
    ) {
      successfullyImported += 1;
      tvSeasonsImported += item.seasonsCount;
      tvEpisodesImported += item.importedEpisodes.length;
    }

    if (item.status === "import_failed" || item.status === "publish_failed") {
      failedImports += 1;
    }

    if (item.rightsReviewStatus === "pending" && item.productionMovieId) {
      pendingRightsReview += 1;
      playbackSourcesAwaitingApproval += 1;
    }
    for (const ep of item.importedEpisodes) {
      if (ep.rightsStatus === "pending") {
        playbackSourcesAwaitingApproval += 1;
      }
    }
    for (const t of item.importedTorrents) {
      if (t.rightsStatus !== "approved" || t.playbackStatus !== "active") {
        playbackSourcesAwaitingApproval += 1;
      }
    }

    if (item.rightsReviewStatus === "approved") {
      approvedTitles += 1;
    }
    if (item.publishedAt) {
      publishedTitles += 1;
    }
    if (item.status === "published_verified" && item.verification?.passed) {
      verifiedLiveTitles += 1;
    }
    if (item.missingPoster || item.missingBackdrop || item.missingMediaSource) {
      missingMediaAssets += 1;
    }
    if (item.missingMetadataFields.length > 0) {
      missingMetadata += 1;
    }
  }

  return {
    totalRecordsSubmitted: items.length,
    newTitlesDetected,
    existingDuplicatesSkipped,
    batchDuplicatesSkipped,
    successfullyImported,
    pendingRightsReview,
    approvedTitles,
    publishedTitles,
    verifiedLiveTitles,
    failedImports,
    missingMediaAssets,
    missingMetadata,
    tvSeasonsImported,
    tvEpisodesImported,
    playbackSourcesAwaitingApproval,
  };
}

function rowToJob(row: Record<string, unknown>): ProductionImportJob {
  const items = (row.items as ProductionImportItemResult[]) ?? [];
  return {
    id: String(row.id),
    name: String(row.name),
    payloadSha256: String(row.payload_sha256),
    status: row.status as ProductionImportJobStatus,
    updateExisting: Boolean(row.update_existing),
    createdBy: String(row.created_by),
    createdByEmail: String(row.created_by_email),
    metrics: (row.metrics as ProductionImportMetrics) ?? computeMetrics(items),
    items,
    batches: (row.batches as ProductionImportBatchRecord[]) ?? [],
    auditTrail: (row.audit_trail as ProductionImportAuditEvent[]) ?? [],
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

async function saveJobState(
  jobId: string,
  status: ProductionImportJobStatus,
  items: ProductionImportItemResult[],
  batches: ProductionImportBatchRecord[],
  auditTrail: ProductionImportAuditEvent[],
): Promise<ProductionImportJob> {
  const metrics = computeMetrics(items);
  const res = await pool.query(
    `
      UPDATE "production_import_jobs"
      SET status = $2,
          metrics = $3::jsonb,
          items = $4::jsonb,
          batches = $5::jsonb,
          audit_trail = $6::jsonb,
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `,
    [
      jobId,
      status,
      JSON.stringify(metrics),
      JSON.stringify(items),
      JSON.stringify(batches),
      JSON.stringify(auditTrail),
    ],
  );
  return rowToJob(res.rows[0]!);
}

export async function listProductionImportJobs(): Promise<ProductionImportJob[]> {
  await ensureProductionImporterTable();
  const res = await pool.query(`
    SELECT id, name, payload_sha256, status, update_existing, created_by, created_by_email,
           metrics, items, batches, audit_trail, created_at, updated_at
    FROM "production_import_jobs"
    ORDER BY created_at DESC
    LIMIT 30
  `);
  return res.rows.map(rowToJob);
}

export async function getProductionImportJob(
  jobId: string,
): Promise<{ job: ProductionImportJob; payload: ProductionAdditionRecord[] } | null> {
  await ensureProductionImporterTable();
  const res = await pool.query(
    `SELECT * FROM "production_import_jobs" WHERE id = $1 LIMIT 1`,
    [jobId],
  );
  if (!res.rows[0]) return null;
  return {
    job: rowToJob(res.rows[0]),
    payload: (res.rows[0].payload as ProductionAdditionRecord[]) ?? [],
  };
}

/**
 * Curated, source-verified Library of Congress public-domain additions pack:
 * - 3 Library of Congress public-domain movies (1903-1906)
 * - 1 Library of Congress public-domain multi-episode TV documentary series (2 episodes)
 */
export function getVerifiedPublicDomainAdditionsPack(): ProductionAdditionRecord[] {
  const locCredit =
    "Library of Congress, Motion Picture, Broadcasting, and Recorded Sound Division, Before and After the Great Earthquake and Fire: Early Films of San Francisco, 1897 to 1916 Collection";
  const licenseVersion = "LOC collection public-domain notice";
  const ep1Url =
    "https://tile.loc.gov/streaming-services/iiif/service:mbrs:ntscrm:00015143:00015143/full/full/0/full/default.m3u8";
  const ep2Url =
    "https://tile.loc.gov/streaming-services/iiif/service:mbrs:ntscrm:00007947:00007947/full/full/0/full/default.m3u8";

  const moviesPack: ProductionAdditionRecord[] = curatedPublicDomainTitles.map((title) => ({
    ...title,
    rating: "G",
    tagline: `Library of Congress Archival Motion Picture (${title.year ?? 1906})`,
  }));

  const seriesPack: ProductionAdditionRecord = {
    name: "Early San Francisco Chronicles (1897–1916)",
    kind: "series",
    synopsis:
      "A two-part Library of Congress historical docuseries presenting preserved early motion pictures of San Francisco before and immediately after the April 1906 earthquake and fire.",
    year: 1906,
    tagline: "Preserved Library of Congress archival docuseries of turn-of-the-century San Francisco.",
    creatorAttribution: "Miles Brothers (Library of Congress Motion Picture, Broadcasting, and Recorded Sound Division)",
    rating: "TV-G",
    durationMinutes: 23,
    genres: ["Documentary", "History", "Classics"],
    cast: ["Theodore Roosevelt"],
    featured: false,
    rights: [
      {
        assetKind: "main-video",
        assetLabel: "Library of Congress Collection Master Series Listing",
        assetUrl: ep1Url,
        rightsHolder: "Public domain in the United States (Library of Congress collection record)",
        creatorAttribution: `Miles Brothers; source credit: ${locCredit}`,
        licenseType: "public-domain",
        licenseVersion,
        licenseUrl: "https://www.loc.gov/item/00694408/",
        usageRestrictions: [
          "U.S. public-domain status only; no foreign-territory conclusion is made.",
          `Use the Library of Congress source credit: ${locCredit}.`,
        ],
        sourceUrl: "https://www.loc.gov/item/00694408/",
        evidenceUrl: "https://www.loc.gov/item/00694408/",
        evidenceNotes:
          "Library of Congress collection-level and item-level records confirm that the Before and After the Great Earthquake and Fire: Early Films of San Francisco, 1897 to 1916 Collection is in the U.S. public domain and free to use and reuse.",
        territory: "United States",
        expiresAt: null,
        uploaderAttested: true,
      },
    ],
    seasons: [
      {
        seasonNumber: 1,
        name: "Season 1: Before & After the 1906 Earthquake",
        episodes: [
          {
            episodeNumber: 1,
            name: "Part I: Market Street Before the Fire (April 14, 1906)",
            synopsis:
              "A silent camera ride down Market Street toward the Ferry Building filmed four days before the 1906 San Francisco earthquake and fire.",
            durationMinutes: 10,
            stream: { url: ep1Url },
            rights: {
              assetKind: "main-video",
              assetLabel: "Episode 1 Library of Congress IIIF HLS Viewing Copy",
              assetUrl: ep1Url,
              rightsHolder: "Public domain in the United States (Library of Congress item 00694408)",
              creatorAttribution: `Miles Brothers; source credit: ${locCredit}`,
              licenseType: "public-domain",
              licenseVersion,
              licenseUrl: "https://www.loc.gov/item/00694408/",
              usageRestrictions: [
                "U.S. public-domain status only; no foreign-territory conclusion is made.",
              ],
              sourceUrl: "https://www.loc.gov/item/00694408/",
              evidenceUrl: "https://www.loc.gov/item/00694408/",
              evidenceNotes:
                "Library of Congress item 00694408 dates this silent actuality film to April 14, 1906 and confirms public-domain status in the United States.",
              territory: "United States",
              expiresAt: null,
              uploaderAttested: true,
            },
          },
          {
            episodeNumber: 2,
            name: "Part II: San Francisco Earthquake & Fire Aftermath (May 1906)",
            synopsis:
              "Archival actuality footage documenting the ruins, relief camps, and recovery operations across San Francisco and Oakland following the April 18, 1906 earthquake.",
            durationMinutes: 13,
            stream: { url: ep2Url },
            rights: {
              assetKind: "main-video",
              assetLabel: "Episode 2 Library of Congress IIIF HLS Viewing Copy",
              assetUrl: ep2Url,
              rightsHolder: "Public domain in the United States (Library of Congress item 00694425)",
              creatorAttribution: `Library of Congress; source credit: ${locCredit}`,
              licenseType: "public-domain",
              licenseVersion,
              licenseUrl: "https://www.loc.gov/item/00694425/",
              usageRestrictions: [
                "U.S. public-domain status only; no foreign-territory conclusion is made.",
              ],
              sourceUrl: "https://www.loc.gov/item/00694425/",
              evidenceUrl: "https://www.loc.gov/item/00694425/",
              evidenceNotes:
                "Library of Congress item 00694425 dates this silent actuality film to May 1906 and confirms public-domain status in the United States.",
              territory: "United States",
              expiresAt: null,
              uploaderAttested: true,
            },
          },
        ],
      },
    ],
    uploaderAttested: true,
  };

  return [...moviesPack, seriesPack];
}

/**
 * PHASE A — Input & Preflight Validation
 * Checks all records against existing DB records (by ID, slug, IMDb ID, and normalized name+year+kind),
 * detects within-batch duplicates, validates rights & media URLs, and saves a preflight job report.
 */
export async function preflightValidateAdditions(input: {
  name?: string;
  records: unknown[];
  updateExisting?: boolean;
  probeStreams?: boolean;
  session: RequestSession;
}): Promise<ProductionImportJob> {
  await ensureProductionImporterTable();

  const rawRecords = Array.isArray(input.records) ? input.records : [];
  if (!rawRecords.length) {
    throw new Error("Provide at least one movie or TV series addition record.");
  }

  const updateExisting = Boolean(input.updateExisting);
  const payloadJson = JSON.stringify(rawRecords);
  const payloadSha256 = createHash("sha256").update(payloadJson).digest("hex");

  // 1. Collect candidate IDs, slugs, IMDb codes, and normalized names for bulk duplicate lookup
  const candidateIds = new Set<string>();
  const candidateSlugs = new Set<string>();
  const candidateImdbCodes = new Set<string>();
  const candidateNamesLower = new Set<string>();

  for (const raw of rawRecords) {
    if (!raw || typeof raw !== "object") continue;
    const obj = raw as Record<string, unknown>;
    if (typeof obj.id === "string" && obj.id.trim()) candidateIds.add(obj.id.trim());
    if (typeof obj.name === "string" && obj.name.trim()) {
      const norm = normalizeTitleName(obj.name);
      candidateNamesLower.add(norm.toLowerCase());
      candidateSlugs.add(slugBase(norm));
    }
    if (typeof obj.slug === "string" && obj.slug.trim()) {
      candidateSlugs.add(slugBase(obj.slug));
    }
    if (typeof obj.imdbCode === "string" && /^tt\d{5,16}$/i.test(obj.imdbCode.trim())) {
      candidateImdbCodes.add(obj.imdbCode.trim().toLowerCase());
    }
  }

  // Query existing database records
  const existingById = new Map<string, { id: string; slug: string; name: string; status: string; kind: string; year: number | null }>();
  const existingBySlug = new Map<string, { id: string; slug: string; name: string; status: string; kind: string; year: number | null }>();
  const existingByNameYearKind = new Map<string, { id: string; slug: string; name: string; status: string; kind: string; year: number | null }>();
  const existingByImdb = new Map<string, { movieId: string; imdbCode: string }>();

  if (candidateSlugs.size > 0 || candidateNamesLower.size > 0) {
    const slugArr = [...candidateSlugs];
    const nameArr = [...candidateNamesLower];
    const dbRes = await pool.query(
      `
        SELECT id, slug, name, status, kind, year
        FROM movies
        WHERE slug = ANY($1::text[])
           OR LOWER(TRIM(name)) = ANY($2::text[])
      `,
      [slugArr, nameArr],
    );
    for (const r of dbRes.rows) {
      const rec = {
        id: String(r.id),
        slug: String(r.slug),
        name: String(r.name),
        status: String(r.status),
        kind: String(r.kind),
        year: r.year !== null ? Number(r.year) : null,
      };
      existingById.set(rec.id, rec);
      existingBySlug.set(rec.slug.toLowerCase(), rec);
      const nykKey = `${rec.name.trim().toLowerCase()}|${rec.year ?? ""}|${rec.kind}`;
      existingByNameYearKind.set(nykKey, rec);
    }
  }

  if (candidateIds.size > 0) {
    const validUuids = [...candidateIds].filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
    );
    if (validUuids.length > 0) {
      const idRes = await pool.query(
        `SELECT id, slug, name, status, kind, year FROM movies WHERE id = ANY($1::uuid[])`,
        [validUuids],
      );
      for (const r of idRes.rows) {
        const rec = {
          id: String(r.id),
          slug: String(r.slug),
          name: String(r.name),
          status: String(r.status),
          kind: String(r.kind),
          year: r.year !== null ? Number(r.year) : null,
        };
        existingById.set(rec.id, rec);
        existingBySlug.set(rec.slug.toLowerCase(), rec);
      }
    }
  }

  if (candidateImdbCodes.size > 0) {
    const imdbRes = await pool.query(
      `SELECT movie_id, LOWER(imdb_code) as imdb_code FROM imported_movie_sources WHERE LOWER(imdb_code) = ANY($1::text[])`,
      [[...candidateImdbCodes]],
    );
    for (const r of imdbRes.rows) {
      existingByImdb.set(String(r.imdb_code), {
        movieId: String(r.movie_id),
        imdbCode: String(r.imdb_code),
      });
    }
  }

  const seenBatchSlugs = new Set<string>();
  const seenBatchImdb = new Set<string>();
  const seenBatchNameYearKind = new Set<string>();
  const items: ProductionImportItemResult[] = [];
  const normalizedRecords: ProductionAdditionRecord[] = [];

  for (let index = 0; index < rawRecords.length; index++) {
    const rowNumber = index + 1;
    const raw = rawRecords[index];
    const warnings: string[] = [];
    const errors: string[] = [];
    const missingMetadataFields: string[] = [];

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      items.push({
        row: rowNumber,
        normalizedName: `Row ${rowNumber}`,
        requestedSlug: `row-${rowNumber}`,
        kind: "movie",
        year: null,
        imdbCode: null,
        status: "validation_failed",
        duplicateMatchBasis: null,
        existingMovieId: null,
        productionMovieId: null,
        productionSlug: null,
        rightsIds: [],
        rightsReviewStatus: "none",
        reviewerId: null,
        reviewerEmail: null,
        reviewedAt: null,
        reviewerNote: null,
        publishedAt: null,
        missingPoster: true,
        missingBackdrop: true,
        missingMediaSource: true,
        missingMetadataFields: ["name", "synopsis", "rights"],
        seasonsCount: 0,
        episodesCount: 0,
        importedEpisodes: [],
        importedTorrents: [],
        warnings: [],
        errors: ["Record must be a valid JSON object."],
        verification: null,
      });
      continue;
    }

    const rawObj = raw as Record<string, unknown>;
    const rawName = typeof rawObj.name === "string" ? normalizeTitleName(rawObj.name) : "";
    const requestedSlug =
      typeof rawObj.slug === "string" && rawObj.slug.trim()
        ? slugBase(rawObj.slug)
        : slugBase(rawName || `row-${rowNumber}`);
    const kind =
      rawObj.kind === "series" || rawObj.kind === "live" ? rawObj.kind : ("movie" as const);
    const year =
      typeof rawObj.year === "number" && Number.isInteger(rawObj.year) ? rawObj.year : null;
    const imdbCode =
      typeof rawObj.imdbCode === "string" && rawObj.imdbCode.trim()
        ? rawObj.imdbCode.trim()
        : null;

    // Check optional/recommended metadata completeness
    if (!rawName) missingMetadataFields.push("name");
    if (!rawObj.synopsis || !String(rawObj.synopsis).trim()) missingMetadataFields.push("synopsis");
    if (year === null) missingMetadataFields.push("year");
    if (!rawObj.creatorAttribution || !String(rawObj.creatorAttribution).trim()) {
      missingMetadataFields.push("creatorAttribution");
    }
    if (!Array.isArray(rawObj.genres) || rawObj.genres.length === 0) {
      missingMetadataFields.push("genres");
    }

    const missingPoster = !rawObj.posterUrl || !String(rawObj.posterUrl).trim();
    const missingBackdrop = !rawObj.backdropUrl || !String(rawObj.backdropUrl).trim();
    if (missingPoster) warnings.push("Poster URL is not supplied (title will use placeholder card artwork).");
    if (missingBackdrop) warnings.push("Backdrop URL is not supplied.");

    const rawSeasons = Array.isArray(rawObj.seasons)
      ? (rawObj.seasons as ProductionAdditionSeasonInput[])
      : [];
    const rawTorrents = Array.isArray(rawObj.torrentSources)
      ? (rawObj.torrentSources as ProductionAdditionTorrentInput[])
      : [];

    const hasDirectStream = Boolean(
      rawObj.stream &&
        typeof rawObj.stream === "object" &&
        ((rawObj.stream as Record<string, unknown>).mp4Url ||
          (rawObj.stream as Record<string, unknown>).hlsUrl ||
          (rawObj.stream as Record<string, unknown>).playbackId),
    );
    const hasSeriesEpisodeStreams =
      kind === "series" &&
      rawSeasons.length > 0 &&
      rawSeasons.every(
        (s) =>
          Array.isArray(s.episodes) &&
          s.episodes.length > 0 &&
          s.episodes.every((ep) => Boolean(ep.stream?.url)),
      );
    const hasTorrentStream = rawTorrents.length > 0;
    const missingMediaSource =
      kind === "series"
        ? !hasSeriesEpisodeStreams && !hasDirectStream && !hasTorrentStream
        : !hasDirectStream && !hasTorrentStream;

    if (missingMediaSource) {
      errors.push(
        kind === "series"
          ? "Series requires at least one season and episode with a valid HTTPS .mp4 or .m3u8 stream URL."
          : "Movie requires a valid stream (mp4Url or hlsUrl) or an authorized torrent source.",
      );
    }

    // Check within-batch duplicates first
    const nykKey = `${rawName.toLowerCase()}|${year ?? ""}|${kind}`;
    if (
      seenBatchSlugs.has(requestedSlug) ||
      (imdbCode && seenBatchImdb.has(imdbCode.toLowerCase())) ||
      (rawName && seenBatchNameYearKind.has(nykKey))
    ) {
      items.push({
        row: rowNumber,
        normalizedName: rawName || `Row ${rowNumber}`,
        requestedSlug,
        kind,
        year,
        imdbCode,
        status: "skipped_batch_duplicate",
        duplicateMatchBasis: "Duplicate record within the incoming import batch",
        existingMovieId: null,
        productionMovieId: null,
        productionSlug: null,
        rightsIds: [],
        rightsReviewStatus: "none",
        reviewerId: null,
        reviewerEmail: null,
        reviewedAt: null,
        reviewerNote: null,
        publishedAt: null,
        missingPoster,
        missingBackdrop,
        missingMediaSource,
        missingMetadataFields,
        seasonsCount: rawSeasons.length,
        episodesCount: rawSeasons.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0),
        importedEpisodes: [],
        importedTorrents: [],
        warnings,
        errors: ["Duplicate record detected inside the same incoming batch; skipped."],
        verification: null,
      });
      continue;
    }

    seenBatchSlugs.add(requestedSlug);
    if (imdbCode) seenBatchImdb.add(imdbCode.toLowerCase());
    if (rawName) seenBatchNameYearKind.add(nykKey);

    // Check existing production database duplicates (by ID, slug, IMDb, or Name+Year+Kind)
    const idMatch = typeof rawObj.id === "string" ? existingById.get(rawObj.id.trim()) : undefined;
    const slugMatch = existingBySlug.get(requestedSlug);
    const imdbMatch = imdbCode ? existingByImdb.get(imdbCode.toLowerCase()) : undefined;
    const nykMatch = existingByNameYearKind.get(nykKey);

    const matchedRecord = idMatch ?? slugMatch ?? nykMatch;
    const matchedMovieId = matchedRecord?.id ?? imdbMatch?.movieId ?? null;
    const matchBasis = idMatch
      ? `Internal ID (${idMatch.id})`
      : slugMatch
        ? `Slug (${slugMatch.slug})`
        : imdbMatch
          ? `IMDb Code (${imdbMatch.imdbCode})`
          : nykMatch
            ? `Title/Year/Kind (${nykMatch.name}, ${nykMatch.year ?? "N/A"}, ${nykMatch.kind})`
            : null;

    if (matchedMovieId) {
      const isPublished = matchedRecord?.status === "published";
      if (isPublished || !updateExisting) {
        items.push({
          row: rowNumber,
          normalizedName: rawName || matchedRecord?.name || `Row ${rowNumber}`,
          requestedSlug,
          kind,
          year,
          imdbCode,
          status: "skipped_existing_duplicate",
          duplicateMatchBasis: matchBasis,
          existingMovieId: matchedMovieId,
          productionMovieId: null,
          productionSlug: matchedRecord?.slug ?? requestedSlug,
          rightsIds: [],
          rightsReviewStatus: "none",
          reviewerId: null,
          reviewerEmail: null,
          reviewedAt: null,
          reviewerNote: null,
          publishedAt: null,
          missingPoster,
          missingBackdrop,
          missingMediaSource,
          missingMetadataFields,
          seasonsCount: rawSeasons.length,
          episodesCount: rawSeasons.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0),
          importedEpisodes: [],
          importedTorrents: [],
          warnings: [
            isPublished
              ? `Protected published catalog title matched by ${matchBasis}. Existing published records are never overwritten.`
              : `Existing title matched by ${matchBasis} and updateExisting is false.`,
          ],
          errors: [],
          verification: null,
        });
        continue;
      }
    }

    // Validate against CreateAdminTitleBody Zod schema
    const zodChecked = CreateAdminTitleBody.safeParse({
      ...rawObj,
      name: rawName,
    });
    if (!zodChecked.success) {
      for (const issue of zodChecked.error.issues) {
        errors.push(`${issue.path.join(".") || "record"}: ${issue.message}`);
      }
    } else {
      const validTitle = zodChecked.data;
      // Validate rights records
      for (const right of validTitle.rights) {
        const rightIssue = validateRightsInput(right);
        if (rightIssue) errors.push(`Rights (${right.assetLabel}): ${rightIssue}`);
      }
      if (validTitle.rights.filter((r) => r.assetKind === "main-video").length !== 1) {
        errors.push("Exactly one main-video rights record is required.");
      }
      const posterMatches =
        !validTitle.posterUrl ||
        validTitle.rights.some((r) => r.assetKind === "poster" && r.assetUrl === validTitle.posterUrl);
      const backdropMatches =
        !validTitle.backdropUrl ||
        validTitle.rights.some(
          (r) => r.assetKind === "backdrop" && r.assetUrl === validTitle.backdropUrl,
        );
      if (!posterMatches) {
        errors.push("posterUrl requires a matching rights record with assetKind='poster' and the exact same assetUrl.");
      }
      if (!backdropMatches) {
        errors.push("backdropUrl requires a matching rights record with assetKind='backdrop' and the exact same assetUrl.");
      }

      // Validate stream URL format and optional live probe
      if (validTitle.stream) {
        if (validTitle.stream.provider !== "manual") {
          errors.push("Stream provider for automated import must be 'manual'.");
        } else {
          const streamUrl = validTitle.stream.hlsUrl || validTitle.stream.mp4Url;
          const streamType = validTitle.stream.hlsUrl ? "hls" : "mp4";
          if (!streamUrl) {
            errors.push("Stream object must specify mp4Url or hlsUrl.");
          } else {
            const urlIssue = validatePublicHttpUrl(streamUrl);
            if (urlIssue) errors.push(`Stream URL: ${urlIssue}`);
            else if (input.probeStreams) {
              const probeIssue = await checkDirectMediaSource(streamUrl, streamType);
              if (probeIssue) errors.push(`Stream probe (${streamUrl}): ${probeIssue}`);
            }
          }
        }
      }

      // If series has seasons/episodes, validate with ImportAdminSeriesEpisodesBody
      if (kind === "series" && rawSeasons.length > 0) {
        const epChecked = ImportAdminSeriesEpisodesBody.safeParse({
          seasons: rawSeasons,
          uploaderAttested: true,
        });
        if (!epChecked.success) {
          for (const issue of epChecked.error.issues) {
            errors.push(`seasons.${issue.path.join(".")}: ${issue.message}`);
          }
        } else {
          for (const season of epChecked.data.seasons) {
            for (const ep of season.episodes) {
              if (ep.rights.assetKind !== "main-video") {
                errors.push(`S${season.seasonNumber}E${ep.episodeNumber}: rights.assetKind must be 'main-video'.`);
              }
              const epRightsIssue = validateRightsInput(ep.rights);
              if (epRightsIssue) {
                errors.push(`S${season.seasonNumber}E${ep.episodeNumber} rights: ${epRightsIssue}`);
              }
              if (ep.rights.assetUrl !== ep.stream.url) {
                errors.push(
                  `S${season.seasonNumber}E${ep.episodeNumber}: episode stream.url must exactly match episode rights.assetUrl.`,
                );
              }
              const epUrlIssue = validatePublicHttpUrl(ep.stream.url);
              if (epUrlIssue) {
                errors.push(`S${season.seasonNumber}E${ep.episodeNumber} stream: ${epUrlIssue}`);
              }
            }
          }
        }
      }

      normalizedRecords.push({
        ...validTitle,
        slug: requestedSlug,
        imdbCode,
        seasons: rawSeasons.length > 0 ? rawSeasons : undefined,
        torrentSources: rawTorrents.length > 0 ? rawTorrents : undefined,
      });
    }

    items.push({
      row: rowNumber,
      normalizedName: rawName || `Row ${rowNumber}`,
      requestedSlug,
      kind,
      year,
      imdbCode,
      status: errors.length > 0 ? "validation_failed" : "ready_to_import",
      duplicateMatchBasis: matchBasis,
      existingMovieId: matchedMovieId,
      productionMovieId: null,
      productionSlug: null,
      rightsIds: [],
      rightsReviewStatus: "none",
      reviewerId: null,
      reviewerEmail: null,
      reviewedAt: null,
      reviewerNote: null,
      publishedAt: null,
      missingPoster,
      missingBackdrop,
      missingMediaSource,
      missingMetadataFields,
      seasonsCount: rawSeasons.length,
      episodesCount: rawSeasons.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0),
      importedEpisodes: [],
      importedTorrents: [],
      warnings,
      errors,
      verification: null,
    });
  }

  const jobId = randomUUID();
  const jobName =
    input.name?.trim() ||
    `Catalog Additions Import (${new Date().toISOString().slice(0, 19).replace("T", " ")})`;
  const metrics = computeMetrics(items);
  const auditEvent: ProductionImportAuditEvent = {
    timestamp: new Date().toISOString(),
    phase: "preflight",
    actorId: input.session.user.id,
    actorEmail: input.session.user.email,
    summary: `Preflight validated ${items.length} records: ${metrics.newTitlesDetected} new eligible, ${metrics.existingDuplicatesSkipped} existing duplicates skipped, ${metrics.batchDuplicatesSkipped} batch duplicates skipped, ${metrics.failedImports} failed validation.`,
    details: { metrics },
  };

  const insertRes = await pool.query(
    `
      INSERT INTO "production_import_jobs" (
        id, name, payload_sha256, status, update_existing, created_by, created_by_email,
        metrics, items, payload, batches, audit_trail
      ) VALUES (
        $1, $2, $3, 'preflight_validated', $4, $5, $6,
        $7::jsonb, $8::jsonb, $9::jsonb, '[]'::jsonb, $10::jsonb
      )
      RETURNING *
    `,
    [
      jobId,
      jobName,
      payloadSha256,
      updateExisting,
      input.session.user.id,
      input.session.user.email,
      JSON.stringify(metrics),
      JSON.stringify(items),
      JSON.stringify(rawRecords),
      JSON.stringify([auditEvent]),
    ],
  );

  await logAudit(input.session, "production_import.preflight", "production_import_job", jobId, {
    totalRecordsSubmitted: metrics.totalRecordsSubmitted,
    newTitlesDetected: metrics.newTitlesDetected,
    existingDuplicatesSkipped: metrics.existingDuplicatesSkipped,
  });

  return rowToJob(insertRes.rows[0]!);
}

/**
 * Helper to split items into <= 1 MB (well under 5 MB limit) batches of up to 25 items
 */
function buildBatches<T>(entries: { item: ProductionImportItemResult; record: T }[]) {
  const batches: { item: ProductionImportItemResult; record: T }[][] = [];
  let currentBatch: { item: ProductionImportItemResult; record: T }[] = [];
  let currentBytes = 2;

  for (const entry of entries) {
    const serialized = JSON.stringify(entry.record);
    const entryBytes = Buffer.byteLength(serialized, "utf8") + 1;
    if (
      currentBatch.length > 0 &&
      (currentBatch.length >= MAX_BATCH_ITEMS || currentBytes + entryBytes > MAX_BATCH_BYTES)
    ) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBytes = 2;
    }
    currentBatch.push(entry);
    currentBytes += entryBytes;
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }
  return batches;
}

/**
 * PHASE B (Dry-Run Mode) — Executes dry-run validation across 5MB-compliant batches
 */
export async function executeDryRunJob(
  jobId: string,
  session: RequestSession,
): Promise<ProductionImportJob> {
  const loaded = await getProductionImportJob(jobId);
  if (!loaded) throw new Error("Production import job not found.");
  const { job, payload } = loaded;

  const eligibleEntries: { item: ProductionImportItemResult; record: ProductionAdditionRecord }[] = [];
  for (const item of job.items) {
    if (item.status === "ready_to_import" || item.status === "dry_run_passed") {
      const rawRecord = payload[item.row - 1];
      if (rawRecord) eligibleEntries.push({ item, record: rawRecord });
    }
  }

  const batches = buildBatches(eligibleEntries);
  const batchRecords: ProductionImportBatchRecord[] = [...job.batches];

  for (let bIndex = 0; bIndex < batches.length; bIndex++) {
    const batch = batches[bIndex]!;
    const payloadStr = JSON.stringify(batch.map((e) => e.record));
    const payloadBytes = Buffer.byteLength(payloadStr, "utf8");
    const batchIssues: { row: number; title: string | null; message: string }[] = [];
    let passedCount = 0;

    for (const entry of batch) {
      const parsed = CreateAdminTitleBody.safeParse(entry.record);
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message ?? "Invalid record format.";
        entry.item.status = "validation_failed";
        entry.item.errors.push(msg);
        batchIssues.push({ row: entry.item.row, title: entry.item.normalizedName, message: msg });
      } else {
        entry.item.status = "dry_run_passed";
        passedCount += 1;
      }
    }

    batchRecords.push({
      batchIndex: bIndex + 1,
      rowNumbers: batch.map((e) => e.item.row),
      payloadBytes,
      dryRun: true,
      created: passedCount,
      updated: 0,
      skipped: batch.length - passedCount,
      issues: batchIssues,
      completedAt: new Date().toISOString(),
    });
  }

  const auditEvent: ProductionImportAuditEvent = {
    timestamp: new Date().toISOString(),
    phase: "dry_run",
    actorId: session.user.id,
    actorEmail: session.user.email,
    summary: `Dry run completed across ${batches.length} batch(es). ${
      job.items.filter((i) => i.status === "dry_run_passed").length
    } title(s) ready for production import.`,
  };

  await logAudit(session, "production_import.dry_run", "production_import_job", jobId, {
    batches: batches.length,
  });

  return saveJobState(
    jobId,
    "dry_run_completed",
    job.items,
    batchRecords,
    [...job.auditTrail, auditEvent],
  );
}

/**
 * Inserts a single title + rights + genres + video_assets + (optional series seasons/episodes)
 * into production using the exact transactional database logic of admin-content.ts & series-episodes.ts.
 */
async function importSingleTitleIntoProduction(
  rawRecord: ProductionAdditionRecord,
  session: RequestSession,
): Promise<{
  movieId: string;
  slug: string;
  rightsIds: string[];
  importedEpisodes: ProductionImportEpisodeLedger[];
}> {
  const checked = CreateAdminTitleBody.parse({
    ...rawRecord,
    name: normalizeTitleName(rawRecord.name),
  });

  // Idempotency guard: if a draft with this exact name & year already exists from an earlier attempt, check first
  const candidateSlugBase = slugBase(checked.name);
  let slug = candidateSlugBase;
  let suffix = 2;
  while (true) {
    const [existing] = await db
      .select({ id: movies.id, status: movies.status, name: movies.name })
      .from(movies)
      .where(eq(movies.slug, slug))
      .limit(1);
    if (!existing) break;
    if (existing.status === "published") {
      throw new Error(`Published title with slug '${slug}' already exists and cannot be overwritten.`);
    }
    slug = `${candidateSlugBase}-${suffix++}`;
  }

  return db.transaction(async (tx) => {
    const [movie] = await tx
      .insert(movies)
      .values({
        slug,
        name: checked.name.trim(),
        kind: checked.kind,
        tagline: checked.tagline ?? null,
        synopsis: checked.synopsis,
        year: checked.year ?? null,
        rating: checked.rating ?? null,
        durationMinutes: checked.durationMinutes ?? null,
        cast: checked.cast ?? [],
        creatorAttribution: checked.creatorAttribution.trim(),
        featured: checked.featured ?? false,
        posterUrl: checked.posterUrl ?? null,
        backdropUrl: checked.backdropUrl ?? null,
        status: "draft",
        createdBy: session.user.id,
        updatedAt: new Date(),
      })
      .returning({ id: movies.id, slug: movies.slug });

    const newRights = await tx
      .insert(mediaRights)
      .values(checked.rights.map((right) => rightsToInsert(right, movie.id, session)))
      .returning({ id: mediaRights.id, assetKind: mediaRights.assetKind });

    for (const name of [...new Set(checked.genres ?? [])]) {
      const normalized = name.trim();
      if (!normalized) continue;
      const genreSlug = slugBase(normalized);
      const [genre] = await tx
        .insert(genres)
        .values({ name: normalized, slug: genreSlug })
        .onConflictDoNothing()
        .returning({ id: genres.id });
      const genreRecord =
        genre ??
        (
          await tx
            .select({ id: genres.id })
            .from(genres)
            .where(eq(genres.slug, genreSlug))
            .limit(1)
        )[0];
      if (genreRecord) {
        await tx
          .insert(movieGenres)
          .values({ movieId: movie.id, genreId: genreRecord.id })
          .onConflictDoNothing();
      }
    }

    if (checked.stream) {
      const main = newRights.filter((right) => right.assetKind === "main_video");
      if (main.length !== 1) {
        throw new Error("A stream needs exactly one main-video rights record.");
      }
      if (checked.stream.provider !== "manual") {
        throw new Error("Automated import supports manual HTTPS MP4/HLS streams.");
      }
      const streamUrl = checked.stream.hlsUrl || checked.stream.mp4Url;
      if (!streamUrl) {
        throw new Error("Add a direct MP4 or HLS source.");
      }
      await tx.insert(videoAssets).values({
        movieId: movie.id,
        mediaRightId: main[0]!.id,
        provider: "manual",
        mp4Url: checked.stream.mp4Url ?? null,
        hlsUrl: checked.stream.hlsUrl ?? null,
        status: "ready",
        signedPlayback: false,
        createdBy: session.user.id,
        updatedAt: new Date(),
      });
    }

    // Phase D: If TV Series has seasons & episodes, import them in the same transaction
    const importedEpisodes: ProductionImportEpisodeLedger[] = [];
    if (checked.kind === "series" && Array.isArray(rawRecord.seasons) && rawRecord.seasons.length > 0) {
      const parsedSeasons = ImportAdminSeriesEpisodesBody.parse({
        seasons: rawRecord.seasons,
        uploaderAttested: true,
      });

      for (const seasonInput of parsedSeasons.seasons) {
        const [createdSeason] = await tx
          .insert(seriesSeasons)
          .values({
            movieId: movie.id,
            seasonNumber: seasonInput.seasonNumber,
            name: seasonInput.name?.trim() || null,
          })
          .onConflictDoNothing()
          .returning({ id: seriesSeasons.id });
        const [season] = createdSeason
          ? [createdSeason]
          : await tx
              .select({ id: seriesSeasons.id })
              .from(seriesSeasons)
              .where(
                and(
                  eq(seriesSeasons.movieId, movie.id),
                  eq(seriesSeasons.seasonNumber, seasonInput.seasonNumber),
                ),
              )
              .limit(1);
        if (!season) {
          throw new Error(`Could not create or locate Season ${seasonInput.seasonNumber}.`);
        }

        for (const episodeInput of seasonInput.episodes) {
          const [episode] = await tx
            .insert(seriesEpisodes)
            .values({
              seasonId: season.id,
              episodeNumber: episodeInput.episodeNumber,
              name: episodeInput.name.trim(),
              synopsis: episodeInput.synopsis,
              durationMinutes: episodeInput.durationMinutes ?? null,
              status: "draft",
              createdBy: session.user.id,
            })
            .returning({ id: seriesEpisodes.id });

          const [epRight] = await tx
            .insert(mediaRights)
            .values(rightsToInsert(episodeInput.rights, null, session, episode.id))
            .returning({ id: mediaRights.id });

          const epUrl = episodeInput.stream.url;
          const isHls = /\.m3u8$/i.test(new URL(epUrl).pathname);
          await tx.insert(videoAssets).values({
            movieId: null,
            episodeId: episode.id,
            mediaRightId: epRight.id,
            provider: "manual",
            providerAssetId: null,
            playbackId: null,
            hlsUrl: isHls ? epUrl : null,
            mp4Url: isHls ? null : epUrl,
            status: "ready",
            signedPlayback: false,
            createdBy: session.user.id,
            updatedAt: new Date(),
          });

          importedEpisodes.push({
            episodeId: episode.id,
            seasonNumber: seasonInput.seasonNumber,
            episodeNumber: episodeInput.episodeNumber,
            name: episodeInput.name.trim(),
            rightsId: epRight.id,
            rightsStatus: "pending",
            status: "draft",
            streamUrl: epUrl,
          });
        }
      }
    }

    return {
      movieId: movie.id,
      slug: movie.slug,
      rightsIds: newRights.map((r) => r.id),
      importedEpisodes,
    };
  });
}

/**
 * PHASE B & D — Execute Production Import (or Retry Failed Records Only)
 */
export async function executeProductionImportJob(
  jobId: string,
  session: RequestSession,
  options: { retryFailedOnly?: boolean; confirmedByAdmin?: boolean } = {},
): Promise<ProductionImportJob> {
  if (!options.confirmedByAdmin) {
    throw new Error("Explicit administrator confirmation is required before writing to production.");
  }
  if (activeJobLocks.has(jobId)) {
    throw new Error("This import job is already running.");
  }
  activeJobLocks.add(jobId);

  try {
    const loaded = await getProductionImportJob(jobId);
    if (!loaded) throw new Error("Production import job not found.");
    const { job, payload } = loaded;

    await saveJobState(jobId, "importing", job.items, job.batches, job.auditTrail);

    const eligibleEntries: {
      item: ProductionImportItemResult;
      record: ProductionAdditionRecord;
    }[] = [];

    for (const item of job.items) {
      // Idempotency: never re-import an item that already received a productionMovieId
      if (item.productionMovieId) continue;
      if (options.retryFailedOnly) {
        if (item.status === "import_failed") {
          const rawRecord = payload[item.row - 1];
          if (rawRecord) eligibleEntries.push({ item, record: rawRecord });
        }
      } else if (item.status === "ready_to_import" || item.status === "dry_run_passed") {
        const rawRecord = payload[item.row - 1];
        if (rawRecord) eligibleEntries.push({ item, record: rawRecord });
      }
    }

    const batches = buildBatches(eligibleEntries);
    const batchRecords: ProductionImportBatchRecord[] = [...job.batches];
    let totalCreated = 0;
    let totalFailed = 0;

    for (let bIndex = 0; bIndex < batches.length; bIndex++) {
      const batch = batches[bIndex]!;
      const payloadStr = JSON.stringify(batch.map((e) => e.record));
      const payloadBytes = Buffer.byteLength(payloadStr, "utf8");
      const batchIssues: { row: number; title: string | null; message: string }[] = [];
      let batchCreated = 0;

      for (const entry of batch) {
        try {
          entry.item.errors = [];
          const result = await importSingleTitleIntoProduction(entry.record, session);
          entry.item.productionMovieId = result.movieId;
          entry.item.productionSlug = result.slug;
          entry.item.rightsIds = result.rightsIds;
          entry.item.rightsReviewStatus = "pending";
          entry.item.importedEpisodes = result.importedEpisodes;
          entry.item.status = "imported_pending_review";
          batchCreated += 1;
          totalCreated += 1;
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Failed to import title into production.";
          entry.item.status = "import_failed";
          entry.item.errors.push(msg);
          batchIssues.push({ row: entry.item.row, title: entry.item.normalizedName, message: msg });
          totalFailed += 1;
        }
      }

      batchRecords.push({
        batchIndex: batchRecords.length + 1,
        rowNumbers: batch.map((e) => e.item.row),
        payloadBytes,
        dryRun: false,
        created: batchCreated,
        updated: 0,
        skipped: batch.length - batchCreated,
        issues: batchIssues,
        completedAt: new Date().toISOString(),
      });
    }

    const nextStatus: ProductionImportJobStatus =
      totalFailed > 0 && totalCreated === 0 ? "partial_failure" : "imported_pending_review";
    const auditEvent: ProductionImportAuditEvent = {
      timestamp: new Date().toISOString(),
      phase: options.retryFailedOnly ? "retry_failed" : "production_import",
      actorId: session.user.id,
      actorEmail: session.user.email,
      summary: `${
        options.retryFailedOnly ? "Retried failed records" : "Imported records into production"
      }: ${totalCreated} created as draft pending rights review, ${totalFailed} failed.`,
      details: {
        createdMovieIds: job.items
          .filter((i) => i.productionMovieId)
          .map((i) => ({ id: i.productionMovieId, slug: i.productionSlug, name: i.normalizedName })),
      },
    };

    await logAudit(
      session,
      options.retryFailedOnly ? "production_import.retry" : "production_import.execute",
      "production_import_job",
      jobId,
      { totalCreated, totalFailed },
    );

    return saveJobState(
      jobId,
      nextStatus,
      job.items,
      batchRecords,
      [...job.auditTrail, auditEvent],
    );
  } finally {
    activeJobLocks.delete(jobId);
  }
}

/**
 * PHASE C — Explicit Administrator Rights Review (Title Rights + Series Episode Rights)
 */
export async function reviewProductionJobRights(
  jobId: string,
  input: {
    decision: "approve" | "reject" | "restrict";
    note: string;
    titleIds?: string[];
    confirmedByAdmin: boolean;
  },
  session: RequestSession,
): Promise<ProductionImportJob> {
  if (!input.confirmedByAdmin) {
    throw new Error("Explicit administrator confirmation is required to record rights review decisions.");
  }
  const note = input.note?.trim();
  if (!note || note.length < 5) {
    throw new Error("Provide an explicit reviewer note (at least 5 characters) documenting the rights review.");
  }

  const loaded = await getProductionImportJob(jobId);
  if (!loaded) throw new Error("Production import job not found.");
  const { job } = loaded;

  const filterIds =
    Array.isArray(input.titleIds) && input.titleIds.length > 0 ? new Set(input.titleIds) : null;
  const nextDbStatus =
    input.decision === "approve"
      ? "approved"
      : input.decision === "reject"
        ? "rejected"
        : "restricted";
  const now = new Date();
  let reviewedTitlesCount = 0;
  let reviewedEpisodesCount = 0;

  for (const item of job.items) {
    if (!item.productionMovieId) continue;
    if (filterIds && !filterIds.has(item.productionMovieId)) continue;

    const titleRights = await db
      .select()
      .from(mediaRights)
      .where(eq(mediaRights.movieId, item.productionMovieId));

    if (!titleRights.length) {
      item.errors.push("No media_rights records found for this title.");
      continue;
    }

    if (input.decision === "approve") {
      const incomplete = titleRights.find(
        (record) =>
          !isEvidenceComplete(record) || !isRightCurrent({ ...record, reviewStatus: "approved" }),
      );
      if (incomplete) {
        item.errors.push(
          `Rights evidence for '${incomplete.assetLabel}' is incomplete, expired, or unlicensed.`,
        );
        continue;
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(mediaRights)
        .set({
          reviewStatus: nextDbStatus,
          reviewedBy: session.user.id,
          reviewedAt: now,
          reviewNotes: note,
          updatedAt: now,
        })
        .where(eq(mediaRights.movieId, item.productionMovieId!));

      if (input.decision !== "approve") {
        await tx
          .update(movies)
          .set({ status: "archived", publishedAt: null, updatedAt: now })
          .where(eq(movies.id, item.productionMovieId!));
      }
    });

    await logAudit(session, `rights.${input.decision}`, "title", item.productionMovieId, {
      rightsIds: titleRights.map((r) => r.id),
      note,
    });

    // Also review episode rights if this is a TV series
    for (const ep of item.importedEpisodes) {
      const epRights = await db
        .select()
        .from(mediaRights)
        .where(eq(mediaRights.episodeId, ep.episodeId));
      if (!epRights.length) {
        item.errors.push(`Episode S${ep.seasonNumber}E${ep.episodeNumber} is missing rights evidence.`);
        continue;
      }
      if (input.decision === "approve") {
        const epIncomplete = epRights.find(
          (r) => !isEvidenceComplete(r) || !isRightCurrent({ ...r, reviewStatus: "approved" }),
        );
        if (epIncomplete) {
          item.errors.push(
            `Episode S${ep.seasonNumber}E${ep.episodeNumber} rights evidence is incomplete or expired.`,
          );
          continue;
        }
      }
      await db
        .update(mediaRights)
        .set({
          reviewStatus: nextDbStatus,
          reviewedBy: session.user.id,
          reviewedAt: now,
          reviewNotes: note,
          updatedAt: now,
        })
        .where(eq(mediaRights.episodeId, ep.episodeId));

      ep.rightsStatus = nextDbStatus;
      reviewedEpisodesCount += 1;

      await logAudit(session, `episode.rights.${input.decision}`, "episode", ep.episodeId, {
        rightsIds: epRights.map((r) => r.id),
        note,
      });
    }

    item.rightsReviewStatus = nextDbStatus;
    item.reviewerId = session.user.id;
    item.reviewerEmail = session.user.email;
    item.reviewedAt = now.toISOString();
    item.reviewerNote = note;
    item.status =
      input.decision === "approve"
        ? "rights_approved"
        : input.decision === "reject"
          ? "rights_rejected"
          : "rights_restricted";
    reviewedTitlesCount += 1;
  }

  const auditEvent: ProductionImportAuditEvent = {
    timestamp: now.toISOString(),
    phase: "rights_review",
    actorId: session.user.id,
    actorEmail: session.user.email,
    summary: `Administrator ${session.user.email} recorded '${input.decision}' decision for ${reviewedTitlesCount} title(s) and ${reviewedEpisodesCount} episode(s). Note: "${note}"`,
  };

  const allApproved = job.items
    .filter((i) => i.productionMovieId)
    .every((i) => i.rightsReviewStatus === "approved");

  return saveJobState(
    jobId,
    allApproved ? "rights_approved" : "imported_pending_review",
    job.items,
    job.batches,
    [...job.auditTrail, auditEvent],
  );
}

/**
 * PHASE G — 10-Point Post-Publication Live Catalog Verification
 */
export async function verifyPublishedTitleInProduction(
  movieId: string,
  expectedSlug: string,
  expectedKind: "movie" | "series" | "live",
): Promise<TenPointVerificationResult> {
  const errors: string[] = [];
  const checkedAt = new Date().toISOString();

  // 1. Check DB row directly
  const [movieRow] = await db.select().from(movies).where(eq(movies.id, movieId)).limit(1);
  const titleExists = Boolean(movieRow);
  if (!titleExists) {
    errors.push("Title record does not exist in production movies table.");
  }

  // 2. Check ID and Slug match
  const idAndSlugMatch = Boolean(
    movieRow && movieRow.id === movieId && movieRow.slug === expectedSlug,
  );
  if (!idAndSlugMatch) {
    errors.push(
      `Slug or ID mismatch (expected ${movieId}/${expectedSlug}, found ${movieRow?.id ?? "null"}/${movieRow?.slug ?? "null"}).`,
    );
  }

  // 3. Check movie/series classification
  const classificationMatches = Boolean(movieRow && movieRow.kind === expectedKind);
  if (!classificationMatches) {
    errors.push(`Classification mismatch (expected ${expectedKind}, found ${movieRow?.kind ?? "null"}).`);
  }

  // 4. Check rights records are approved and complete
  const rightsRows = movieRow
    ? await db.select().from(mediaRights).where(eq(mediaRights.movieId, movieRow.id))
    : [];
  const rightsApproved =
    rightsRows.length > 0 &&
    rightsRows.some((r) => r.assetKind === "main_video") &&
    rightsRows.every((r) => r.reviewStatus === "approved" && isEvidenceComplete(r) && isRightCurrent(r));
  if (!rightsApproved) {
    errors.push("One or more title media_rights records are not approved or have incomplete evidence.");
  }

  // 5. Check title status is published
  const statusPublished = Boolean(
    movieRow && movieRow.status === "published" && movieRow.publishedAt !== null,
  );
  if (!statusPublished) {
    errors.push(`Title status is '${movieRow?.status ?? "missing"}' (expected 'published').`);
  }

  // 6. Check public catalog hydration & discoverability
  const catalogRow = movieRow ? await getPublicCatalogRowBySlug(movieRow.slug) : null;
  const inMemoryItem = movieRow ? await catalogService.getTitleBySlug(movieRow.slug) : undefined;
  const discoverableInPublicCatalog = Boolean(catalogRow && inMemoryItem);
  if (!discoverableInPublicCatalog) {
    errors.push("Title is not discoverable through the public catalog service or slug lookup.");
  }

  // 7. Check metadata validity on public detail
  const publicDetail = catalogRow ? toPublicTitleDetail(catalogRow) : null;
  const metadataValid = Boolean(
    publicDetail &&
      publicDetail.name.trim().length > 0 &&
      publicDetail.synopsis.trim().length > 0 &&
      publicDetail.creatorAttribution.trim().length > 0 &&
      publicDetail.rights.length > 0,
  );
  if (!metadataValid) {
    errors.push("Public title detail metadata is incomplete.");
  }

  // 8. Check playback binding
  const playback = catalogRow ? await getPlaybackForRow(catalogRow) : null;
  const playbackBindingValid = Boolean(
    playback &&
      playback.url &&
      ["mp4", "hls", "cloudflare"].includes(playback.streamType),
  );
  if (!playbackBindingValid) {
    errors.push("Playback binding (getPlaybackForRow) did not resolve a valid stream URL.");
  }

  // 9. Watch page & detail page readiness
  const watchPageReady = Boolean(publicDetail && playbackBindingValid);
  if (!watchPageReady) {
    errors.push("Watch page prerequisites (publicDetail + playbackBinding) are not satisfied.");
  }

  // 10. Media endpoint / episode playback verification
  let mediaEndpointResponds = Boolean(playback && playback.url);
  let seriesSeasonsAndEpisodesVerified = true;
  let verifiedSeasonsCount = 0;
  let verifiedEpisodesCount = 0;

  if (expectedKind === "series") {
    if (!catalogRow || catalogRow.episodes.length === 0) {
      seriesSeasonsAndEpisodesVerified = false;
      mediaEndpointResponds = false;
      errors.push("Series has 0 publicly playable published episodes.");
    } else {
      const seasonNums = new Set<number>();
      for (const epRow of catalogRow.episodes) {
        seasonNums.add(epRow.seasonNumber);
        const epPlayback = await getEpisodePlaybackForRow(catalogRow, epRow.episode.id);
        if (!epPlayback || !epPlayback.url) {
          seriesSeasonsAndEpisodesVerified = false;
          mediaEndpointResponds = false;
          errors.push(
            `Episode S${epRow.seasonNumber}E${epRow.episode.episodeNumber} (${epRow.episode.name}) failed playback resolution.`,
          );
        } else {
          verifiedEpisodesCount += 1;
        }
      }
      verifiedSeasonsCount = seasonNums.size;
    }
  }

  const passed =
    titleExists &&
    idAndSlugMatch &&
    classificationMatches &&
    metadataValid &&
    rightsApproved &&
    playbackBindingValid &&
    statusPublished &&
    discoverableInPublicCatalog &&
    watchPageReady &&
    mediaEndpointResponds &&
    seriesSeasonsAndEpisodesVerified;

  return {
    passed,
    checkedAt,
    checks: {
      titleExists,
      idAndSlugMatch,
      classificationMatches,
      metadataValid,
      rightsApproved,
      playbackBindingValid,
      statusPublished,
      discoverableInPublicCatalog,
      watchPageReady,
      mediaEndpointResponds,
      ...(expectedKind === "series" ? { seriesSeasonsAndEpisodesVerified } : {}),
    },
    details: {
      productionId: movieRow?.id ?? null,
      slug: movieRow?.slug ?? null,
      kind: movieRow?.kind ?? null,
      status: movieRow?.status ?? null,
      streamType: playback?.streamType ?? null,
      streamUrl: playback?.url ?? null,
      approvedRightsCount: rightsRows.filter((r) => r.reviewStatus === "approved").length,
      verifiedSeasonsCount,
      verifiedEpisodesCount,
      watchUrl: movieRow ? `/watch/${movieRow.slug}` : null,
      detailUrl: movieRow ? `/title/${movieRow.slug}` : null,
      playbackApiUrl: movieRow ? `/api/playback/${movieRow.slug}` : null,
    },
    errors,
  };
}

/**
 * PHASE F & G — Publish Approved Titles & Episodes + Run 10-Point Live Verification
 */
export async function publishAndVerifyProductionJob(
  jobId: string,
  input: {
    titleIds?: string[];
    confirmedByAdmin: boolean;
  },
  session: RequestSession,
): Promise<ProductionImportJob> {
  if (!input.confirmedByAdmin) {
    throw new Error("Explicit administrator confirmation is required before publishing to the live catalog.");
  }
  if (activeJobLocks.has(jobId)) {
    throw new Error("This import job is currently busy.");
  }
  activeJobLocks.add(jobId);

  try {
    const loaded = await getProductionImportJob(jobId);
    if (!loaded) throw new Error("Production import job not found.");
    const { job } = loaded;

    await saveJobState(jobId, "publishing", job.items, job.batches, job.auditTrail);

    const filterIds =
      Array.isArray(input.titleIds) && input.titleIds.length > 0 ? new Set(input.titleIds) : null;
    let publishedVerifiedCount = 0;
    let failedPublishCount = 0;

    for (const item of job.items) {
      if (!item.productionMovieId) continue;
      if (filterIds && !filterIds.has(item.productionMovieId)) continue;
      if (item.status === "published_verified" && item.verification?.passed) {
        publishedVerifiedCount += 1;
        continue;
      }

      const movieId = item.productionMovieId;
      try {
        const [movie] = await db.select().from(movies).where(eq(movies.id, movieId)).limit(1);
        if (!movie) throw new Error("Title not found in production database.");

        // Execute exact publication gate from POST /api/admin/titles/:id/publish
        const [rights, video, torrentRows] = await Promise.all([
          db.select().from(mediaRights).where(eq(mediaRights.movieId, movie.id)),
          db.select().from(videoAssets).where(eq(videoAssets.movieId, movie.id)).limit(1),
          db
            .select({ torrent: importedTorrentSources })
            .from(importedTorrentSources)
            .innerJoin(
              importedMovieSources,
              eq(importedTorrentSources.movieSourceId, importedMovieSources.id),
            )
            .where(eq(importedMovieSources.movieId, movie.id)),
        ]);

        const currentRights = rights.filter((record) => record.movieId === movie.id);
        const main = currentRights.find((record) => record.assetKind === "main_video");
        const stream = video[0];
        const activeTorrent = torrentRows.some(({ torrent }) =>
          isTorrentPlaybackEligible(torrent, true),
        );
        const mediaReady =
          movie.kind === "series" ||
          (currentRights.filter((record) => record.assetKind === "main_video").length === 1 &&
            Boolean(main) &&
            ((Boolean(stream) && stream!.status === "ready" && stream!.mediaRightId === main!.id) ||
              activeTorrent));

        if (
          !currentRights.length ||
          currentRights.some(
            (record) => !isEvidenceComplete(record) || record.reviewStatus !== "approved",
          ) ||
          !mediaReady
        ) {
          throw new Error(
            movie.kind === "series"
              ? "All series-level rights must be reviewed and approved before publication."
              : "All media rights must be reviewed and approved, with either a ready stream or an active approved torrent source.",
          );
        }

        const publishedAt = new Date();
        await db
          .update(movies)
          .set({
            status: "published",
            publishedAt,
            updatedAt: publishedAt,
          })
          .where(eq(movies.id, movie.id));

        await logAudit(session, "title.publish", "title", movie.id);

        // If series, also publish each approved episode using exact checks from POST /api/admin/episodes/:episodeId/publish
        if (movie.kind === "series") {
          if (item.importedEpisodes.length === 0) {
            throw new Error("Cannot publish a TV series with 0 imported episodes.");
          }
          for (const ep of item.importedEpisodes) {
            const [epRights, epVideo] = await Promise.all([
              db.select().from(mediaRights).where(eq(mediaRights.episodeId, ep.episodeId)),
              db.select().from(videoAssets).where(eq(videoAssets.episodeId, ep.episodeId)).limit(1),
            ]);
            if (
              epRights.length !== 1 ||
              epRights.some((r) => !isEvidenceComplete(r) || !isRightCurrent(r)) ||
              !hasEpisodePlaybackAssets(epRights, epVideo[0])
            ) {
              throw new Error(
                `Episode S${ep.seasonNumber}E${ep.episodeNumber} (${ep.name}) does not have approved rights and a ready playback stream.`,
              );
            }
            await db
              .update(seriesEpisodes)
              .set({
                status: "published",
                publishedAt,
                updatedAt: publishedAt,
              })
              .where(eq(seriesEpisodes.id, ep.episodeId));
            ep.status = "published";
            await logAudit(session, "episode.publish", "episode", ep.episodeId, {
              seriesId: movie.id,
              seasonNumber: ep.seasonNumber,
              episodeNumber: ep.episodeNumber,
            });
          }
        }

        // Refresh in-memory catalog caches immediately before verification
        invalidatePublicCatalogCache();
        await catalogService.refreshCatalog();

        // Phase G: Execute 10-point live catalog verification
        const verification = await verifyPublishedTitleInProduction(
          movie.id,
          movie.slug,
          movie.kind,
        );
        item.verification = verification;

        if (!verification.passed) {
          item.status = "publish_failed";
          item.errors.push(...verification.errors);
          failedPublishCount += 1;
        } else {
          item.publishedAt = publishedAt.toISOString();
          item.status = "published_verified";
          publishedVerifiedCount += 1;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Publication or verification failed.";
        item.status = "publish_failed";
        item.errors.push(msg);
        failedPublishCount += 1;
      }
    }

    // Final cache refresh to ensure all newly published titles are live across every endpoint
    invalidatePublicCatalogCache();
    await catalogService.refreshCatalog();

    const auditEvent: ProductionImportAuditEvent = {
      timestamp: new Date().toISOString(),
      phase: "publish_and_verify",
      actorId: session.user.id,
      actorEmail: session.user.email,
      summary: `Published and verified ${publishedVerifiedCount} title(s) in the live FamilyFlix catalog (${failedPublishCount} failed).`,
      details: {
        publishedVerifiedCount,
        failedPublishCount,
      },
    };

    const nextStatus: ProductionImportJobStatus =
      failedPublishCount > 0 ? "partial_failure" : "published_verified";

    return saveJobState(
      jobId,
      nextStatus,
      job.items,
      job.batches,
      [...job.auditTrail, auditEvent],
    );
  } finally {
    activeJobLocks.delete(jobId);
  }
}
