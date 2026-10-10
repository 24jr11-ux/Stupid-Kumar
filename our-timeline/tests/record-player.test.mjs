import test from "node:test";
import assert from "node:assert/strict";
import { applyPlayerVolume, createHeartStream, resetPlayerPlayback, uprightRewindFrames } from "../src/lib/recordPlayer.js";

test("replay resets the runtime and leaves both playing and finished songs paused", () => {
  for (const initialState of ["playing", "finished", "paused"]) {
    let state = initialState;
    let runtime = 90;
    const player = {
      pauseVideo: () => { state = "paused"; },
      seekTo: (time) => { runtime = time; state = "playing"; },
      playVideo: () => assert.fail("Replay must not start playback"),
    };
    resetPlayerPlayback(player);
    assert.equal(runtime, 0);
    assert.equal(state, "paused");
  }
});

test("rewind begins at the displayed angle and lands upright rather than at the paused angle", () => {
  for (const [matrix, angle] of [
    ["matrix(0, 1, -1, 0, 0, 0)", 90],
    ["matrix(0, -1, 1, 0, 0, 0)", 270],
    ["matrix(-1, 0, 0, -1, 0, 0)", 180],
    ["matrix3d(0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)", 90],
    ["none", 0],
  ]) {
    const frames = uprightRewindFrames(matrix);
    assert.equal(frames[0].transform, `rotate(${angle}deg)`);
    assert.equal(frames.at(-1).transform, "rotate(-360deg)");
    assert.equal(frames.at(-2).transform, frames.at(-1).transform);
  }
});

test("volume reaches the playback API, mutes at zero, and unmutes when raised", () => {
  const calls = [];
  const player = {
    setVolume: value => calls.push(["volume", value]),
    mute: () => calls.push(["mute"]),
    unMute: () => calls.push(["unmute"]),
  };
  applyPlayerVolume(player, 65);
  applyPlayerVolume(player, 0);
  applyPlayerVolume(player, 35);
  assert.deepEqual(calls, [["volume", 65], ["unmute"], ["volume", 0], ["mute"], ["volume", 35], ["unmute"]]);
  assert.equal(applyPlayerVolume(player, 150), 100);
  assert.equal(applyPlayerVolume(player, -10), 0);
});

function heartClock() {
  let tick;
  let live = false;
  let emitted = 0;
  let starts = 0;
  const stream = createHeartStream({
    emit: () => { emitted += 1; },
    schedule: (callback, period) => {
      assert.equal(period, 125);
      tick = callback;
      live = true;
      starts += 1;
      return starts;
    },
    cancel: () => { live = false; },
  });
  return { stream, step: () => { if (live) tick(); }, emitted: () => emitted, starts: () => starts, live: () => live };
}

test("each press emits a two-second stream and stops its timer", () => {
  const clock = heartClock();
  clock.stream.press();
  assert.equal(clock.emitted(), 1);
  for (let i = 0; i < 16; i++) clock.step();
  assert.equal(clock.emitted(), 16);
  assert.equal(clock.live(), false);
});

test("rapid heart presses extend one continuous stream with every heart preserved", () => {
  const clock = heartClock();
  clock.stream.press();
  for (let i = 0; i < 4; i++) clock.step();
  clock.stream.press();
  clock.stream.press();
  assert.equal(clock.starts(), 1);
  for (let i = 0; i < 60; i++) clock.step();
  assert.equal(clock.emitted(), 48);
  assert.equal(clock.live(), false);
  clock.stream.press();
  assert.equal(clock.starts(), 2);
});

test("leaving the player cancels queued heart emissions", () => {
  const clock = heartClock();
  clock.stream.press();
  clock.stream.press();
  const before = clock.emitted();
  clock.stream.dispose();
  for (let i = 0; i < 40; i++) clock.step();
  assert.equal(clock.emitted(), before);
  assert.equal(clock.live(), false);
});
