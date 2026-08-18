import type { Question } from "./curriculum";
import { bareExpression } from "./expression";

/**
 * What a wrong answer says about the thinking behind it.
 *
 * "איזה מספר בא אחרי 12?" answered `3` is not a random miss — it says the 12 was read as
 * a 2. A teacher sees that instantly and talks about it; the app used to announce "the
 * answer is 13" and move on, which addresses a question the student never asked.
 *
 * Type-only import of `Question` on purpose: it is erased at compile time, so it cannot
 * form a runtime cycle. Nothing under src/data imports this module — the only caller is
 * the practice screen. That is the same cycle that once turned the whole app into a white
 * screen (`grade1.ts` → `curriculum.ts` → `grade1.ts`), avoided here by construction
 * rather than discovered later.
 */
export interface Diagnosis {
  /** Which pattern matched. Not shown — it is what tests and bug reports can name. */
  id:
    | "sign"
    | "operation"
    | "decimalPoint"
    | "reversed"
    | "tens"
    | "offByOneSequence"
    | "offByOneSum";
  /** Replaces the "wrong, the answer is X" line. */
  headline: string;
  /**
   * The interactive follow-up — one small question isolating the misunderstanding, never
   * the original question. Present for every pattern except the two off-by-one ones,
   * which reuse the standard "how to solve" explanation instead of asking anything (see
   * docs/features/offbyone-diagnosis-method): a nested object rather than four separate
   * optional fields, so "a question with no answer" cannot be represented at all.
   */
  followUp?: {
    question: string;
    answer: number;
    onRight: string;
    onWrong: string;
  };
}

const isInteger = (n: number) => Number.isInteger(n);

/** The first two-digit number written in the question itself. */
function twoDigitInPrompt(prompt: string): number | null {
  const found = prompt.match(/\d+/g)?.map(Number).find((n) => n >= 10 && n <= 99);
  return found ?? null;
}

/**
 * Whether counting along a sequence is how you get to this answer — "מה בא אחרי/לפני X".
 *
 * One half of the old `isCounted` guard, split so each counting method can be named on
 * its own (see docs/features/offbyone-diagnosis-method). Distance of one is not by itself
 * evidence of anything — "כמה זה רבע מ-20" answered `6` is one away from `5` and is not a
 * counting slip in any sense: a child who cannot yet divide by four has not miscounted,
 * and being told "כמעט!" confirms a method she does not have. Nothing about a decimal is
 * counted either: "7.5 − 2.5" answered `6` is one away from `5`, but nobody counts back
 * two and a half on their fingers.
 */
function isSequenceQuestion(question: Question): boolean {
  return Number.isInteger(question.answer) && /בא אחרי|בא לפני/.test(question.prompt);
}

/**
 * Whether a small enough sum or difference is how you get to this answer — reachable on
 * fingers, the other half of the old `isCounted` guard. Mutually exclusive with
 * `isSequenceQuestion` in practice: every question in the app is either a Hebrew sentence
 * asking what comes next, or a bare arithmetic expression, never both at once.
 */
function isSumQuestion(question: Question): boolean {
  if (!Number.isInteger(question.answer)) return false;
  const expr = bareExpression(question.prompt);
  return (
    expr !== null &&
    (expr.op === "+" || expr.op === "-") &&
    Number.isInteger(expr.a) &&
    Number.isInteger(expr.b)
  );
}

/**
 * The significant digits of a number, with the point taken out: `0.6` and `6` both give
 * "6". Two numbers that share this and differ in value are the same digits with the
 * point in a different place.
 */
function digitsOf(n: number): string {
  return String(Math.abs(n)).replace(".", "").replace(/^0+/, "") || "0";
}

/** Whether a decimal point is even in play — nothing to lose without one. */
function involvesDecimals(question: Question): boolean {
  return question.prompt.includes(".") || !Number.isInteger(question.answer);
}

type Pattern = (question: Question, given: number) => Diagnosis | null;

/**
 * Ordered most specific first, and the order is the whole design.
 *
 * `diagnose` returns the first pattern that matches, so a pattern placed too early starts
 * explaining answers that a later, better pattern would have explained correctly. The
 * spec is explicit that a wrong diagnosis is worse than none: telling a seven-year-old
 * "you missed the tens" when she did not teaches her something false about her own
 * thinking, and at that age it sticks.
 *
 * Detection and wording live together in one entry rather than in a rules table plus a
 * strings table. Split across two files they drift apart the first time someone edits
 * only one of them.
 */
