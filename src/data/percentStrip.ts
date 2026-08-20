import type { Question } from "./curriculum";

/**
 * A strip out of a hundred, read off the question itself — how much of it is coloured,
 * and, for a price that went up, how far the strip runs past the original amount.
 *
 * Five different sentences in the data reduce to only two pictures: an ordinary strip
 * filled up to some point, or a strip that keeps going past its own 100% mark. Built from
 * the prompt and shown only if it reproduces `question.answer`, the same rule as every
 * other shape here.
 *
 * Type-only import of `Question`: erased at compile time, so it cannot form a runtime
 * cycle. The practice screen is the only caller.
 */
export interface PercentStrip {
  /** The 100% reference amount. */
  base: number;
  /** How much of the strip is coloured, out of `base`. For a discount question this is
   *  the discount amount specifically, whichever the question actually asks for — the
   *  strip always shows both the discount and what's left, per the caption. */
  filled: number;
  /** Set only for a price increase: how far the bar extends past `base`. */
  extra?: number;
  /** Set only for the "X% of Y?" pattern — the reduced fraction of `X/100`. Determines
   *  how many equal parts the strip is drawn with, instead of fixed quarter-ticks.
   *  undefined for every other question shape (discount/increase/"what percent"), where
   *  the existing fixed quarter-ticks stay as they are. */
  numerator?: number;
  denominator?: number;
  caption: string;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function readShape(prompt: string): PercentStrip | null {
  let m: RegExpMatchArray | null;

  if ((m = prompt.match(/^כמה זה (\d+)% מ-(\d+)\?$/))) {
    const [rate, base] = [Number(m[1]), Number(m[2])];
    const filled = (base * rate) / 100;
    const g = gcd(rate, 100);
    const numerator = rate / g;
    const denominator = 100 / g;
    return {
      base,
      filled,
      numerator,
      denominator,
      // Describes the picture, not the result — "X% of Y" and where the colour sits, the
      // same way geometryShape.ts's captions say "the area is everything inside" rather
      // than stating a number. The strip already appears after a wrong answer, so this
      // caption sitting above the step-by-step explanation must not hand over the answer
      // before the reasoning that leads to it.
      caption: `\`${rate}%\` מ-\`${base}\` — הצבוע ברצועה`,
    };
  }

  // Two wordings for the same "how much was the discount" question — old and new, both
  // accepted so this module works whichever order #36 and #38 land in. New: "מחיר מעיל
  // הוא 200 שקלים, וקיבלת עליו הנחה של 15%." Old: "מחיר 200 שקלים בהנחה של 15%."
  if (
    (m =
      prompt.match(
        /^מחיר .+ הוא (\d+) שקלים, וקיבלת עלי(?:ו|ה|הן) הנחה של (\d+)%\. כמה שקלים הייתה ההנחה\?$/,
      ) ?? prompt.match(/^מחיר (\d+) שקלים בהנחה של (\d+)%\. כמה שקלים ההנחה\?$/))
  ) {
    const [base, rate] = [Number(m[1]), Number(m[2])];
    const discount = (base * rate) / 100;
    return {
      base,
      filled: discount,
      caption: `הנחה של \`${discount}\` מתוך \`${base}\` — ואחרי ההנחה משלמים \`${base - discount}\``,
    };
  }

  if (
    (m =
      prompt.match(
        /^מחיר .+ הוא (\d+) שקלים, וקיבלת עלי(?:ו|ה|הן) הנחה של (\d+)%\. כמה שקלים שילמת\?$/,
      ) ?? prompt.match(/^מחיר (\d+) שקלים בהנחה של (\d+)%\. כמה משלמים\?$/))
  ) {
    const [base, rate] = [Number(m[1]), Number(m[2])];
    const discount = (base * rate) / 100;
    return {
      base,
      filled: discount,
      caption: `הנחה של \`${discount}\` מתוך \`${base}\` — ואחרי ההנחה משלמים \`${base - discount}\``,
    };
  }

  if ((m = prompt.match(/^מחיר (\d+) שקלים עלה ב-(\d+)%\. מה המחיר החדש\?$/))) {
    const [base, rate] = [Number(m[1]), Number(m[2])];
    const extra = (base * rate) / 100;
    return {
      base,
      filled: base,
      extra,
      caption: `המחיר היה \`${base}\`, ועם התוספת של \`${extra}\` הוא עולה ל-\`${base + extra}\``,
    };
  }

  if ((m = prompt.match(/^(\d+) מתוך (\d+)\. כמה אחוזים זה\?$/))) {
    const [part, base] = [Number(m[1]), Number(m[2])];
    const percent = (part * 100) / base;
    return {
      base,
      filled: part,
      caption: `\`${part}\` מתוך \`${base}\` הם \`${percent}%\``,
    };
  }

  return null;
}

export function percentStrip(question: Question): PercentStrip | null {
  const shape = readShape(question.prompt);
  if (!shape) return null;

  const { base, filled, extra } = shape;
  if (!Number.isInteger(base) || !Number.isInteger(filled) || base <= 0 || filled < 0) return null;
  if (extra !== undefined && !Number.isInteger(extra)) return null;

  // The check with teeth. Four different things can be asked of the same strip: the new
  // total after a price increase, the percentage a coloured part comes to, what's left
  // after a discount, or the coloured amount itself — and only the prompt's own wording
  // says which. Two independent sources that can disagree.
  const expected =
    extra !== undefined
      ? base + extra
      : /כמה אחוזים/.test(question.prompt)
        ? (filled * 100) / base
        : /כמה משלמים|כמה שקלים שילמת/.test(question.prompt)
          ? base - filled
          : filled;

  if (expected !== question.answer) return null;

  return shape;
}
