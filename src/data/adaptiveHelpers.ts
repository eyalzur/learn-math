/**
 * Small helpers shared by every runtime-template generator under `src/data/adaptive*.ts`
 * (see `docs/features/levels-as-practice/architecture.md`). Kept out of `adaptiveAdd100.ts`
 * on purpose — that file is the original pilot and stays untouched except for its question
 * count, per the architecture's Affected Files table.
 */

export type Rng = () => number;

export function randInt(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

/** A fresh id per instance — never reused as a lookup key, only for React keys/aria. */
export function makeFreshId(prefix: string): (rng: Rng) => string {
  return (rng: Rng) => `${prefix}-${Math.floor(rng() * 1e9)}`;
}

/** Unicode superscript digits for exponents 2–6, matching the glyphs already used in
 *  the hand-written `חזקות ושורשים` questions (e.g. `2³`, `2⁴`). */
const SUPERSCRIPTS: Record<number, string> = { 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶" };

export function sup(n: number): string {
  const s = SUPERSCRIPTS[n];
  if (!s) throw new Error(`No superscript glyph for exponent ${n}`);
  return s;
}
