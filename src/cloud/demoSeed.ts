/**
 * The demo's starting point: a family that is already using the app — two parents (אייל, יעל), three
 * children connected, practice history, and the free week half over. Built with the real service
 * functions, so it is exactly what the real thing would hold, not a mock-up.
 */
import { gradeById } from "../data/curriculum";
import * as svc from "./server/service";

export interface DemoLogins {
  parents: { name: string; token: string }[];
  kids: { name: string; token: string; grade: string }[];
}

const DAY = 86_400_000;
const EYAL = { uid: "dev-eyal@example.com", email: "eyal@example.com", name: "אייל" };
const YAEL = { uid: "dev-yael@example.com", email: "yael@example.com", name: "יעל" };

const CHILDREN = [
  { name: "מיקה", gradeId: "1", avatar: "unicorn", plan: [[0.4, 0, 0.9], [1.2, 1, 0.7], [2.1, 0, 0.95], [2.9, 2, 0.6], [3.3, 0, 1]] },
  { name: "רותם", gradeId: "6", avatar: "panda", plan: [[0.6, 0, 0.75], [1.5, 1, 0.55], [2.4, 0, 0.85], [3.1, 2, 0.65]] },
  { name: "עומר", gradeId: "8", avatar: "owl", plan: [[0.8, 0, 0.8], [2.0, 1, 0.6], [3.2, 2, 0.7]] },
] as const;

/** Small deterministic generator, so the demo always starts the same. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

// React StrictMode runs effects twice in development: two seeds on one store would register each
// child twice and fail with children_full. One seeding per store, shared by every caller.
const seeding = new WeakMap<object, Promise<DemoLogins>>();

export function seedDemo(deps: svc.Deps): Promise<DemoLogins> {
  let p = seeding.get(deps.store);
  if (!p) {
    p = seedOnce(deps);
    seeding.set(deps.store, p);
  }
  return p;
}

async function seedOnce(deps: svc.Deps): Promise<DemoLogins> {
  const existing = await deps.store.get<DemoLogins>("demo/logins");
  if (existing) return existing;

  // "Now" for the seed: the family joined 3.5 days ago, so half of the free week is gone.
  let t = deps.now() - 3.5 * DAY;
  const d: svc.Deps = { ...deps, now: () => t, paywall: true };
  const rng = lcg(7);

  await svc.parentHousehold(d, EYAL);
  const invite = await svc.parentInvite(d, EYAL);
  await svc.parentJoin(d, YAEL, invite.code);
  const { code } = await svc.parentChildCode(d, EYAL);

  // Everyone joins at the start (the code only lasts ten minutes)...
  const kids: DemoLogins["kids"] = [];
  const joined = [];
  for (const c of CHILDREN) {
    const { token, who } = await svc.childRegister(d, { name: c.name, gradeId: c.gradeId, avatar: c.avatar });
    await svc.childLink(d, who, code);
    kids.push({ name: c.name, token, grade: gradeById(c.gradeId).label });
    joined.push({ c, who });
  }
  // ...and then practise over the following days.
  for (const { c, who } of joined) {
    const topics = gradeById(c.gradeId).topicSets;
    const sorted = [...c.plan].sort((a, b) => a[0] - b[0]);
    for (const [daysAfterJoin, topicIndex, rightShare] of sorted) {
      t = deps.now() - 3.5 * DAY + daysAfterJoin * DAY;
      const topic = topics[Math.min(topicIndex, topics.length - 1)];
      const session = await svc.childStartSession(d, who, { gradeId: c.gradeId, topicId: topic.id });
      for (let i = session.resume?.index ?? 0; i < session.questions.length; i++) {
        await svc.childAnswer(d, who, session.sessionId, rng() < rightShare);
      }
      await svc.childFinish(d, who, session.sessionId);
    }
  }

  const logins: DemoLogins = {
    parents: [
      { name: EYAL.name, token: `dev:${EYAL.email}` },
      { name: YAEL.name, token: `dev:${YAEL.email}` },
    ],
    kids,
  };
  await deps.store.set("demo/logins", logins);
  return logins;
}
