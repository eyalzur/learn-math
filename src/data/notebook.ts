/**
 * Pure logic for the practice notebook: page data, cell-fill drawing, and the pan/zoom
 * math. No React here — PracticeNotebook.tsx wires this to pointer events and state.
 *
 * The values below (CELL, PAGE_WIDTH/HEIGHT, PEN_CELLS, ERASER_CELLS) are carried over
 * unchanged from the external prototype (docs/features/notebook-planning/) where they
 * were tuned against real handwriting testing — not re-derived here.
 */

export const CELL = 4.665;
export const PAGE_WIDTH = 1200;
export const PAGE_HEIGHT = 1600;
export const PEN_CELLS = 1;
export const ERASER_CELLS = 5;
export const MAX_PAGES = 20;
export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 2.5;

export interface NotebookPage {
  id: string;
  /** Keys are "col,row" — the same sparse cell-fill model as the prototype. */
  filledCells: Set<string>;
}

let nextPageId = 0;

export function createBlankPage(): NotebookPage {
  nextPageId += 1;
  return { id: `page-${nextPageId}`, filledCells: new Set() };
}

export function pageHasContent(page: NotebookPage): boolean {
  return page.filledCells.size > 0;
}

export type DrawTool = "pen" | "eraser";

/**
 * Fills (or erases) a square block of cells centered on the cell containing (x, y), in the
 * page's own local coordinate space. Mutates `filledCells` directly and reports which keys
 * changed, so callers can undo a spurious mark (see the pinch-gesture handling this exists
 * for, in PracticeNotebook.tsx).
 */
export function fillCellBlock(
  filledCells: Set<string>,
  x: number,
  y: number,
  sizeInCells: number,
  tool: DrawTool,
): string[] {
  const col = Math.floor(x / CELL);
  const row = Math.floor(y / CELL);
  const half = Math.floor(sizeInCells / 2);
  const changed: string[] = [];
  for (let c = col - half; c < col - half + sizeInCells; c++) {
    for (let r = row - half; r < row - half + sizeInCells; r++) {
      const key = `${c},${r}`;
      if (tool === "eraser") {
        filledCells.delete(key);
      } else {
        filledCells.add(key);
      }
      changed.push(key);
    }
  }
  return changed;
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export interface PanZoom {
  panX: number;
  panY: number;
  zoom: number;
}

/**
 * Rescales around (screenX, screenY) — the point under the cursor/pinch-midpoint stays
 * fixed on screen while the zoom level changes by `factor`.
 */
export function zoomAroundPoint(current: PanZoom, screenX: number, screenY: number, factor: number): PanZoom {
  const newZoom = clampZoom(current.zoom * factor);
  const actualFactor = newZoom / current.zoom;
  return {
    zoom: newZoom,
    panX: screenX - actualFactor * (screenX - current.panX),
    panY: screenY - actualFactor * (screenY - current.panY),
  };
}

/** The transform that fits the whole page inside a viewport of the given size, centered. */
export function computeFitTransform(viewportWidth: number, viewportHeight: number): PanZoom {
  const zoom = clampZoom(Math.min(viewportWidth / PAGE_WIDTH, viewportHeight / PAGE_HEIGHT) * 0.96);
  return {
    zoom,
    panX: (viewportWidth - PAGE_WIDTH * zoom) / 2,
    panY: (viewportHeight - PAGE_HEIGHT * zoom) / 2,
  };
}

/** The highlighted rectangle in the minimap, in the minimap's own pixel space. */
export function minimapViewRect(
  panZoom: PanZoom,
  viewportWidth: number,
  viewportHeight: number,
  minimapWidth: number,
  minimapHeight: number,
) {
  const scaleX = minimapWidth / PAGE_WIDTH;
  const scaleY = minimapHeight / PAGE_HEIGHT;
  const visLeft = -panZoom.panX / panZoom.zoom;
  const visTop = -panZoom.panY / panZoom.zoom;
  const visWidth = viewportWidth / panZoom.zoom;
  const visHeight = viewportHeight / panZoom.zoom;
  const left = Math.max(0, visLeft * scaleX);
  const top = Math.max(0, visTop * scaleY);
  const right = Math.min(minimapWidth, (visLeft + visWidth) * scaleX);
  const bottom = Math.min(minimapHeight, (visTop + visHeight) * scaleY);
  return { left, top, width: Math.max(2, right - left), height: Math.max(2, bottom - top) };
}
