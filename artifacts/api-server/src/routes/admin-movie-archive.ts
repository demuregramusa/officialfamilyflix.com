import express, { Router } from "express";
import { eq } from "drizzle-orm";
import {
  GetAdminArchiveSourcesParams,
  GetMovieArchiveImportJobParams,
} from "@workspace/api-zod";
import { db, movies } from "@workspace/db";
import { requireCapability } from "../lib/auth-middleware";
import { logAudit } from "../lib/audit";
import {
  getImportedMovieSources,
  getMovieArchiveImportJob,
  listMovieArchiveImportJobs,
  startMovieArchiveImport,
  validateMovieArchive,
} from "../lib/movie-archive-import";

const router = Router();
const zipBody = express.raw({
  type: ["application/zip", "application/x-zip-compressed"],
  limit: "20mb",
});

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

router.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
  const typedError = error as { type?: string; status?: number };
  if (typedError?.type === "entity.too.large" || typedError?.status === 413) {
    response.status(413).json({ error: "ZIP archives must be 20 MB or smaller." });
    return;
  }
  next(error);
});

export default router;
