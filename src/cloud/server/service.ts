/**
 * The whole backend, as plain async functions over a `Store`. Express (api/) and the
 * in-browser demo are thin wrappers around this — so what the demo shows is the real logic.
 * Identity arrives already verified (a Firebase ID token for a parent, a signed device token
 * for a child); this file never sees a password or a token.
 */
import { gradeById, type Question } from "../../data/curriculum";
import { withoutRepeatingPrompt } from "../../data/adaptiveHelpers";
import { DEFAULT_PACE_LEVEL } from "../../data/adaptivePace";
import { pricing } from "../../data/pricing";
import type { Store } from "./store";
import {
  ApiError,
  type AnswerResult,
  type ChildMe,
  type ChildSettings,
  type ChildView,
  type HistoryEntry,
  type ProgressView,
  type TopicProgress,
  type HouseholdView,
  type SessionView,
  type SubscriptionView,
} from "./types";

export interface Deps {
  store: Store;
  now: () => number;
  rng: () => number;
  newId: () => string;
  issueChildToken: (payload: ChildIdentity) => string;
  /** Enforce the subscription? Default off — see `HouseholdView.paywall`. */
  paywall?: boolean;
}
export interface ParentIdentity { uid: string; email: string }
/** A child device: which child, which of their devices. Which household (if any) is looked up — a
 *  child can exist before any parent has linked them. */
export interface ChildIdentity { cid: string; did: string }

interface HouseholdDoc {
  createdAt: string;
  parentUids: string[];
  trialEndsAt: string;
  paidUntil: string | null;
  payments: { at: string; amountNis: number }[];
}
interface ChildDoc {
  name: string;
  gradeId: string;
  avatar?: string;
  createdAt: string;
  devices: { id: string; at: string }[];
  settings: ChildSettings;
}
interface CodeDoc { kind: "child" | "parent"; hid: string; expiresAt: string }
interface SessionDoc {
  gradeId: string;
  topicId: string;
  title: string;
  adaptive: boolean;
  difficulty: number | null;
  streak: number;
  answeredCount: number;
  correctCount: number;
  questions: Question[];
}

const DAY = 86_400_000;
const hPath = (hid: string) => `households/${hid}`;
const unlinkedPath = (cid: string) => `unlinkedChildren/${cid}`;
const cPath = (hid: string, cid: string) => `households/${hid}/children/${cid}`;
const sessionKey = (gradeId: string, topicId: string) => encodeURIComponent(`${gradeId}__${topicId}`);

// ───────────────────────── subscription

export function subscriptionOf(h: HouseholdDoc, now: number): SubscriptionView {
  const paidUntil = h.paidUntil ? Date.parse(h.paidUntil) : 0;
  const trialEnds = Date.parse(h.trialEndsAt);
  const status = now < paidUntil ? "active" : now < trialEnds ? "trial" : "expired";
  const end = status === "active" ? paidUntil : status === "trial" ? trialEnds : now;
  return {
    status,
    active: status !== "expired",
    trialEndsAt: h.trialEndsAt,
    paidUntil: h.paidUntil,
    daysLeft: status === "expired" ? 0 : Math.max(0, Math.ceil((end - now) / DAY)),
    nextPriceNis: h.payments.length === 0 ? pricing.firstMonthNis : pricing.laterMonthNis,
    paymentsCount: h.payments.length,
  };
}

// ───────────────────────── lookups

async function householdOf(d: Deps, parent: ParentIdentity): Promise<{ hid: string; h: HouseholdDoc }> {
  const link = await d.store.get<{ householdId: string }>(`parents/${parent.uid}`);
  if (!link) throw new ApiError(404, "no_household");
  const h = await d.store.get<HouseholdDoc>(hPath(link.householdId));
  if (!h) throw new ApiError(404, "no_household");
  return { hid: link.householdId, h };
}

async function childOfParent(d: Deps, parent: ParentIdentity, cid: string) {
  const { hid, h } = await householdOf(d, parent);
  const c = await d.store.get<ChildDoc>(cPath(hid, cid));
  if (!c) throw new ApiError(404, "no_child");
  return { hid, h, cid, c };
}

/** Where this child lives now — in a household once a parent's code was entered, alone before. */
async function requireChild(d: Deps, who: ChildIdentity) {
  const idx = await d.store.get<{ hid: string | null }>(`childIndex/${who.cid}`);
  if (!idx) throw new ApiError(401, "device_revoked");
  const path = idx.hid ? cPath(idx.hid, who.cid) : unlinkedPath(who.cid);
  const c = await d.store.get<ChildDoc>(path);
  if (!c || !c.devices.some((x) => x.id === who.did)) throw new ApiError(401, "device_revoked");
  const h = idx.hid ? await d.store.get<HouseholdDoc>(hPath(idx.hid)) : undefined;
  if (idx.hid && !h) throw new ApiError(401, "device_revoked");
  return { path, hid: idx.hid, c, h };
}

