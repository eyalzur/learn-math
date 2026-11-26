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

/** Grade-2 add/sub topics were renamed "עד 1000" → "עד 100" (docs/features/grade2-addsub-to-100).
 *  Records are keyed by title, so old ones are re-labelled on read — otherwise the stats
 *  table and struggle diagnosis would lose them. Stored data is rewritten on the next save. */
const RENAMED_TOPICS: Record<string, string> = {
  "חיבור עד 1000": "חיבור עד 100",
  "חיסור עד 1000": "חיסור עד 100",
};

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
    return Array.isArray(parsed)
      ? (parsed as PracticeRecord[]).map((record) => ({
          ...record,
          topicTitle: RENAMED_TOPICS[record.topicTitle] ?? record.topicTitle,
        }))
      : [];
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

/** Deleting a student deletes their saved progress with them — there is no undo, by
 *  design (see docs/features/manage-students/product-spec.md). */
export function clearStudent(studentId: string): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(readAll().filter((record) => record.studentId !== studentId)),
    );
  } catch {
    // ignore
  }
}

/** Every student's practices (oldest first) — for household-wide counts such as the shared
 *  extra-lessons pool (docs/features/weekly-lesson-cap). */
export function allHistory(): PracticeRecord[] {
  return readAll();
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

/**
 * How many of 3 stars a given accuracy earns — the same thresholds Result.tsx has always
 * used for a single finished session (≥80% → 3, ≥50% → 2, otherwise 1), shared here so a
 * cumulative view (TopicPicker, across every session ever) can't quietly drift from what
 * "3 stars" means there. `total === 0` is its own case — no practice yet, not a failing
 * grade — and returns 0, which callers treat as an empty/neutral state, not "0 stars
 * earned".
 */
export function starsForAccuracy(correct: number, total: number): 0 | 1 | 2 | 3 {
  if (total === 0) return 0;
  const percent = (correct / total) * 100;
  if (percent >= 80) return 3;
  if (percent >= 50) return 2;
  return 1;
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
