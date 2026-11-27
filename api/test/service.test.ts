import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../../src/cloud/server/store.ts";
import * as svc from "../../src/cloud/server/service.ts";
import { ApiError } from "../../src/cloud/server/types.ts";
import { pricing } from "../../src/data/pricing.ts";

function setup() {
  let t = Date.parse("2026-12-01T10:00:00Z");
  let n = 0;
  const d: svc.Deps = {
    store: new MemoryStore(),
    now: () => t,
    rng: Math.random,
    newId: () => `id${++n}`,
    issueChildToken: (p) => JSON.stringify(p),
  };
  const mom = { uid: "mom", email: "mom@example.com" };
  return { d, mom, advanceDays: (x: number) => (t += x * 86_400_000) };
}
/** A child who made their own profile and typed the parent's code. */
async function kid(d: svc.Deps, mom: svc.ParentIdentity, name = "רותם", grade = "6") {
  const { token: _t, who } = await svc.childRegister(d, { name, gradeId: grade });
  const { code: c } = await svc.parentChildCode(d, mom);
  await svc.childLink(d, who, c);
  return who;
}
const code = async (e: Promise<unknown>) => {
  try { await e; } catch (x) { return (x as ApiError).code; }
  return "no error";
};

test("first sign-in creates a household with a free week; second sign-in returns the same one", async () => {
  const { d, mom } = setup();
  const a = await svc.parentHousehold(d, mom);
  const b = await svc.parentHousehold(d, mom);
  assert.equal(a.id, b.id);
  assert.equal(a.subscription.status, "trial");
  assert.equal(a.subscription.daysLeft, pricing.trialDays);
  assert.equal(a.subscription.nextPriceNis, pricing.firstMonthNis);
});

test("a child makes their own profile first; it has no household and cannot practise", async () => {
  const { d } = setup();
  const { who } = await svc.childRegister(d, { name: "מיקה", gradeId: "1" });
  const me = await svc.childMe(d, who);
  assert.equal(me.child.name, "מיקה");
  assert.equal(me.linked, false);
  assert.equal(me.subscription.active, false);
  const { gradeById } = await import("../../src/data/curriculum.ts");
  assert.equal(await code(svc.childStartSession(d, who, { gradeId: "1", topicId: gradeById("1").topicSets[0].id })), "subscription_inactive");
  assert.equal(await code(svc.childRegister(d, { name: " ", gradeId: "1" })), "bad_name");
  assert.equal(await code(svc.childRegister(d, { name: "x", gradeId: "99" })), "bad_grade");
});

test("the parent's code links the profile to the household; then the household's subscription decides", async () => {
  const { d, mom } = setup();
  await svc.parentHousehold(d, mom);
  const { who } = await svc.childRegister(d, { name: "רותם", gradeId: "6" });
  assert.equal(await code(svc.childLink(d, who, "0000")), "bad_code");
  const { code: c } = await svc.parentChildCode(d, mom);
  assert.match(c, /^\d{4}$/);
  const me = await svc.childLink(d, who, c);
  assert.equal(me.linked, true);
  assert.equal(me.subscription.status, "trial");
  assert.equal(me.subscription.active, true);
  assert.equal((await svc.parentHousehold(d, mom)).children[0].name, "רותם");
  assert.equal(await code(svc.childLink(d, who, c)), "already_linked");
});

test("one code serves several children within its ten minutes, up to three; a fourth is refused", async () => {
  const { d, mom, advanceDays } = setup();
  await svc.parentHousehold(d, mom);
  const { code: c } = await svc.parentChildCode(d, mom);
  for (const name of ["א", "ב", "ג"]) {
    const { who } = await svc.childRegister(d, { name, gradeId: "1" });
    await svc.childLink(d, who, c);
  }
  assert.equal(await code(svc.parentChildCode(d, mom)), "children_full");
  const { who: fourth } = await svc.childRegister(d, { name: "ד", gradeId: "1" });
  assert.equal(await code(svc.childLink(d, fourth, c)), "children_full");
  advanceDays(1);
  const s2 = setup();
  await svc.parentHousehold(s2.d, s2.mom);
  const { code: old } = await svc.parentChildCode(s2.d, s2.mom);
  s2.advanceDays(1);
  const { who: late } = await svc.childRegister(s2.d, { name: "ה", gradeId: "1" });
  assert.equal(await code(svc.childLink(s2.d, late, old)), "bad_code");
});

test("disconnecting devices revokes the child's token", async () => {
  const { d, mom } = setup();
  await svc.parentHousehold(d, mom);
  const who = await kid(d, mom);
  const h = await svc.parentHousehold(d, mom);
  await svc.parentDisconnectDevices(d, mom, h.children[0].id);
  assert.equal(await code(svc.childMe(d, who)), "device_revoked");
});

