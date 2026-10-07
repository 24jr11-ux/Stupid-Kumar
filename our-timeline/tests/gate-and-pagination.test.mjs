import test from "node:test";
import assert from "node:assert/strict";
import { chooseQuestion } from "../src/lib/questionRotation.js";
import { carouselWindow } from "../src/lib/carouselWindow.js";
import { inactivityExpired, SESSION_IDLE_MS } from "../src/lib/session.js";
import { authCookieValue, isValidAuthCookie, sanitizeNextPath } from "../src/lib/auth.js";

test("question rotation uses every question once per round and never repeats at a boundary", () => {
  const questions = Array.from({ length: 7 }, (_, id) => ({ id }));
  let history = [], previous;
  for (let round = 0; round < 100; round++) {
    const used = new Set();
    for (let i = 0; i < questions.length; i++) {
      const choice = chooseQuestion(questions, history);
      assert.notEqual(choice.question.id, previous);
      assert.equal(used.has(choice.question.id), false);
      used.add(choice.question.id);
      history = choice.history;
      previous = choice.question.id;
    }
    assert.equal(used.size, questions.length);
  }
});

test("one question and stale or malformed history still produce a valid choice", () => {
  const questions = [{ id: 1 }, { id: 2 }];
  assert.equal(chooseQuestion(questions, [99, 1]).question.id, 2);
  const choice = chooseQuestion(questions, {});
  assert.ok(questions.some(q => q.id === choice.question.id));
  assert.equal(chooseQuestion([{ id: 1 }], [1]).question.id, 1);
});

test("pagination never shows more than three dots and always includes the selected item", () => {
  for (let count = 1; count <= 40; count++) {
    for (let active = 0; active < count; active++) {
      const window = carouselWindow(count, active);
      assert.equal(window.indices.length, Math.min(3, count));
      assert.ok(window.indices.includes(active));
      assert.ok(window.indices.every(i => i >= 0 && i < count));
      if (window.previous !== null) assert.ok(window.previous < window.indices[0]);
      if (window.next !== null) assert.ok(window.next > window.indices.at(-1) && window.next < count);
    }
  }
});

test("inactivity locks at ten minutes, including after a suspended or reopened page", () => {
  const start = 1700000000000;
  assert.equal(inactivityExpired(start, start + SESSION_IDLE_MS - 1), false);
  assert.equal(inactivityExpired(start, start + SESSION_IDLE_MS), true);
  assert.equal(inactivityExpired(start, start + SESSION_IDLE_MS * 2), true);
});

test("server sessions expire, renew only from valid sessions, and reject altered or legacy cookies", () => {
  const old = process.env.PASSPHRASE;
  process.env.PASSPHRASE = "isolated-test-secret";
  try {
    const start = 1700000000000;
    const token = authCookieValue(start);
    assert.equal(isValidAuthCookie(token, start + SESSION_IDLE_MS - 1), true);
    assert.equal(isValidAuthCookie(token, start + SESSION_IDLE_MS), false);
    const renewed = authCookieValue(start + 60000);
    assert.equal(isValidAuthCookie(renewed, start + SESSION_IDLE_MS), true);
    assert.equal(isValidAuthCookie(renewed, start + SESSION_IDLE_MS + 60000), false);
    assert.equal(isValidAuthCookie(token.replace(/^\d+/, String(start + SESSION_IDLE_MS * 2)), start), false);
    assert.equal(isValidAuthCookie("f".repeat(64), start), false);
    assert.equal(isValidAuthCookie("malformed", start), false);
    process.env.PASSPHRASE = "";
    assert.equal(isValidAuthCookie(token, start), false);
    assert.equal(authCookieValue(start), "");
  } finally {
    if (old === undefined) delete process.env.PASSPHRASE; else process.env.PASSPHRASE = old;
  }
});

test("gate redirects allow internal detail links and reject external destinations", () => {
  assert.equal(sanitizeNextPath("/memory/test?edit=1"), "/memory/test?edit=1");
  for (const value of ["https://example.com", "//example.com", "/\\example.com", "/bad\npath"])
    assert.equal(sanitizeNextPath(value), "/");
});