/** No household, no practice (a parent has to link the profile). With the paywall off that is the only
 *  requirement; with it on, the household's subscription must also be active. */
const canPractise = (d: Deps, h: HouseholdDoc | undefined) =>
  h ? !d.paywall || subscriptionOf(h, d.now()).active : false;

// ───────────────────────── views

async function childView(d: Deps, hid: string, cid: string, c: ChildDoc): Promise<ChildView> {
  const history = await d.store.list<HistoryEntry>(`${cPath(hid, cid)}/history`);
  const weekAgo = d.now() - 7 * DAY;
  const times = history.map((x) => Date.parse(x.data.at));
  return {
    id: cid,
    name: c.name,
    gradeId: c.gradeId,
    avatar: c.avatar,
    devicesCount: c.devices.length,
    practicesThisWeek: times.filter((t) => t >= weekAgo).length,
    lastPracticeAt: times.length ? new Date(Math.max(...times)).toISOString() : null,
  };
}

async function householdView(d: Deps, hid: string, h: HouseholdDoc): Promise<HouseholdView> {
  const parents = await Promise.all(
    h.parentUids.map(async (uid) => ({ uid, email: (await d.store.get<{ email: string }>(`parents/${uid}`))?.email ?? "" })),
  );
  const kids = await d.store.list<ChildDoc>(`${hPath(hid)}/children`);
  const children = await Promise.all(
    kids.sort((a, b) => a.data.createdAt.localeCompare(b.data.createdAt)).map((k) => childView(d, hid, k.id, k.data)),
  );
  return { id: hid, paywall: !!d.paywall, parents, children, subscription: subscriptionOf(h, d.now()) };
}

// ───────────────────────── parent

/** First sign-in creates the household and starts the free week. Later sign-ins return it. */
export async function parentHousehold(d: Deps, parent: ParentIdentity): Promise<HouseholdView> {
  const link = await d.store.get<{ householdId: string }>(`parents/${parent.uid}`);
  if (link) {
    const { hid, h } = await householdOf(d, parent);
    return householdView(d, hid, h);
  }
  const hid = d.newId();
  const now = d.now();
  const h: HouseholdDoc = {
    createdAt: new Date(now).toISOString(),
    parentUids: [parent.uid],
    trialEndsAt: new Date(now + pricing.trialDays * DAY).toISOString(),
    paidUntil: null,
    payments: [],
  };
  await d.store.set(hPath(hid), h);
  await d.store.set(`parents/${parent.uid}`, { householdId: hid, email: parent.email });
  return householdView(d, hid, h);
}

function cleanName(raw: unknown): string {
  const name = typeof raw === "string" ? raw.trim() : "";
  if (name.length < 1 || name.length > 20) throw new ApiError(400, "bad_name");
  return name;
}

/** Deletes the child and every record of them (history, difficulty tiers, sessions). */
export async function parentDeleteChild(d: Deps, parent: ParentIdentity, cid: string): Promise<HouseholdView> {
  const { hid, h } = await childOfParent(d, parent, cid);
  await d.store.deleteTree(cPath(hid, cid));
  await d.store.delete(`childIndex/${cid}`);
  return householdView(d, hid, h);
}

async function newCode(d: Deps, doc: Omit<CodeDoc, "expiresAt">): Promise<{ code: string; expiresAt: string }> {
  const expiresAt = new Date(d.now() + pricing.codeTtlMinutes * 60_000).toISOString();
  for (let i = 0; i < 100; i++) {
    const code = String(Math.floor(d.rng() * 10000)).padStart(4, "0");
    const taken = await d.store.get<CodeDoc>(`connectCodes/${code}`);
    if (taken && Date.parse(taken.expiresAt) > d.now()) continue;
    await d.store.set(`connectCodes/${code}`, { ...doc, expiresAt });
    return { code, expiresAt };
  }
  throw new ApiError(503, "no_free_code");
}

/** The code a parent reads out (or shows as a QR) for the children to type in their own app.
 *  Works for any child within its 10 minutes, until the household is full. */
export async function parentChildCode(d: Deps, parent: ParentIdentity) {
  const { hid } = await householdOf(d, parent);
  const kids = await d.store.list<ChildDoc>(`${hPath(hid)}/children`);
  if (kids.length >= pricing.maxChildren) throw new ApiError(409, "children_full");
  return newCode(d, { kind: "child", hid });
}

