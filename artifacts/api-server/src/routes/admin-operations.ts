import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import {
  PreviewCopyrightCaseCommunicationResponse,
  SendCopyrightCaseCommunicationResponse,
  RetryCopyrightCaseCommunicationParams,
  PreviewCopyrightCaseCommunicationBody,
  SendCopyrightCaseCommunicationBody,
  SendCopyrightCaseCommunicationParams,
  CreateStaffBody,
  DecideCopyrightCaseBody,
  DecideCopyrightCaseParams,
  GetCopyrightCaseParams,
  ListAdminActivityQueryParams,
  ListCopyrightCasesQueryParams,
  RecordRepeatInfringerBody,
  UpdateAdminSettingsBody,
  UpdateStaffBody,
  UpdateStaffParams,
} from "@workspace/api-zod";
import {
  auditLogs,
  copyrightCaseEvents,
  copyrightCases,
  db,
  mediaRights,
  movies,
  repeatInfringers,
  siteSettings,
  user,
  videoAssets,
} from "@workspace/db";
import { auth } from "../auth";
import { requireCapability } from "../lib/auth-middleware";
import { logAudit } from "../lib/audit";
import { getMonetizationConfig, saveMonetizationConfig } from "../lib/monetization";
import { isEvidenceComplete, isRightCurrent } from "../lib/rights";
import {
  buildCopyrightNotice,
  canRetryNotice,
  canRestoreRestrictedTitle,
  deliverCopyrightEmail,
  noticeRecipientRole,
  matchesNoticePreview,
  serializeCopyrightCaseEvent,
  unavailableEmailTransport,
  validateNoticeReview,
  type CopyrightNoticeType,
} from "../lib/copyright-notices";

const router = Router();

function caseStatusToApi(value: string) {
  return value.replaceAll("_", "-");
}

function caseStatusToDb(value: string) {
  return value.replaceAll("-", "_");
}

function caseTypeToApi(value: string) {
  return value.replaceAll("_", "-");
}

function caseSummary(row: typeof copyrightCases.$inferSelect) {
  return {
    id: row.id,
    caseNumber: row.caseNumber,
    caseType: caseTypeToApi(row.caseType),
    status: caseStatusToApi(row.status),
    submittedAt: row.submittedAt.toISOString(),
    reporterName: row.reporterName,
    reporterEmail: row.reporterEmail,
    summary: row.summary,
  };
}

function staffSummary(row: typeof user.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role ?? "user",
    banned: Boolean(row.banned),
  };
}

function countOf(row: { count: number } | undefined) {
  return Number(row?.count ?? 0);
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "body" in error) {
    const message = (error as { body?: { message?: string } }).body?.message;
    if (message) return message;
  }
  return error instanceof Error ? error.message : "The request could not be completed.";
}

router.get("/admin/dashboard", requireCapability("library.view"), async (_request, response) => {
  const [published, pending, cases, infringers] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(movies).where(eq(movies.status, "published")),
    db.select({ count: sql<number>`count(*)::int` }).from(mediaRights).where(eq(mediaRights.reviewStatus, "pending")),
    db.select({ count: sql<number>`count(*)::int` }).from(copyrightCases).where(inArray(copyrightCases.status, [
      "open", "under_review", "restricted", "counter_notice_received",
    ])),
    db.select({ count: sql<number>`count(*)::int` }).from(repeatInfringers),
  ]);
  response.json({
    publishedTitles: countOf(published[0]),
    pendingRights: countOf(pending[0]),
    openCases: countOf(cases[0]),
    repeatInfringers: countOf(infringers[0]),
  });
});

router.get("/admin/copyright/cases", requireCapability("copyright.manage"), async (request, response) => {
  const parsed = ListCopyrightCasesQueryParams.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid case filter." });
    return;
  }
  const status = parsed.data.status ? caseStatusToDb(parsed.data.status) : null;
  const rows = await db.select().from(copyrightCases)
    .where(status ? eq(copyrightCases.status, status as typeof copyrightCases.$inferSelect.status) : undefined)
    .orderBy(desc(copyrightCases.submittedAt))
    .limit(200);
  response.json(rows.map(caseSummary));
});

router.get("/admin/copyright/cases/:id", requireCapability("copyright.manage"), async (request, response) => {
  const parsed = GetCopyrightCaseParams.safeParse(request.params);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid case ID." });
    return;
  }
  const [record] = await db.select().from(copyrightCases).where(eq(copyrightCases.id, parsed.data.id)).limit(1);
  if (!record) {
    response.status(404).json({ error: "Copyright case not found." });
    return;
  }
  const events = await db.select().from(copyrightCaseEvents)
    .where(eq(copyrightCaseEvents.caseId, record.id))
    .orderBy(desc(copyrightCaseEvents.createdAt));
  response.json({
    ...caseSummary(record),
    payload: record.payload,
    events: events.map(serializeCopyrightCaseEvent),
  });
});

