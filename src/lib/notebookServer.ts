/**
 * Talks to the notebook server (docs/features/notebook-server-relay/,
 * docs/features/notebook-teacher-understanding/) — sends one page's filled-cell matrix and
 * gets back the PNG the server rendered from it, plus what the teacher (Claude, server-side)
 * understood was written on it.
 */

import { CELL, PAGE_HEIGHT, PAGE_WIDTH, type NotebookPage } from "../data/notebook";

const SERVER_URL: string = import.meta.env.VITE_NOTEBOOK_SERVER_URL ?? "";

/**
 * What the teacher read off the page. `question`/`answer` carry arithmetic marked in
 * backticks (e.g. "`7 + 5=`"), the same convention `segmented()`/`speechParts()` already
 * expect everywhere else in this app. `certain: false` carries no text from the model at
 * all — the uncertainty message shown to the student is fixed client-side copy, not
 * anything the model wrote.
 */
export type PageReading = { certain: true; question: string; answer: string } | { certain: false };

export interface TeacherReading {
  imageDataUrl: string;
  reading: PageReading;
}

export async function readPageWithTeacher(page: NotebookPage): Promise<TeacherReading> {
  if (!SERVER_URL) throw new Error("notebook server url is not configured");

  const response = await fetch(`${SERVER_URL}/read-page`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cols: Math.ceil(PAGE_WIDTH / CELL),
      rows: Math.ceil(PAGE_HEIGHT / CELL),
      cell: CELL,
      filledCells: Array.from(page.filledCells),
    }),
  });

  if (!response.ok) throw new Error(`notebook server responded with ${response.status}`);

  const data = (await response.json()) as { imageDataUrl?: string; reading?: PageReading };
  if (!data.imageDataUrl || !data.reading) throw new Error("notebook server response missing fields");
  return { imageDataUrl: data.imageDataUrl, reading: data.reading };
}
