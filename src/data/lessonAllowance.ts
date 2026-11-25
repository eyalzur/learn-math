/**
 * Weekly lesson allowance — see docs/features/weekly-lesson-cap/.
 *
 * One "lesson" = one finished practice (a `PracticeRecord`), so usage is *derived* from the
 * history that already exists rather than counted separately: there is no second counter
 * that could drift from the journal. Only the purchased extras need storage of their own.
 *
 * Everything the UI needs goes through `LessonAllowanceStore`, so a server (and real
 * payment) can replace the localStorage implementation without touching a component.
 */
import { historyFor } from "./progress";

/** Free lessons per student per week. The one number to change. */
export const FREE_LESSONS_PER_WEEK = 5;

export interface LessonPack {
  id: string;
  /** Lessons added to the current week. */
  lessons: number;
  /** 0 until a payment provider is wired in. */
  priceIls: number;
}

/** Adding 20 / 50 / 100 later is adding entries here — nothing else reads the length. */
export const LESSON_PACKS: LessonPack[] = [{ id: "extra-10", lessons: 10, priceIls: 0 }];

/** Test hook: a localStorage value here replaces the free allowance (e2e seeds a low one
 *  to exercise the cap). `VITE_FREE_LESSONS_PER_WEEK` does the same at build/dev-server
 *  level (the Playwright dev server sets it high so unrelated specs are never capped).
 *  Unset in production, where the constant above applies. */
export const FREE_LESSONS_OVERRIDE_KEY = "learn-math:free-lessons-override";

export function freeLessonsPerWeek(): number {
  try {
    const stored = localStorage.getItem(FREE_LESSONS_OVERRIDE_KEY);
    if (stored !== null && /^\d+$/.test(stored)) return Number(stored);
  } catch {
    // ignore
  }
  const fromEnv = import.meta.env.VITE_FREE_LESSONS_PER_WEEK;
  if (typeof fromEnv === "string" && /^\d+$/.test(fromEnv)) return Number(fromEnv);
  return FREE_LESSONS_PER_WEEK;
}

/** Local midnight of the Sunday that starts the (Israeli) week containing `date`. */
export function weekStartDate(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return start;
}

/** `YYYY-MM-DD` of that Sunday — the key an extras entry is valid for. */
export function weekKey(date: Date): string {
  const s = weekStartDate(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
}

export interface LessonAllowanceStore {
  /** Lessons the student can still start this week (never negative). */
  remaining(studentId: string): number;
  /** Adds the pack's lessons to the current week. Unknown pack ids are ignored. */
  grantPack(studentId: string, packId: string): void;
  /** Forgets a deleted student's purchases. */
  clearStudent(studentId: string): void;
}

const STORAGE_KEY = "learn-math:lessons";

interface Extras {
  /** The `weekKey` these extras belong to; extras of any other week have expired. */
  week: string;
  extra: number;
}

function readAll(): Record<string, Extras> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, Extras>)
      : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, Extras>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export const localStorageLessonAllowance: LessonAllowanceStore = {
  remaining(studentId) {
    const now = new Date();
    const since = weekStartDate(now).getTime();
    const used = historyFor(studentId).filter((r) => new Date(r.at).getTime() >= since).length;
    const entry = readAll()[studentId];
    const extra = entry && entry.week === weekKey(now) && Number.isFinite(entry.extra) ? entry.extra : 0;
    return Math.max(0, freeLessonsPerWeek() + extra - used);
  },
  grantPack(studentId, packId) {
    const pack = LESSON_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    const all = readAll();
    const week = weekKey(new Date());
    const current = all[studentId]?.week === week ? all[studentId].extra : 0;
    writeAll({ ...all, [studentId]: { week, extra: current + pack.lessons } });
  },
  clearStudent(studentId) {
    const all = readAll();
    delete all[studentId];
    writeAll(all);
  },
};

export const lessonAllowance: LessonAllowanceStore = localStorageLessonAllowance;
