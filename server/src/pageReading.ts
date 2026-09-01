/**
 * The shape of what the teacher understood from a notebook page — shared between
 * readPage.ts (validates Claude's structured output against this) and index.ts (the safe
 * fallback when validation fails). `processReflection`/`errorPointer` are free Hebrew
 * sentences with any arithmetic marked in backticks (e.g. "ראיתי שחישבת `7 + 5` וקיבלת
 * `12`."), the same convention the client already uses everywhere else to isolate math for
 * RTL display and read-aloud — see src/components/segmented.tsx and src/data/speech.ts on
 * the client. `finalAnswer` is a plain number, not a string to parse later: the model
 * already has everything (the page, and the exercise it was given) needed to produce the
 * numeric value directly, which is more reliable than a hand-rolled parser trying to cover
 * every handwritten notation ("x = 9", a fraction, a leading minus sign).
 */

import { z } from "zod";

export const PageReadingSchema = z.object({
  certain: z.boolean(),
  processReflection: z.string().optional(),
  errorPointer: z.string().optional(),
  finalAnswer: z.number().optional(),
});

export type PageReading =
  | { certain: true; processReflection: string; errorPointer?: string; finalAnswer: number }
  | { certain: false };
