/**
 * Turns a written arithmetic/algebra expression into fully-spelled-out Hebrew words —
 * numbers included, not just the operator symbols.
 *
 * This is deliberately a separate module from `speech.ts`. `speech.ts` owns *how* speech
 * is played (voices, pauses, cancellation); this module owns *what Hebrew text* a piece of
 * math turns into, which is a pure, easily-unit-tested question with no DOM/browser API in
 * sight — on purpose, so it can feed either the browser's `speechSynthesis` or a cloud TTS
 * call identically.
 *
 * Why this exists alongside the older `mathToWords` in speech.ts: that function only ever
 * swapped symbols for words (`+` → "ועוד") and left the digits as Arabic numerals — reading
 * digits aloud was left entirely to whatever TTS engine received the text. A real TTS
 * engine handles bare digits inconsistently (different engines, different locales, some
 * read "20" as "two zero"), and gives no control over the specific Hebrew grammatical form
 * (the counting form "שלוש" vs. the construct form "שלושה") that this app's own docs call
 * for. So this module spells every number out itself, in the exact form a Hebrew-speaking
 * child expects when reading arithmetic aloud — "שבע פחות שלוש שווה ארבע", not "7 - 3 = 4"
 * handed to an engine and hoped for the best.
 *
 * `speech.ts`'s `mathToWords` now delegates to `normalizeMathSpeech` here — see the comment
 * on that function for why nothing was kept duplicated.
 */

// ---------------------------------------------------------------------------------------
// Number words
// ---------------------------------------------------------------------------------------

/**
 * The "counting form" Hebrew uses for number words spoken on their own — "שלוש", "ארבע" —
 * as opposed to the construct/attributive form ("שלושה ילדים", "ארבעה תפוחים") used when a
 * number modifies a noun. Arithmetic read aloud uses the counting form: "שלוש ועוד ארבע",
 * never "שלושה ועוד ארבעה". This table is also the feminine form, which is what Hebrew
 * uses by default for a number named in isolation.
 */
const ONES_COUNTING: Record<number, string> = {
  0: "אפס",
  1: "אחת",
  2: "שתיים",
  3: "שלוש",
  4: "ארבע",
  5: "חמש",
  6: "שש",
  7: "שבע",
  8: "שמונה",
  9: "תשע",
};

/** 10–19, the counting form. 12 is "שתים עשרה", not "שתיים עשרה" — a real exception, not a typo. */
const TEENS_COUNTING: Record<number, string> = {
  10: "עשר",
  11: "אחת עשרה",
  12: "שתים עשרה",
  13: "שלוש עשרה",
  14: "ארבע עשרה",
  15: "חמש עשרה",
  16: "שש עשרה",
  17: "שבע עשרה",
  18: "שמונה עשרה",
  19: "תשע עשרה",
};

const TENS: Record<number, string> = {
  20: "עשרים",
  30: "שלושים",
  40: "ארבעים",
  50: "חמישים",
  60: "שישים",
  70: "שבעים",
  80: "שמונים",
  90: "תשעים",
};

const HUNDREDS: Record<number, string> = {
  1: "מאה",
  2: "מאתיים",
  3: "שלוש מאות",
  4: "ארבע מאות",
  5: "חמש מאות",
  6: "שש מאות",
  7: "שבע מאות",
  8: "שמונה מאות",
  9: "תשע מאות",
};

/**
 * The masculine "construct-adjacent" form used only for fraction numerator/denominator —
 * "שלושה חלקי ארבעה", never "שלוש חלקי ארבע". Deliberately a separate, small table rather
 * than a flag threaded through the counting-form table above: fractions are the one place
 * this app needs the other grammatical form, and keeping it local to `fractionWords` below
 * means nothing else can accidentally pick it up.
 */
const FRACTION_FORM: Record<number, string> = {
  1: "אחד",
  2: "שניים",
  3: "שלושה",
  4: "ארבעה",
  5: "חמישה",
  6: "שישה",
  7: "שבעה",
  8: "שמונה",
  9: "תשעה",
  10: "עשרה",
};

