/**
 * How fast adaptive difficulty climbs/drops — a per-student setting (see
 * `preferences.ts`) applied by every adaptive topic's `next*Difficulty` function
 * (docs/features/adaptive-pace-setting/).
 */
export type PaceLevel = "slow" | "medium" | "fast";

export interface PaceLevelOption {
  id: PaceLevel;
  label: string;
}

export const PACE_LEVELS: PaceLevelOption[] = [
  { id: "slow", label: "אטי" },
  { id: "medium", label: "בינוני" },
  { id: "fast", label: "מהיר" },
];

export const DEFAULT_PACE_LEVEL: PaceLevel = "medium";

const CORRECT_STREAK_NEEDED: Record<PaceLevel, number> = { slow: 4, medium: 2, fast: 1 };
const WRONG_STREAK_NEEDED: Record<PaceLevel, number> = { slow: 2, medium: 1, fast: 1 };

/**
 * `streak` is the run just closed: positive for N consecutive correct, negative for N
 * consecutive wrong (e.g. -2 = two wrong in a row). `medium`'s thresholds (2 correct /
 * 1 wrong) reproduce the old hardcoded behavior exactly, so a student who never opens
 * the pace setting sees nothing change.
 */
export function nextAdaptiveDifficulty(
  current: number,
  wasCorrect: boolean,
  streak: number,
  min: number,
  max: number,
  pace: PaceLevel,
): number {
  if (wasCorrect) {
    return streak >= CORRECT_STREAK_NEEDED[pace] ? Math.min(max, current + 1) : current;
  }
  return Math.abs(streak) >= WRONG_STREAK_NEEDED[pace] ? Math.max(min, current - 1) : current;
}