export async function parentDisconnectDevices(d: Deps, parent: ParentIdentity, cid: string): Promise<HouseholdView> {
  const { hid, h, c } = await childOfParent(d, parent, cid);
  await d.store.set(cPath(hid, cid), { ...c, devices: [] });
  return householdView(d, hid, h);
}

export async function parentInvite(d: Deps, parent: ParentIdentity) {
  const { hid, h } = await householdOf(d, parent);
  if (h.parentUids.length >= pricing.maxParents) throw new ApiError(409, "parents_full");
  return newCode(d, { kind: "parent", hid });
}

export async function parentJoin(d: Deps, parent: ParentIdentity, code: string): Promise<HouseholdView> {
  if (await d.store.get(`parents/${parent.uid}`)) throw new ApiError(409, "already_in_household");
  const doc = await d.store.get<CodeDoc>(`connectCodes/${String(code).trim()}`);
  if (!doc || doc.kind !== "parent" || Date.parse(doc.expiresAt) <= d.now()) throw new ApiError(404, "bad_code");
  const h = await d.store.get<HouseholdDoc>(hPath(doc.hid));
  if (!h) throw new ApiError(404, "bad_code");
  if (h.parentUids.length >= pricing.maxParents) throw new ApiError(409, "parents_full");
  const next = { ...h, parentUids: [...h.parentUids, parent.uid] };
  await d.store.set(hPath(doc.hid), next);
  await d.store.set(`parents/${parent.uid}`, { householdId: doc.hid, email: parent.email });
  await d.store.delete(`connectCodes/${String(code).trim()}`);
  return householdView(d, doc.hid, next);
}

export async function parentHistory(d: Deps, parent: ParentIdentity, cid: string): Promise<HistoryEntry[]> {
  const { hid } = await childOfParent(d, parent, cid);
  const rows = await d.store.list<HistoryEntry>(`${cPath(hid, cid)}/history`);
  return rows.map((r) => ({ ...r.data, id: r.id })).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 50);
}

