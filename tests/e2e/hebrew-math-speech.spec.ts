import { test, expect } from "@playwright/test";
import { normalizeMathSpeech, hebrewNumberWords } from "../../src/data/hebrewMathSpeech";

/**
 * Unit tests for the Hebrew math-speech normalizer (docs/features/hebrew-math-tts/).
 *
 * Pure-function tests, no browser needed — same pattern as the "without the browser"
 * blocks in mistake-diagnosis.spec.ts: importing the module directly and asserting on its
 * return value, with no page navigation at all.
 */
test.describe("without the browser", () => {
  test.use({ baseURL: undefined });

  test("the five required examples, exact output", () => {
    expect(normalizeMathSpeech("7 − 3 = 4")).toBe("שבע פחות שלוש שווה ארבע");
    expect(normalizeMathSpeech("-2 + 10")).toBe("מינוס שתיים ועוד עשר");
    expect(normalizeMathSpeech("(4 + 1) × 3")).toBe(
      "סוגריים פותחים ארבע ועוד אחת סוגריים סוגרים כפול שלוש",
    );
    expect(normalizeMathSpeech("12 ÷ 4")).toBe("שתים עשרה חלקי ארבע");
    expect(normalizeMathSpeech("2.5 + 0.5")).toBe("שתיים נקודה חמש ועוד אפס נקודה חמש");
  });

  test("ASCII hyphen behaves the same as the U+2212 minus sign", () => {
    expect(normalizeMathSpeech("7 - 3 = 4")).toBe("שבע פחות שלוש שווה ארבע");
    expect(normalizeMathSpeech("-2 + 10")).toBe("מינוס שתיים ועוד עשר");
  });

  test("unary minus after every kind of operator, not just at the start", () => {
    expect(normalizeMathSpeech("3 + -5")).toBe("שלוש ועוד מינוס חמש");
    expect(normalizeMathSpeech("3 × -5")).toBe("שלוש כפול מינוס חמש");
    expect(normalizeMathSpeech("(-5 + 2)")).toBe("סוגריים פותחים מינוס חמש ועוד שתיים סוגריים סוגרים");
  });

  test("binary minus after a closing paren is still subtraction", () => {
    expect(normalizeMathSpeech("(2 + 3) - 1")).toBe(
      "סוגריים פותחים שתיים ועוד שלוש סוגריים סוגרים פחות אחת",
    );
  });

  test("multiplication and division symbol variants", () => {
    expect(normalizeMathSpeech("2 * 3")).toBe("שתיים כפול שלוש");
    expect(normalizeMathSpeech("6 / 2")).toBe("שש חלקי שתיים");
  });

  test("comparisons", () => {
    expect(normalizeMathSpeech("3 < 5")).toBe("שלוש קטן מ חמש");
    expect(normalizeMathSpeech("5 > 3")).toBe("חמש גדול מ שלוש");
    expect(normalizeMathSpeech("3 ≤ 3")).toBe("שלוש קטן או שווה ל שלוש");
    expect(normalizeMathSpeech("4 ≥ 4")).toBe("ארבע גדול או שווה ל ארבע");
  });

  test("percent", () => {
    expect(normalizeMathSpeech("50%")).toBe("חמישים אחוז");
  });

  test("exponent and root", () => {
    expect(normalizeMathSpeech("2^3")).toBe("שתיים בחזקת שלוש");
    expect(normalizeMathSpeech("5²")).toBe("חמש בחזקת שתיים");
    expect(normalizeMathSpeech("2³")).toBe("שתיים בחזקת שלוש");
    expect(normalizeMathSpeech("√9")).toBe("שורש של תשע");
  });

  test("a tight fraction uses the masculine fraction form, unlike a spaced division", () => {
    expect(normalizeMathSpeech("3/4")).toBe("שלושה חלקי ארבעה");
    expect(normalizeMathSpeech("1/2")).toBe("אחד חלקי שניים");
  });

  test("large numbers, with and without thousands separators", () => {
    expect(normalizeMathSpeech("1000")).toBe("אלף");
    expect(normalizeMathSpeech("2000")).toBe("אלפיים");
    expect(normalizeMathSpeech("1,234")).toBe("אלף מאתיים שלושים וארבע");
    expect(normalizeMathSpeech("1000000")).toBe("מיליון");
  });

  test("the algebra variable x, and implicit multiplication next to it", () => {
    expect(normalizeMathSpeech("x + 2")).toBe("איקס ועוד שתיים");
    expect(normalizeMathSpeech("3x")).toBe("שלוש כפול איקס");
  });

  test("implicit multiplication before an open paren (the CLAUDE.md 3(x + 2) case)", () => {
    expect(normalizeMathSpeech("3(x + 2)")).toBe(
      "שלוש כפול סוגריים פותחים איקס ועוד שתיים סוגריים סוגרים",
    );
  });

  test("plain Hebrew text mixed into the expression passes through unchanged", () => {
    expect(normalizeMathSpeech("יש לנו 3 + 2 תפוחים")).toBe("יש לנו שלוש ועוד שתיים תפוחים");
  });

  test("hebrewNumberWords: a bare number, including a negative one", () => {
    expect(hebrewNumberWords(7)).toBe("שבע");
    expect(hebrewNumberWords(-7)).toBe("מינוס שבע");
    expect(hebrewNumberWords("12")).toBe("שתים עשרה");
  });
});
