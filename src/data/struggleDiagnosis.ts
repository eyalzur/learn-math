import { grades } from "./curriculum";
import type { Topic } from "./curriculum";
import { historyFor } from "./progress";

/**
 * A topic the student has struggled with over time (not one bad question — a pattern
 * across several whole practices), for the "ההתקדמות שלי" screen
 * (docs/features/struggle-diagnosis/).
 */
export const STUCK_MIN_PRACTICES = 3;
export const STUCK_SCORE_THRESHOLD = 0.7;

export interface StuckTopic {
  topic: Topic;
  gradeId: string;
  topicTitle: string;
}

/** The student's last `STUCK_MIN_PRACTICES` practices of this topic, ordered oldest first,
 *  keyed by (gradeLabel, topicTitle) together — two same-named topics in different grades
 *  never mix into one streak. */
function recentRunsByTopic(studentId: string): Map<string, { gradeLabel: string; topicTitle: string; ratios: number[] }> {
  const runs = new Map<string, { gradeLabel: string; topicTitle: string; ratios: number[] }>();
  // historyFor() is newest-first; collecting up to STUCK_MIN_PRACTICES per key here means
  // each group ends up with its most recent practices, in newest-first order.
  for (const record of historyFor(studentId)) {
    if (!record.topicTitle) continue; // mixed-level grades record no topic title at all
    const key = `${record.gradeLabel}\u0000${record.topicTitle}`;
    const run = runs.get(key) ?? { gradeLabel: record.gradeLabel, topicTitle: record.topicTitle, ratios: [] };
    if (run.ratios.length < STUCK_MIN_PRACTICES) run.ratios.push(record.total > 0 ? record.correct / record.total : 0);
    runs.set(key, run);
  }
  return runs;
}

/** Topics where the student's last `STUCK_MIN_PRACTICES` practices were every one below
 *  `STUCK_SCORE_THRESHOLD`, most-recently-practiced topic first. A topic the content no
 *  longer has (renamed/removed since the record was saved) is silently skipped, not shown
 *  broken — same defensive stance `preferences.ts` already takes on a stale stored value. */
export function stuckTopicsFor(studentId: string): StuckTopic[] {
  const result: StuckTopic[] = [];
  for (const run of recentRunsByTopic(studentId).values()) {
    if (run.ratios.length < STUCK_MIN_PRACTICES) continue;
    if (!run.ratios.every((ratio) => ratio < STUCK_SCORE_THRESHOLD)) continue;

    const grade = grades.find((g) => g.label === run.gradeLabel);
    const topic = grade?.topicSets.find((t) => t.title === run.topicTitle);
    if (!grade || !topic) continue;

    result.push({ topic, gradeId: grade.id, topicTitle: run.topicTitle });
  }
  return result;
}
