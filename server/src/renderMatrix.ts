/**
 * Pure PNG rendering: no HTTP, no side effects. Draws the same filled-cell squares the
 * client already draws on its <canvas> (src/components/PracticeNotebook.tsx), just onto a
 * PNG buffer instead of a screen. Kept dependency-free of any native image library
 * (pngjs is pure JS) so the Docker image stays small and cold-starts fast on Cloud Run.
 */

import { PNG } from "pngjs";

export interface RenderMatrixInput {
  cols: number;
  rows: number;
  cell: number;
  filledCells: string[];
}

interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

const BACKGROUND: Color = { r: 255, g: 255, b: 255, a: 255 };
const INK: Color = { r: 8, g: 6, b: 13, a: 255 };

export function renderMatrix({ cols, rows, cell, filledCells }: RenderMatrixInput): Buffer {
  const width = Math.max(1, Math.round(cols * cell));
  const height = Math.max(1, Math.round(rows * cell));
  const png = new PNG({ width, height });

  fillRect(png, 0, 0, width, height, BACKGROUND);

  const size = Math.max(1, Math.ceil(cell));
  for (const key of filledCells) {
    const parsed = parseCell(key, cols, rows);
    if (!parsed) continue; // out-of-range or malformed keys are skipped, not fatal
    fillRect(png, Math.round(parsed.col * cell), Math.round(parsed.row * cell), size, size, INK);
  }

  return PNG.sync.write(png);
}

function parseCell(key: string, cols: number, rows: number): { col: number; row: number } | null {
  const match = /^(-?\d+),(-?\d+)$/.exec(key);
  if (!match) return null;
  const col = Number(match[1]);
  const row = Number(match[2]);
  if (col < 0 || row < 0 || col >= cols || row >= rows) return null;
  return { col, row };
}

function fillRect(png: PNG, x0: number, y0: number, w: number, h: number, color: Color) {
  const xEnd = Math.min(png.width, x0 + w);
  const yEnd = Math.min(png.height, y0 + h);
  for (let y = Math.max(0, y0); y < yEnd; y++) {
    for (let x = Math.max(0, x0); x < xEnd; x++) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = color.r;
      png.data[idx + 1] = color.g;
      png.data[idx + 2] = color.b;
      png.data[idx + 3] = color.a;
    }
  }
}
