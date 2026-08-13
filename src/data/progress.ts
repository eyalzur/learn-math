export interface PracticeRecord {
  /** ISO timestamp of when the practice was finished. */
  at: string;
  studentId: string;
  gradeLabel: string;
  /** Empty for grades that still practise from mixed levels. */
  topicTitle: string;
  levelTitle: string;
  correct: number;
  total: number;
}

const STORAGE_KEY = "learn-math:history";

/**
 * History lives in localStorage, which can throw in private mode. Losing a record is a
 * small disappointment; taking the app down mid-practice over it is not acceptable, so
 * every access is guarded and simply yields nothing on failure.
 */
function readAll(): PracticeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PracticeRecord[]) : [];
  } catch {
    return [];
  }
}

export function recordPractice(record: PracticeRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...readAll(), record]));
  } catch {
    // ignore
  }
}

/** One student's practices, newest first. */
export function historyFor(studentId: string): PracticeRecord[] {
  return readAll()
    .filter((record) => record.studentId === studentId)
    .reverse();
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)} · ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}
