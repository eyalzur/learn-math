export interface PracticeRecord {
  /** ISO timestamp of when the practice was finished. */
  at: string;
  studentId: string;
  gradeLabel: string;
  /** Empty for grades that still practise from mixed levels. */
  topicTitle: string;
  levelTitle: string;
  /** The adaptive difficulty tier reached, for a topic with no named level (`levelTitle`
   *  stays "" for those, unchanged from before this field existed — this is a separate
   *  field, not a replacement, so History's existing "topic · levelTitle" row rendering,
   *  which relies on an empty levelTitle to omit the separator, keeps working exactly as
   *  it does today). Absent for a non-adaptive (levelTitle-bearing) session, and for any
   *  record saved before this field existed — both cases just don't count toward
   *  `statsByDifficulty` below, which isn't a regression: there was no per-session
   *  difficulty data to show for them before either. */
  difficultyLabel?: string;
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

export interface StatsRow {
  label: string;
  correct: number;
  total: number;
}

/**
 * Cumulative success, grouped by topic, across every session this student has ever
 * finished — not just the current one. Derived from the same records `historyFor` already
 * reads, so there's no second write path and no new localStorage key: this is "how many of
 * the rows already in the log are for topic X", summed.
 */
export function statsByTopic(studentId: string): StatsRow[] {
  return groupAndSum(historyFor(studentId), (r) => (r.topicTitle ? [r.topicTitle] : []));
}

/**
 * Same idea as `statsByTopic`, grouped by difficulty instead — a session's `levelTitle`
 * when it has one, otherwise its `difficultyLabel` (set only for an adaptive topic, see
 * `PracticeRecord`). A record with neither (an older one, saved before `difficultyLabel`
 * existed, from a non-adaptive topic with no level either) contributes to no row here —
 * it still counts under `statsByTopic`.
 */
export function statsByDifficulty(studentId: string): StatsRow[] {
  return groupAndSum(historyFor(studentId), (r) => {
    const label = r.levelTitle || r.difficultyLabel;
    return label ? [label] : [];
  });
}

function groupAndSum(records: PracticeRecord[], keysFor: (r: PracticeRecord) => string[]): StatsRow[] {
  const byLabel = new Map<string, StatsRow>();
  for (const record of records) {
    for (const label of keysFor(record)) {
      const row = byLabel.get(label) ?? { label, correct: 0, total: 0 };
      row.correct += record.correct;
      row.total += record.total;
      byLabel.set(label, row);
    }
  }
  return [...byLabel.values()];
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)} · ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}
