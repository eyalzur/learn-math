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

/** A rough estimate of where on the page the `errorPointer` issue was written, as a
 *  fraction of the page's own width/height (0 = top/left edge, 1 = bottom/right edge) —
 *  never a pixel or cell coordinate, since the model has no reliable way to be that
 *  precise. Only meaningful alongside `errorPointer`; see docs/features/notebook-teacher-marks/,
 *  "עדכון סבב ב׳". */
const ErrorLocationSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const PageReadingSchema = z.object({
  certain: z.boolean(),
  processReflection: z.string().optional(),
  errorPointer: z.string().optional(),
  errorLocation: ErrorLocationSchema.optional(),
  finalAnswer: z.number().optional(),
});

export type PageReading =
  | {
      certain: true;
      processReflection: string;
      errorPointer?: string;
      errorLocation?: { x: number; y: number };
      finalAnswer: number;
    }
  | { certain: false };
