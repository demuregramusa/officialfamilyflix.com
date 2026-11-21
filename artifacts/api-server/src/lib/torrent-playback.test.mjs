import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import WebTorrent from "webtorrent";
import { test } from "node:test";
import {
  hasReviewedTorrentRights,
  isTorrentPlaybackEligible,
} from "./movie-archive-policy.ts";
import { createTorrentPlayback, parseSingleByteRange } from "./torrent-playback.ts";

const fixturePath = fileURLToPath(
  new URL("../../test/fixtures/rights-cleared-long-form.mp4", import.meta.url),
);
const evidenceUrl = "https://creativecommons.org/publicdomain/zero/1.0/";
const evidenceNotes = "Synthetic original test footage, no third-party material; released under CC0.";

function approvedSource(infoHash, overrides = {}) {
  return {
    id: "torrent-fixture-source",
    infoHash,
    playbackStatus: "active",
    rightsStatus: "approved",
    rightsEvidenceUrl: evidenceUrl,
    rightsEvidenceNotes: evidenceNotes,
    rightsReviewedBy: "fixture-reviewer",
    rightsReviewedAt: new Date("2026-11-20T00:00:00Z"),
    activatedBy: "fixture-admin",
    activatedAt: new Date("2026-11-20T00:00:00Z"),
    ...overrides,
  };
}

function durationSeconds(mp4) {
  const marker = mp4.indexOf(Buffer.from("mvhd"));
  assert.notEqual(marker, -1, "the fixture must have an MP4 movie header");
  const version = mp4[marker + 4];
  const timescaleOffset = marker + (version === 1 ? 20 : 16);
  const durationOffset = marker + (version === 1 ? 24 : 20);
  const timescale = version === 1
    ? Number(mp4.readBigUInt64BE(timescaleOffset))
    : mp4.readUInt32BE(timescaleOffset);
  const duration = version === 1
    ? Number(mp4.readBigUInt64BE(durationOffset))
    : mp4.readUInt32BE(durationOffset);
  return duration / timescale;
}

test("rights approval, activation, and availability are all required", () => {
  const approved = approvedSource("0123456789abcdef0123456789abcdef01234567");
  assert.equal(hasReviewedTorrentRights(approved), true);
  assert.equal(isTorrentPlaybackEligible(approved, true), true);
  assert.equal(isTorrentPlaybackEligible(approved, false), false, "unavailable sources stay blocked");
});

test("unverified, rejected, and disabled torrent sources are denied", () => {
  const base = approvedSource("0123456789abcdef0123456789abcdef01234567");
  assert.equal(isTorrentPlaybackEligible(base, false), false);
  assert.equal(isTorrentPlaybackEligible(base, true), true);
  assert.equal(isTorrentPlaybackEligible({ ...base, rightsStatus: "unverified" }, true), false);
  assert.equal(isTorrentPlaybackEligible({ ...base, rightsStatus: "rejected" }, true), false);
  assert.equal(isTorrentPlaybackEligible({ ...base, playbackStatus: "disabled" }, true), false);
  assert.equal(isTorrentPlaybackEligible({ ...base, activatedAt: null }, true), false);
  assert.equal(isTorrentPlaybackEligible({ ...base, rightsEvidenceUrl: "magnet:?xt=urn:btih:bad" }, true), false);
});

test("a rights-approved torrent with no available peers fails closed", async () => {
  const infoHash = "0123456789abcdef0123456789abcdef01234567";
  const unavailableClient = {
    torrents: [],
    add() {
      const torrent = new EventEmitter();
      torrent.infoHash = infoHash;
      torrent.files = [];
      setImmediate(() => torrent.emit("error", new Error("No peers are available.")));
      return torrent;
    },
  };
  const playback = createTorrentPlayback(unavailableClient, { metadataWaitMs: 25 });
  await assert.rejects(
    playback.openApprovedTorrentMedia(approvedSource(infoHash)),
    /No peers are available/,
  );
});

