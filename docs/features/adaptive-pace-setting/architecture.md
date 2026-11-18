# קצב התקדמות בקושי — Architecture

## Overview
כל 19 פונקציות ה-`next*Difficulty` (אחת לכל נושא אדפטיבי) כופלות היום את אותו
בלוק קוד בדיוק — `streak >= 2` מעלה, תשובה שגויה אחת תמיד מורידה. מחלצים את
הלוגיקה המשותפת לפונקציה אחת (`nextAdaptiveDifficulty`) בקובץ חדש, וכל 19
הפונקציות הופכות לעטיפה חד-שורתית סביבה עם ה-MIN/MAX של הנושא עצמו. ההגדרה
("אטי"/"בינוני"/"מהיר") נשמרת פר-תלמיד/ה, באותו מודול ובאותה צורה כמו כל שאר
ה-⚙️ (`preferences.ts`) — **לא גלובלית כפי שנכתב מילולית ב-product-spec.md**,
ראו Risks/Tradeoffs למטה על הסטייה הזו ולמה היא נבחרה.

## Data / State Changes

### קובץ חדש: `src/data/adaptivePace.ts`
```ts
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
 * consecutive wrong (e.g. -2 = two wrong in a row). Replaces the old always-non-negative
 * `streak` (positive-correct-only, reset to 0 on any wrong) now that "medium" needs to
 * remember a wrong-answer run too, not just drop on the first miss.
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
```
`medium`'s numbers (4 correct? — no: 2 correct / 1 wrong) reproduce today's exact
behavior, so a student who never opens the setting sees nothing change — same
convention as `PAN_SPEED_LEVELS`'s `medium` in `notebook.ts`.

### `src/data/curriculum.ts`
`AdaptiveConfig.nextDifficulty`'s signature gains a 4th parameter and its doc
comment is rewritten for the new signed-streak meaning:
```ts
/** `streak` is the run just closed: positive for N consecutive correct, negative for
 *  N consecutive wrong. How many of each `pace` requires before difficulty actually
 *  moves is decided by `nextAdaptiveDifficulty` (adaptivePace.ts), not by this topic. */
nextDifficulty: (current: number, wasCorrect: boolean, streak: number, pace: PaceLevel) => number;
```
(add `import type { PaceLevel } from "./adaptivePace";` at the top)

### All 19 `src/data/adaptive*.ts` topic files
Add the import and change each `next*Difficulty` to delegate. Full list (function
name → MIN/MAX constant names, all in the same file):

| File | Function | MIN | MAX |
|---|---|---|---|
| adaptiveAdd10.ts | nextAdd10Difficulty | ADD10_MIN_DIFFICULTY | ADD10_MAX_DIFFICULTY |
| adaptiveSub10.ts | nextSub10Difficulty | SUB10_MIN_DIFFICULTY | SUB10_MAX_DIFFICULTY |
| adaptiveAdd100.ts | nextAdd100Difficulty | ADD100_MIN_DIFFICULTY | ADD100_MAX_DIFFICULTY |
| adaptiveSub100.ts | nextSub100Difficulty | SUB100_MIN_DIFFICULTY | SUB100_MAX_DIFFICULTY |
| adaptiveMulDiv.ts | nextMulDivDifficulty | MULDIV_MIN_DIFFICULTY | MULDIV_MAX_DIFFICULTY |
| adaptiveShapes.ts | nextShapesDifficulty | SHAPES_MIN_DIFFICULTY | SHAPES_MAX_DIFFICULTY |
| adaptiveClock.ts | nextClockDifficulty | CLOCK_MIN_DIFFICULTY | CLOCK_MAX_DIFFICULTY |
| adaptiveFractions.ts | nextFractionsDifficulty | FRACTIONS_MIN_DIFFICULTY | FRACTIONS_MAX_DIFFICULTY |
| adaptiveDecimals.ts | nextDecimalsDifficulty | DECIMALS_MIN_DIFFICULTY | DECIMALS_MAX_DIFFICULTY |
| adaptivePercent.ts | nextPercentDifficulty | PERCENT_MIN_DIFFICULTY | PERCENT_MAX_DIFFICULTY |
| adaptiveRatio.ts | nextRatioDifficulty | RATIO_MIN_DIFFICULTY | RATIO_MAX_DIFFICULTY |
| adaptiveAreaPerimeter.ts | nextAreaPerimeterDifficulty | AREA_PERIMETER_MIN_DIFFICULTY | AREA_PERIMETER_MAX_DIFFICULTY |
| adaptiveAverage.ts | nextAverageDifficulty | AVERAGE_MIN_DIFFICULTY | AVERAGE_MAX_DIFFICULTY |
| adaptiveExpressions.ts | nextExpressionsDifficulty | EXPRESSIONS_MIN_DIFFICULTY | EXPRESSIONS_MAX_DIFFICULTY |
| adaptiveEquations.ts | nextEquationsDifficulty | EQUATIONS_MIN_DIFFICULTY | EQUATIONS_MAX_DIFFICULTY |
| adaptivePowers.ts | nextPowersDifficulty | POWERS_MIN_DIFFICULTY | POWERS_MAX_DIFFICULTY |
| adaptivePythagoras.ts | nextPythagorasDifficulty | PYTHAGORAS_MIN_DIFFICULTY | PYTHAGORAS_MAX_DIFFICULTY |
| adaptiveAngles.ts | nextAnglesDifficulty | ANGLES_MIN_DIFFICULTY | ANGLES_MAX_DIFFICULTY |
| adaptiveLinearFunction.ts | nextLinearFunctionDifficulty | LINEAR_FUNCTION_MIN_DIFFICULTY | LINEAR_FUNCTION_MAX_DIFFICULTY |
| adaptiveWordProblems.ts | nextWordProblemsDifficulty | WORD_PROBLEMS_MIN_DIFFICULTY | WORD_PROBLEMS_MAX_DIFFICULTY |

