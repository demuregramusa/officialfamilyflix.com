import { createHash } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  archiveImportJobs,
  db,
  genres,
  importedMovieSources,
  importedTorrentSources,
  mediaRights,
  movieGenres,
  movies,
} from "@workspace/db";
import {
  parseMovieArchive,
  type ArchiveParseIssue,
  type ImportedMovieRecord,
  type ParsedMovieArchive,
} from "./movie-archive-parser";
import {
  disabledTorrentSource,
  isProtectedArchiveTarget,
  privateArchiveMovieDraft,
} from "./movie-archive-policy";

const PROVIDER = "yts";
const PAGE_BATCH_SIZE = 25;
const TORRENT_INSERT_BATCH_SIZE = 250;
const MAX_JOB_ISSUES = 100;
const activeJobs = new Set<string>();

type ArchiveJob = typeof archiveImportJobs.$inferSelect;

export interface ArchiveImportJobView {
  id: string;
  archiveName: string;
  archiveSha256: string;
  status: "validated" | "running" | "paused" | "completed" | "failed";
  totalPages: number;
  nextPageIndex: number;
  totalRecords: number;
  expectedNewTitles: number;
  expectedMatchedTitles: number;
  expectedSourceRecords: number;
  expectedTorrentSources: number;
  processedRecords: number;
  createdTitles: number;
  matchedTitles: number;
  updatedTitles: number;
  duplicateRecords: number;
  duplicateSourceRecords: number;
  duplicateImdbRecords: number;
  importedSourceRecords: number;
  importedTorrentSources: number;
  malformedPages: number;
  recoveredRecords: number;
  skippedRecords: number;
  failedRecords: number;
  issues: ArchiveParseIssue[];
  lastError: string | null;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArchiveValidationReport {
  job: ArchiveImportJobView;
  archivePages: number;
  totalRecords: number;
  duplicateSourceRecords: number;
  duplicateImdbRecords: number;
  invalidRecords: number;
  malformedPages: number;
  recoveredRecords: number;
  nonCatalogEntries: number;
  existingTitles: number;
  expectedNewTitles: number;
  expectedMatchedTitles: number;
  protectedTitles: number;
  expectedSourceRecords: number;
  expectedTorrentSources: number;
  expectedDatabaseWrites: number;
  issues: ArchiveParseIssue[];
}

function safeArchiveName(value: string) {
  const name = value.replace(/\\/g, "/").split("/").pop()?.trim() ?? "";
  return (name || "movie-catalog.zip").slice(0, 200);
}

function slugifyGenre(value: string) {
  return value.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

function issueList(issues: ArchiveParseIssue[]) {
  return issues.slice(0, MAX_JOB_ISSUES);
}

function toJobView(job: ArchiveJob): ArchiveImportJobView {
  return {
    id: job.id,
    archiveName: job.archiveName,
    archiveSha256: job.archiveSha256,
    status: job.status,
    totalPages: job.totalPages,
    nextPageIndex: job.nextPageIndex,
    totalRecords: job.totalRecords,
    expectedNewTitles: job.expectedNewTitles,
    expectedMatchedTitles: job.expectedMatchedTitles,
    expectedSourceRecords: job.expectedSourceRecords,
    expectedTorrentSources: job.expectedTorrentSources,
    processedRecords: job.processedRecords,
    createdTitles: job.createdTitles,
    matchedTitles: job.matchedTitles,
    updatedTitles: job.updatedTitles,
    duplicateRecords: job.duplicateRecords,
    duplicateSourceRecords: job.duplicateSourceRecords,
    duplicateImdbRecords: job.duplicateImdbRecords,
    importedSourceRecords: job.importedSourceRecords,
    importedTorrentSources: job.importedTorrentSources,
    malformedPages: job.malformedPages,
    recoveredRecords: job.recoveredRecords,
    skippedRecords: job.skippedRecords,
    failedRecords: job.failedRecords,
    issues: job.issues ?? [],
    lastError: job.lastError,
    progressPercent: job.totalPages === 0
      ? 0
      : Math.min(100, Math.round((job.nextPageIndex / job.totalPages) * 100)),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

async function estimateWrites(parsed: ParsedMovieArchive) {
  const sourceIds = parsed.records.map((record) => record.sourceId);
  const slugs = sourceIds.map((sourceId) => `yts-${sourceId}`);
  const imdbCodes = [...new Set(parsed.records.flatMap((record) => record.imdbCode ?? []))];
  const [sourceRows, slugRows, imdbRows] = await Promise.all([
    db.select({
      id: importedMovieSources.id,
      sourceId: importedMovieSources.sourceId,
      movieId: importedMovieSources.movieId,
      imdbCode: importedMovieSources.imdbCode,
    })
      .from(importedMovieSources)
      .where(and(
        eq(importedMovieSources.provider, PROVIDER),
        inArray(importedMovieSources.sourceId, sourceIds),
      )),
    db.select({
      id: movies.id,
      slug: movies.slug,
      status: movies.status,
      licenseType: movies.licenseType,
    }).from(movies).where(inArray(movies.slug, slugs)),
    imdbCodes.length
      ? db.select({
          imdbCode: importedMovieSources.imdbCode,
          movieId: importedMovieSources.movieId,
        })
        .from(importedMovieSources)
        .where(and(
          eq(importedMovieSources.provider, PROVIDER),
          inArray(importedMovieSources.imdbCode, imdbCodes),
        ))
      : Promise.resolve([]),
  ]);

  const existingTorrentRows = sourceRows.length
    ? await db.select({
        movieSourceId: importedTorrentSources.movieSourceId,
        sourceIndex: importedTorrentSources.sourceIndex,
      }).from(importedTorrentSources)
      .where(inArray(importedTorrentSources.movieSourceId, sourceRows.map((row) => row.id)))
    : [];
  const sourceIdByMetadataId = new Map(sourceRows.map((row) => [row.id, row.sourceId]));
  const existingTorrentIndexes = new Map<string, Set<number>>();
  for (const torrent of existingTorrentRows) {
    const sourceId = sourceIdByMetadataId.get(torrent.movieSourceId);
    if (!sourceId) continue;
    const indices = existingTorrentIndexes.get(sourceId) ?? new Set<number>();
    indices.add(torrent.sourceIndex);
    existingTorrentIndexes.set(sourceId, indices);
  }
  const sourceMap = new Map(sourceRows.map((row) => [row.sourceId, row.movieId]));
  const slugMap = new Map(slugRows.map((row) => [row.slug, row]));
  const imdbMap = new Map<string, string>();
  for (const row of imdbRows) {
    if (row.imdbCode && !imdbMap.has(row.imdbCode)) imdbMap.set(row.imdbCode, row.movieId);
  }
  const knownIds = new Set([
    ...sourceRows.map((row) => row.movieId),
    ...slugRows.map((row) => row.id),
    ...imdbRows.map((row) => row.movieId),
  ]);
  const knownMovies = knownIds.size
    ? await db.select({
        id: movies.id,
        status: movies.status,
        licenseType: movies.licenseType,
      }).from(movies).where(inArray(movies.id, [...knownIds]))
    : [];
  const rightsRows = knownIds.size
    ? await db.select({ movieId: mediaRights.movieId })
      .from(mediaRights)
      .where(inArray(mediaRights.movieId, [...knownIds]))
    : [];
  const movieById = new Map(knownMovies.map((row) => [row.id, row]));
  const movieWithRights = new Set(rightsRows.map((row) => row.movieId).filter(Boolean));
  const seenImdbTargets = new Map<string, string>();
  let expectedNewTitles = 0;
  let expectedMatchedTitles = 0;
  let protectedTitles = 0;
  let expectedSourceRecords = 0;
  let expectedTorrentSources = 0;

  for (const record of parsed.records) {
    const movieBySlug = slugMap.get(`yts-${record.sourceId}`);
    const imdbTarget = record.imdbCode
      ? imdbMap.get(record.imdbCode) ?? seenImdbTargets.get(record.imdbCode)
      : undefined;
    const movieId = sourceMap.get(record.sourceId) ?? movieBySlug?.id ?? imdbTarget;
    let canWrite = true;
    if (movieId) {
      const existing = movieById.get(movieId) ?? movieBySlug;
      const pendingNewTitle = movieId.startsWith("new:");
      const protectedTitle = !pendingNewTitle && isProtectedArchiveTarget(
        existing?.status ?? "missing",
        existing?.licenseType ?? "unlicensed",
        movieWithRights.has(movieId),
      );
      if (protectedTitle) {
        protectedTitles += 1;
        canWrite = false;
      } else {
        expectedMatchedTitles += 1;
      }
    } else {
      expectedNewTitles += 1;
    }
    if (record.imdbCode && !seenImdbTargets.has(record.imdbCode)) {
      seenImdbTargets.set(record.imdbCode, movieId ?? `new:${record.sourceId}`);
    }
    if (canWrite) {
      if (!sourceMap.has(record.sourceId)) expectedSourceRecords += 1;
      const existingIndices = existingTorrentIndexes.get(record.sourceId);
      expectedTorrentSources += record.torrents
        .filter((torrent) => !existingIndices?.has(torrent.sourceIndex))
        .length;
    }
  }

  return {
    existingTitles: knownIds.size,
    expectedNewTitles,
    expectedMatchedTitles,
    protectedTitles,
    expectedSourceRecords,
    expectedTorrentSources,
  };
}

function makeValidationReport(
  job: ArchiveJob,
  parsed: ParsedMovieArchive,
  estimate: Awaited<ReturnType<typeof estimateWrites>>,
): ArchiveValidationReport {
  const issues = issueList(parsed.issues);
  const expectedDatabaseWrites =
    estimate.expectedNewTitles +
    estimate.expectedSourceRecords +
    estimate.expectedTorrentSources;
  return {
    job: toJobView(job),
    archivePages: parsed.archivePages,
    totalRecords: parsed.totalRecords,
    duplicateSourceRecords: parsed.duplicateSourceRecords,
    duplicateImdbRecords: parsed.duplicateImdbRecords,
    invalidRecords: parsed.invalidRecords,
    malformedPages: parsed.malformedPages,
    recoveredRecords: parsed.recoveredRecords,
    nonCatalogEntries: parsed.nonCatalogEntries,
    existingTitles: estimate.existingTitles,
    expectedNewTitles: estimate.expectedNewTitles,
    expectedMatchedTitles: estimate.expectedMatchedTitles,
    protectedTitles: estimate.protectedTitles,
    expectedSourceRecords: estimate.expectedSourceRecords,
    expectedTorrentSources: estimate.expectedTorrentSources,
    expectedDatabaseWrites,
    issues,
  };
}

export async function validateMovieArchive(
  buffer: Buffer,
  filename: string,
  actorId: string | null,
): Promise<ArchiveValidationReport> {
  const parsed = await parseMovieArchive(buffer);
  const estimate = await estimateWrites(parsed);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const issues = issueList(parsed.issues);
  const [existingJob] = await db.select().from(archiveImportJobs)
    .where(eq(archiveImportJobs.archiveSha256, sha256))
    .orderBy(desc(archiveImportJobs.createdAt))
    .limit(1);
  if (existingJob) {
    if (existingJob.status === "validated") {
      const [updated] = await db.update(archiveImportJobs).set({
        expectedNewTitles: estimate.expectedNewTitles,
        expectedMatchedTitles: estimate.expectedMatchedTitles,
        expectedSourceRecords: estimate.expectedSourceRecords,
        expectedTorrentSources: estimate.expectedTorrentSources,
        updatedAt: new Date(),
      }).where(eq(archiveImportJobs.id, existingJob.id)).returning();
      return makeValidationReport(updated ?? existingJob, parsed, estimate);
    }
    return makeValidationReport(existingJob, parsed, estimate);
  }
  const [inserted] = await db.insert(archiveImportJobs).values({
    archiveName: safeArchiveName(filename),
    archiveSha256: sha256,
    createdBy: actorId,
    status: "validated",
    totalPages: parsed.archivePages,
    totalRecords: parsed.totalRecords,
    expectedNewTitles: estimate.expectedNewTitles,
    expectedMatchedTitles: estimate.expectedMatchedTitles,
    expectedSourceRecords: estimate.expectedSourceRecords,
    expectedTorrentSources: estimate.expectedTorrentSources,
    duplicateRecords: parsed.duplicateSourceRecords + parsed.duplicateImdbRecords,
    duplicateSourceRecords: parsed.duplicateSourceRecords,
    duplicateImdbRecords: parsed.duplicateImdbRecords,
    malformedPages: parsed.malformedPages,
    recoveredRecords: parsed.recoveredRecords,
    failedRecords: parsed.invalidRecords,
    issues,
  }).onConflictDoNothing({ target: archiveImportJobs.archiveSha256 }).returning();
  if (inserted) return makeValidationReport(inserted, parsed, estimate);
  const [racedJob] = await db.select().from(archiveImportJobs)
    .where(eq(archiveImportJobs.archiveSha256, sha256))
    .orderBy(desc(archiveImportJobs.createdAt))
    .limit(1);
  if (!racedJob) throw new Error("The archive validation report could not be saved.");
  return makeValidationReport(racedJob, parsed, estimate);
}

async function importRecordBatch(
  jobId: string,
  pageEnd: number,
  records: ImportedMovieRecord[],
) {
  if (!records.length) {
    await db.update(archiveImportJobs).set({
      nextPageIndex: pageEnd,
      updatedAt: new Date(),
    }).where(eq(archiveImportJobs.id, jobId));
    return;
  }

  await db.transaction(async (tx) => {
    const sourceIds = records.map((record) => record.sourceId);
    const slugs = sourceIds.map((sourceId) => `yts-${sourceId}`);
    const imdbCodes = [...new Set(records.flatMap((record) => record.imdbCode ?? []))];
    const sourceRows = await tx.select({
        id: importedMovieSources.id,
        sourceId: importedMovieSources.sourceId,
        movieId: importedMovieSources.movieId,
        imdbCode: importedMovieSources.imdbCode,
      })
        .from(importedMovieSources)
        .where(and(
          eq(importedMovieSources.provider, PROVIDER),
          inArray(importedMovieSources.sourceId, sourceIds),
        ));
    const existingBySlug = await tx.select({
        id: movies.id,
        slug: movies.slug,
        status: movies.status,
        licenseType: movies.licenseType,
      }).from(movies).where(inArray(movies.slug, slugs));
    const imdbRows = imdbCodes.length
      ? await tx.select({
            id: importedMovieSources.id,
            imdbCode: importedMovieSources.imdbCode,
            movieId: importedMovieSources.movieId,
          })
          .from(importedMovieSources)
          .where(and(
            eq(importedMovieSources.provider, PROVIDER),
            inArray(importedMovieSources.imdbCode, imdbCodes),
          ))
      : [];

    const sourceById = new Map(sourceRows.map((row) => [row.sourceId, row]));
    const movieBySlug = new Map(existingBySlug.map((row) => [row.slug, row]));
    const imdbMovieId = new Map<string, string>();
    for (const row of imdbRows) {
      if (row.imdbCode && !imdbMovieId.has(row.imdbCode)) imdbMovieId.set(row.imdbCode, row.movieId);
    }
    const existingMovieIds = new Set([
      ...sourceRows.map((row) => row.movieId),
      ...existingBySlug.map((row) => row.id),
      ...imdbRows.map((row) => row.movieId),
    ]);
    const moviesById = existingMovieIds.size
      ? await tx.select({
          id: movies.id,
          status: movies.status,
          licenseType: movies.licenseType,
        }).from(movies).where(inArray(movies.id, [...existingMovieIds]))
      : [];
    const rightsRows = existingMovieIds.size
      ? await tx.select({ movieId: mediaRights.movieId })
        .from(mediaRights)
        .where(inArray(mediaRights.movieId, [...existingMovieIds]))
      : [];
    const existingById = new Map(moviesById.map((row) => [row.id, row]));
    const protectedMovieIds = new Set(
      rightsRows.map((row) => row.movieId).filter((id): id is string => Boolean(id)),
    );
    const assignments: Array<{
      record: ImportedMovieRecord;
      movieId?: string;
      newTitleCandidate?: boolean;
      protectedTitle?: boolean;
    }> = [];
    const pendingByImdb = new Map<string, string>();
    const newRecordsById = new Map<string, ImportedMovieRecord>();

    for (const record of records) {
      const sourceMatch = sourceById.get(record.sourceId);
      const slugMatch = movieBySlug.get(`yts-${record.sourceId}`);
      let movieId = sourceMatch?.movieId ?? slugMatch?.id;
      if (!movieId && record.imdbCode) {
        movieId = imdbMovieId.get(record.imdbCode);
        const pendingSourceId = pendingByImdb.get(record.imdbCode);
        if (!movieId && pendingSourceId) {
          assignments.push({ record, newTitleCandidate: false, movieId: `pending:${pendingSourceId}` });
          continue;
        }
      }
      if (movieId) {
        assignments.push({
          record,
          movieId,
          protectedTitle: sourceMatch
            ? undefined
            : (() => {
                const found = existingById.get(movieId!);
                return !found ||
                  found.status !== "draft" ||
                  found.licenseType !== "unlicensed" ||
                  protectedMovieIds.has(movieId!);
              })(),
        });
        if (record.imdbCode && !imdbMovieId.has(record.imdbCode)) {
          imdbMovieId.set(record.imdbCode, movieId);
        }
        continue;
      }
      newRecordsById.set(record.sourceId, record);
      if (record.imdbCode) pendingByImdb.set(record.imdbCode, record.sourceId);
      assignments.push({ record, newTitleCandidate: true });
    }

    const newRecords = [...newRecordsById.values()];
    const insertedMovies = newRecords.length
      ? await tx.insert(movies).values(newRecords.map(privateArchiveMovieDraft))
        .onConflictDoNothing({ target: movies.slug })
        .returning({ id: movies.id, slug: movies.slug })
      : [];
    const movieIdBySlug = new Map(insertedMovies.map((row) => [row.slug, row.id]));
    const newlyInsertedIds = new Set(insertedMovies.map((row) => row.id));
    if (newRecords.length > insertedMovies.length) {
      const createdSlugs = newRecords.map((record) => `yts-${record.sourceId}`);
      const conflictedRows = await tx.select({
        id: movies.id,
        slug: movies.slug,
        status: movies.status,
        licenseType: movies.licenseType,
      }).from(movies).where(inArray(movies.slug, createdSlugs));
      for (const row of conflictedRows) {
        movieIdBySlug.set(row.slug, row.id);
        existingById.set(row.id, row);
      }
    }

    for (const assignment of assignments) {
      if (assignment.movieId?.startsWith("pending:")) {
        const sourceId = assignment.movieId.slice("pending:".length);
        assignment.movieId = movieIdBySlug.get(`yts-${sourceId}`);
      } else if (assignment.newTitleCandidate) {
        assignment.movieId = movieIdBySlug.get(`yts-${assignment.record.sourceId}`);
      }
      if (!assignment.movieId) {
        throw new Error("A title ID could not be resolved while importing the archive.");
      }
      if (newlyInsertedIds.has(assignment.movieId)) {
        assignment.protectedTitle = false;
      } else {
        const existing = existingById.get(assignment.movieId);
        assignment.protectedTitle = !existing || isProtectedArchiveTarget(
          existing.status,
          existing.licenseType,
          protectedMovieIds.has(assignment.movieId),
        );
      }
    }

    const safeAssignments = assignments.filter((assignment) => !assignment.protectedTitle);
    const sourceRowsToInsert = safeAssignments
      .filter((assignment) => !sourceById.has(assignment.record.sourceId))
      .map((assignment) => ({
        movieId: assignment.movieId!,
        importJobId: jobId,
        provider: PROVIDER,
        sourceId: assignment.record.sourceId,
        imdbCode: assignment.record.imdbCode,
        sourceUrl: assignment.record.sourceUrl,
        metadata: assignment.record.metadata,
        updatedAt: new Date(),
      }));
    const insertedSourceRows = sourceRowsToInsert.length
      ? await tx.insert(importedMovieSources).values(sourceRowsToInsert)
        .onConflictDoNothing()
        .returning({ id: importedMovieSources.id, sourceId: importedMovieSources.sourceId })
      : [];
    const sourceIdsToResolve = safeAssignments.map((assignment) => assignment.record.sourceId);
    const allSourceRows = sourceIdsToResolve.length
      ? await tx.select({
          id: importedMovieSources.id,
          sourceId: importedMovieSources.sourceId,
          movieId: importedMovieSources.movieId,
        }).from(importedMovieSources).where(and(
          eq(importedMovieSources.provider, PROVIDER),
          inArray(importedMovieSources.sourceId, sourceIdsToResolve),
        ))
      : [];
    const sourceMetadataId = new Map(allSourceRows.map((row) => [row.sourceId, row.id]));
    const sourceRowById = new Map(allSourceRows.map((row) => [row.sourceId, row]));
    const torrentRows = safeAssignments.flatMap((assignment) => {
      const sourceId = sourceMetadataId.get(assignment.record.sourceId);
      const sourceRow = sourceRowById.get(assignment.record.sourceId);
      if (!sourceId || sourceRow?.movieId !== assignment.movieId) return [];
      return assignment.record.torrents.map((torrent) =>
        disabledTorrentSource(sourceId, torrent),
      );
    });
    let insertedTorrentCount = 0;
    for (let start = 0; start < torrentRows.length; start += TORRENT_INSERT_BATCH_SIZE) {
      const batch = torrentRows.slice(start, start + TORRENT_INSERT_BATCH_SIZE);
      const inserted = await tx.insert(importedTorrentSources).values(batch)
        .onConflictDoNothing()
        .returning({ id: importedTorrentSources.id });
      insertedTorrentCount += inserted.length;
    }

    const genrePairs: Array<{ movieId: string; slug: string; name: string }> = [];
    for (const assignment of safeAssignments) {
      for (const name of assignment.record.genres) {
        const slug = slugifyGenre(name);
        if (slug) genrePairs.push({ movieId: assignment.movieId!, slug, name });
      }
    }
    const uniqueGenres = [...new Map(genrePairs.map((genre) => [genre.slug, genre])).values()];
    if (uniqueGenres.length) {
      await tx.insert(genres).values(uniqueGenres.map(({ slug, name }) => ({ slug, name })))
        .onConflictDoNothing();
      const genreRows = await tx.select({
        id: genres.id,
        slug: genres.slug,
      }).from(genres).where(inArray(genres.slug, uniqueGenres.map((genre) => genre.slug)));
      const genreIdBySlug = new Map(genreRows.map((genre) => [genre.slug, genre.id]));
      const movieGenrePairMap = new Map<string, { movieId: string; genreId: number }>();
      for (const pair of genrePairs) {
        const genreId = genreIdBySlug.get(pair.slug);
        if (genreId) {
          movieGenrePairMap.set(`${pair.movieId}:${pair.slug}`, {
            movieId: pair.movieId,
            genreId,
          });
        }
      }
      const movieGenrePairs = [...movieGenrePairMap.values()];
      if (movieGenrePairs.length) {
        await tx.insert(movieGenres).values(movieGenrePairs).onConflictDoNothing();
      }
    }

    const createdTitleCount = insertedMovies.length;
    const protectedCount = assignments.filter((assignment) => assignment.protectedTitle).length;
    const matchedCount = assignments.filter((assignment) =>
      !assignment.protectedTitle && !newlyInsertedIds.has(assignment.movieId!),
    ).length;
    const insertedSourceCount = insertedSourceRows.length;
    await tx.update(archiveImportJobs).set({
      nextPageIndex: pageEnd,
      processedRecords: sql`${archiveImportJobs.processedRecords} + ${records.length}`,
      createdTitles: sql`${archiveImportJobs.createdTitles} + ${createdTitleCount}`,
      matchedTitles: sql`${archiveImportJobs.matchedTitles} + ${matchedCount}`,
      importedSourceRecords: sql`${archiveImportJobs.importedSourceRecords} + ${insertedSourceCount}`,
      importedTorrentSources: sql`${archiveImportJobs.importedTorrentSources} + ${insertedTorrentCount}`,
      skippedRecords: sql`${archiveImportJobs.skippedRecords} + ${protectedCount}`,
      updatedAt: new Date(),
    }).where(eq(archiveImportJobs.id, jobId));
  });
}

async function runImportJob(jobId: string, buffer: Buffer) {
  try {
    const parsed = await parseMovieArchive(buffer);
    const [job] = await db.select().from(archiveImportJobs)
      .where(eq(archiveImportJobs.id, jobId))
      .limit(1);
    if (!job) throw new Error("The import job could not be found.");
    if (job.totalPages !== parsed.archivePages || job.totalRecords !== parsed.totalRecords) {
      throw new Error("The archive contents do not match the validated report.");
    }
    for (let start = job.nextPageIndex; start < parsed.pages.length; start += PAGE_BATCH_SIZE) {
      const end = Math.min(parsed.pages.length, start + PAGE_BATCH_SIZE);
      const batchRecords = parsed.pages.slice(start, end).flatMap((page) => page.records);
      await importRecordBatch(jobId, end, batchRecords);
    }
    await db.update(archiveImportJobs).set({
      status: "completed",
      nextPageIndex: parsed.pages.length,
      lastError: null,
      updatedAt: new Date(),
    }).where(eq(archiveImportJobs.id, jobId));
  } catch (error) {
    const message = error instanceof Error
      ? error.message.slice(0, 500)
      : "The archive import stopped unexpectedly.";
    await db.update(archiveImportJobs).set({
      status: "failed",
      lastError: message,
      updatedAt: new Date(),
    }).where(eq(archiveImportJobs.id, jobId));
  } finally {
    activeJobs.delete(jobId);
  }
}

export async function startMovieArchiveImport(jobId: string, buffer: Buffer) {
  const [job] = await db.select().from(archiveImportJobs)
    .where(eq(archiveImportJobs.id, jobId))
    .limit(1);
  if (!job) throw new Error("Archive import job not found.");
  if (!["validated", "paused", "failed"].includes(job.status)) {
    throw new Error("This archive import is not ready to start or resume.");
  }
  const digest = createHash("sha256").update(buffer).digest("hex");
  if (digest !== job.archiveSha256) {
    throw new Error("Select the exact same ZIP file that was validated.");
  }
  if (activeJobs.has(jobId)) throw new Error("This archive import is already running.");
  if (activeJobs.size > 0) throw new Error("Another movie archive import is already running.");
  const [runningJob] = await db.select({ id: archiveImportJobs.id })
    .from(archiveImportJobs)
    .where(eq(archiveImportJobs.status, "running"))
    .limit(1);
  if (runningJob && runningJob.id !== jobId) {
    throw new Error("Another movie archive import is already running.");
  }
  activeJobs.add(jobId);
  let updated: ArchiveJob | undefined;
  try {
    [updated] = await db.update(archiveImportJobs).set({
      status: "running",
      lastError: null,
      updatedAt: new Date(),
    }).where(eq(archiveImportJobs.id, jobId)).returning();
  } catch (error) {
    activeJobs.delete(jobId);
    throw error;
  }
  if (!updated) {
    activeJobs.delete(jobId);
    throw new Error("The archive import could not be started.");
  }
  void runImportJob(jobId, buffer);
  return toJobView(updated);
}

export async function recoverInterruptedArchiveJobs() {
  await db.update(archiveImportJobs).set({
    status: "paused",
    lastError: "The server restarted. Select and upload the same ZIP to resume.",
    updatedAt: new Date(),
  }).where(eq(archiveImportJobs.status, "running"));
}

export async function listMovieArchiveImportJobs() {
  const rows = await db.select().from(archiveImportJobs)
    .orderBy(desc(archiveImportJobs.createdAt))
    .limit(20);
  return rows.map(toJobView);
}

export async function getMovieArchiveImportJob(jobId: string) {
  const [job] = await db.select().from(archiveImportJobs)
    .where(eq(archiveImportJobs.id, jobId))
    .limit(1);
  return job ? toJobView(job) : null;
}

export async function getImportedMovieSources(movieId: string) {
  const sources = await db.select().from(importedMovieSources)
    .where(eq(importedMovieSources.movieId, movieId));
  if (!sources.length) return [];
  const torrentRows = await db.select().from(importedTorrentSources)
    .where(inArray(importedTorrentSources.movieSourceId, sources.map((source) => source.id)));
  const torrentsBySource = new Map<string, typeof torrentRows>();
  for (const torrent of torrentRows) {
    const rows = torrentsBySource.get(torrent.movieSourceId) ?? [];
    rows.push(torrent);
    torrentsBySource.set(torrent.movieSourceId, rows);
  }
  return sources.map((source) => ({
    provider: source.provider,
    sourceId: source.sourceId,
    imdbCode: source.imdbCode,
    sourceUrl: source.sourceUrl,
    metadata: source.metadata,
    torrents: (torrentsBySource.get(source.id) ?? []).map((torrent) => ({
      sourceUrl: torrent.sourceUrl,
      infoHash: torrent.infoHash,
      quality: torrent.quality,
      sourceType: torrent.sourceType,
      isRepack: torrent.isRepack,
      videoCodec: torrent.videoCodec,
      bitDepth: torrent.bitDepth,
      audioChannels: torrent.audioChannels,
      seeders: torrent.seeders,
      peers: torrent.peers,
      size: torrent.size,
      sizeBytes: torrent.sizeBytes,
      uploadedAt: torrent.uploadedAt,
      playbackStatus: torrent.playbackStatus,
      rightsStatus: torrent.rightsStatus,
      metadata: torrent.metadata,
    })),
  }));
}