test("deactivation cancels metadata retrieval and removes the torrent", async () => {
  const infoHash = "0123456789abcdef0123456789abcdef01234567";
  let finishMetadata;
  let removeOptions;
  let torrent;
  const client = {
    torrents: [],
    add(_magnetUri, _options, callback) {
      torrent = new EventEmitter();
      torrent.infoHash = infoHash;
      torrent.files = [];
      finishMetadata = callback;
      this.torrents.push(torrent);
      return torrent;
    },
    async remove(_hash, options) {
      removeOptions = options;
      this.torrents = [];
      torrent.files = [{
        name: "rights-cleared-long-form.mp4",
        length: 100,
        type: "video/mp4",
        createReadStream() {
          throw new Error("A deactivated torrent must not stream.");
        },
      }];
      finishMetadata(torrent);
    },
  };
  const playback = createTorrentPlayback(client, { metadataWaitMs: 100 });
  const pendingMedia = playback.openApprovedTorrentMedia(approvedSource(infoHash));
  while (!finishMetadata) await new Promise((resolve) => setImmediate(resolve));

  await playback.stopTorrentSourceStreams("torrent-fixture-source");
  await assert.rejects(pendingMedia, /no longer active/);
  assert.deepEqual(removeOptions, { destroyStore: true });
  assert.equal(client.torrents.length, 0);
});

test("single byte ranges support seeking and reject malformed or unsatisfiable requests", () => {
  assert.deepEqual(parseSingleByteRange(undefined, 100), { start: 0, end: 99, partial: false });
  assert.deepEqual(parseSingleByteRange("bytes=5-14", 100), { start: 5, end: 14, partial: true });
  assert.deepEqual(parseSingleByteRange("bytes=90-", 100), { start: 90, end: 99, partial: true });
  assert.deepEqual(parseSingleByteRange("bytes=-10", 100), { start: 90, end: 99, partial: true });
  assert.equal(parseSingleByteRange("bytes=100-110", 100), null);
  assert.equal(parseSingleByteRange("bytes=1-2,5-6", 100), null);
});

test("the documented 90-minute CC0 fixture streams through the approved torrent file path", async () => {
  const bytes = await readFile(fixturePath);
  assert.ok(durationSeconds(bytes) >= 5_400);
  const tempDirectory = await mkdtemp(join(tmpdir(), "familyflix-torrent-fixture-"));
  const seededFixturePath = join(tempDirectory, "rights-cleared-long-form.mp4");
  await copyFile(fixturePath, seededFixturePath);

  const seeder = new WebTorrent({
    dht: false,
    lsd: false,
    natPmp: false,
    natUpnp: false,
    tracker: false,
  });
  try {
    const torrent = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("The local fixture did not seed.")), 15_000);
      const seeded = seeder.seed(
        seededFixturePath,
        { dht: false, lsd: false, natPmp: false, natUpnp: false, tracker: false, uploads: false },
        (readyTorrent) => {
          clearTimeout(timeout);
          resolve(readyTorrent);
        },
      );
      seeded.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    const playback = createTorrentPlayback(seeder);
    const media = await playback.openApprovedTorrentMedia(approvedSource(torrent.infoHash));
    assert.equal(media.length, bytes.length);
    assert.equal(media.contentType, "video/mp4");

    const streamed = [];
    for await (const chunk of media.createReadStream()) streamed.push(chunk);
    assert.deepEqual(Buffer.concat(streamed), bytes);

    const rangeChunks = [];
    for await (const chunk of media.createReadStream({ start: 0, end: 15 })) rangeChunks.push(chunk);
    assert.deepEqual(Buffer.concat(rangeChunks), bytes.subarray(0, 16));
    await playback.stopTorrentSourceStreams(media.sourceId);
  } finally {
    await seeder.destroy();
    await rm(tempDirectory, { recursive: true, force: true });
  }
});
