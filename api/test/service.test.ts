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

test("at most 3 children; names and grades are validated", async () => {
  const { d, mom } = setup();
  await svc.parentHousehold(d, mom);
  for (const name of ["א", "ב", "ג"]) await svc.parentAddChild(d, mom, { name, gradeId: "1" });
  assert.equal(await code(svc.parentAddChild(d, mom, { name: "ד", gradeId: "1" })), "children_full");
  const s = setup();
  await svc.parentHousehold(s.d, s.mom);
  assert.equal(await code(svc.parentAddChild(s.d, s.mom, { name: " ", gradeId: "1" })), "bad_name");
  assert.equal(await code(svc.parentAddChild(s.d, s.mom, { name: "x", gradeId: "99" })), "bad_grade");
});

test("child connects with a code once; the code then no longer works; wrong code fails", async () => {
  const { d, mom } = setup();
  await svc.parentHousehold(d, mom);
  const h = await svc.parentAddChild(d, mom, { name: "מיקה", gradeId: "1" });
  const { code: c } = await svc.parentConnectCode(d, mom, h.children[0].id);
  assert.match(c, /^\d{4}$/);
  const { who } = await svc.childConnect(d, c);
  assert.equal((await svc.childMe(d, who)).child.name, "מיקה");
  assert.equal(await code(svc.childConnect(d, c)), "bad_code");
  assert.equal(await code(svc.childConnect(d, "abcd")), "bad_code");
});

test("code expires after 10 minutes", async () => {
  const { d, mom, advanceDays } = setup();
  await svc.parentHousehold(d, mom);
  const h = await svc.parentAddChild(d, mom, { name: "א", gradeId: "1" });
  const { code: c } = await svc.parentConnectCode(d, mom, h.children[0].id);
  advanceDays(1);
  assert.equal(await code(svc.childConnect(d, c)), "bad_code");
});

test("disconnecting devices revokes the child's token", async () => {
  const { d, mom } = setup();
  await svc.parentHousehold(d, mom);
  const h = await svc.parentAddChild(d, mom, { name: "א", gradeId: "1" });
  const { code: c } = await svc.parentConnectCode(d, mom, h.children[0].id);
  const { who } = await svc.childConnect(d, c);
  await svc.parentDisconnectDevices(d, mom, h.children[0].id);
  assert.equal(await code(svc.childMe(d, who)), "device_revoked");
});

async function connected(grade = "6") {
  const s = setup();
  await svc.parentHousehold(s.d, s.mom);
  const h = await svc.parentAddChild(s.d, s.mom, { name: "רותם", gradeId: grade });
  const cid = h.children[0].id;
  const { who } = await svc.childConnect(s.d, (await svc.parentConnectCode(s.d, s.mom, cid)).code);
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

test("schedule and reminders", async () => {
  const { d, mom, who, cid } = await connected();
  assert.equal(await svc.parentSchedule(d, mom, cid), null);
  assert.deepEqual(await svc.parentSetSchedule(d, mom, cid, { days: [3, 1, 1, 9], time: "18:30" }), { days: [1, 3], time: "18:30" });
  assert.equal(await code(svc.parentSetSchedule(d, mom, cid, { days: [1], time: "25:00" })), "bad_time");
  await svc.parentSendReminder(d, mom, cid, 0);
  assert.equal((await svc.childMe(d, who)).unreadMessages, 1);
  assert.equal((await svc.childInbox(d, who))[0].text, "הגיע הזמן לתרגל 🙂");
  await svc.childMarkInboxRead(d, who);
  assert.equal((await svc.childMe(d, who)).unreadMessages, 0);
  assert.equal(await code(svc.parentSendReminder(d, mom, cid, 7)), "bad_reminder");
});
