const STORAGE_KEY = "learn-math:adaptive-tier";

function keyFor(studentId: string, gradeId: string, topicId: string): string {
  return `${studentId}:${gradeId}:${topicId}`;
}

/**
 * Same guard as `progress.ts`'s `readAll()` — `localStorage` can throw in private mode,
 * and losing the saved tier is a small disappointment, not something worth taking the app
 * down over.
 */
function readAll(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

/** The difficulty tier this student last reached in this topic, or `null` if there is
 *  none — first-ever visit, or history from before this feature existed. */
export function loadAdaptiveTier(studentId: string, gradeId: string, topicId: string): number | null {
  const value = readAll()[keyFor(studentId, gradeId, topicId)];
  return typeof value === "number" ? value : null;
}

export function saveAdaptiveTier(
  studentId: string,
  gradeId: string,
  topicId: string,
  difficulty: number,
): void {
  try {
    const all = readAll();
    all[keyFor(studentId, gradeId, topicId)] = difficulty;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}