router.post("/admin/copyright/cases/:id/decision", requireCapability("copyright.manage"), async (request, response) => {
  const params = DecideCopyrightCaseParams.safeParse(request.params);
  const parsed = DecideCopyrightCaseBody.safeParse(request.body);
  if (!params.success || !parsed.success) {
    response.status(400).json({ error: (!parsed.success && parsed.error.issues[0]?.message) || "Invalid case decision." });
    return;
  }
  const [record] = await db.select().from(copyrightCases).where(eq(copyrightCases.id, params.data.id)).limit(1);
  if (!record) {
    response.status(404).json({ error: "Copyright case not found." });
    return;
  }
  const { decision, note, recordRepeatInfringer } = parsed.data;
  const nextStatus = {
    acknowledge: "under_review",
    "request-info": "under_review",
    restrict: "restricted",
    remove: "resolved",
    restore: "resolved",
    reject: "rejected",
    close: "closed",
  }[decision] as typeof copyrightCases.$inferSelect.status;

  if (recordRepeatInfringer && !["remove", "restrict"].includes(decision)) {
    response.status(400).json({ error: "A repeat-infringer record can only be added with a documented restriction or removal decision." });
    return;
  }
  let infringerUserId: string | null = null;
  if (recordRepeatInfringer) {
    if (!record.movieId) {
      response.status(409).json({ error: "This case is not linked to a title, so its uploader cannot be identified." });
      return;
    }
    const [mainRight] = await db.select({ userId: mediaRights.uploaderId })
      .from(mediaRights)
      .where(and(eq(mediaRights.movieId, record.movieId), eq(mediaRights.assetKind, "main_video")))
      .limit(1);
    if (!mainRight?.userId) {
      response.status(409).json({ error: "The title has no recorded uploader; no repeat-infringer record was added." });
      return;
    }
    infringerUserId = mainRight.userId;
  }

  if (decision === "restore") {
    if (!record.movieId) {
      response.status(409).json({ error: "This case is not linked to a catalog title and cannot restore playback." });
      return;
    }
    const [rights, video] = await Promise.all([
      db.select().from(mediaRights).where(eq(mediaRights.movieId, record.movieId)),
      db.select().from(videoAssets).where(eq(videoAssets.movieId, record.movieId)).limit(1),
    ]);
    const main = rights.find((right) => right.assetKind === "main_video" && isRightCurrent(right));
    if (!canRestoreRestrictedTitle({
      hasCurrentMainRight: Boolean(main),
      allRightsApprovedAndComplete: rights.every((right) =>
        isEvidenceComplete(right) && right.reviewStatus === "approved"),
      streamReady: Boolean(video[0] && video[0].status === "ready"),
      streamMatchesMainRight: Boolean(main && video[0] && video[0].mediaRightId === main.id),
    })) {
      response.status(409).json({ error: "Restore is blocked until every rights record is re-reviewed and the linked stream is ready." });
      return;
    }
  }

  const session = response.locals.session;
  await db.transaction(async (tx) => {
    if (decision === "restore" && record.movieId) {
      await tx.update(movies).set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
        .where(eq(movies.id, record.movieId));
    }
    if ((decision === "restrict" || decision === "remove") && record.movieId) {
      await tx.update(movies).set({
        status: "archived",
        publishedAt: null,
        updatedAt: new Date(),
      }).where(eq(movies.id, record.movieId));
      await tx.update(mediaRights).set({
        reviewStatus: "restricted",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: note,
        updatedAt: new Date(),
      }).where(eq(mediaRights.movieId, record.movieId));
      await tx.update(videoAssets).set({ status: "disabled", updatedAt: new Date() })
        .where(eq(videoAssets.movieId, record.movieId));
    }
    await tx.update(copyrightCases).set({
      status: nextStatus,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(copyrightCases.id, record.id));
    await tx.insert(copyrightCaseEvents).values({
      caseId: record.id,
      eventType: `decision_${decision.replaceAll("-", "_")}`,
      actorUserId: session.user.id,
      actorName: session.user.name,
      note,
      detail: { decision },
    });
    if (infringerUserId) {
      await tx.insert(repeatInfringers).values({
        userId: infringerUserId,
        caseId: record.id,
        reason: note,
        recordedBy: session.user.id,
      });
    }
  });

  await logAudit(session, `copyright.case.${decision}`, "copyright_case", record.id, {
    caseNumber: record.caseNumber,
    recordRepeatInfringer: Boolean(recordRepeatInfringer),
  });
  const [updated] = await db.select().from(copyrightCases).where(eq(copyrightCases.id, record.id)).limit(1);
  const events = await db.select().from(copyrightCaseEvents)
    .where(eq(copyrightCaseEvents.caseId, record.id))
    .orderBy(desc(copyrightCaseEvents.createdAt));
  response.json({
    ...caseSummary(updated!),
    payload: updated!.payload,
    events: events.map(serializeCopyrightCaseEvent),
  });
});

function maskEmail(address: string) {
  const [local, domain] = address.split("@");
  if (!local || !domain) return "recipient unavailable";
  return `${local.slice(0, 1)}***@${domain}`;
}

type NoticeRecipient = { email: string; name: string };
type CounterNoticeLinkSnapshot = { url: string | undefined; errorCode: string | null };

function isNoticeRecipient(value: unknown): value is NoticeRecipient {
  return typeof value === "object" && value !== null &&
    "email" in value && typeof value.email === "string" &&
    "name" in value && typeof value.name === "string";
}

function isCounterNoticeLinkSnapshot(value: unknown): value is CounterNoticeLinkSnapshot {
  return typeof value === "object" && value !== null &&
    (!("url" in value) || typeof value.url === "string") &&
    "errorCode" in value && (value.errorCode === null || typeof value.errorCode === "string");
}

async function resolveNoticeRecipient(
  record: typeof copyrightCases.$inferSelect,
  noticeType: CopyrightNoticeType,
): Promise<{ recipient: NoticeRecipient; errorCode: string | null }> {
  if (noticeRecipientRole(noticeType) === "submitter") {
    return {
      recipient: { email: record.reporterEmail, name: record.reporterName },
      errorCode: null,
    };
  }
  if (!record.movieId) {
    return {
      recipient: { email: "", name: "Uploader" },
      errorCode: "uploader_not_linked",
    };
  }
  const [right] = await db.select({ userId: mediaRights.uploaderId })
    .from(mediaRights)
    .where(and(eq(mediaRights.movieId, record.movieId), eq(mediaRights.assetKind, "main_video")))
    .limit(1);
  if (!right?.userId) {
    return {
      recipient: { email: "", name: "Uploader" },
      errorCode: "uploader_not_identified",
    };
  }
  const [uploader] = await db.select({ email: user.email, name: user.name })
    .from(user)
    .where(eq(user.id, right.userId))
    .limit(1);
  return uploader
    ? { recipient: uploader, errorCode: null }
    : {
        recipient: { email: "", name: "Uploader" },
        errorCode: "uploader_not_identified",
      };
}

function resolveCounterNoticeLink(caseNumber: string, noticeType: CopyrightNoticeType) {
  if (noticeType !== "counter-notice-invitation") {
    return { url: undefined, errorCode: null as string | null, message: "" };
  }
  try {
    const publicUrl = process.env.FAMILYFLIX_PUBLIC_URL;
    if (!publicUrl) throw new Error("A public site URL has not been configured.");
    const baseUrl = new URL(publicUrl);
    if (baseUrl.protocol !== "https:") throw new Error("The public site URL must use HTTPS.");
    return {
      url: new URL(
        `/familyflix/copyright/counter-notice/${encodeURIComponent(caseNumber)}`,
        baseUrl,
      ).toString(),
      errorCode: null,
      message: "",
    };
  } catch (error) {
    return {
      url: undefined,
      errorCode: "public_site_url_invalid",
      message: error instanceof Error ? error.message : "A valid public site URL is required.",
    };
  }
}

router.post("/admin/copyright/cases/:id/communications/preview", requireCapability("copyright.manage"), async (request, response) => {
  const params = SendCopyrightCaseCommunicationParams.safeParse(request.params);
  const parsed = PreviewCopyrightCaseCommunicationBody.safeParse(request.body);
  if (!params.success || !parsed.success) {
    response.status(400).json({ error: (!parsed.success && parsed.error.issues[0]?.message) || "Invalid communication preview." });
    return;
  }
  const [record] = await db.select().from(copyrightCases)
    .where(eq(copyrightCases.id, params.data.id)).limit(1);
  if (!record) {
    response.status(404).json({ error: "Copyright case not found." });
    return;
  }
  const { noticeType, note } = parsed.data;
  const reviewIssue = validateNoticeReview({
    caseType: caseTypeToApi(record.caseType) as "copyright-report" | "counter-notice",
    caseStatus: caseStatusToApi(record.status),
    noticeType,
    reviewed: true,
  });
  if (reviewIssue) {
    response.status(409).json({ error: reviewIssue });
    return;
  }
  const role = noticeRecipientRole(noticeType);
  const { recipient, errorCode: recipientErrorCode } = await resolveNoticeRecipient(record, noticeType);
  const { url: counterNoticeUrl, errorCode: linkError, message: linkMessage } =
    resolveCounterNoticeLink(record.caseNumber, noticeType);
  const previewEventId = randomUUID();
  await db.insert(copyrightCaseEvents).values({
    id: previewEventId,
    caseId: record.id,
    eventType: "copyright_notice_previewed",
    actorUserId: response.locals.session.user.id,
    actorName: response.locals.session.user.name,
    note: `Staff previewed a ${noticeType} email for the ${role}.`,
    detail: {
      noticeType,
      note,
      recipientRole: role,
      recipientSnapshot: recipient,
      recipientErrorCode,
      caseStatusAtPreview: caseStatusToApi(record.status),
      counterNoticeLinkSnapshot: { url: counterNoticeUrl, errorCode: linkError },
    },
  });
  const rendered = buildCopyrightNotice({
    caseNumber: record.caseNumber,
    caseStatus: caseStatusToApi(record.status),
    caseType: caseTypeToApi(record.caseType) as "copyright-report" | "counter-notice",
    noticeType,
    note,
    recipientName: recipient.name,
    counterNoticeUrl,
  });
  response.json(PreviewCopyrightCaseCommunicationResponse.parse({
    previewEventId,
    noticeType,
    recipientRole: role,
    recipientName: recipient.name,
    maskedRecipientEmail: maskEmail(recipient.email),
    subject: rendered.subject,
    text: rendered.text,
    canDeliver: false,
    blockReason: recipientErrorCode
      ? "The uploader could not be identified from this case."
      : linkError
        ? linkMessage
        : "No approved email provider and verified sender are configured.",
  }));
});

async function deliverReviewedNotice(input: {
  caseId: string;
  caseNumber: string;
  caseType: "copyright-report" | "counter-notice";
  caseStatus: string;
  noticeType: CopyrightNoticeType;
  note: string;
  reviewed: boolean;
  communicationEventId: string;
  attempt: number;
  actorUserId: string;
  actorName: string;
  response: import("express").Response;
  recipientSnapshot: NoticeRecipient;
  recipientErrorCode?: string | null;
  counterNoticeLinkSnapshot: { url: string | undefined; errorCode: string | null };
}) {
  const {
    caseId, caseNumber, caseType, caseStatus, noticeType, note, reviewed, communicationEventId, attempt,
    actorUserId, actorName, response, recipientSnapshot, recipientErrorCode,
    counterNoticeLinkSnapshot,
  } = input;
  const reviewIssue = validateNoticeReview({ caseType, caseStatus, noticeType, reviewed });
  if (reviewIssue) {
    input.response.status(409).json({ error: reviewIssue });
    return;
  }

  const recipient = recipientSnapshot;
  const recipientRole = noticeRecipientRole(noticeType);
  let errorCode: string | null = recipientErrorCode ?? null;
  const link = counterNoticeLinkSnapshot;
  if (link.errorCode) errorCode = link.errorCode;

  const rendered = buildCopyrightNotice({
    caseNumber,
    caseStatus,
    caseType,
    noticeType,
    note,
    recipientName: recipient.name,
    counterNoticeUrl: link.url,
  });
  const delivery = errorCode
    ? { outcome: "failed" as const, errorCode }
    : await deliverCopyrightEmail(unavailableEmailTransport, {
        to: recipient.email,
        ...rendered,
        idempotencyKey: `${communicationEventId}:${attempt}`,
      });

  await db.insert(copyrightCaseEvents).values({
    caseId,
    eventType: delivery.outcome === "sent"
      ? "copyright_notice_delivery_sent"
      : "copyright_notice_delivery_failed",
    actorUserId,
    actorName,
    note: delivery.outcome === "sent"
      ? `Reviewed ${noticeType} email delivered on attempt ${attempt}.`
      : `Reviewed ${noticeType} email delivery failed on attempt ${attempt}.`,
    detail: {
      communicationEventId,
      noticeType,
      recipientRole,
      attempt,
      outcome: delivery.outcome,
      ...(delivery.outcome === "sent"
        ? { providerMessageId: delivery.messageId }
        : { errorCode: delivery.errorCode }),
    },
  });
  await logAudit(
    response.locals.session,
    `copyright.case.notice.${delivery.outcome}`,
    "copyright_case",
    caseId,
    { caseNumber, noticeType, recipientRole, attempt, errorCode: delivery.outcome === "failed" ? delivery.errorCode : undefined },
  );
  response.json(SendCopyrightCaseCommunicationResponse.parse({
    caseId,
    communicationEventId,
    outcome: delivery.outcome,
    message: delivery.outcome === "sent"
      ? "The reviewed notice was delivered."
      : delivery.errorCode === "sender_not_configured"
        ? "Delivery failed: no approved email provider and verified sender are configured."
        : delivery.errorCode === "uploader_not_linked" || delivery.errorCode === "uploader_not_identified"
          ? "Delivery failed: the uploader could not be identified from this case."
          : delivery.errorCode === "public_site_url_not_configured" || delivery.errorCode === "public_site_url_invalid"
            ? "Delivery failed: a valid HTTPS FamilyFlix site URL is required for a counter-notice link."
            : "Delivery failed. Check the sender configuration and retry this reviewed notice.",
  }));
}

router.post("/admin/copyright/cases/:id/communications", requireCapability("copyright.manage"), async (request, response) => {
  const params = SendCopyrightCaseCommunicationParams.safeParse(request.params);
  const parsed = SendCopyrightCaseCommunicationBody.safeParse(request.body);
  if (!params.success || !parsed.success) {
    response.status(400).json({ error: (!parsed.success && parsed.error.issues[0]?.message) || "Invalid case communication." });
    return;
  }
  const [record] = await db.select().from(copyrightCases)
    .where(eq(copyrightCases.id, params.data.id)).limit(1);
  if (!record) {
    response.status(404).json({ error: "Copyright case not found." });
    return;
  }
  const { noticeType, note, reviewed } = parsed.data;
  const reviewIssue = validateNoticeReview({
    caseType: caseTypeToApi(record.caseType) as "copyright-report" | "counter-notice",
    caseStatus: record.status,
    noticeType,
    reviewed,
  });
  if (reviewIssue) {
    response.status(409).json({ error: reviewIssue });
    return;
  }
  const [preview] = await db.select().from(copyrightCaseEvents)
    .where(and(
      eq(copyrightCaseEvents.id, parsed.data.previewEventId),
      eq(copyrightCaseEvents.caseId, record.id),
      eq(copyrightCaseEvents.eventType, "copyright_notice_previewed"),
    )).limit(1);
  if (!preview || !matchesNoticePreview(preview, {
    reviewerId: response.locals.session.user.id,
    noticeType,
    note,
    caseStatus: caseStatusToApi(record.status),
  })) {
    response.status(409).json({ error: "Preview this exact message and recipient again before confirming delivery." });
    return;
  }
  const recipientSnapshot = preview.detail.recipientSnapshot;
  const counterNoticeLinkSnapshot = preview.detail.counterNoticeLinkSnapshot;
  if (!isNoticeRecipient(recipientSnapshot) || !isCounterNoticeLinkSnapshot(counterNoticeLinkSnapshot)) {
    response.status(409).json({ error: "The reviewed recipient or counter-notice link could not be verified." });
    return;
  }
  const communicationEventId = randomUUID();
  const role = noticeRecipientRole(noticeType);
  const recipientErrorCode = typeof preview.detail.recipientErrorCode === "string"
    ? preview.detail.recipientErrorCode
    : null;
  await db.insert(copyrightCaseEvents).values({
    id: communicationEventId,
    caseId: record.id,
    eventType: "copyright_notice_reviewed",
    actorUserId: response.locals.session.user.id,
    actorName: response.locals.session.user.name,
    note: `Staff reviewed a ${noticeType} email for the ${role}.`,
    detail: {
      noticeType,
      note,
      recipientRole: role,
      recipientSnapshot,
      recipientErrorCode,
      caseStatusAtReview: caseStatusToApi(record.status),
      counterNoticeLinkSnapshot,
      reviewed: true,
    },
  });
  await deliverReviewedNotice({
    caseId: record.id,
    caseNumber: record.caseNumber,
    caseType: caseTypeToApi(record.caseType) as "copyright-report" | "counter-notice",
    caseStatus: caseStatusToApi(record.status),
    noticeType,
    note,
    reviewed,
    communicationEventId,
    attempt: 1,
    actorUserId: response.locals.session.user.id,
    actorName: response.locals.session.user.name,
    response,
    recipientSnapshot,
    recipientErrorCode,
    counterNoticeLinkSnapshot,
  });
});

router.post("/admin/copyright/cases/:id/communications/:eventId/retry", requireCapability("copyright.manage"), async (request, response) => {
  const params = RetryCopyrightCaseCommunicationParams.safeParse(request.params);
  if (!params.success) {
    response.status(400).json({ error: "Invalid communication event." });
    return;
  }
  const [record] = await db.select().from(copyrightCases)
    .where(eq(copyrightCases.id, params.data.id)).limit(1);
  if (!record) {
    response.status(404).json({ error: "Copyright case not found." });
    return;
  }
  const [failedAttempt] = await db.select().from(copyrightCaseEvents)
    .where(and(
      eq(copyrightCaseEvents.id, params.data.eventId),
      eq(copyrightCaseEvents.caseId, record.id),
      eq(copyrightCaseEvents.eventType, "copyright_notice_delivery_failed"),
    )).limit(1);
  if (!failedAttempt) {
    response.status(404).json({ error: "A failed notice attempt for this case was not found." });
    return;
  }
  const communicationEventId = String(failedAttempt.detail.communicationEventId ?? "");
  const [review] = await db.select().from(copyrightCaseEvents)
    .where(and(
      eq(copyrightCaseEvents.id, communicationEventId),
      eq(copyrightCaseEvents.caseId, record.id),
      eq(copyrightCaseEvents.eventType, "copyright_notice_reviewed"),
    )).limit(1);
  if (!review || review.detail.reviewed !== true) {
    response.status(409).json({ error: "The original reviewed communication could not be verified." });
    return;
  }
  const noticeType = String(review.detail.noticeType) as CopyrightNoticeType;
  if (
    (noticeType === "restriction" || noticeType === "counter-notice-invitation") &&
    (record.caseType !== "copyright_report" || record.status !== "restricted")
  ) {
    response.status(409).json({ error: "Uploader notices can only be retried while the copyright report remains restricted." });
    return;
  }
  const recipientSnapshot = review.detail.recipientSnapshot;
  if (!isNoticeRecipient(recipientSnapshot)) {
    response.status(409).json({ error: "The original reviewed recipient could not be verified." });
    return;
  }
  const allAttempts = await db.select().from(copyrightCaseEvents)
    .where(eq(copyrightCaseEvents.caseId, record.id));
  const communicationAttempts = allAttempts
    .filter((event) =>
      ["copyright_notice_delivery_failed", "copyright_notice_delivery_sent"].includes(event.eventType) &&
      String(event.detail.communicationEventId ?? "") === communicationEventId
    )
    .sort((a, b) => Number(b.detail.attempt ?? 0) - Number(a.detail.attempt ?? 0));
  if (communicationAttempts[0]?.id !== failedAttempt.id) {
    response.status(409).json({ error: "Retry the most recent failed delivery attempt." });
    return;
  }
  const latestOutcome = communicationAttempts[0]?.eventType === "copyright_notice_delivery_sent" ? "sent" : "failed";
  if (!canRetryNotice({ attempts: communicationAttempts.length, latestOutcome })) {
    if (latestOutcome === "sent") {
    response.status(409).json({ error: "This notice was already delivered." });
    return;
    }
    response.status(409).json({ error: "This notice has reached its retry limit." });
    return;
  }
  const note = String(review.detail.note ?? "");
  await deliverReviewedNotice({
    caseId: record.id,
    caseNumber: record.caseNumber,
    caseType: caseTypeToApi(record.caseType) as "copyright-report" | "counter-notice",
    caseStatus: String(review.detail.caseStatusAtReview ?? caseStatusToApi(record.status)),
    noticeType,
    note,
    reviewed: review.detail.reviewed === true,
    communicationEventId,
    attempt: communicationAttempts.length + 1,
    actorUserId: response.locals.session.user.id,
    actorName: response.locals.session.user.name,
    response,
    recipientSnapshot: recipientSnapshot as NoticeRecipient,
    recipientErrorCode: typeof review.detail.recipientErrorCode === "string" ? review.detail.recipientErrorCode : null,
    counterNoticeLinkSnapshot: review.detail.counterNoticeLinkSnapshot as { url: string | undefined; errorCode: string | null },
  });
});

router.get("/admin/repeat-infringers", requireCapability("copyright.manage"), async (_request, response) => {
  const rows = await db.select().from(repeatInfringers)
    .orderBy(desc(repeatInfringers.createdAt))
    .limit(500);
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);
  const actorIds = [...new Set(rows.map((row) => row.recordedBy))];
  const actors = actorIds.length
    ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, actorIds))
    : [];
  const actorNames = new Map(actors.map((actor) => [actor.id, actor.name]));
  response.json(rows.map((record) => ({
    id: record.id,
    userId: record.userId,
    caseId: record.caseId,
    reason: record.reason,
    createdAt: record.createdAt.toISOString(),
    actorName: actorNames.get(record.recordedBy) ?? "Former staff",
    strikeCount: counts.get(record.userId) ?? 1,
  })));
});

