import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { MemoryStore } from "../../src/cloud/server/store.ts";
import { createApp } from "../src/app.ts";
import { childTokens, devParentVerifier } from "../src/auth.ts";

async function boot() {
  const tokens = childTokens("test-secret");
  let n = 0;
  const clock = { offsetMs: 0 };
  const app = createApp({
    deps: { store: new MemoryStore(), now: () => Date.now() + clock.offsetMs, rng: Math.random, newId: () => `id${++n}`, issueChildToken: tokens.issue },
    verifyParent: devParentVerifier(),
    verifyChildToken: tokens.verify,
    devClock: clock,
  });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, close: () => server.close() };
}
const call = (base: string, path: string, token: string | null, method = "GET", body?: unknown) =>
  fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));

test("end to end over HTTP: parent, code, child, practice, expiry", async () => {
  const { base, close } = await boot();
  try {
    assert.equal((await call(base, "/parent/household", null)).status, 401);
    assert.equal((await call(base, "/child/me", "garbage")).status, 401);
    const mom = "dev:mom@example.com";
    const hh = await call(base, "/parent/household", mom);
    assert.equal(hh.json.subscription.status, "trial");
    const added = await call(base, "/parent/children", mom, "POST", { name: "רותם", gradeId: "6" });
    const cid = added.json.children[0].id;
    const code = (await call(base, `/parent/children/${cid}/code`, mom, "POST")).json.code;
    assert.equal((await call(base, "/child/connect", null, "POST", { code: "0000x" })).status, 404);
    const conn = await call(base, "/child/connect", null, "POST", { code });
    assert.equal(conn.status, 200);
    const tok = conn.json.token;
    assert.equal((await call(base, "/child/me", tok)).json.child.name, "רותם");
    const { gradeById } = await import("../../src/data/curriculum.ts");
    const topic = gradeById("6").topicSets.find((t) => t.adaptive)!.id;
    const s = await call(base, "/child/session", tok, "POST", { gradeId: "6", topicId: topic });
    assert.equal(s.status, 200);
    assert.ok(s.json.questions.length > 0);
    await call(base, "/dev/clock", null, "POST", { addDays: 8 });
    const blocked = await call(base, "/child/session", tok, "POST", { gradeId: "6", topicId: topic });
    assert.equal(blocked.status, 402);
    assert.equal(blocked.json.error, "subscription_inactive");
    await call(base, "/parent/subscription/pay", mom, "POST");
    assert.equal((await call(base, "/child/session", tok, "POST", { gradeId: "6", topicId: topic })).status, 200);
  } finally {
    close();
  }
});
