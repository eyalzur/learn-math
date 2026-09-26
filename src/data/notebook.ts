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
/** The zoom the notebook opens at, once per practice session — not a fit-to-viewport
 *  calculation, which on a phone could come out small enough to be unusable (16% was
 *  observed in review). Manual zoom/pan after that is unaffected. */
export const INITIAL_ZOOM = 0.7;

/**
 * How far hold-to-zoom closes in, as a choice rather than a constant — see
 * docs/features/notebook-hold-to-zoom/ (סבב ה׳). Six options: "off", then five strengths
 * rising by a constant ratio of ~1.67, which puts the middle one at exactly +25% (the
 * number the user asked for) and the strongest at +70% (the value that was actually tried
 * and approved on a real touchscreen, which is also the default).
 *
 * Ordered array rather than separate order/label/factor maps: those three can drift apart
 * in a later edit, and then the row a person taps and the zoom they get describe different
 * things. `factor: null` is "off" — one field covers all six states, so there is no
 * separate boolean to keep in sync with it.
 *
 * A ratio scale, not equal steps: zoom reads multiplicatively (10%→20% feels like
 * 50%→100%, not like 50%→60%), so equal ratios are what feel evenly spaced to someone
 * trying the six in turn.
 */
export interface HoldZoomLevel {
  id: string;
  label: string;
  /** Multiplier applied to the current zoom, or `null` for "off". */
  factor: number | null;
}

export const HOLD_ZOOM_LEVELS: HoldZoomLevel[] = [
  { id: "off", label: "כבוי", factor: null },
  { id: "veryLittle", label: "מעט מאוד", factor: 1.09 },
  { id: "little", label: "מעט", factor: 1.15 },
  { id: "medium", label: "בינוני", factor: 1.25 },
  { id: "much", label: "הרבה", factor: 1.42 },
  { id: "veryMuch", label: "הרבה מאוד", factor: 1.7 },
];

/** The strongest level — the one validated on a real device, so it is what a student who
 *  never opens the setting gets. See product-spec.md for why the default is the tested
 *  value rather than the middle of the scale. */
export const DEFAULT_HOLD_ZOOM_LEVEL = "veryMuch";

/** The multiplier for a stored level id, or `null` when the level is "off" *or* the id is
 *  unknown-but-somehow-present. Callers get one number (or null) and never see ids. */
export function holdZoomFactorFor(levelId: string): number | null {
  return HOLD_ZOOM_LEVELS.find((level) => level.id === levelId)?.factor ?? null;
}

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

/** The transform that fits the whole page inside a viewport of the given size, centered.
 *  Used for fullscreen's dynamic re-fit (entering/leaving, and resize while fullscreen) —
 *  not for the session's opening zoom, see `computeInitialTransform` below. */
export function computeFitTransform(viewportWidth: number, viewportHeight: number): PanZoom {
  const zoom = clampZoom(Math.min(viewportWidth / PAGE_WIDTH, viewportHeight / PAGE_HEIGHT) * 0.96);
  return {
    zoom,
    panX: (viewportWidth - PAGE_WIDTH * zoom) / 2,
    panY: (viewportHeight - PAGE_HEIGHT * zoom) / 2,
  };
}

/** The transform the notebook opens with, once per practice session: `INITIAL_ZOOM`
 *  regardless of viewport size — deliberately a separate function rather than a fixed-zoom
 *  branch inside `computeFitTransform`, which is also used to fit the whole page on demand
 *  (see `computeFitTransform`'s own doc) and still needs to center. This one anchors the
 *  page's own top-left corner to the viewport's top-left corner instead: a student starts
 *  writing at the top of the page, like a real notebook, not in the middle of a canvas they
 *  have to scroll to orient themselves on. */
export function computeInitialTransform(): PanZoom {
  return { zoom: INITIAL_ZOOM, panX: 0, panY: 0 };
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

/**
 * Auto-scroll-follow: while writing near the edge of the visible area, the view pans
 * sideways to keep the writing point comfortably in view — see
 * docs/features/notebook-auto-scroll/. Starting values, not validated on a real
 * touchscreen yet (same situation notebook-hold-to-zoom started from before its own
 * tuning rounds).
 */
export const AUTO_SCROLL_FOLLOW_MARGIN_FRACTION = 0.2;
export const AUTO_SCROLL_FOLLOW_GAIN = 0.4;
export const AUTO_SCROLL_FOLLOW_MAX_STEP_PX = 32;

/**
 * `panX` clamped so the view never slides past the page's own left/right edge — used only
 * by the auto-scroll-follow step (see PracticeNotebook.tsx's `applyAutoScrollFollow`), the
 * same way `minimapViewRect` above already derives "what's visible" from `panX`/`zoom`, but
 * to bound `panX` itself rather than draw a rectangle. Deliberately not applied to manual
 * pan/pinch-zoom or hold-to-zoom, which stay exactly as unbounded as they are today — see
 * architecture.md, Risks/Tradeoffs.
 */
export function clampFollowPanX(panX: number, zoom: number, viewportWidth: number): number {
  const pageSpan = PAGE_WIDTH * zoom;
  const lo = Math.min(0, viewportWidth - pageSpan);
  const hi = Math.max(0, viewportWidth - pageSpan);
  return Math.min(hi, Math.max(lo, panX));
}
