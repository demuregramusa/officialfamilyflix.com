import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, movies } from "@workspace/db";
import { requireCapability } from "../lib/auth-middleware";
import {
  executeDryRunJob,
  executeProductionImportJob,
  getProductionImportJob,
  getVerifiedPublicDomainAdditionsPack,
  listProductionImportJobs,
  preflightValidateAdditions,
  publishAndVerifyProductionJob,
  reviewProductionJobRights,
  verifyPublishedTitleInProduction,
} from "../lib/production-importer";

const router = Router();

function sendError(res: import("express").Response, error: unknown, status = 400) {
  const message =
    error instanceof Error ? error.message : "The production import operation could not be completed.";
  res.status(status).json({ error: message });
}

router.get(
  "/admin/production-importer/starter-additions",
  requireCapability("library.import"),
  (_req, res) => {
    res.json(getVerifiedPublicDomainAdditionsPack());
  },
);

router.get(
  "/admin/production-importer/jobs",
  requireCapability("library.import"),
  async (_req, res) => {
    try {
      const jobs = await listProductionImportJobs();
      res.json(jobs);
    } catch (error) {
      sendError(res, error, 500);
    }
  },
);

router.get(
  "/admin/production-importer/jobs/:jobId",
  requireCapability("library.import"),
  async (req, res) => {
    try {
      const loaded = await getProductionImportJob(req.params.jobId);
      if (!loaded) {
        res.status(404).json({ error: "Production import job not found." });
        return;
      }
      res.json(loaded.job);
    } catch (error) {
      sendError(res, error, 500);
    }
  },
);

router.get(
  "/admin/production-importer/jobs/:jobId/report",
  requireCapability("library.import"),
  async (req, res) => {
    try {
      const loaded = await getProductionImportJob(req.params.jobId);
      if (!loaded) {
        res.status(404).json({ error: "Production import job not found." });
        return;
      }
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="familyflix-production-import-report-${loaded.job.id}.json"`,
      );
      res.send(JSON.stringify(loaded.job, null, 2));
    } catch (error) {
      sendError(res, error, 500);
    }
  },
);

router.post(
  "/admin/production-importer/preflight",
  requireCapability("library.import"),
  async (req, res) => {
    try {
      const body = (req.body ?? {}) as {
        name?: string;
        records?: unknown;
        payload?: string;
        updateExisting?: boolean;
        probeStreams?: boolean;
      };
      let records: unknown[] = [];
      if (Array.isArray(body.records)) {
        records = body.records;
      } else if (typeof body.payload === "string" && body.payload.trim()) {
        const parsed: unknown = JSON.parse(body.payload);
        if (!Array.isArray(parsed)) {
          res.status(400).json({ error: "Import JSON payload must be an array of title addition objects." });
          return;
        }
        records = parsed;
      } else {
        res.status(400).json({ error: "Provide an array of addition records or a JSON payload string." });
        return;
      }

      const job = await preflightValidateAdditions({
        name: body.name,
        records,
        updateExisting: Boolean(body.updateExisting),
        probeStreams: Boolean(body.probeStreams),
        session: res.locals.session,
      });
      res.status(201).json(job);
    } catch (error) {
      sendError(res, error, 400);
    }
  },
);

router.post(
  "/admin/production-importer/jobs/:jobId/dry-run",
  requireCapability("library.import"),
  async (req, res) => {
    try {
      const job = await executeDryRunJob(req.params.jobId, res.locals.session);
      res.json(job);
    } catch (error) {
      sendError(res, error, 400);
    }
  },
);

router.post(
  "/admin/production-importer/jobs/:jobId/import",
  requireCapability("library.import"),
  async (req, res) => {
    try {
      const body = (req.body ?? {}) as { confirmedByAdmin?: boolean };
      const job = await executeProductionImportJob(req.params.jobId, res.locals.session, {
        retryFailedOnly: false,
        confirmedByAdmin: Boolean(body.confirmedByAdmin),
      });
      res.json(job);
    } catch (error) {
      sendError(res, error, 400);
    }
  },
);

router.post(
  "/admin/production-importer/jobs/:jobId/retry-failed",
  requireCapability("library.import"),
  async (req, res) => {
    try {
      const body = (req.body ?? {}) as { confirmedByAdmin?: boolean };
      const job = await executeProductionImportJob(req.params.jobId, res.locals.session, {
        retryFailedOnly: true,
        confirmedByAdmin: Boolean(body.confirmedByAdmin),
      });
      res.json(job);
    } catch (error) {
      sendError(res, error, 400);
    }
  },
);

router.post(
  "/admin/production-importer/jobs/:jobId/review-rights",
  requireCapability("rights.manage"),
  async (req, res) => {
    try {
      const body = (req.body ?? {}) as {
        decision?: "approve" | "reject" | "restrict";
        note?: string;
        titleIds?: string[];
        confirmedByAdmin?: boolean;
      };
      if (!body.decision || !["approve", "reject", "restrict"].includes(body.decision)) {
        res.status(400).json({ error: "Select a valid rights review decision (approve, reject, or restrict)." });
        return;
      }
      const job = await reviewProductionJobRights(
        req.params.jobId,
        {
          decision: body.decision,
          note: body.note ?? "",
          titleIds: body.titleIds,
          confirmedByAdmin: Boolean(body.confirmedByAdmin),
        },
        res.locals.session,
      );
      res.json(job);
    } catch (error) {
      sendError(res, error, 400);
    }
  },
);

router.post(
  "/admin/production-importer/jobs/:jobId/publish-and-verify",
  requireCapability("library.publish"),
  async (req, res) => {
    try {
      const body = (req.body ?? {}) as {
        titleIds?: string[];
        confirmedByAdmin?: boolean;
      };
      const job = await publishAndVerifyProductionJob(
        req.params.jobId,
        {
          titleIds: body.titleIds,
          confirmedByAdmin: Boolean(body.confirmedByAdmin),
        },
        res.locals.session,
      );
      res.json(job);
    } catch (error) {
      sendError(res, error, 400);
    }
  },
);

router.post(
  "/admin/production-importer/verify-title/:id",
  requireCapability("library.view"),
  async (req, res) => {
    try {
      const [movie] = await db
        .select()
        .from(movies)
        .where(eq(movies.id, req.params.id))
        .limit(1);
      if (!movie) {
        res.status(404).json({ error: "Title not found." });
        return;
      }
      const verification = await verifyPublishedTitleInProduction(
        movie.id,
        movie.slug,
        movie.kind,
      );
      res.json(verification);
    } catch (error) {
      sendError(res, error, 400);
    }
  },
);

export default router;
