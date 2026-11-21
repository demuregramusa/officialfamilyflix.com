import assert from "node:assert/strict";
import { test } from "node:test";
import {
  disabledTorrentSource,
  isProtectedArchiveTarget,
  privateArchiveMovieDraft,
  redactTorrentLocators,
  toAdminTorrentSourceView,
} from "./movie-archive-policy.ts";

const movieRecord = {
  sourceId: "123",
  name: "Private archive draft",
  imdbCode: "tt1234567",
  sourceUrl: "https://catalog.example.test/123",
  year: 2020,
  runtime: 95,
  genres: ["Drama"],
  metadata: { title: "Private archive draft" },
  torrents: [],
};

const torrentRecord = {
  sourceIndex: 0,
  sourceUrl: "magnet:?xt=urn:btih:0123456789abcdef",
  infoHash: "0123456789abcdef",
  quality: "720p",
  sourceType: "web",
  isRepack: false,
  videoCodec: "x264",
  bitDepth: "8",
  audioChannels: "2.0",
  seeders: 2,
  peers: 1,
  size: "1 GB",
  sizeBytes: 1_000_000_000,
  uploadedAt: "2026-11-18",
  metadata: { hash: "0123456789abcdef" },
};

test("new archive titles stay unlicensed drafts without active artwork or media", () => {
  const draft = privateArchiveMovieDraft(movieRecord);
  assert.equal(draft.status, "draft");
  assert.equal(draft.licenseType, "unlicensed");
  assert.equal(draft.posterUrl, null);
  assert.equal(draft.backdropUrl, null);
  assert.equal(draft.sourceUrl, null);
  assert.equal("mediaUrl" in draft, false);
});

test("every imported torrent reference starts disabled and unverified", () => {
  const source = disabledTorrentSource("source-row-1", torrentRecord);
  assert.equal(source.playbackStatus, "disabled");
  assert.equal(source.rightsStatus, "unverified");
  assert.match(source.sourceUrl, /^magnet:/);
  assert.equal("mediaUrl" in source, false);
});

test("admin torrent views redact raw locators and torrent metadata", () => {
  const view = toAdminTorrentSourceView({
    ...disabledTorrentSource("source-row-1", torrentRecord),
    id: "torrent-row-1",
    rightsEvidenceUrl: null,
    rightsEvidenceNotes: null,
    rightsReviewNote: null,
    rightsReviewedAt: null,
    activatedAt: null,
    sourceUrl: torrentRecord.sourceUrl,
    metadata: { url: torrentRecord.sourceUrl },
  });
  assert.equal("sourceUrl" in view, false);
  assert.equal("metadata" in view, false);
  assert.equal(JSON.stringify(view).includes("magnet:"), false);
  assert.equal(redactTorrentLocators({
    description: "A source link: https://example.org/media/download.torrent?raw=1",
    magnet: "magnet:?xt=urn:btih:1234",
  }).description.includes(".torrent"), false);
  assert.equal(
    redactTorrentLocators({ description: "Primary source magnet:?xt=urn:btih:0123" }).description,
    "[private torrent locator]",
  );
  assert.equal(
    redactTorrentLocators({ link: "https://files.example.test/download/item.torrent?token=hidden" }).link,
    "[private torrent locator]",
  );
});

test("published, licensed, or rights-documented movie records are protected", () => {
  assert.equal(isProtectedArchiveTarget("draft", "unlicensed", false), false);
  assert.equal(isProtectedArchiveTarget("published", "unlicensed", false), true);
  assert.equal(isProtectedArchiveTarget("draft", "cc_by_4_0", false), true);
  assert.equal(isProtectedArchiveTarget("draft", "unlicensed", true), true);
});