async function connected(grade = "6") {
  const s = setup();
  await svc.parentHousehold(s.d, s.mom);
  const who = await kid(s.d, s.mom, "רותם", grade);
  const cid = who.cid;
  return { ...s, cid, who };
}

test("practice needs an active subscription: trial ok, expired refused, paid ok again", async () => {
  const { d, mom, who, advanceDays } = await connected();
  const topic = (await import("../../src/data/curriculum.ts")).gradeById("6").topicSets[0].id;
  await svc.childStartSession(d, who, { gradeId: "6", topicId: topic });
  advanceDays(pricing.trialDays + 1);
  assert.equal((await svc.childMe(d, who)).subscription.active, false);
  assert.equal(await code(svc.childStartSession(d, who, { gradeId: "6", topicId: topic })), "subscription_inactive");
  await svc.parentPay(d, mom);
  await svc.childStartSession(d, who, { gradeId: "6", topicId: topic });
});

test("prices: first paid month 10, then 30; cancel ends access at once", async () => {
  const { d, mom } = setup();
  await svc.parentHousehold(d, mom);
  const a = await svc.parentPay(d, mom);
  assert.equal(a.subscription.nextPriceNis, pricing.laterMonthNis);
  assert.equal(a.subscription.status, "active"); // paying during the free week: access continues, the paid month starts after it
  const b = await svc.parentCancel(d, mom);
  assert.equal(b.subscription.status, "expired");
  assert.equal(b.subscription.active, false);
});

test("an adaptive session: answers move difficulty, resume restores position, finish writes history", async () => {
  const { d, mom, who, cid } = await connected("6");
  const { gradeById } = await import("../../src/data/curriculum.ts");
  const topic = gradeById("6").topicSets.find((t) => t.adaptive)!;
  const s = await svc.childStartSession(d, who, { gradeId: "6", topicId: topic.id });
  assert.equal(s.questions.length, topic.adaptive!.questionCount);
  assert.equal(s.resume, null);
  const r1 = await svc.childAnswer(d, who, s.sessionId, true);
  assert.equal(r1.index, 1);
  assert.ok(r1.nextQuestion);
  const again = await svc.childStartSession(d, who, { gradeId: "6", topicId: topic.id });
  assert.deepEqual(again.resume, { index: 1, correctCount: 1 });
  for (let i = 1; i < s.questions.length; i++) await svc.childAnswer(d, who, s.sessionId, true);
  await svc.childFinish(d, who, s.sessionId);
  const hist = await svc.parentHistory(d, mom, cid);
  assert.equal(hist.length, 1);
  assert.equal(hist[0].correct, s.questions.length);
  assert.equal((await svc.parentHousehold(d, mom)).children[0].practicesThisWeek, 1);
  // next visit starts from the reached tier, not from zero
  const next = await svc.childStartSession(d, who, { gradeId: "6", topicId: topic.id });
  assert.ok((next.difficulty ?? 0) >= (topic.adaptive!.initialDifficulty));
});

test("subscription ending mid-run: the answer is saved, no next question", async () => {
  const { d, who, advanceDays } = await connected("6");
  const { gradeById } = await import("../../src/data/curriculum.ts");
  const topic = gradeById("6").topicSets.find((t) => t.adaptive)!;
  const s = await svc.childStartSession(d, who, { gradeId: "6", topicId: topic.id });
  advanceDays(pricing.trialDays + 1);
  const r = await svc.childAnswer(d, who, s.sessionId, true);
  assert.equal(r.stopped, true);
  assert.equal(r.nextQuestion, null);
});

test("deleting a child removes every trace; another household cannot touch it", async () => {
  const { d, mom, who, cid } = await connected("6");
  const { gradeById } = await import("../../src/data/curriculum.ts");
  const topic = gradeById("6").topicSets.find((t) => t.adaptive)!;
  const s = await svc.childStartSession(d, who, { gradeId: "6", topicId: topic.id });
  await svc.childAnswer(d, who, s.sessionId, true);
  await svc.childFinish(d, who, s.sessionId);
  const dad = { uid: "stranger", email: "x@example.com" };
  await svc.parentHousehold(d, dad);
  assert.equal(await code(svc.parentHistory(d, dad, cid)), "no_child");
  await svc.parentDeleteChild(d, mom, cid);
  const store = d.store as MemoryStore;
  assert.equal(Object.keys(store.snapshot()).filter((k) => k.includes(cid)).length, 0);
  assert.equal(await code(svc.childMe(d, who)), "device_revoked");
});

test("second parent joins by code; third is refused", async () => {
  const { d, mom } = setup();
  await svc.parentHousehold(d, mom);
  const dad = { uid: "dad", email: "dad@example.com" };
  const { code: c } = await svc.parentInvite(d, mom);
  const h = await svc.parentJoin(d, dad, c);
  assert.equal(h.parents.length, 2);
  assert.equal(await code(svc.parentInvite(d, mom)), "parents_full");
});