/** What a parent sees about one child. Counts every practice, not only the latest 50. */
export async function parentProgress(d: Deps, parent: ParentIdentity, cid: string): Promise<ProgressView> {
  const { hid } = await childOfParent(d, parent, cid);
  const base = cPath(hid, cid);
  const rows = (await d.store.list<Omit<HistoryEntry, "id">>(`${base}/history`)).map((r) => ({ ...r.data, id: r.id }));
  const weekAgo = d.now() - 7 * DAY;
  const groups = new Map<string, HistoryEntry[]>();
  for (const r of rows) {
    const k = `${r.gradeId}__${r.topicId}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const topics: TopicProgress[] = [];
  for (const [k, list] of groups) {
    const correct = list.reduce((n, r) => n + r.correct, 0);
    const total = list.reduce((n, r) => n + r.total, 0);
    const tier = await d.store.get<{ difficulty: number }>(`${base}/adaptive/${encodeURIComponent(k)}`);
    const newest = list.reduce((a, b) => (a.at > b.at ? a : b));
    topics.push({
      gradeLabel: newest.gradeLabel,
      topicId: newest.topicId,
      topicTitle: newest.topicTitle,
      practices: list.length,
      correct,
      total,
      percent: total ? Math.round((100 * correct) / total) : 0,
      lastAt: newest.at,
      level: tier?.difficulty ?? null,
    });
  }
  return {
    practicesThisWeek: rows.filter((r) => Date.parse(r.at) >= weekAgo).length,
    topics: topics.sort((a, b) => b.lastAt.localeCompare(a.lastAt)),
    recent: rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10),
  };
}

/** BILLING STUB. No real payment: marks the next period paid at the right price. A real
 *  provider (Cardcom) replaces this function's body and nothing above it changes. */
export async function parentPay(d: Deps, parent: ParentIdentity): Promise<HouseholdView> {
  const { hid, h } = await householdOf(d, parent);
  const now = d.now();
  const base = Math.max(now, h.paidUntil ? Date.parse(h.paidUntil) : 0, Date.parse(h.trialEndsAt));
  const price = h.payments.length === 0 ? pricing.firstMonthNis : pricing.laterMonthNis;
  const next: HouseholdDoc = {
    ...h,
    paidUntil: new Date(base + pricing.periodDays * DAY).toISOString(),
    payments: [...h.payments, { at: new Date(now).toISOString(), amountNis: price }],
  };
  await d.store.set(hPath(hid), next);
  return householdView(d, hid, next);
}

/** Ends access right away (the decision: when it ends, it ends). */
export async function parentCancel(d: Deps, parent: ParentIdentity): Promise<HouseholdView> {
  const { hid, h } = await householdOf(d, parent);
  const at = new Date(d.now()).toISOString();
  const next: HouseholdDoc = { ...h, paidUntil: at, trialEndsAt: at };
  await d.store.set(hPath(hid), next);
  return householdView(d, hid, next);
}

// ───────────────────────── child

/** A child makes their own profile in the kids' app. Nothing to practise yet: no parent has
 *  linked them, so there is no subscription behind them. */
export async function childRegister(d: Deps, input: { name: string; gradeId: string; avatar?: string }) {
  const name = cleanName(input.name);
  try {
    gradeById(input.gradeId);
  } catch {
    throw new ApiError(400, "bad_grade");
  }
  const cid = d.newId();
  const did = d.newId();
  const child: ChildDoc = {
    name,
    gradeId: input.gradeId,
    avatar: typeof input.avatar === "string" ? input.avatar.slice(0, 30) : undefined,
    createdAt: new Date(d.now()).toISOString(),
    devices: [{ id: did, at: new Date(d.now()).toISOString() }],
    settings: { readAloud: false, pace: DEFAULT_PACE_LEVEL },
  };
  await d.store.set(unlinkedPath(cid), child);
  await d.store.set(`childIndex/${cid}`, { hid: null });
  const who: ChildIdentity = { cid, did };
  return { token: d.issueChildToken(who), who };
}

/** The child types the code their parent shows: the profile joins that household, and from then
 *  on the household's subscription decides whether they may practise. */
export async function childLink(d: Deps, who: ChildIdentity, code: string): Promise<ChildMe> {
  const here = await requireChild(d, who);
  if (here.hid) throw new ApiError(409, "already_linked");
  const key = String(code ?? "").trim();
  const doc = await d.store.get<CodeDoc>(`connectCodes/${key}`);
  if (!doc || doc.kind !== "child" || Date.parse(doc.expiresAt) <= d.now()) throw new ApiError(404, "bad_code");
  const h = await d.store.get<HouseholdDoc>(hPath(doc.hid));
  if (!h) throw new ApiError(404, "bad_code");
  const kids = await d.store.list<ChildDoc>(`${hPath(doc.hid)}/children`);
  if (kids.length >= pricing.maxChildren) throw new ApiError(409, "children_full");
  await d.store.set(cPath(doc.hid, who.cid), here.c);
  await d.store.set(`childIndex/${who.cid}`, { hid: doc.hid });
  await d.store.delete(unlinkedPath(who.cid));
  return childMe(d, who);
}

export async function childMe(d: Deps, who: ChildIdentity): Promise<ChildMe> {
  const { c, hid, h } = await requireChild(d, who);
  const sub = h ? subscriptionOf(h, d.now()) : null;
  return {
    child: { id: who.cid, name: c.name, gradeId: c.gradeId, avatar: c.avatar },
    linked: hid !== null,
    subscription: { status: sub?.status ?? "expired", active: canPractise(d, h) },
    settings: c.settings,
  };
}

export async function childSetSettings(d: Deps, who: ChildIdentity, patch: Partial<ChildSettings>): Promise<ChildSettings> {
  const { c, path } = await requireChild(d, who);
  const settings: ChildSettings = {
    readAloud: typeof patch.readAloud === "boolean" ? patch.readAloud : c.settings.readAloud,
    pace: patch.pace === "slow" || patch.pace === "medium" || patch.pace === "fast" ? patch.pace : c.settings.pace,
  };
  await d.store.set(path, { ...c, settings });
  return settings;
}

export async function childStartSession(
  d: Deps,
  who: ChildIdentity,
  input: { gradeId: string; topicId: string; levelId?: string },
): Promise<SessionView> {
  const { path: base, h } = await requireChild(d, who);
  if (!canPractise(d, h)) throw new ApiError(402, "subscription_inactive");
  let grade;
  try {
    grade = gradeById(input.gradeId);
  } catch {
    throw new ApiError(404, "no_topic");
  }
  const topic = grade.topicSets.find((t) => t.id === input.topicId);
  if (!topic) throw new ApiError(404, "no_topic");
  const key = sessionKey(input.gradeId, input.topicId);

  const existing = await d.store.get<SessionDoc>(`${base}/sessions/${key}`);
  if (existing && existing.answeredCount < existing.questions.length) {
    return viewOf(key, existing, { index: existing.answeredCount, correctCount: existing.correctCount });
  }

  let doc: SessionDoc;
  if (topic.adaptive) {
    const { adaptive } = topic;
    const saved = await d.store.get<{ difficulty: number }>(`${base}/adaptive/${key}`);
    const start = saved
      ? Math.min(adaptive.maxDifficulty, Math.max(adaptive.minDifficulty, saved.difficulty))
      : adaptive.initialDifficulty;
    doc = {
      gradeId: input.gradeId,
      topicId: input.topicId,
      title: topic.title,
      adaptive: true,
      difficulty: start,
      streak: 0,
      answeredCount: 0,
      correctCount: 0,
      questions: Array.from({ length: adaptive.questionCount }, () => adaptive.generate(start, d.rng)),
    };
  } else {
    const level = topic.levels.find((l) => l.id === input.levelId) ?? topic.levels[0];
    if (!level) throw new ApiError(404, "no_topic");
    doc = {
      gradeId: input.gradeId,
      topicId: input.topicId,
      title: level.title,
      adaptive: false,
      difficulty: null,
      streak: 0,
      answeredCount: 0,
      correctCount: 0,
      questions: level.questions,
    };
  }
  await d.store.set(`${base}/sessions/${key}`, doc);
  return viewOf(key, doc, null);
}

function viewOf(key: string, s: SessionDoc, resume: SessionView["resume"]): SessionView {
  return {
    sessionId: key,
    gradeId: s.gradeId,
    topicId: s.topicId,
    title: s.title,
    difficulty: s.difficulty,
    questions: s.questions,
    resume,
  };
}

export async function childAnswer(d: Deps, who: ChildIdentity, sessionId: string, correct: boolean): Promise<AnswerResult> {
  const { c, path: base, h } = await requireChild(d, who);
  const path = `${base}/sessions/${sessionId}`;
  const s = await d.store.get<SessionDoc>(path);
  if (!s || s.answeredCount >= s.questions.length) throw new ApiError(404, "no_session");
  const answeredCount = s.answeredCount + 1;
  const next: SessionDoc = { ...s, answeredCount, correctCount: s.correctCount + (correct ? 1 : 0) };

  if (s.adaptive) {
    const topic = gradeById(s.gradeId).topicSets.find((t) => t.id === s.topicId);
    if (!topic?.adaptive) throw new ApiError(404, "no_topic");
    const { adaptive } = topic;
    const streak = correct ? (s.streak > 0 ? s.streak + 1 : 1) : s.streak < 0 ? s.streak - 1 : -1;
    const difficulty = adaptive.nextDifficulty(s.difficulty ?? adaptive.initialDifficulty, correct, streak, c.settings.pace);
    next.streak = streak;
    next.difficulty = difficulty;
    // Same rule the client always had: only the question at exactly `answeredCount` is ever
    // shown, and it must not repeat the one just answered; the later ones are redrawn.
    next.questions = s.questions.map((q, i) => {
      if (i < answeredCount) return q;
      if (i === answeredCount) return withoutRepeatingPrompt(() => adaptive.generate(difficulty, d.rng), s.questions[answeredCount - 1].prompt);
      return adaptive.generate(difficulty, d.rng);
    });
    await d.store.set(`${base}/adaptive/${sessionId}`, { difficulty });
  }
  await d.store.set(path, next);
  const stopped = !canPractise(d, h);
  return {
    nextQuestion: stopped ? null : (next.questions[answeredCount] ?? null),
    index: answeredCount,
    difficulty: next.difficulty,
    stopped,
  };
}

export async function childFinish(d: Deps, who: ChildIdentity, sessionId: string): Promise<void> {
  const { path: base } = await requireChild(d, who);
  const s = await d.store.get<SessionDoc>(`${base}/sessions/${sessionId}`);
  if (!s) return;
  const grade = gradeById(s.gradeId);
  const entry: Omit<HistoryEntry, "id"> = {
    at: new Date(d.now()).toISOString(),
    gradeId: s.gradeId,
    gradeLabel: grade.label,
    topicId: s.topicId,
    topicTitle: grade.topicSets.find((t) => t.id === s.topicId)?.title ?? s.topicId,
    difficulty: s.difficulty,
    correct: s.correctCount,
    total: s.questions.length,
  };
  await d.store.set(`${base}/history/${d.newId()}`, entry);
  await d.store.delete(`${base}/sessions/${sessionId}`);
}

/** Leaving mid-run keeps the session on the server so the next visit resumes it. */
export async function childAbandon(_d: Deps, _who: ChildIdentity, _sessionId: string): Promise<void> {}
