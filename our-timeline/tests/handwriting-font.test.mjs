import test from "node:test";
import assert from "node:assert/strict";
import { loadHandwritingFont } from "../src/lib/handwritingFont.js";

test("handwriting waits for both the clock's normal weight and the titles' bold weight", async () => {
  const requests = [];
  const resolvers = [];
  let ready = false;
  const loading = loadHandwritingFont({ load: (font, sample) => {
    requests.push({ font, sample });
    return new Promise((resolve) => resolvers.push(resolve));
  } }, '"chosen_Caveat"').then((loaded) => { ready = loaded; });
  assert.deepEqual(requests.map((request) => request.font),
    ['400 48px "chosen_Caveat"', '700 48px "chosen_Caveat"']);
  assert.ok(requests.every((request) => request.sample.includes("0123456789")));
  resolvers[1]([{ status: "loaded" }]);
  await Promise.resolve();
  assert.equal(ready, false);
  resolvers[0]([{ status: "loaded" }]);
  await loading;
  assert.equal(ready, true);
});

test("missing font definitions and incomplete loads never reveal a fallback", async () => {
  assert.equal(await loadHandwritingFont({ load: () => assert.fail("No family specified") }, ""), false);
  assert.equal(await loadHandwritingFont({ load: async () => [] }, '"chosen_Caveat"'), false);
  assert.equal(await loadHandwritingFont({ load: async () => [{ status: "loading" }] }, '"chosen_Caveat"'), false);
  await assert.rejects(loadHandwritingFont({ load: async () => { throw new Error("Font failed"); } }, '"chosen_Caveat"'));
});