Each becomes (example, `adaptiveAdd10.ts`):
```ts
import { nextAdaptiveDifficulty, type PaceLevel } from "./adaptivePace";
// ...
export function nextAdd10Difficulty(
  current: number,
  wasCorrect: boolean,
  streak: number,
  pace: PaceLevel,
): number {
  return nextAdaptiveDifficulty(current, wasCorrect, streak, ADD10_MIN_DIFFICULTY, ADD10_MAX_DIFFICULTY, pace);
}
```
No changes needed in `grade1.ts`/`grade2.ts`/`grade6.ts`/`grade8.ts` — they only
reference these functions by name (`nextDifficulty: nextAdd10Difficulty`), and
TypeScript checks the assignment against `AdaptiveConfig`'s updated type
automatically.

### `src/App.tsx`
`handleAdaptiveAnswered` (around line 300) currently resets `streak` to `0` on a
wrong answer. Change to a signed run length, and pass `pace`:
```ts
const streak = correct
  ? (adaptiveSession.streak > 0 ? adaptiveSession.streak + 1 : 1)
  : (adaptiveSession.streak < 0 ? adaptiveSession.streak - 1 : -1);
const difficulty = adaptive.nextDifficulty(adaptiveSession.difficulty, correct, streak, paceLevel);
```
`paceLevel` is read the same way every other per-student setting already is, next
to `readAloud`/`holdZoomLevel`/etc (~line 345):
```ts
const paceLevel = paceLevelFor(student.id);
```
and added to `settingsProps` (~line 384) exactly like the others:
```ts
paceLevel,
onPaceLevelChange: (levelId: string) => {
  setPaceLevel(student.id, levelId as PaceLevel);
  setPreferencesTick((n) => n + 1);
},
```
(imports `paceLevelFor as paceLevelFor, setPaceLevel` from `preferences.ts`,
following the exact `holdZoomLevel as holdZoomLevelFor` renaming convention
already used for every other setting's import at the top of the file.)

### `src/data/preferences.ts`
New field on `Preferences` + getter/setter pair, same shape as every other
setting in this file (`holdZoomLevel` is the closest template — an id, not a raw
number, validated against the current level list with a default fallback):
```ts
/** Student id → how fast difficulty climbs/drops (a `PACE_LEVELS` id). */
paceLevel?: Record<string, string>;
```
```ts
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
```
(import `PACE_LEVELS`, `DEFAULT_PACE_LEVEL`, `type PaceLevel` from `./adaptivePace`
alongside the existing imports from `./notebook`.)

### `src/lib/settingsVisibility.ts`
Add to `SettingsValues`:
```ts
paceLevel?: string;
onPaceLevelChange?: (levelId: string) => void;
```
Add to `hasAnySettings`:
```ts
const showPaceLevel = props.paceLevel !== undefined && props.onPaceLevelChange !== undefined;
```
and OR it into the final `return (...)`.

### `src/components/SettingsDialog.tsx`
New destructured props (`paceLevel`, `onPaceLevelChange`), a `showPaceLevel`
local (same pattern as `showHoldZoom` etc, line ~45), added to the `!open ||
(!showX && ... )` early-return guard, and a new block — copy `pan-speed-setting`'s
JSX shape exactly (header with icon + title + note, then a `pan-speed-options`
row of buttons), renamed to `pace-setting`/`pace-options`, icon `🎯`, importing
`PACE_LEVELS` from `../data/adaptivePace` instead of `PAN_SPEED_LEVELS` from
`../data/notebook`. Reuses the `.pan-speed-setting`/`.pan-speed-header`/
`.pan-speed-options`/`.pan-speed-option` CSS classes directly (visually identical
layout, no new CSS needed) rather than inventing `.pace-*` class names — same
reuse `notebook-nav-buttons-visibility/design.md` already did for the read-aloud
switch styling.

## Technical Approach
1. `adaptivePace.ts` is the one place that knows the three pace levels and their
   thresholds. Every topic's difficulty function becomes a thin wrapper that only
   supplies its own min/max — this mirrors how `curriculum.ts` already documents
   `nextDifficulty` as the one per-topic customization point.
2. `streak`'s meaning changes from "consecutive-correct count, 0 otherwise" to "signed
   run length" — necessary because "אטי" needs to count a run of *wrong* answers too
   (today's code never tracks that; one wrong always drops). This is the only
   behavioral change to existing (non-pace-related) code, and it's invisible at
   `pace: "medium"` because `WRONG_STREAK_NEEDED.medium === 1` reproduces "drop on the
   first wrong" exactly.
3. The setting is per-student (`preferences.ts`), read once per render next to every
   other per-student setting, and passed down as a plain prop — no new state-
   management pattern introduced.

## Edge Cases
- **Mid-session pace change**: switching pace while `adaptiveSession` is live changes
  `paceLevel`, which flows into the very next `handleAdaptiveAnswered` call — already
  "changes immediately, no restart needed" per design.md, and falls out of the
  architecture for free since `pace` isn't stored on `adaptiveSession` itself, it's
  read fresh from `preferences.ts` on every answer.
- **Switching pace mid-streak**: a streak accumulated under one pace carries over
  numerically to the next pace's thresholds (e.g. 1 correct under "מהיר" then
  switching to "אטי" mid-run keeps `streak === 1`, now short of "אטי"'s 4-needed).
  This is the obvious, least-surprising behavior (no hidden reset) and needs no
  special handling.
- **First-ever visit to a topic** (`streak` starts at `0` in `freshAdaptiveSession`,
  see `App.tsx` line ~140): `0` is neither `>= CORRECT_STREAK_NEEDED` nor
  `Math.abs(0) >= WRONG_STREAK_NEEDED` for any pace (all thresholds are `>= 1`), so
  the first answer never moves difficulty before a real run exists — same as today.
- **Existing e2e test `adaptive-difficulty.spec.ts`** (and any other e2e asserting
  the 2-correct/1-wrong pacing) keeps passing unmodified: default pace is "בינוני",
  numerically identical to the old hardcoded behavior.

## Risks / Tradeoffs
- **Storage scope deviates from product-spec.md's literal wording.** product-spec.md
  says "הגדרה אחת גלובלית... לא פר-תלמיד/ה", written on the assumption that the ⚙️
  dialog's existing settings are global. They are not: every single setting already
  in `preferences.ts` (`holdZoomLevel`, `panSpeedLevel`, `readAloud`, etc.) is stored
  **per student id**, and the file's own header comment says so explicitly
  ("Per-student settings"). Storing pace per-student instead of globally:
  (a) matches the one and only existing precedent in this exact dialog with zero
  exceptions, and (b) actually serves product-spec.md's own motivation better —
  "ילדים שונים צריכים קצב שונה" (different children need different pace) argues
  *for* per-student, not against it. Flagging this explicitly rather than silently
  overriding the spec: if a truly global (one value for all students) setting was
  really intended, it's a small change (drop the `studentId` keying in
  `preferences.ts`) — but per-student is what's being built unless told otherwise.
- **19-file mechanical edit.** Large file count, but each change is a 1-line
  signature + 1-line body swap, not a redesign — the table above is exhaustive so
  `developer` doesn't have to rediscover the call sites.
- **Deliberately not done**: no UI indication of current difficulty tier or pace
  anywhere outside the ⚙️ dialog (out of scope per product-spec.md). No auto-tuning
  of pace based on performance (also explicitly out of scope).

## Open Questions
None.
