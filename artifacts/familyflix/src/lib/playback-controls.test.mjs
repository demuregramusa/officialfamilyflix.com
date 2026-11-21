import assert from "node:assert/strict";
import test from "node:test";
import {
  getNextPlaybackTarget,
  getResumePosition,
  startAutoplayCountdown,
} from "./playback-controls.ts";

test("restores saved playback while avoiding nearly completed or invalid progress", () => {
  assert.equal(getResumePosition(240, 900, 900), 240);
  assert.equal(getResumePosition(880, 900, 900), 0);
  assert.equal(getResumePosition(-1, 900, 900), 0);
  assert.equal(getResumePosition(20, 900, 0), 0);
});

test("disabled autoplay does not start a countdown", () => {
  let scheduled = false;
  let completed = false;
  startAutoplayCountdown(false, 10, () => {}, () => { completed = true; }, () => {
    scheduled = true;
    return 1;
  }, () => {});
  assert.equal(scheduled, false);
  assert.equal(completed, false);
});

test("cancelling the next-title countdown prevents navigation", () => {
  let tick;
  let completed = false;
  const cancelCountdown = startAutoplayCountdown(
    true,
    10,
    () => {},
    () => { completed = true; },
    (callback) => { tick = callback; return 1; },
    () => {},
  );
  cancelCountdown();
  tick();
  assert.equal(completed, false);
});

test("unavailable or unlisted titles are never selected for autoplay", () => {
  assert.equal(getNextPlaybackTarget({
    slug: "removed-title",
    episodes: [],
    titles: [{ slug: "approved-title", name: "Approved", kind: "movie" }],
  }), null);
  assert.equal(getNextPlaybackTarget({
    slug: "series",
    episodeId: "episode-2",
    episodes: [{ id: "episode-1", name: "Episode 1" }, { id: "episode-2", name: "Episode 2" }],
    titles: [],
  }), null);
});
