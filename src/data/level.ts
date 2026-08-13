import type { Level, Question } from "./curriculum";

/**
 * Lives apart from curriculum.ts on purpose. Grade files call `level()` while
 * curriculum.ts imports those grade files, so keeping the helper here breaks what would
 * otherwise be a circular import — one that fails at runtime, not at compile time, with
 * "Cannot access 'LEVEL_META' before initialization".
 *
 * The type import above is erased at build time, so it adds no runtime edge.
 */
const LEVEL_META = {
  easy: { title: "קל", description: "להתחלה בטוחה" },
  medium: { title: "בינוני", description: "כשכבר יודעים את הבסיס" },
  hard: { title: "מתקדם", description: "לאתגר אמיתי" },
} as const;

export function level(id: Level["id"], questions: Question[]): Level {
  return { id, ...LEVEL_META[id], questions };
}
