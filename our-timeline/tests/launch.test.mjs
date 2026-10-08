import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { LAST_READY_PAGE_KEY, launchBootstrap, recentReadyPage } from "../src/lib/launch.js";
import { SESSION_IDLE_MS } from "../src/lib/session.js";

const now = 1700000000000;
const stored = (path, readyAt = now - 1000) => JSON.stringify({ path, readyAt });

test("recent relaunches restore only a valid ready page within the session window", () => {
  assert.equal(recentReadyPage(stored("/memory/date-123?edit=1"), now), "/memory/date-123?edit=1");
  assert.equal(recentReadyPage(stored("/"), now), "/");
  for (const value of [null, "bad json", "{}", stored("/", now - SESSION_IDLE_MS), stored("/", now + 1), stored("/", 0), stored("//example.com"), stored("/gate"), stored("/memory/../gate"), stored("/memory/test\\oops")]) {
    assert.equal(recentReadyPage(value, now), null);
  }
});

function boot({ saved = stored("/memory/date-123"), pathname = "/", search = "?resume=1", unavailable = false, installed = false } = {}) {
  const classes = [];
  const redirects = [];
  vm.runInNewContext(launchBootstrap, {
    Date: { now: () => now }, URLSearchParams,
    matchMedia: () => ({ matches: installed }),
    localStorage: { getItem(key) {
      assert.equal(key, LAST_READY_PAGE_KEY);
      if (unavailable) throw new Error("Storage disabled");
      return saved;
    } },
    document: { documentElement: { classList: { add: value => classes.push(value) } } },
    location: { pathname, search, replace: path => redirects.push(path) },
  });
  return { classes, redirects };
}

test("installed warm launch suppresses the splash before paint and resumes the last page", () => {
  assert.deepEqual(boot(), { classes: ["warm-launch"], redirects: ["/memory/date-123"] });
  assert.deepEqual(boot({ search: "", installed: true }), { classes: ["warm-launch"], redirects: ["/memory/date-123"] });
});

test("direct links and timeline visits remain on their requested page", () => {
  assert.deepEqual(boot({ pathname: "/memory/other", search: "" }), { classes: ["warm-launch"], redirects: [] });
  assert.deepEqual(boot({ search: "" }), { classes: ["warm-launch"], redirects: [] });
});

test("cold, expired, locked, and storage-disabled launches retain the normal startup flow", () => {
  for (const options of [{ saved: null }, { saved: stored("/", now - SESSION_IDLE_MS) }, { pathname: "/gate" }, { unavailable: true }]) {
    assert.deepEqual(boot(options), { classes: [], redirects: [] });
  }
});