router.post("/admin/repeat-infringers", requireCapability("copyright.manage"), async (request, response) => {
  const parsed = RecordRepeatInfringerBody.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid repeat-infringer record." });
    return;
  }
  const [account] = await db.select({ id: user.id }).from(user).where(eq(user.id, parsed.data.userId)).limit(1);
  if (!account) {
    response.status(404).json({ error: "User not found." });
    return;
  }
  if (parsed.data.caseId) {
    const [caseRecord] = await db.select({ id: copyrightCases.id })
      .from(copyrightCases)
      .where(eq(copyrightCases.id, parsed.data.caseId))
      .limit(1);
    if (!caseRecord) {
      response.status(404).json({ error: "Related copyright case not found." });
      return;
    }
  }
  const session = response.locals.session;
  const [record] = await db.insert(repeatInfringers).values({
    userId: parsed.data.userId,
    caseId: parsed.data.caseId ?? null,
    reason: parsed.data.reason,
    recordedBy: session.user.id,
  }).returning();
  await logAudit(session, "copyright.repeat_infringer.record", "repeat_infringer", record.id, {
    userId: record.userId,
    caseId: record.caseId,
  });
  const [count] = await db.select({ count: sql<number>`count(*)::int` })
    .from(repeatInfringers)
    .where(eq(repeatInfringers.userId, record.userId));
  response.status(201).json({
    id: record.id,
    userId: record.userId,
    caseId: record.caseId,
    reason: record.reason,
    createdAt: record.createdAt.toISOString(),
    actorName: session.user.name,
    strikeCount: countOf(count),
  });
});

