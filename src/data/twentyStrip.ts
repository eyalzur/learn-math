import type { Question } from "./curriculum";

/**
 * Twenty circles, some filled, the rest empty — for "how many do you add to N to reach
 * twenty?".
 *
 * The user's own words on seeing `כמה צריך להוסיף ל-13 כדי להגיע ל-20?` with no picture
 * at all: "צריך פה ציור של 20 כדורים, 13 צבועים ו-7 ריקים. קל יותר מאשר קופסאות שלא
 * מתאימות לפה."
 *
 * The first plan excluded these five questions from the ten-frame, and correctly — a box
 * of ten does not describe "how many are missing". The mistake was concluding from that
 * they get no picture. They get a different one.
 *
 * Separate module from `tenFrame.ts` on purpose, though the two serve the same topic and
 * the same thirty questions. They share a contract, not code: one extracts a two-digit
 * number and asks which side, this one extracts a target and subtracts. More to the
 * point, they have to be strangers so that a test can prove they are strangers — no
 * question may produce both.
 */
export interface TwentyStrip {
  /** How many of the twenty are filled — where the question starts from. */
  filled: number;
  /** The rest of the twenty. This is the answer, and that is the whole check. */
  empty: number;
  /** One line: the screen-reader description, and what the read-aloud says. */
  caption: string;
}

const TOTAL = 20;

export function twentyStrip(question: Question): TwentyStrip | null {
  const match = question.prompt.match(/כמה צריך להוסיף ל-(\d+) כדי להגיע ל-(\d+)/);
  if (!match) return null;

  const filled = Number(match[1]);
  const target = Number(match[2]);

  // The strip is twenty circles or it is not this picture.
  if (target !== TOTAL) return null;
  if (filled < 0 || filled >= TOTAL) return null;

  const empty = TOTAL - filled;

  // Built from the prompt, shown only if it reproduces the recorded answer. Two
  // independent sources that can disagree — the same check every other shape makes.
  if (empty !== question.answer) return null;

  return {
    filled,
    empty,
    caption: `מתוך \`${TOTAL}\` עיגולים, \`${filled}\` כבר צבועים — והריקים שנשארו הם \`${empty}\``,
  };
}
