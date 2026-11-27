import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../../src/cloud/server/store.ts";
import * as svc from "../../src/cloud/server/service.ts";
import { seedDemo } from "../../src/cloud/demoSeed.ts";

test("the demo family: two parents, three connected children with history, halfway through the free week", async () => {
  let n = 0;
  const d: svc.Deps = { store: new MemoryStore(), now: () => Date.now(), rng: Math.random, newId: () => `id${++n}`, issueChildToken: (p) => JSON.stringify(p), paywall: true };
  const logins = await seedDemo(d);
  assert.deepEqual(logins.parents.map((p) => p.name), ["אייל", "יעל"]);
  assert.deepEqual(logins.kids.map((k) => k.name), ["מיקה", "רותם", "עומר"]);

  const eyal = { uid: "dev-eyal@example.com", email: "eyal@example.com" };
  const h = await svc.parentHousehold(d, eyal);
  assert.deepEqual(h.parents.map((p) => p.name), ["אייל", "יעל"]);
  assert.equal(h.children.length, 3);
  assert.equal(h.subscription.status, "trial");
  assert.equal(h.subscription.daysLeft, 4); // 3.5 of 7 days used
  for (const c of h.children) {
    const p = await svc.parentProgress(d, eyal, c.id);
    assert.ok(p.topics.length >= 1, `${c.name} has progress`);
    assert.ok(p.recent.length >= 3, `${c.name} has practices`);
  }
  // each seeded child device works, and the second parent sees the same family
  const kid = JSON.parse(logins.kids[1].token);
  assert.equal((await svc.childMe(d, kid)).subscription.active, true);
  const yael = { uid: "dev-yael@example.com", email: "yael@example.com" };
  assert.equal((await svc.parentHousehold(d, yael)).children.length, 3);
  // seeding twice changes nothing
  assert.deepEqual(await seedDemo(d), logins);
});
