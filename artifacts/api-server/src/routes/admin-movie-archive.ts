import express, { Router } from "express";
import { and, eq } from "drizzle-orm";
import {
  GetAdminArchiveSourcesParams,
  GetMovieArchiveImportJobParams,
  ReviewImportedTorrentRightsBody,
  ReviewImportedTorrentRightsParams,
  SetImportedTorrentPlaybackBody,
  SetImportedTorrentPlaybackParams,
} from "@workspace/api-zod";
import {
  db,
  importedMovieSources,
  importedTorrentSources,
  movies,
} from "@workspace/db";
import { requireCapability } from "../lib/auth-middleware";
import { logAudit } from "../lib/audit";
import {
  getImportedMovieSources,
  getMovieArchiveImportJob,
  listMovieArchiveImportJobs,
  startMovieArchiveImport,
  validateMovieArchive,
} from "../lib/movie-archive-import";
import { hasReviewedTorrentRights, toAdminTorrentSourceView } from "../lib/movie-archive-policy";
import { stopTorrentSourceStreams } from "../lib/torrent-playback";

const router = Router();
const zipBody = express.raw({
  type: ["application/zip", "application/x-zip-compressed"],
  limit: "20mb",
});

function torrentSourceView(source: typeof importedTorrentSources.$inferSelect) {
  return toAdminTorrentSourceView(source);
}

async function findTorrentSource(titleId: string, torrentId: string) {
  const [row] = await db.select({ torrent: importedTorrentSources })
    .from(importedTorrentSources)
    .innerJoin(
      importedMovieSources,
      eq(importedTorrentSources.movieSourceId, importedMovieSources.id),
    )
    .where(and(
      eq(importedMovieSources.movieId, titleId),
      eq(importedTorrentSources.id, torrentId),
    ))
    .limit(1);
  return row?.torrent ?? null;
}

function requestError(response: express.Response, error: unknown, status = 400) {
  const message = error instanceof Error
    ? error.message
    : "The archive request could not be completed.";
  response.status(status).json({ error: message });
}

function getZipBody(body: unknown) {
  return Buffer.isBuffer(body) ? body : null;
}

function getArchiveName(value: string | undefined) {
  if (!value) return "movie-catalog.zip";
  try {
    return decodeURIComponent(value);
  } catch {
    return "movie-catalog.zip";
  }
}

router.post(
  "/admin/import/archive/validate",
  requireCapability("library.import"),
  zipBody,
  async (request, response) => {
    const buffer = getZipBody(request.body);
    if (!buffer) {
      response.status(400).json({ error: "Upload the ZIP file as the raw request body." });
      return;
    }
    const session = response.locals.session;
    try {
      const report = await validateMovieArchive(
        buffer,
        getArchiveName(request.header("x-archive-name")),
        session.user.id,
      );
      await logAudit(session, "archive_import.validate", "archive_import", report.job.id, {
        pages: report.archivePages,
        records: report.totalRecords,
      });
      response.status(200).json(report);
    } catch (error) {
      requestError(response, error);
    }
  },
);

router.get(
  "/admin/import/archive-jobs",
  requireCapability("library.import"),
  async (_request, response) => {
    response.json(await listMovieArchiveImportJobs());
  },
);

router.get(
  "/admin/import/archive-jobs/:jobId",
  requireCapability("library.import"),
  async (request, response) => {
    const parsed = GetMovieArchiveImportJobParams.safeParse(request.params);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid archive import job ID." });
      return;
    }
    const job = await getMovieArchiveImportJob(parsed.data.jobId);
    if (!job) {
      response.status(404).json({ error: "Archive import job not found." });
      return;
    }
    response.json(job);
  },
);

router.post(
  "/admin/import/archive-jobs/:jobId/start",
  requireCapability("library.import"),
  zipBody,
  async (request, response) => {
    const parsed = GetMovieArchiveImportJobParams.safeParse(request.params);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid archive import job ID." });
      return;
    }
    const buffer = getZipBody(request.body);
    if (!buffer) {
      response.status(400).json({ error: "Upload the same ZIP file used for validation." });
      return;
    }
    try {
      const job = await startMovieArchiveImport(parsed.data.jobId, buffer);
      await logAudit(response.locals.session, "archive_import.start", "archive_import", job.id, {
        status: job.status,
        pageIndex: job.nextPageIndex,
        pageCount: job.totalPages,
      });
      response.status(202).json(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const status = message === "Archive import job not found."
        ? 404
        : message.includes("not ready") || message.includes("already running")
          ? 409
          : 400;
      requestError(response, error, status);
    }
  },
);

