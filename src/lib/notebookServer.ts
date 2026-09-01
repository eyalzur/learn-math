/**
 * Talks to the notebook server (docs/features/notebook-server-relay/,
 * docs/features/notebook-teacher-understanding/, docs/features/notebook-default-practice/)
 * — sends one page's filled-cell matrix, plus the exercise the student was given, and gets
 * back what the teacher (Claude, server-side) understood was done on it.
 */

import { CELL, PAGE_HEIGHT, PAGE_WIDTH, type NotebookPage } from "../data/notebook";

const SERVER_URL: string = import.meta.env.VITE_NOTEBOOK_SERVER_URL ?? "";

/**
 * What the teacher read off the page. `processReflection`/`errorPointer` are free Hebrew
 * sentences with arithmetic marked in backticks (e.g. "ראיתי שחישבת `7 + 5` וקיבלת `12`."),
 * the same convention `segmented()`/`speechParts()` already expect everywhere else in this
 * app. `finalAnswer` is a plain number, ready to feed directly into the same local check
 * (`question.answer`, `diagnose()`) that used to run on a typed answer — no parsing step in
 * between. `certain: false` carries no text from the model at all — the uncertainty message
 * shown to the student is fixed client-side copy, not anything the model wrote.
 */
export type PageReading =
  | { certain: true; processReflection: string; errorPointer?: string; finalAnswer: number }
  | { certain: false };

export interface TeacherReading {
  reading: PageReading;
}

/**
 * `expectedPrompt` is the exercise text already shown to the student (e.g. `question.prompt`)
 * — never the correct answer. It grounds the teacher's reading without handing the model
 * anything to grade against; judging correct/incorrect stays entirely with the caller's own
 * local check.
 */
export async function readPageWithTeacher(page: NotebookPage, expectedPrompt: string): Promise<TeacherReading> {
  if (!SERVER_URL) throw new Error("notebook server url is not configured");

  const response = await fetch(`${SERVER_URL}/read-page`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cols: Math.ceil(PAGE_WIDTH / CELL),
      rows: Math.ceil(PAGE_HEIGHT / CELL),
      cell: CELL,
      filledCells: Array.from(page.filledCells),
      expectedPrompt,
    }),
  });

  if (!response.ok) throw new Error(`notebook server responded with ${response.status}`);

  const data = (await response.json()) as { reading?: PageReading };
  if (!data.reading) throw new Error("notebook server response missing fields");
  return { reading: data.reading };
}
