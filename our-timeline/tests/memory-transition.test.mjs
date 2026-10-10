import test from "node:test";
import assert from "node:assert/strict";
import { crossfadeLandedCover, MEMORY_TRANSITION } from "../src/lib/memoryTransition.js";

test("a different cover dissolves only after the first gallery photo is decoded", async () => {
  const events = [];
  let ready;
  const decoded = new Promise(resolve => { ready = resolve; });
  const transition = crossfadeLandedCover({
    coverPhoto: "cover.jpg", firstPhoto: "first.jpg",
    firstImage: { complete: false, decode: () => { events.push("decode"); return decoded; } },
    isCancelled: () => false,
    dissolve: async duration => { events.push(["dissolve", duration]); },
  });
  assert.deepEqual(events, ["decode"]);
  ready();
  await transition;
  assert.deepEqual(events, ["decode", ["dissolve", 150]]);
  const total = MEMORY_TRANSITION.lift + MEMORY_TRANSITION.flight + MEMORY_TRANSITION.crossfade;
  assert.ok(total >= 400 && total <= 550);
});

test("the cover already being the first photo skips decoding and the final dissolve", async () => {
  const unexpected = () => assert.fail("Matching photos should not crossfade");
  await crossfadeLandedCover({
    coverPhoto: "same.jpg", firstPhoto: "same.jpg",
    firstImage: { complete: false, decode: unexpected },
    isCancelled: () => false, dissolve: unexpected,
  });
});

test("navigation cancelled during image loading never starts a stale crossfade", async () => {
  let ready;
  let cancelled = false;
  const decoded = new Promise(resolve => { ready = resolve; });
  const transition = crossfadeLandedCover({
    coverPhoto: "cover.jpg", firstPhoto: "first.jpg",
    firstImage: { complete: false, decode: () => decoded },
    isCancelled: () => cancelled, dissolve: () => assert.fail("Cancelled transition must stay cancelled"),
  });
  cancelled = true;
  ready();
  await transition;
});

test("an image decode failure still allows transition cleanup", async () => {
  let dissolved = false;
  await crossfadeLandedCover({
    coverPhoto: "cover.jpg", firstPhoto: "first.jpg",
    firstImage: { complete: false, decode: async () => { throw new Error("Image unavailable"); } },
    isCancelled: () => false, dissolve: async () => { dissolved = true; },
  });
  assert.equal(dissolved, true);
});
