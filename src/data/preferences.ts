/**
 * Per-student settings.
 *
 * Deliberately not folded into `progress.ts`. That file is a journal — records accumulate,
 * are read back by student, and are never updated. A preference is the opposite: a single
 * value that gets overwritten. Sharing one array would force every history read to filter
 * out rows that are not practices, which looks cheap on the first day and is not.
 */
import { DEFAULT_PACE_LEVEL, PACE_LEVELS, type PaceLevel } from "./adaptivePace";

const STORAGE_KEY = "learn-math:preferences";

interface Preferences {
  /** Student id → read every new question aloud without being asked. */
  readAloud?: Record<string, boolean>;
  /** Student id → how fast adaptive difficulty climbs/drops (a `PACE_LEVELS` id). An id
   *  rather than the thresholds themselves, validated against the current list: a missing
   *  or stale value falls back to the default rather than propagating a level nothing can
   *  render as chosen. */
  paceLevel?: Record<string, string>;
  /** Student id → epoch ms until which "stop auto-read-aloud?" should not be asked again,
   *  set after any answer (yes or no) to that ask — see docs/features/
   *  ask-before-disabling-autoread/. Not a plain boolean "don't ask again": the whole
   *  point is that it expires, so the student is asked again if their situation changes. */
  autoReadPromptUntil?: Record<string, number>;
}

/** How long a "stop auto-read-aloud?" answer (yes or no, with or without the "don't ask
 *  again" checkbox) silences the next ask — see product-spec.md's acceptance criteria. */
const AUTO_READ_PROMPT_SUPPRESS_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * localStorage throws in private mode. Losing a setting is a small disappointment; taking
 * the app down over it is not, so every access is guarded — same rule as `progress.ts`.
 */
function readAll(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Preferences) : {};
  } catch {
    return {};
  }
}

/** Whether this student has questions read aloud automatically. Off unless turned on. */
export function readAloud(studentId: string): boolean {
  return readAll().readAloud?.[studentId] === true;
}

export function setReadAloud(studentId: string, value: boolean): void {
  try {
    const all = readAll();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...all, readAloud: { ...all.readAloud, [studentId]: value } }),
    );
  } catch {
    // ignore
  }
}

/** How fast adaptive difficulty climbs/drops for this student. Validated against the
 *  current list: a missing or stale value falls back to the default rather than
 *  propagating a level nothing can render as chosen. */
export function paceLevel(studentId: string): PaceLevel {
  const stored = readAll().paceLevel?.[studentId];
  return PACE_LEVELS.some((level) => level.id === stored) ? (stored as PaceLevel) : DEFAULT_PACE_LEVEL;
}

export function setPaceLevel(studentId: string, levelId: PaceLevel): void {
  try {
    const all = readAll();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...all, paceLevel: { ...all.paceLevel, [studentId]: levelId } }),
    );
  } catch {
    // ignore
  }
}

/** Whether this student already answered the "stop auto-read-aloud?" ask recently enough
 *  that it should stay quiet. `false` for a student who was never asked, or whose
 *  ~2-day window already ran out. */
export function isAutoReadPromptSuppressed(studentId: string): boolean {
  const until = readAll().autoReadPromptUntil?.[studentId];
  return typeof until === "number" && Date.now() < until;
}

/** Call once the student answers the "stop auto-read-aloud?" ask (yes or no) — starts a
 *  fresh ~2-day window before it can be asked again. */
export function suppressAutoReadPrompt(studentId: string): void {
  try {
    const all = readAll();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...all,
        autoReadPromptUntil: { ...all.autoReadPromptUntil, [studentId]: Date.now() + AUTO_READ_PROMPT_SUPPRESS_MS },
      }),
    );
  } catch {
    // ignore
  }
}