/**
 * The words for 0 ≤ n ≤ 99 as separate atoms, with no "ו" joined in yet — e.g. 23 is
 * `["עשרים", "שלוש"]`, not `"עשרים ושלוש"`. Kept apart from the "ו" itself so the caller
 * can decide, exactly once, where the one "ו" a whole number gets actually goes (see
 * `joinWithFinalVav`) — Hebrew places it immediately before the *last* word of the whole
 * number ("אלף מאתיים שלושים וארבע"), never before every intermediate group.
 */
function under100Atoms(n: number): string[] {
  if (n === 0) return [];
  if (n < 10) return [ONES_COUNTING[n]];
  if (n < 20) return [TEENS_COUNTING[n]];
  const tens = TENS[Math.floor(n / 10) * 10];
  const ones = n % 10;
  return ones === 0 ? [tens] : [tens, ONES_COUNTING[ones]];
}

/** Joins number-word atoms with the single "ו" Hebrew puts right before the last one —
 *  `["מאתיים", "שלושים", "ארבע"]` → "מאתיים שלושים וארבע", not "מאתיים ושלושים וארבע". */
function joinWithFinalVav(atoms: string[]): string {
  if (atoms.length === 0) return "";
  if (atoms.length === 1) return atoms[0];
  const last = atoms[atoms.length - 1];
  return `${atoms.slice(0, -1).join(" ")} ו${last}`;
}

/** 0 ≤ n ≤ 999, counting form. */
function wordsUnder1000(n: number): string {
  if (n === 0) return ONES_COUNTING[0];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const atoms = [...(hundreds > 0 ? [HUNDREDS[hundreds]] : []), ...under100Atoms(rest)];
  return joinWithFinalVav(atoms);
}

/**
 * 0 to at least 1,000,000 (and in practice beyond, via the same thousand/million grouping —
 * the "at least" in the brief is a floor, not a ceiling this stops at).
 *
 * Groups (millions / thousands / the final 0-999) are joined with a plain space, *not* a
 * cross-group "ו" — each group already carries its own correctly-placed "ו" internally
 * (via `joinWithFinalVav`), and Hebrew does not add another one between "אלף" and the
 * group after it: "אלף מאתיים שלושים וארבע", not "אלף ומאתיים ושלושים וארבע".
 */
function integerWords(n: number): string {
  if (n === 0) return ONES_COUNTING[0];
  if (n < 1000) return wordsUnder1000(n);

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (millions > 0) {
    parts.push(millions === 1 ? "מיליון" : `${wordsUnder1000(millions)} מיליון`);
  }
  if (thousands > 0) {
    if (thousands === 1) parts.push("אלף");
    else if (thousands === 2) parts.push("אלפיים");
    else parts.push(`${wordsUnder1000(thousands)} אלפים`);
  }
  if (rest > 0) parts.push(wordsUnder1000(rest));

  return parts.join(" ");
}

/** Each digit after the decimal point spoken on its own — the standard Hebrew convention
 *  for reading decimals aloud, and the only form that stays unambiguous past one digit
 *  ("3.14" is "שלוש נקודה אחת ארבע", never "שלוש נקודה ארבע עשרה"). */
function decimalDigitsWords(digits: string): string {
  return digits
    .split("")
    .map((d) => ONES_COUNTING[Number(d)])
    .join(" ");
}

/**
 * Parses a number written with an optional thousands separator (`,`) and an optional
 * decimal point, and speaks it in counting form. Does not handle a leading sign — that is
 * unary-minus territory, decided by the caller (`normalizeMathSpeech`) from surrounding
 * context, not by this function in isolation.
 */
function numberWords(raw: string): string {
  const cleaned = raw.replace(/,/g, "");
  const [intPart, decPart] = cleaned.split(".");
  const intWords = integerWords(Number(intPart || "0"));
  if (decPart === undefined) return intWords;
  return `${intWords} נקודה ${decimalDigitsWords(decPart)}`;
}