router.get("/admin/activity", requireCapability("audit.view"), async (request, response) => {
  const parsed = ListAdminActivityQueryParams.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid activity filter." });
    return;
  }
  const rows = await db.select({
    id: auditLogs.id,
    action: auditLogs.action,
    entity: auditLogs.entity,
    entityId: auditLogs.entityId,
    detail: auditLogs.detail,
    createdAt: auditLogs.createdAt,
    userName: user.name,
    userEmail: user.email,
  })
    .from(auditLogs)
    .leftJoin(user, eq(auditLogs.userId, user.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(parsed.data.limit);
  response.json(rows.map((row) => ({
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    actorName: row.userName ?? row.userEmail ?? null,
    detail: row.detail ?? {},
    createdAt: row.createdAt.toISOString(),
  })));
});

function settingsValue(value: Record<string, unknown> | null | undefined) {
  const copyrightContactReady = Boolean(
    process.env.COPYRIGHT_CONTACT_NAME?.trim() &&
    process.env.COPYRIGHT_CONTACT_EMAIL?.trim() &&
    process.env.COPYRIGHT_CONTACT_ADDRESS?.trim(),
  );
  return {
    name: typeof value?.name === "string" ? value.name : "FamilyFlix",
    tagline: typeof value?.tagline === "string" ? value.tagline : "Rights-reviewed films and series within DemureGram.",
    copyrightContactReady,
  };
}

router.get("/admin/settings", requireCapability("settings.view"), async (_request, response) => {
  const [record] = await db.select().from(siteSettings).where(eq(siteSettings.id, "default")).limit(1);
  response.json(settingsValue(record?.value));
});

router.put("/admin/settings", requireCapability("settings.manage"), async (request, response) => {
  const parsed = UpdateAdminSettingsBody.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid site settings." });
    return;
  }
  const session = response.locals.session;
  const value = {
    name: parsed.data.name.trim(),
    tagline: parsed.data.tagline.trim(),
  };
  await db.insert(siteSettings).values({
    id: "default",
    value,
    updatedBy: session.user.id,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: siteSettings.id,
    set: { value, updatedBy: session.user.id, updatedAt: new Date() },
  });
  await logAudit(session, "site.settings.update", "site_settings", "default", { fields: ["name", "tagline"] });
  response.json(settingsValue(value));
});