router.get(
  "/admin/titles/:id/archive-sources",
  requireCapability("library.import"),
  async (request, response) => {
    const parsed = GetAdminArchiveSourcesParams.safeParse(request.params);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid title ID." });
      return;
    }
    const [title] = await db.select({ id: movies.id })
      .from(movies)
      .where(eq(movies.id, parsed.data.id))
      .limit(1);
    if (!title) {
      response.status(404).json({ error: "Title not found." });
      return;
    }
    response.json(await getImportedMovieSources(title.id));
  },
);

router.patch(
  "/admin/titles/:id/archive-torrents/:torrentId/rights-review",
  requireCapability("rights.manage"),
  async (request, response): Promise<void> => {
    const params = ReviewImportedTorrentRightsParams.safeParse(request.params);
    const body = ReviewImportedTorrentRightsBody.safeParse(request.body);
    if (!params.success || !body.success) {
      response.status(400).json({ error: "Provide a valid torrent source and rights review." });
      return;
    }

    const evidenceUrl = new URL(body.data.evidenceUrl);
    if (evidenceUrl.protocol !== "https:" || evidenceUrl.username || evidenceUrl.password) {
      response.status(400).json({ error: "Rights evidence must use a public HTTPS URL without credentials." });
      return;
    }
    const source = await findTorrentSource(params.data.id, params.data.torrentId);
    if (!source) {
      response.status(404).json({ error: "Torrent source not found for this title." });
      return;
    }

    const session = response.locals.session;
    const rightsStatus = body.data.decision === "approve"
      ? "approved"
      : body.data.decision === "restrict"
        ? "restricted"
        : "rejected";
    const [updated] = await db.update(importedTorrentSources).set({
      rightsStatus,
      rightsEvidenceUrl: body.data.evidenceUrl,
      rightsEvidenceNotes: body.data.evidenceNotes.trim(),
      rightsReviewNote: body.data.reviewerNote.trim(),
      rightsReviewedBy: session.user.id,
      rightsReviewedAt: new Date(),
      playbackStatus: "disabled",
      activatedBy: null,
      activatedAt: null,
    }).where(eq(importedTorrentSources.id, source.id)).returning();
    if (!updated) {
      response.status(404).json({ error: "Torrent source not found for this title." });
      return;
    }
    await stopTorrentSourceStreams(source.id);
    await logAudit(session, `torrent.rights.${body.data.decision}`, "torrent_source", source.id, {
      titleId: params.data.id,
      evidenceUrl: body.data.evidenceUrl,
    });
    response.json(torrentSourceView(updated));
  },
);

router.patch(
  "/admin/titles/:id/archive-torrents/:torrentId/playback",
  requireCapability("rights.manage"),
  async (request, response): Promise<void> => {
    const params = SetImportedTorrentPlaybackParams.safeParse(request.params);
    const body = SetImportedTorrentPlaybackBody.safeParse(request.body);
    if (!params.success || !body.success) {
      response.status(400).json({ error: "Provide a valid torrent source and playback state." });
      return;
    }
    const source = await findTorrentSource(params.data.id, params.data.torrentId);
    if (!source) {
      response.status(404).json({ error: "Torrent source not found for this title." });
      return;
    }
    if (body.data.active && !hasReviewedTorrentRights(source)) {
      response.status(409).json({
        error: "Review current distribution-rights evidence before activating this source.",
      });
      return;
    }

    const session = response.locals.session;
    const update = db.update(importedTorrentSources).set(body.data.active
      ? {
          playbackStatus: "active",
          activatedBy: session.user.id,
          activatedAt: new Date(),
        }
      : {
          playbackStatus: "disabled",
          activatedBy: null,
          activatedAt: null,
        });
    const [updated] = await update.where(body.data.active
      ? and(eq(importedTorrentSources.id, source.id), eq(importedTorrentSources.rightsStatus, "approved"))
      : eq(importedTorrentSources.id, source.id)).returning();
    if (!updated) {
      response.status(body.data.active ? 409 : 404).json({
        error: body.data.active
          ? "Review current distribution-rights evidence before activating this source."
          : "Torrent source not found for this title.",
      });
      return;
    }
    if (!body.data.active) await stopTorrentSourceStreams(source.id);
    await logAudit(session, body.data.active ? "torrent.playback.activate" : "torrent.playback.deactivate", "torrent_source", source.id, {
      titleId: params.data.id,
      infoHash: source.infoHash,
    });
    response.json(torrentSourceView(updated));
  },
);

router.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
  const typedError = error as { type?: string; status?: number };
  if (typedError?.type === "entity.too.large" || typedError?.status === 413) {
    response.status(413).json({ error: "ZIP archives must be 20 MB or smaller." });
    return;
  }
  next(error);
});

export default router;
