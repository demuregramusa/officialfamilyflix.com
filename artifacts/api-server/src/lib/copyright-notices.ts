export const COPYRIGHT_NOTICE_TYPES = [
  "receipt",
  "status-update",
  "restriction",
  "counter-notice-invitation",
] as const;

export type CopyrightNoticeType = (typeof COPYRIGHT_NOTICE_TYPES)[number];
export type NoticeRecipientRole = "submitter" | "uploader";

export interface CopyrightNoticeInput {
  caseNumber: string;
  caseStatus: string;
  caseType: "copyright-report" | "counter-notice";
  noticeType: CopyrightNoticeType;
  note: string;
  recipientName: string;
  counterNoticeUrl?: string;
}

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}

export interface EmailTransport {
  send(message: OutboundEmail): Promise<{ messageId?: string }>;
}

export type DeliveryResult =
  | { outcome: "sent"; messageId: string | null }
  | { outcome: "failed"; errorCode: string };

export class EmailDeliveryUnavailableError extends Error {
  constructor() {
    super("No approved email provider and verified sender are configured.");
    this.name = "EmailDeliveryUnavailableError";
  }
}

export function noticeRecipientRole(
  noticeType: CopyrightNoticeType,
): NoticeRecipientRole {
  return noticeType === "restriction" || noticeType === "counter-notice-invitation"
    ? "uploader"
    : "submitter";
}

export function validateNoticeReview(input: {
  caseType: "copyright-report" | "counter-notice";
  caseStatus: string;
  noticeType: CopyrightNoticeType;
  reviewed: boolean;
}): string | null {
  if (!input.reviewed) return "Review the complete message before sending it.";
  if (
    (input.noticeType === "restriction" ||
      input.noticeType === "counter-notice-invitation") &&
    (input.caseType !== "copyright-report" || input.caseStatus !== "restricted")
  ) {
    return "Uploader notices are available only for a restricted copyright report.";
  }
  return null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildCopyrightNotice(input: CopyrightNoticeInput) {
  const intro = {
    receipt: "We received your copyright report.",
    "status-update": `There is an update to copyright case ${input.caseNumber}.`,
    restriction: `A title related to copyright case ${input.caseNumber} has been restricted while the case is reviewed.`,
    "counter-notice-invitation": `A title related to copyright case ${input.caseNumber} has been restricted. If you believe this action was made in error, you may submit a counter-notice for review.`,
  }[input.noticeType];
  const counterLink = input.noticeType === "counter-notice-invitation"
    ? `\n\nSubmit a counter-notice: ${input.counterNoticeUrl ?? ""}`
    : "";
  const text = [
    `Hello ${input.recipientName},`,
    "",
    intro,
    `Case number: ${input.caseNumber}`,
    `Current status: ${input.caseStatus}`,
    `Case note: ${input.note}`,
    counterLink,
    "",
    "A restriction is not a final finding. A submitted counter-notice does not automatically restore content; staff review is required.",
    "",
    "DemureGram",
  ].filter(Boolean).join("\n");
  const subject = {
    receipt: `Copyright report received — ${input.caseNumber}`,
    "status-update": `Copyright case update — ${input.caseNumber}`,
    restriction: `Copyright restriction notice — ${input.caseNumber}`,
    "counter-notice-invitation": `Counter-notice information — ${input.caseNumber}`,
  }[input.noticeType];
  return {
    subject,
    text,
    html: `<p>Hello ${escapeHtml(input.recipientName)},</p><p>${escapeHtml(intro)}</p><p><strong>Case number:</strong> ${escapeHtml(input.caseNumber)}<br><strong>Current status:</strong> ${escapeHtml(input.caseStatus)}<br><strong>Case note:</strong> ${escapeHtml(input.note)}</p>${input.noticeType === "counter-notice-invitation" && input.counterNoticeUrl ? `<p><a href="${escapeHtml(input.counterNoticeUrl)}">Submit a counter-notice for review</a></p>` : ""}<p>A restriction is not a final finding. A submitted counter-notice does not automatically restore content; staff review is required.</p><p>DemureGram</p>`,
  };
}

export async function deliverCopyrightEmail(
  transport: EmailTransport,
  message: OutboundEmail,
): Promise<DeliveryResult> {
  try {
    const result = await transport.send(message);
    return { outcome: "sent", messageId: result.messageId ?? null };
  } catch (error) {
    return {
      outcome: "failed",
      errorCode: error instanceof EmailDeliveryUnavailableError
        ? "sender_not_configured"
        : "provider_error",
    };
  }
}

export const unavailableEmailTransport: EmailTransport = {
  async send() {
    throw new EmailDeliveryUnavailableError();
  },
};

export const MAX_NOTICE_DELIVERY_ATTEMPTS = 3;

export function canRetryNotice(input: {
  attempts: number;
  latestOutcome: "sent" | "failed";
}) {
  return input.latestOutcome === "failed" &&
    input.attempts < MAX_NOTICE_DELIVERY_ATTEMPTS;
}

export function canRestoreRestrictedTitle(input: {
  hasCurrentMainRight: boolean;
  allRightsApprovedAndComplete: boolean;
  streamReady: boolean;
  streamMatchesMainRight: boolean;
}) {
  return input.hasCurrentMainRight &&
    input.allRightsApprovedAndComplete &&
    input.streamReady &&
    input.streamMatchesMainRight;
}

export function matchesNoticePreview(
  preview: {
    eventType: string;
    actorUserId: string | null;
    detail: Record<string, unknown>;
  },
  input: {
    reviewerId: string;
    noticeType: CopyrightNoticeType;
    note: string;
    caseStatus: string;
  },
) {
  return preview.eventType === "copyright_notice_previewed" &&
    preview.actorUserId === input.reviewerId &&
    preview.detail.noticeType === input.noticeType &&
    preview.detail.note === input.note &&
    preview.detail.caseStatusAtPreview === input.caseStatus;
}

export function serializeCopyrightCaseEvent(event: {
  id: string;
  eventType: string;
  actorName: string;
  note: string;
  createdAt: Date;
}) {
  return {
    id: event.id,
    eventType: event.eventType,
    actorName: event.actorName,
    note: event.note,
    createdAt: event.createdAt.toISOString(),
  };
}