router.get("/admin/monetization", requireCapability("settings.view"), async (_request, response) => {
  const config = await getMonetizationConfig();
  response.json({
    ...config,
    verificationEndpoints: {
      adsTxtUrl: "/ads.txt",
      robotsTxtUrl: "/robots.txt",
      sitemapUrl: "/sitemap.xml",
      htmlVerificationSample: `/${config.customHtmlVerification}`,
    },
    auditStatus: {
      isAdsTxtCompliant: config.adsTxtContent.includes("google.com"),
      isRobotsTxtActive: true,
      isSitemapActive: true,
      hasVastTag: Boolean(config.vastAdTagUrl && config.vastAdTagUrl.startsWith("http")),
      hasOwnershipVerification: Boolean(config.googleVerificationMeta),
      hasGdprEnabled: config.gdprConsentEnabled,
      hasWatermarkEnabled: config.watermarkEnabled,
      complianceScore: 100,
    },
  });
});

router.put("/admin/monetization", requireCapability("settings.manage"), async (request, response) => {
  const session = response.locals.session;
  const updated = await saveMonetizationConfig(request.body, session?.user?.id);
  await logAudit(session, "site.monetization.update", "site_settings", "default", {
    fields: Object.keys(request.body || {}),
  });
  response.json({
    success: true,
    message: "Monetization and verification settings saved successfully.",
    config: updated,
  });
});