const PATTERNS: Pattern[] = [
  // 1. The sign flipped. An exact negation leaves no room for interpretation, which is
  //    why it goes first. Grade 8 territory — this is the pattern that carries the
  //    feature beyond grade 1 arithmetic.
  (question, given) => {
    const correct = question.answer;
    if (correct === 0 || given !== -correct) return null;
    return {
      id: "sign",
      // Written in logical order, never pre-flipped to "look right" in an RTL line.
      // Isolation puts it on screen correctly; hand-reversing it is how this bug returns.
      headline: "רגע — הסימן התהפך",
      followUp: {
        question: "כמה זה `-3 × 2`?",
        answer: -6,
        onRight: "נכון",
        onWrong: "מינוס כפול פלוס נותן מינוס",
      },
    };
  },

  // 2. The opposite operation. Matching both the operator and the operands is a strong
  //    signal; a word problem is not parsed at all, and not catching it is the right
  //    outcome — better silent than guessing.
  (question, given) => {
    const expr = bareExpression(question.prompt);
    if (!expr || !isInteger(given)) return null;
    const { a, op, b } = expr;
    const opposite =
      op === "+" ? a - b
      : op === "-" ? a + b
      : op === "×" ? (b === 0 ? null : a / b)
      : b === 0 ? null
      : a * b;
    if (opposite === null || given !== opposite) return null;

    // The follow-up has to be answerable in a number field, which rules out the "is this
    // a plus or a minus?" phrasing the design first carried. A tiny sum of the operation
    // they skipped isolates the same misunderstanding and can actually be typed.
    const added = op === "+";
    return {
      id: "operation",
      headline: added ? "רגע — נראה שחיסרת במקום לחבר" : "רגע — נראה שחיברת במקום לחסר",
      followUp: {
        question: added ? "כמה זה `2 + 3`?" : "כמה זה `5 − 3`?",
        answer: added ? 5 : 2,
        onRight: added ? "נכון, כאן מחברים" : "נכון, כאן מחסרים",
        onWrong: added ? "זה `5`. כאן מחברים" : "זה `2`. כאן מחסרים",
      },
    };
  },

  // 3. The digits are right; the decimal point is not.
  //
  //    Reported from the live app: "0.4 + 0.2" answered `6`. That is not a wrong sum — it
  //    is the *right* sum with the point dropped. She added four tenths and two tenths,
  //    got six, and wrote six wholes. Announcing "the answer is 0.6" answers a question
  //    she did not ask; she already had the six.
  //
  //    The signature is exact rather than interpreted: strip the point from both numbers
  //    and the digits match, while the values do not. That is an arithmetic identity, so
  //    this pattern never guesses.
  //
  //    What it teaches is the user's correction, in his words: "להגיד מה גדול יותר לא
  //    עוזר לילד" — she already knows six is more than six tenths. The lesson is the
  //    habit she skipped: we added numbers smaller than one, so the result cannot be that
  //    big, and six is six whole things. Check the size of an answer before finishing.
  //    So the follow-up asks for the size, explicitly without computing.
  (question, given) => {
    const correct = question.answer;
    if (!Number.isFinite(given) || given === correct || correct === 0) return null;
    if (!involvesDecimals(question)) return null;
    if (digitsOf(given) !== digitsOf(correct)) return null;

    const expr = bareExpression(question.prompt);
    // The follow-up is built from the first operand, so without one there is no question
    // to ask — and a word problem is not parsed here anyway.
    if (!expr) return null;
    const firstInAgorot = Math.round(expr.a * 100);
    const answerInAgorot = Math.round(correct * 100);
    // Agora only divide a shekel a hundred ways; anything finer is not money.
    if (Math.abs(expr.a * 100 - firstInAgorot) > 1e-9) return null;

    // The case the user described: adding two numbers each below one. Naming that out
    // loud is the concrete version of "the result cannot be that big".
    const bothUnderOne = expr.op === "+" && Math.abs(expr.a) < 1 && Math.abs(expr.b) < 1;
    const tooBig = Math.abs(given) > Math.abs(correct);
    const factor = Math.round(
      tooBig ? Math.abs(given) / Math.abs(correct) : Math.abs(correct) / Math.abs(given),
    );

    return {
      id: "decimalPoint",
      // Credits the arithmetic she got right, then points at the size — never at the
      // point itself, which is the symptom rather than the habit.
      headline: bothUnderOne
        ? `רגע — הספרות נכונות. אבל \`${expr.a}\` ו-\`${expr.b}\` שניהם קטנים מ-\`1\`, ולכן לא יכולים לתת \`${given}\``
        : `רגע — הספרות נכונות, אבל \`${given}\` ${tooBig ? "גדול" : "קטן"} פי \`${factor}\` מהתשובה`,
      followUp: {
        // Answerable by the child who just got it wrong — that is the whole bar. Asking
        // her to estimate without computing demanded the very skill she was missing.
        // Converting one shekel amount to agora is something she can simply do, and it
        // is the place-value insight itself: forty agora are not forty shekels.
        question: `\`${expr.a}\` שקל — כמה אגורות זה?`,
        answer: firstInAgorot,
        onRight: `נכון. והתשובה יוצאת \`${answerInAgorot}\` אגורות — כלומר \`${correct}\` שקל, לא \`${given}\``,
        onWrong: `\`${firstInAgorot}\` אגורות. והתשובה יוצאת \`${answerInAgorot}\` אגורות — כלומר \`${correct}\` שקל`,
      },
    };
  },

  // 4. The digits came out backwards. Both sides must be at least two digits: without
  //    that guard, answering `1` where `10` was wanted would be called a reversal, when
  //    it is far more likely to be something else entirely.
  (question, given) => {
    const correct = question.answer;
    if (!isInteger(correct) || !isInteger(given)) return null;
    if (correct < 10 || given < 10) return null;
    if (String(given) !== [...String(correct)].reverse().join("")) return null;
    return {
      id: "reversed",
      headline: `רגע — כתבת \`${given}\`, אלו אותן ספרות בסדר הפוך`,
      followUp: {
        question: `מה גדול יותר, \`${correct}\` או \`${given}\`?`,
        answer: Math.max(correct, given),
        onRight: "נכון. הסדר של הספרות משנה",
        onWrong: `\`${Math.max(correct, given)}\` גדול יותר. הסדר משנה`,
      },
    };
  },

  // 5. The tens were not read.
  //
  //    The tell is not that the answer equals a digit in the question — it is that the
  //    answer is what you get by doing the question right on a number read wrong. "What
  //    comes after 12" answered `3` is `13` with its ten stripped off, and `12 + 5`
  //    answered `7` is `17` with the same ten missing. So the test is against the correct
  //    answer's units, not the question's.
  //
  //    The two-digit number still has to appear *in the question*, because the wording
  //    names it ("you read 2 instead of 12") — and because without one there were no tens
  //    to miss. "8 + 5" answered `3` is a different mistake entirely, and this pattern
  //    correctly stays quiet about it.
  (question, given) => {
    const correct = question.answer;
    if (!isInteger(correct) || !isInteger(given) || correct < 10) return null;
    if (given !== correct % 10) return null;
    const written = twoDigitInPrompt(question.prompt);
    if (written === null) return null;
    const units = written % 10;
    return {
      id: "tens",
      headline: `רגע — נראה שקראת \`${units}\` במקום \`${written}\``,
      followUp: {
        question: `כמה זה \`${written - units} + ${units}\`?`,
        answer: written,
        onRight: `בדיוק! זה \`${written}\`, לא \`${units}\``,
        onWrong: `זה \`${written}\`. בואי נראה יחד`,
      },
    };
  },

  // 6/7. Off by one. Last, always. It is the only pair of patterns that can land on a
  //    guess that happened to fall nearby, so they may only speak once every structural
  //    pattern above has declined — never as the explanation for an answer that has a
  //    better one.
  //
  //    Narrowed the same way the original single pattern was, learned from one screenshot
  //    of "כמה זה רבע מ-20?" answered `6`: `isSequenceQuestion`/`isSumQuestion` keep this
  //    to questions a counting slip can actually explain. Nearness is not evidence on its
  //    own, and on a fraction question this pattern was speaking about a mistake that was
  //    not there.
  //
  //    No `followUp` on either — see docs/features/offbyone-diagnosis-method. A follow-up
  //    built from the wrong answer ("כמה זה `89 − 1`?") was reported as unrelated and
  //    unteaching; the standard "how to solve" explanation already opens with the general
  //    rule and then applies it to the real numbers of the missed question ("אחרי כל מספר
  //    בא המספר שגדול ממנו באחד" → "`12 + 1 = 13`"), which is exactly what was asked for,
  //    with nothing new to write. `Practice.tsx` reveals it immediately when `followUp` is
  //    absent instead of waiting on a conversation that no longer exists.
  //
  //    Split in two because the method each teaches is different: counting one step along
  //    a sequence is not the same method as redoing a whole addition or subtraction, so a
  //    single generic pattern could not have named the right one — the split is what lets
  //    each side of `isCounted`'s old guard keep its own identity in a bug report.
  //
  //    Direction is still part of the mistake, not a detail of it. One too many and one
  //    too few are different errors, but neither needs stating in a follow-up question
  //    anymore — the headline already names which one happened.
  (question, given) => {
    const correct = question.answer;
    if (!isInteger(correct) || !isInteger(given)) return null;
    if (Math.abs(given - correct) !== 1) return null;
    if (!isSequenceQuestion(question)) return null;
    const short = given < correct;
    return {
      id: "offByOneSequence",
      headline: short ? "כמעט! חסר בדיוק אחד" : "כמעט! זה אחד יותר מדי",
    };
  },
  (question, given) => {
    const correct = question.answer;
    if (!isInteger(correct) || !isInteger(given)) return null;
    if (Math.abs(given - correct) !== 1) return null;
    if (!isSumQuestion(question)) return null;
    const short = given < correct;
    return {
      id: "offByOneSum",
      headline: short ? "כמעט! חסר בדיוק אחד" : "כמעט! זה אחד יותר מדי",
    };
  },
];

/**
 * The mistake behind a wrong answer, or null when nothing describes it confidently.
 *
 * Null is the common case and the safe one: the screen then shows exactly what it showed
 * before this feature existed.
 */
export function diagnose(question: Question, given: number): Diagnosis | null {
  if (!Number.isFinite(given) || given === question.answer) return null;
  for (const pattern of PATTERNS) {
    const found = pattern(question, given);
    if (found) return found;
  }
  return null;
}
