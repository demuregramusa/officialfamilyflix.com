import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCopyrightNotice,
  canRetryNotice,
  canRestoreRestrictedTitle,
  deliverCopyrightEmail,
  EmailDeliveryUnavailableError,
  matchesNoticePreview,
  noticeRecipientRole,
  serializeCopyrightCaseEvent,
  validateNoticeReview,
} from "./copyright-notices.ts";

test("delivery failures are reported without claiming that mail was sent", async () => {
  const result = await deliverCopyrightEmail(
    { send: async () => { throw new EmailDeliveryUnavailableError(); } },
    { to: "case@example.test", subject: "Case", text: "Body", html: "Body", idempotencyKey: "case:1" },
  );
  assert.deepEqual(result, { outcome: "failed", errorCode: "sender_not_configured" });

  const providerFailure = await deliverCopyrightEmail(
    { send: async () => { throw new Error("private provider response"); } },
    { to: "case@example.test", subject: "Case", text: "Body", html: "Body", idempotencyKey: "case:1" },
  );
  assert.deepEqual(providerFailure, { outcome: "failed", errorCode: "provider_error" });
  assert.equal(JSON.stringify(providerFailure).includes("private provider response"), false);
});

test("a failed notice can be retried, but a sent notice and exhausted retries cannot", () => {
  assert.equal(canRetryNotice({ attempts: 1, latestOutcome: "failed" }), true);
  assert.equal(canRetryNotice({ attempts: 2, latestOutcome: "failed" }), true);
  assert.equal(canRetryNotice({ attempts: 3, latestOutcome: "failed" }), false);
  assert.equal(canRetryNotice({ attempts: 1, latestOutcome: "sent" }), false);
});

test("a failed delivery can succeed on an explicit later attempt", async () => {
  let calls = 0;
  const transport = {
    send: async () => {
      calls += 1;
      if (calls === 1) throw new Error("temporary provider failure");
      return { messageId: "delivery-2" };
    },
  };
  const message = { to: "case@example.test", subject: "Case", text: "Body", html: "Body", idempotencyKey: "case:1" };
  assert.deepEqual(await deliverCopyrightEmail(transport, message), {
    outcome: "failed",
    errorCode: "provider_error",
  });
  assert.equal(canRetryNotice({ attempts: 1, latestOutcome: "failed" }), true);
  assert.deepEqual(await deliverCopyrightEmail(transport, { ...message, idempotencyKey: "case:2" }), {
    outcome: "sent",
    messageId: "delivery-2",
  });
  assert.equal(calls, 2);
});

test("recipient roles are fixed by notice type rather than supplied email", () => {
  assert.equal(noticeRecipientRole("receipt"), "submitter");
  assert.equal(noticeRecipientRole("status-update"), "submitter");
  assert.equal(noticeRecipientRole("restriction"), "uploader");
  assert.equal(noticeRecipientRole("counter-notice-invitation"), "uploader");
});

test("counter-notice links require a reviewed restricted report", () => {
  assert.equal(validateNoticeReview({
    caseType: "copyright-report",
    caseStatus: "restricted",
    noticeType: "counter-notice-invitation",
    reviewed: true,
  }), null);
  assert.notEqual(validateNoticeReview({
    caseType: "copyright-report",
    caseStatus: "open",
    noticeType: "counter-notice-invitation",
    reviewed: true,
  }), null);
  assert.notEqual(validateNoticeReview({
    caseType: "counter-notice",
    caseStatus: "restricted",
    noticeType: "counter-notice-invitation",
    reviewed: true,
  }), null);
  assert.notEqual(validateNoticeReview({
    caseType: "copyright-report",
    caseStatus: "restricted",
    noticeType: "counter-notice-invitation",
    reviewed: false,
  }), null);
});

test("restoration remains blocked until all rights and stream checks pass", () => {
  const ready = {
    hasCurrentMainRight: true,
    allRightsApprovedAndComplete: true,
    streamReady: true,
    streamMatchesMainRight: true,
  };
  assert.equal(canRestoreRestrictedTitle(ready), true);
  for (const gate of Object.keys(ready)) {
    assert.equal(canRestoreRestrictedTitle({ ...ready, [gate]: false }), false, `${gate} must block restore`);
  }
});

test("sending requires the same staff member to confirm the exact current preview", () => {
  const preview = {
    eventType: "copyright_notice_previewed",
    actorUserId: "staff-1",
    detail: {
      noticeType: "counter-notice-invitation",
      note: "Please respond to the restriction.",
      caseStatusAtPreview: "restricted",
    },
  };
  const confirmation = {
    reviewerId: "staff-1",
    noticeType: "counter-notice-invitation",
    note: "Please respond to the restriction.",
    caseStatus: "restricted",
  };
  assert.equal(matchesNoticePreview(preview, confirmation), true);
  assert.equal(matchesNoticePreview(preview, { ...confirmation, reviewerId: "staff-2" }), false);
  assert.equal(matchesNoticePreview(preview, { ...confirmation, note: "Changed after preview" }), false);
  assert.equal(matchesNoticePreview(preview, { ...confirmation, caseStatus: "resolved" }), false);
});

test("the notice content does not imply a counter-notice restores restricted content", () => {
  const rendered = buildCopyrightNotice({
    caseNumber: "DG-TEST",
    caseStatus: "restricted",
    caseType: "copyright-report",
    noticeType: "counter-notice-invitation",
    note: "Please review the restriction.",
    recipientName: "Uploader",
    counterNoticeUrl: "https://familyflix.example.test/familyflix/copyright/counter-notice/DG-TEST",
  });
  assert.match(rendered.text, /does not automatically restore content/);
  assert.match(rendered.html, /does not automatically restore content/);
  assert.match(rendered.text, /https:\/\/familyflix\.example\.test/);
});

test("message rendering escapes user-controlled values and omits unrelated case payload", () => {
  const rendered = buildCopyrightNotice({
    caseNumber: "DG-TEST",
    caseStatus: "under-review",
    caseType: "copyright-report",
    noticeType: "receipt",
    note: "<script>private payload</script>",
    recipientName: "A <b>person</b>",
  });
  assert.match(rendered.html, /&lt;script&gt;/);
  assert.doesNotMatch(rendered.html, /<script>/);
  assert.doesNotMatch(rendered.text, /reporter@example/);
});

test("case history serialization excludes delivery addresses and private event details", () => {
  const event = serializeCopyrightCaseEvent({
    id: "event-1",
    eventType: "copyright_notice_delivery_failed",
    actorName: "Staff",
    note: "Delivery failed.",
    createdAt: new Date("2026-11-20T12:00:00.000Z"),
    detail: { recipientEmail: "uploader@example.test", privatePayload: "sensitive" },
  });
  assert.equal("detail" in event, false);
  assert.equal(JSON.stringify(event).includes("uploader@example.test"), false);
  assert.equal(JSON.stringify(event).includes("sensitive"), false);
});
