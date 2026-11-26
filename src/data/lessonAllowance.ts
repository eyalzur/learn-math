/**
 * Weekly lesson allowance — see docs/features/weekly-lesson-cap/.
 *
 * One "lesson" = one finished practice (a `PracticeRecord`), so usage is *derived* from the
 * history that already exists rather than counted separately: there is no second counter
 * that could drift from the journal. Only the purchased extras need storage of their own,
 * and they are one household-wide pool (bought once, any student draws from it after their
 * own free weekly lessons are used).
 *
 * Everything the UI needs goes through `LessonAllowanceStore`, so a server (and real
 * payment) can replace the localStorage implementation without touching a component.
 */
import { allHistory } from "./progress";

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
  /** Lessons the student can still start this week: their own free ones left plus what is
   *  left of the household's shared extras pool (never negative). */
  remaining(studentId: string): number;
  /** Adds the pack's lessons to the household pool for the current week (all students
   *  draw from it). Unknown pack ids are ignored. */
  grantPack(packId: string): void;
}

const STORAGE_KEY = "learn-math:lessons-pool";

interface Pool {
  /** The `weekKey` the extras belong to; extras of any other week have expired. */
  week: string;
  extra: number;
}

function readPool(): Pool | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Pool> | null;
    return parsed && typeof parsed.week === "string" && Number.isFinite(parsed.extra)
      ? { week: parsed.week, extra: Number(parsed.extra) }
      : null;
  } catch {
    return null;
  }
}

function writePool(pool: Pool): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pool));
  } catch {
    // ignore
  }
}

export const localStorageLessonAllowance: LessonAllowanceStore = {
  remaining(studentId) {
    const now = new Date();
    const since = weekStartDate(now).getTime();
    const free = freeLessonsPerWeek();
    // Each student spends their own free lessons first; whatever a student used beyond
    // that was drawn from the shared pool, whoever it was.
    const usedBy = new Map<string, number>();
    for (const r of allHistory()) {
      if (new Date(r.at).getTime() >= since) usedBy.set(r.studentId, (usedBy.get(r.studentId) ?? 0) + 1);
    }
    let drawn = 0;
    for (const used of usedBy.values()) drawn += Math.max(0, used - free);
    const pool = readPool();
    const extra = pool && pool.week === weekKey(now) ? pool.extra : 0;
    const freeLeft = Math.max(0, free - (usedBy.get(studentId) ?? 0));
    return freeLeft + Math.max(0, extra - drawn);
  },
  grantPack(packId) {
    const pack = LESSON_PACKS.find((p) => p.id === packId);
    if (!pack) return;
    const week = weekKey(new Date());
    const pool = readPool();
    writePool({ week, extra: (pool && pool.week === week ? pool.extra : 0) + pack.lessons });
  },
};

export const lessonAllowance: LessonAllowanceStore = localStorageLessonAllowance;

/** "נשארו 3 שיעורים" / "נשאר שיעור אחד" / "נגמרו שיעורים" — one wording for chip and dialog. */
export function lessonsLeftText(n: number): string {
  if (n <= 0) return "נגמרו שיעורים";
  if (n === 1) return "נשאר שיעור אחד";
  return `נשארו ${n} שיעורים`;
}
