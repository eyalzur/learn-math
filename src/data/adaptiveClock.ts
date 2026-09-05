import type { Question } from "./curriculum";

/**
 * "שעון וזמן", built at runtime instead of only the 30 written questions in `grade2.ts`.
 * Three difficulty tiers, one per written bucket: a round-hour reading, a half-hour
 * reading, and an elapsed-time question between two clocks.
 *
 * Every `id` this generates encodes the time(s) it draws, in the exact shape
 * `clockFace.ts` (`src/data/clockFace.ts`) parses back out — see that file's own comment
 * for why the time lives in `id` rather than `prompt`. Getting this wrong here means a
 * question with no picture at all, not just a missing hint — see this feature's
 * architecture.md, "Edge Cases".
 */

type Rng = () => number;

function randInt(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

const HOUR_WORDS = [
  "",
  "אחת",
  "שתיים",
  "שלוש",
  "ארבע",
  "חמש",
  "שש",
  "שבע",
  "שמונה",
  "תשע",
  "עשר",
  "אחת עשרה",
  "שתים עשרה",
];

function hourWord(hour: number): string {
  return HOUR_WORDS[hour] ?? String(hour);
}

const EASY_ANALOGIES = [
  (hour: number) => `בשעה ${hourWord(hour)} בדיוק, השיעור שלך מתחיל`,
  (hour: number) => `בשעה ${hourWord(hour)} בדיוק, את/ה יוצא/ת מהבית`,
  (hour: number) => `כשהמחוגים נראים ככה, השעון שעל הקיר בכיתה מראה ${hourWord(hour)}`,
];

const MEDIUM_ANALOGIES = [
  (hour: number) => `ההפסקה מתחילה חצי שעה אחרי ${hourWord(hour)}`,
  (hour: number) => `חצי שעה אחרי ${hourWord(hour)}, האוטובוס יוצא`,
  (hour: number) => `חצי שעה אחרי ${hourWord(hour)}, מתחילה הצגה`,
];

const DURATION_ANALOGIES = [
  () => `כך משך זמן פעילות אחת נראה על שני שעונים - שעת התחלה ושעת סיום`,
  () => `זה בדיוק כמה זמן ארכה נסיעה - משעת היציאה עד שעת ההגעה`,
  () => `זה בדיוק כמה זמן נמשך שיעור - משעת ההתחלה עד שעת הסיום`,
];

function makeQuestion(id: string, prompt: string, answer: number, hints: [string, string], steps: { label: string; math?: string }[], analogy: string): Question {
  return { id, topic: "שעון וזמן", style: "clock", prompt, answer, hints, steps, analogy };
}

/** Tier 1 — a round hour: minute hand on the 12, the exact shape of the written `e1..e10`. */
function roundHour(rng: Rng): Question {
  const hour = randInt(1, 12, rng);
  return makeQuestion(
    `g2-clock-easy-h${hour}-${Math.floor(rng() * 1e9)}`,
    "איזו שעה מראה השעון?",
    hour,
    ["מחוג השעות הוא הקצר מבין השניים", "לאן מצביע המחוג הקצר?"],
    [{ label: `מחוג הדקות (הארוך) מצביע על ה-12, ומחוג השעות (הקצר) מצביע ישר על ${hourWord(hour)} - זו שעה עגולה` }],
    pick(EASY_ANALOGIES, rng)(hour),
  );
}

/** Tier 2 — a half hour: minute hand on the 6, hour hand exactly between two numbers —
 *  the shape of the written `m1..m10`. */
function halfHour(rng: Rng): Question {
  const hour = randInt(1, 12, rng);
  return makeQuestion(
    `g2-clock-medium-h${hour}-${Math.floor(rng() * 1e9)}`,
    "השעון מראה חצי שעה אחרי איזו שעה?",
    hour,
    // "שש" spelled out, not "6": this tier's hour can itself be 6, and a bare `6` in a
    // hint would then hand over the answer.
    ["כשהמחוג הארוך מצביע למטה, על השש בשעון, זו חצי שעה", "המחוג הקצר נמצא בדרך בין שני מספרים - הוא כבר עבר איזה מספר?"],
    // "השש", not "6": a bare digit immediately before the dash reads as subtraction to
    // the "keeps arithmetic out of the prose field" rule ("6 - זו" parses as "6 −").
    [{ label: `מחוג הדקות (הארוך) על השש בשעון, זו חצי שעה. מחוג השעות (הקצר) נמצא באמצע, כי עברה השעה ${hourWord(hour)} וטרם הגיעה השעה הבאה` }],
    pick(MEDIUM_ANALOGIES, rng)(hour),
  );
}

/** Tier 3 (hardest) — elapsed time between a start and end clock, always a multiple of
 *  30 minutes, wrapping past 12 the way a real clock does — the shape of the written
 *  `h1..h10`. */
function duration(rng: Rng): Question {
  const startHour = randInt(1, 12, rng);
  const startMinute: 0 | 30 = pick([0, 30] as const, rng);
  const halfHoursElapsed = randInt(1, 4, rng); // 30 to 120 minutes
  const totalMinutes = startHour * 60 + startMinute + halfHoursElapsed * 30;
  const endHourRaw = Math.floor(totalMinutes / 60) % 12;
  const endHour = endHourRaw === 0 ? 12 : endHourRaw;
  const endMinute: 0 | 30 = (totalMinutes % 60) as 0 | 30;
  const elapsedMinutes = halfHoursElapsed * 30;
  return makeQuestion(
    `g2-clock-hard-h${startHour}m${startMinute}-h${endHour}m${endMinute}-${Math.floor(rng() * 1e9)}`,
    "כמה דקות עברו מההתחלה עד הסיום?",
    elapsedMinutes,
    // Spelled out, not digits: `60`/`30` would equal the answer itself on exactly those
    // elapsed times (this tier only ever produces 30/60/90/120), tripping the
    // hint-hands-over-the-answer rule. Words sidestep it instead of exempting it.
    ["סופרים כמה זמן עבר בין שתי השעות", "כל שעה שלמה היא שישים דקות, וכל חצי שעה היא שלושים דקות"],
    [
      { label: `בהתחלה השעון מראה ${hourWord(startHour)}${startMinute === 30 ? " וחצי" : ""}` },
      { label: `בסיום השעון מראה ${hourWord(endHour)}${endMinute === 30 ? " וחצי" : ""}` },
      { label: "וביחד עברו:", math: `${elapsedMinutes / 30} × 30 = ${elapsedMinutes}` },
    ],
    pick(DURATION_ANALOGIES, rng)(),
  );
}

/**
 * Three difficulty tiers, one per written bucket — the same count and reasoning as
 * `adaptiveMulDiv.ts`: three distinct patterns in the reviewed content, not a number
 * chosen to match another topic.
 */
export function generateClockQuestion(difficulty: number, rng: Rng = Math.random): Question {
  switch (Math.min(3, Math.max(1, Math.round(difficulty)))) {
    case 1:
      return roundHour(rng);
    case 2:
      return halfHour(rng);
    default:
      return duration(rng);
  }
}

export const CLOCK_MIN_DIFFICULTY = 1;
export const CLOCK_MAX_DIFFICULTY = 3;
export const CLOCK_INITIAL_DIFFICULTY = 1;
export const CLOCK_QUESTION_COUNT = 20;

/**
 * Same pace as every other adaptive topic — two in a row before pushing harder, one wrong
 * answer backs off immediately.
 */
export function nextClockDifficulty(current: number, wasCorrect: boolean, streak: number): number {
  if (!wasCorrect) return Math.max(CLOCK_MIN_DIFFICULTY, current - 1);
  return streak >= 2 ? Math.min(CLOCK_MAX_DIFFICULTY, current + 1) : current;
}