/**
 * "שלושה חלקי ארבעה" — the masculine fraction form, for numerator/denominator up to 10
 * (the table above). Outside that range, falls back to the ordinary counting form rather
 * than throwing: a slightly-off grammatical gender is a far smaller problem for a rare
 * large fraction than a crash or missing speech. Easy to extend — add more entries to
 * `FRACTION_FORM` above as real content needs them.
 */
function fractionWords(numerator: number, denominator: number): string {
  const num = FRACTION_FORM[numerator] ?? numberWords(String(numerator));
  const den = FRACTION_FORM[denominator] ?? numberWords(String(denominator));
  return `${num} חלקי ${den}`;
}

// ---------------------------------------------------------------------------------------
// The rule set
// ---------------------------------------------------------------------------------------

/**
 * One rule: recognize a token at the *start* of the remaining text and say what Hebrew it
 * produces. Rules are tried in order, first match wins, exactly like a hand-written
 * tokenizer — which is what this is. New symbols/operators are added by inserting one more
 * entry in `RULES` below; nothing else needs to change, which is the whole point of
 * keeping this a flat ordered list instead of one large regex.
 */
interface Rule {
  /** Must be anchored at the start (`^...`) — matched against the remaining text only. */
  pattern: RegExp;
  /** Returns the Hebrew words for this match, given the match and what comes right before
   *  (already-emitted words so far) and right after (the remaining text) it — enough
   *  context to decide things like unary vs. binary minus. */
  speak: (match: RegExpMatchArray, before: string, after: string) => string;
}

/** True when a minus at this point is the subtraction operator (binary), not a sign
 *  (unary) — i.e. there is a number or a closing paren immediately before it (ignoring
 *  whitespace). Everything else (start of string, after another operator, after an open
 *  paren) is unary: "-5", "3 + -5", "(-5". */
function isBinaryMinus(before: string): boolean {
  return /[\d)]\s*$/.test(before);
}

/** A tight fraction — "3/4" with no surrounding spaces — vs. an explicit division operator
 *  ("12 ÷ 4", or "12 / 4" with spaces). The former is read as a fraction in the masculine
 *  form; the latter as ordinary division in counting form. This mirrors how the two are
 *  actually written in this app's question data: a division *exercise* always has spaces
 *  around its operator, and a fraction never does. */
const TIGHT_FRACTION = /^(\d+)\/(\d+)/;

const NUMBER_PATTERN = /^\d[\d,]*(?:\.\d+)?/;

