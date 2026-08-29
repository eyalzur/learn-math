/**
 * Talks to the notebook-server-relay server (docs/features/notebook-server-relay/) — sends
 * one page's filled-cell matrix and gets back the PNG the server rendered from it, as a
 * data URL ready for an <img src>. No Claude/Anthropic involved at this stage.
 */

import { CELL, PAGE_HEIGHT, PAGE_WIDTH, type NotebookPage } from "../data/notebook";

const SERVER_URL: string = import.meta.env.VITE_NOTEBOOK_SERVER_URL ?? "";

export async function sendPageToServer(page: NotebookPage): Promise<string> {
  if (!SERVER_URL) throw new Error("notebook server url is not configured");

  const response = await fetch(`${SERVER_URL}/render-page`, {
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

  const data = (await response.json()) as { imageDataUrl?: string };
  if (!data.imageDataUrl) throw new Error("notebook server response missing imageDataUrl");
  return data.imageDataUrl;
}