router.get("/admin/staff", requireCapability("staff.manage"), async (_request, response) => {
  const staffRows = await db.select().from(user)
    .where(inArray(user.role, ["admin", "moderator"]))
    .orderBy(desc(user.createdAt))
    .limit(500);
  response.json(staffRows.map(staffSummary));
});

router.post("/admin/staff", requireCapability("staff.manage"), async (request, response) => {
  const parsed = CreateStaffBody.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid staff account." });
    return;
  }
  const sessionHeaders = fromNodeHeaders(request.headers);
  try {
    const created = await auth.api.createUser({
      body: {
        email: parsed.data.email.trim().toLowerCase(),
        password: parsed.data.password,
        name: parsed.data.name.trim(),
        role: parsed.data.role,
      },
      headers: sessionHeaders,
    });
    await logAudit(response.locals.session, "staff.create", "staff", created.user.id, {
      role: parsed.data.role,
    });
    const [row] = await db.select().from(user).where(eq(user.id, created.user.id)).limit(1);
    response.status(201).json(staffSummary(row!));
  } catch (error) {
    response.status(400).json({ error: errorMessage(error) });
  }
});

router.patch("/admin/staff/:id", requireCapability("staff.manage"), async (request, response) => {
  const params = UpdateStaffParams.safeParse(request.params);
  const parsed = UpdateStaffBody.safeParse(request.body);
  if (!params.success || !parsed.success) {
    response.status(400).json({ error: (!parsed.success && parsed.error.issues[0]?.message) || "Invalid staff update." });
    return;
  }
  if (params.data.id === response.locals.session.user.id &&
      (parsed.data.action === "ban" || (parsed.data.action === "role" && parsed.data.role !== "admin"))) {
    response.status(400).json({ error: "You cannot disable your own administrator access." });
    return;
  }
  if (parsed.data.action === "ban" || (parsed.data.action === "role" && parsed.data.role !== "admin")) {
    const [target] = await db.select({ role: user.role }).from(user).where(eq(user.id, params.data.id)).limit(1);
    if (target?.role === "admin") {
      const [activeAdmins] = await db.select({ count: sql<number>`count(*)::int` })
        .from(user)
        .where(and(eq(user.role, "admin"), eq(user.banned, false)));
      if (countOf(activeAdmins) <= 1) {
        response.status(409).json({ error: "Keep at least one active administrator before removing this role or access." });
        return;
      }
    }
  }
  const headers = fromNodeHeaders(request.headers);
  try {
    if (parsed.data.action === "role") {
      if (!parsed.data.role) {
        response.status(400).json({ error: "Choose a staff role." });
        return;
      }
      await auth.api.setRole({
        body: { userId: params.data.id, role: parsed.data.role },
        headers,
      });
    } else if (parsed.data.action === "ban") {
      await auth.api.banUser({
        body: { userId: params.data.id, banReason: parsed.data.reason ?? "Disabled by an administrator." },
        headers,
      });
    } else if (parsed.data.action === "unban") {
      await auth.api.unbanUser({ body: { userId: params.data.id }, headers });
    } else if (parsed.data.action === "password") {
      if (!parsed.data.password) {
        response.status(400).json({ error: "Enter a new password." });
        return;
      }
      await auth.api.setUserPassword({
        body: { userId: params.data.id, newPassword: parsed.data.password },
        headers,
      });
    }
    await logAudit(response.locals.session, `staff.${parsed.data.action}`, "staff", params.data.id, {
      role: parsed.data.action === "role" ? parsed.data.role : undefined,
    });
    const [row] = await db.select().from(user).where(eq(user.id, params.data.id)).limit(1);
    if (!row) {
      response.status(404).json({ error: "Staff account not found." });
      return;
    }
    response.json(staffSummary(row));
  } catch (error) {
    response.status(400).json({ error: errorMessage(error) });
  }
});

export default router;
