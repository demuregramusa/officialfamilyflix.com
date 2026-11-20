import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import {
  SubmitCopyrightReportBody,
  SubmitCounterNoticeBody,
  SubmitCounterNoticeParams,
} from "@workspace/api-zod";
import {
  copyrightCaseEvents,
  copyrightCases,
  db,
  movies,
} from "@workspace/db";
import { validatePublicHttpUrl } from "../lib/rights";

const router = Router();

function newCaseNumber() {
  return `DG-${randomBytes(8).toString("hex").toUpperCase()}`;
}

router.post("/copyright/reports", async (request, response) => {
  const parsed = SubmitCopyrightReportBody.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Complete all required notice fields." });
    return;
  }
  const input = parsed.data;
  const urlIssue = validatePublicHttpUrl(input.infringingUrl);
  if (urlIssue) {
    response.status(400).json({ error: `Reported material URL: ${urlIssue}` });
    return;
  }
  if (input.titleId) {
    const [title] = await db.select({ id: movies.id }).from(movies).where(eq(movies.id, input.titleId)).limit(1);
    if (!title) {
      response.status(404).json({ error: "The referenced title was not found." });
      return;
    }
  }

  const caseNumber = newCaseNumber();
  const [record] = await db
    .insert(copyrightCases)
    .values({
      caseNumber,
      caseType: "copyright_report",
      movieId: input.titleId ?? null,
      reporterName: input.reporterName.trim(),
      reporterEmail: input.reporterEmail.trim().toLowerCase(),
      summary: input.workDescription.trim().slice(0, 240),
      payload: { ...input, reporterEmail: input.reporterEmail.trim().toLowerCase() },
    })
    .returning({ id: copyrightCases.id, status: copyrightCases.status });
  await db.insert(copyrightCaseEvents).values({
    caseId: record.id,
    eventType: "report_submitted",
    actorName: "Reporter",
    note: "Copyright report received and queued for administrator review.",
    detail: { caseNumber },
  });
  response.status(201).json({
    caseNumber,
    status: record.status.replaceAll("_", "-"),
    message: "Your report was received. Submission is not a finding of infringement.",
  });
});

router.post("/copyright/cases/:caseNumber/counter-notices", async (request, response) => {
  const params = SubmitCounterNoticeParams.safeParse(request.params);
  const parsed = SubmitCounterNoticeBody.safeParse(request.body);
  if (!params.success || !parsed.success) {
    response.status(400).json({
      error: (!parsed.success && parsed.error.issues[0]?.message) || "Complete all required counter-notice fields.",
    });
    return;
  }
  const urlIssue = validatePublicHttpUrl(parsed.data.removedMaterialUrl);
  if (urlIssue) {
    response.status(400).json({ error: `Removed material URL: ${urlIssue}` });
    return;
  }
  const [parentCase] = await db
    .select()
    .from(copyrightCases)
    .where(eq(copyrightCases.caseNumber, params.data.caseNumber))
    .limit(1);
  if (!parentCase) {
    response.status(404).json({ error: "The copyright case was not found." });
    return;
  }
  if (["closed", "rejected"].includes(parentCase.status)) {
    response.status(409).json({ error: "This case is closed and cannot receive a counter-notice." });
    return;
  }

  const caseNumber = newCaseNumber();
  const input = parsed.data;
  const [counterCase] = await db
    .insert(copyrightCases)
    .values({
      caseNumber,
      caseType: "counter_notice",
      status: "counter_notice_received",
      movieId: parentCase.movieId,
      relatedCaseId: parentCase.id,
      reporterName: input.fullName.trim(),
      reporterEmail: input.email.trim().toLowerCase(),
      summary: input.reason.trim().slice(0, 240),
      payload: input,
    })
    .returning({ id: copyrightCases.id, status: copyrightCases.status });
  await db
    .update(copyrightCases)
    .set({ status: "counter_notice_received", updatedAt: new Date() })
    .where(and(
      eq(copyrightCases.id, parentCase.id),
      eq(copyrightCases.status, parentCase.status),
    ));
  await db.insert(copyrightCaseEvents).values([
    {
      caseId: counterCase.id,
      eventType: "counter_notice_submitted",
      actorName: "Respondent",
      note: "Counter-notice received; no automatic restoration has occurred.",
      detail: { relatedCaseNumber: parentCase.caseNumber },
    },
    {
      caseId: parentCase.id,
      eventType: "counter_notice_received",
      actorName: "System",
      note: "A counter-notice was linked to this case. Administrator review is required.",
      detail: { counterCaseNumber: caseNumber },
    },
  ]);
  response.status(201).json({
    caseNumber,
    status: counterCase.status.replaceAll("_", "-"),
    message: "Your counter-notice was received. Content is not automatically restored.",
  });
});

export default router;
