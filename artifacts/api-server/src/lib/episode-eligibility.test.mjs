import assert from "node:assert/strict";
import { test } from "node:test";
import { isEpisodePubliclyPlayable, isSeriesPubliclyVisible } from "./episode-eligibility.ts";

const makeFixture = (overrides = {}) => {
  const right = {
    id: "rights-1",
    assetKind: "main_video",
    assetLabel: "Episode video",
    assetUrl: "https://media.example.test/episode.mp4",
    rightsHolder: "Studio",
    creatorAttribution: "Creator",
    licenseType: "authorized",
    licenseVersion: "1",
    licenseUrl: "https://rights.example.test/license",
    usageRestrictions: [],
    sourceUrl: "https://rights.example.test/source",
    evidenceUrl: "https://rights.example.test/evidence",
    evidenceNotes: "Authorization was reviewed.",
    territory: "Worldwide",
    expiresAt: new Date(Date.now() + 60_000),
    uploaderAttested: true,
    reviewStatus: "approved",
  };
  const video = { status: "ready", mediaRightId: right.id };
  return {
    parentSeriesId: "series-1",
    episodeSeriesId: "series-1",
    parentStatus: "published",
    parentKind: "series",
    episodeIsPublished: true,
    rights: [right],
    video,
    ...overrides,
  };
};

test("only published episodes with current reviewed rights and a matching ready source are visible", () => {
  assert.equal(isEpisodePubliclyPlayable(makeFixture()), true);
  assert.equal(isEpisodePubliclyPlayable(makeFixture({ episodeIsPublished: false })), false);
  assert.equal(isEpisodePubliclyPlayable(makeFixture({ video: { status: "processing", mediaRightId: "rights-1" } })), false);
  assert.equal(isEpisodePubliclyPlayable(makeFixture({ video: { status: "ready", mediaRightId: "different-right" } })), false);
});

test("a series is visible only after at least one playable episode is published", () => {
  assert.equal(isSeriesPubliclyVisible({ kind: "series", status: "published", playableEpisodeCount: 1 }), true);
  assert.equal(isSeriesPubliclyVisible({ kind: "series", status: "published", playableEpisodeCount: 0 }), false);
  assert.equal(isSeriesPubliclyVisible({ kind: "series", status: "draft", playableEpisodeCount: 1 }), false);
  assert.equal(isSeriesPubliclyVisible({ kind: "movie", status: "published", playableEpisodeCount: 1 }), false);
});

test("expired episode rights block public visibility and playback authorization", () => {
  const fixture = makeFixture();
  fixture.rights[0].expiresAt = new Date(Date.now() - 1);
  assert.equal(isEpisodePubliclyPlayable(fixture), false);
});

test("episode authorization is scoped to the published parent series", () => {
  assert.equal(isEpisodePubliclyPlayable(makeFixture({ parentStatus: "draft" })), false);
  assert.equal(isEpisodePubliclyPlayable(makeFixture({ parentKind: "movie" })), false);
  assert.equal(isEpisodePubliclyPlayable(makeFixture({ episodeSeriesId: "another-series" })), false);
});
