import type { Question } from "./curriculum";

const STORAGE_KEY = "learn-math:interrupted-session";

/** A saved run is only offered back for 24 hours — see
 *  docs/features/resume-interrupted-practice/product-spec.md, "התיישנות": practice is a
 *  single-sitting activity, and resuming "question 8 of 20" days later feels like a
 *  non-sequitur rather than a continuation. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * A snapshot of an in-progress, not-yet-finished run — written after every answer, read
 * before a fresh run would otherwise start, cleared only when the run actually finishes.
 *
 * `questions` is the exact array the student was shown, not re-derived — so resuming never
 * regenerates anything (see docs/features/no-repeat-consecutive-questions/), and survives
 * content changing between app versions (see `loadInterruptedSession`'s validity checks).
 * `difficulty`/`streak` are present only for an adaptive topic; a level/style lesson has no
 * difficulty tier of its own to carry.
 */
export interface InterruptedSession {
  answeredCount: number;
  correctCount: number;
  questions: Question[];
  savedAt: number;
  difficulty?: number;
  streak?: number;
}

function keyFor(studentId: string, gradeId: string, topicId: string, lessonKey?: string): string {
  return `${studentId}:${gradeId}:${topicId}${lessonKey ? `:${lessonKey}` : ""}`;
}

/** Same guard as `adaptiveProgress.ts`/`progress.ts` — `localStorage` can throw in private
 *  mode, and losing a saved run is a small disappointment, not something worth taking the
 *  app down over. */
function readAll(): Record<string, InterruptedSession> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, InterruptedSession>) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, InterruptedSession>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

/**
 * The saved run for this student/grade/topic (and, for a level or style lesson,
 * `lessonKey` — its `id`), or `null` if there is none worth resuming.
 *
 * "Worth resuming" collapses several cases to the same `null`, deliberately — the caller
 * never has to tell them apart, only decide between "resume" and "start fresh":
 * - nothing was ever saved for this key;
 * - the saved run is older than `MAX_AGE_MS`;
 * - the saved run already answered every question (it reached the end but was interrupted
 *   before the transition to the result screen — there is no "next question" to resume
 *   into, see architecture.md's Edge Cases);
 * - (adaptive only) the topic's question count or difficulty range no longer matches what
 *   was saved — content changed between versions, and a half-matching snapshot is worse
 *   than starting over.
 *
 * `expectedQuestionCount`/`difficultyRange` are supplied by an adaptive caller only — a
 * level/style lesson's question array is already fixed content, nothing to validate against.
 */
export function loadInterruptedSession(
  studentId: string,
  gradeId: string,
  topicId: string,
  lessonKey?: string,
  adaptiveValidity?: { questionCount: number; minDifficulty: number; maxDifficulty: number },
): InterruptedSession | null {
  const rec = readAll()[keyFor(studentId, gradeId, topicId, lessonKey)];
  if (!rec) return null;
  if (Date.now() - rec.savedAt > MAX_AGE_MS) return null;
  if (rec.answeredCount >= rec.questions.length) return null;
  if (adaptiveValidity) {
    if (rec.questions.length !== adaptiveValidity.questionCount) return null;
    if (
      typeof rec.difficulty !== "number" ||
      rec.difficulty < adaptiveValidity.minDifficulty ||
      rec.difficulty > adaptiveValidity.maxDifficulty
    ) {
      return null;
    }
  }
  return rec;
}

export function saveInterruptedSession(
  studentId: string,
  gradeId: string,
  topicId: string,
  lessonKey: string | undefined,
  snapshot: Omit<InterruptedSession, "savedAt">,
): void {
  const all = readAll();
  all[keyFor(studentId, gradeId, topicId, lessonKey)] = { ...snapshot, savedAt: Date.now() };
  writeAll(all);
}

/** Only a normal finish clears this — leaving mid-practice must not, that is the entire
 *  point of this module. */
export function clearInterruptedSession(
  studentId: string,
  gradeId: string,
  topicId: string,
  lessonKey?: string,
): void {
  const all = readAll();
  delete all[keyFor(studentId, gradeId, topicId, lessonKey)];
  writeAll(all);
}

/** Deleting a student deletes every interrupted run they left behind — same no-undo rule
 *  as `adaptiveProgress.ts`'s `clearStudent`. Keys are `studentId:gradeId:topicId[:lessonKey]`
 *  (see `keyFor`), so this is every key whose prefix up to the first `:` matches. */
export function clearStudent(studentId: string): void {
  const all = readAll();
  const prefix = `${studentId}:`;
  for (const key of Object.keys(all)) {
    if (key.startsWith(prefix)) delete all[key];
  }
  writeAll(all);
}
