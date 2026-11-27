/** Shared by the real server (api/), the in-browser demo backend and the screens. No Node or
 *  browser APIs here — this file must run in both. */

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

export type SubscriptionStatus = "trial" | "active" | "expired";

export interface SubscriptionView {
  status: SubscriptionStatus;
  /** Children may practise. False when the subscription has ended — and then they may not. */
  active: boolean;
  trialEndsAt: string;
  paidUntil: string | null;
  /** Whole days until the current period ends (trial or paid); 0 when expired. */
  daysLeft: number;
  /** What the next payment would be — 10 for the first ever, 30 after. Read from pricing. */
  nextPriceNis: number;
  paymentsCount: number;
}

export interface ChildView {
  id: string;
  name: string;
  gradeId: string;
  avatar?: string;
  devicesCount: number;
  /** Practices finished in the last 7 days — the only number the home card needs. */
  practicesThisWeek: number;
  lastPracticeAt: string | null;
}

export interface HouseholdView {
  id: string;
  /** Is the subscription enforced? Off at first: children can practise as soon as a parent has linked them,
   *  and the screens show no prices. The subscription machinery stays, switched off. */
  paywall: boolean;
  parents: { uid: string; email: string; name?: string }[];
  children: ChildView[];
  subscription: SubscriptionView;
}

/** One topic as a parent sees it: how much, how well, how recently, and where the difficulty stands. */
export interface TopicProgress {
  gradeLabel: string;
  topicId: string;
  topicTitle: string;
  practices: number;
  correct: number;
  total: number;
  /** correct / total, whole percent. */
  percent: number;
  lastAt: string;
  /** The adaptive difficulty the child has reached in this topic (null for a fixed-level topic). */
  level: number | null;
}

export interface ProgressView {
  practicesThisWeek: number;
  topics: TopicProgress[];
  recent: HistoryEntry[];
}

export interface HistoryEntry {
  id: string;
  at: string;
  gradeId: string;
  gradeLabel: string;
  topicId: string;
  topicTitle: string;
  difficulty: number | null;
  correct: number;
  total: number;
}

export interface ChildSettings {
  readAloud: boolean;
  pace: "slow" | "medium" | "fast";
}

export interface ChildProfile {
  id: string;
  name: string;
  gradeId: string;
  avatar?: string;
}

/** What the child's device learns about itself. */
export interface ChildMe {
  child: ChildProfile;
  /** False until a parent's code was entered: the profile exists, but no household stands behind it. */
  linked: boolean;
  subscription: Pick<SubscriptionView, "status" | "active">;
  settings: ChildSettings;
}

/** A practice run held by the server: where the child is, and the questions. The questions
 *  include their answers — the server decides *which* questions a child gets (and refuses
 *  when the subscription ended); it does not yet hide answers. See architecture.md. */
export interface SessionView {
  sessionId: string;
  gradeId: string;
  topicId: string;
  title: string;
  difficulty: number | null;
  questions: import("../../data/curriculum").Question[];
  resume: { index: number; correctCount: number } | null;
}

export interface AnswerResult {
  /** Present for adaptive topics: the question the child sees next (index `answeredCount`),
   *  regenerated at the new difficulty. */
  nextQuestion: import("../../data/curriculum").Question | null;
  index: number;
  difficulty: number | null;
  /** The subscription ended mid-run: the answer was saved, no further question is given. */
  stopped: boolean;
}

/** The whole surface the screens talk to. Implemented by `httpApi.ts` (real server) and
 *  `localApi.ts` (the same service running in the browser, for the demo preview). */
export interface CloudApi {
  // ── parent
  parentHousehold(): Promise<HouseholdView>;
  parentDeleteChild(childId: string): Promise<HouseholdView>;
  /** The code children type in their own app to join this household. */
  parentChildCode(): Promise<{ code: string; expiresAt: string }>;
  parentDisconnectDevices(childId: string): Promise<HouseholdView>;
  /** A one-time code that moves this child's profile (progress included) to a new device. */
  parentDeviceCode(childId: string): Promise<{ code: string; expiresAt: string }>;
  parentInvite(): Promise<{ code: string; expiresAt: string }>;
  parentJoin(code: string): Promise<HouseholdView>;
  parentHistory(childId: string): Promise<HistoryEntry[]>;
  /** What a parent sees about one child: this week, per topic, and the latest practices. */
  parentProgress(childId: string): Promise<ProgressView>;
  /** Billing stub: no real payment — marks the next period as paid. Replaced by a real
   *  provider (Cardcom) later without touching the screens. */
  parentPay(): Promise<HouseholdView>;
  parentCancel(): Promise<HouseholdView>;
  // ── child
  /** The child makes their own profile (no parent involved yet). */
  childRegister(input: { name: string; gradeId: string; avatar?: string }): Promise<{ token: string; me: ChildMe }>;
  /** A new phone: the child types the code their parent made for them and gets their profile back. */
  childReconnect(code: string): Promise<{ token: string; me: ChildMe }>;
  /** The child types the parent's code: the profile joins the household. */
  childLink(code: string): Promise<ChildMe>;
  childMe(): Promise<ChildMe>;
  childSetSettings(settings: Partial<ChildSettings>): Promise<ChildSettings>;
  childStartSession(input: { gradeId: string; topicId: string; levelId?: string }): Promise<SessionView>;
  childAnswer(sessionId: string, correct: boolean): Promise<AnswerResult>;
  childFinish(sessionId: string): Promise<void>;
  childAbandon(sessionId: string): Promise<void>;
}