const RULES: Rule[] = [
  // Fractions before the generic division rule — "3/4" must not fall through to "/".
  {
    pattern: TIGHT_FRACTION,
    speak: (m) => fractionWords(Number(m[1]), Number(m[2])),
  },
  // Unary vs. binary minus. Tried before the plain "-" → "פחות" rule it would otherwise
  // also match, and before the number rule so "-5" is consumed as one unit.
  {
    pattern: /^-(\d[\d,]*(?:\.\d+)?)/,
    speak: (m, before) => {
      const digits = numberWords(m[1]);
      return isBinaryMinus(before) ? `פחות ${digits}` : `מינוס ${digits}`;
    },
  },
  { pattern: /^-(?!\d)/, speak: (_m, before) => (isBinaryMinus(before) ? "פחות" : "מינוס") },
  { pattern: /^−(\d[\d,]*(?:\.\d+)?)/, speak: (m) => `מינוס ${numberWords(m[1])}` }, // U+2212 is always a sign in this app's data, never typed as subtraction
  { pattern: /^−/, speak: (_m, before) => (isBinaryMinus(before) ? "פחות" : "מינוס") },

  // Implicit multiplication written as bare juxtaposition — "3x" (coefficient) or "3("
  // (distribution, e.g. the "3(x + 2)" pattern CLAUDE.md calls out for a display-direction
  // bug — here it is read aloud correctly from the start). Tried before the plain number
  // rule below, and only matches a single digit immediately followed by "x" or "(" — a
  // multi-digit coefficient like "12x" still reads as "שתים עשרה איקס" without the
  // "כפול" (a known, narrow gap; see architecture.md).
  { pattern: /^\d(?=[x(])/i, speak: (m) => `${numberWords(m[0])} כפול` },

  { pattern: NUMBER_PATTERN, speak: (m) => numberWords(m[0]) },

  { pattern: /^\+/, speak: () => "ועוד" },
  { pattern: /^[×*]/, speak: () => "כפול" },
  { pattern: /^÷/, speak: () => "חלקי" },
  // A lone "/" that didn't match the tight-fraction rule above is division with spacing.
  { pattern: /^\//, speak: () => "חלקי" },
  { pattern: /^≤/, speak: () => "קטן או שווה ל" },
  { pattern: /^≥/, speak: () => "גדול או שווה ל" },
  { pattern: /^</, speak: () => "קטן מ" },
  { pattern: /^>/, speak: () => "גדול מ" },
  { pattern: /^=/, speak: () => "שווה" },
  { pattern: /^%/, speak: () => "אחוז" },
  { pattern: /^\(/, speak: () => "סוגריים פותחים" },
  { pattern: /^\)/, speak: () => "סוגריים סוגרים" },

  // Exponent: "^3", or a superscript digit (already used elsewhere in this app's data).
  { pattern: /^\^(\d+)/, speak: (m) => `בחזקת ${numberWords(m[1])}` },
  { pattern: /^²/, speak: () => "בחזקת שתיים" },
  { pattern: /^³/, speak: () => "בחזקת שלוש" },

  // Root: "√9" → "שורש של תשע". The operand is whatever number/paren-group follows;
  // simplest correct handling is to say "שורש של" and let the next token(s) speak
  // themselves right after it, same as every other prefix operator here.
  { pattern: /^√/, speak: () => "שורש של" },

  // The algebra variable, never the multiplication sign: only a standalone letter, not one
  // glued to a digit (that "3x" case is the implicit-multiplication rule below).
  { pattern: /^x\b/i, speak: () => "איקס" },
];

/**
 * The heart of the task: turns a written math expression into the Hebrew words a child
 * should hear. Plain Hebrew text embedded in the input (e.g. a stray word, or already-
 * Hebrew punctuation) passes through completely unchanged — this function only ever
 * replaces the tokens it specifically recognizes (numbers, operators, parens, `x`); every
 * other character, including runs of Hebrew letters and spaces, is copied through as-is.
 */
export function normalizeMathSpeech(expression: string): string {
  let rest = expression;
  // The *raw source* already consumed — not the Hebrew produced from it. Rules like
  // unary-vs-binary minus need to know what character actually preceded them in the
  // original text ("7 − 3" vs "+ -3"); the Hebrew words so far ("שבע") don't end in a
  // digit even when a number came right before, so that check has to run against this,
  // never against `out`.
  let consumed = "";
  let out = "";

  while (rest.length > 0) {
    let matched = false;
    for (const rule of RULES) {
      const m = rest.match(rule.pattern);
      if (!m) continue;
      const after = rest.slice(m[0].length);
      const words = rule.speak(m, consumed, after);
      out += (out && !out.endsWith(" ") ? " " : "") + words;
      consumed += m[0];
      rest = after;
      matched = true;
      break;
    }
    if (!matched) {
      // Not a token this module recognizes — e.g. a Hebrew letter, a space, punctuation
      // inside a word problem. Copy it through untouched, one character at a time, so a
      // single unrecognized character never swallows the rest of the string.
      out += rest[0];
      consumed += rest[0];
      rest = rest.slice(1);
    }
  }

  return out.replace(/\s+/g, " ").trim();
}

/** Hebrew words for a bare number, in counting form — exported for callers that already
 *  isolated a number (e.g. a question's numeric answer) and don't need the full expression
 *  tokenizer. Thin wrapper so there is exactly one implementation of "how a number sounds". */
export function hebrewNumberWords(value: number | string): string {
  const raw = typeof value === "number" ? String(value) : value;
  const negative = raw.trim().startsWith("-") || raw.trim().startsWith("−");
  const magnitude = raw.trim().replace(/^[-−]/, "");
  const words = numberWords(magnitude);
  return negative ? `מינוס ${words}` : words;
}
