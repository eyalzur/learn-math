/**
 * The shape of what the teacher understood from a notebook page — shared between
 * readPage.ts (validates Claude's structured output against this) and index.ts (the safe
 * fallback when validation fails). `question`/`answer` carry any arithmetic marked in
 * backticks (e.g. "`7 + 5=`"), the same convention the client already uses everywhere else
 * to isolate math for RTL display and read-aloud — see src/components/segmented.tsx and
 * src/data/speech.ts on the client.
 */

import { z } from "zod";

export const PageReadingSchema = z.object({
  certain: z.boolean(),
  question: z.string().optional(),
  answer: z.string().optional(),
});

export type PageReading = { certain: true; question: string; answer: string } | { certain: false };
