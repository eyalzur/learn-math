import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { DrawTool, NotebookPage, PanZoom } from "../data/notebook";
import {
  AUTO_SCROLL_JUMP_GAP_THRESHOLD_CELLS,
  CELL,
  ERASER_CELLS,
  MAX_PAGES,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PEN_CELLS,
  clampFollowPanX,
  clampFollowPanY,
  clampPan,
  clampZoom,
  computeFitTransform,
  computeInitialTransform,
  createBlankPage,
  fillCellBlock,
  minimapViewRect,
  pageHasContent,
  zoomAroundPoint,
} from "../data/notebook";

/** The single action Practice.tsx wants rendered in the toolbar's action slot — this
 *  component has no idea whether that means "send to the teacher", "still waiting", or
 *  "move to the next question": it just renders whatever button its caller asks for. That
 *  split is deliberate — see docs/features/notebook-default-practice/architecture.md. */
interface PrimaryAction {
  label: string;
  onClick: () => void;
  disabled: boolean;
}

interface PracticeNotebookProps {
  pages: NotebookPage[];
  currentPageIndex: number;
  onPagesChange: (pages: NotebookPage[]) => void;
  onCurrentPageIndexChange: (index: number) => void;
  /** True once the current question has been answered — blocks further drawing/erasing on
   *  the page that was just checked, but zoom/pan/page navigation stay live so the student
   *  can still look back at it. */
  locked: boolean;
  primaryAction: PrimaryAction;
  /** The writing box expanded to (almost) the whole screen — a toggle, not a mode this
   *  component decides on its own. See docs/features/notebook-default-practice/architecture.md. */
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  /** What to show above the writing surface while fullscreen is on, in place of the
   *  regular header Practice.tsx hides then (the question, plus a way out) — composed by
   *  the caller, rendered here without this component knowing what it is. Ignored outside
   *  fullscreen. */
  topSlot: ReactNode;
  /** Small status messages (an uncertain reading, a failed send) that stay reachable next
   *  to the toolbar while fullscreen is on, instead of in the hidden regular header.
   *  Ignored outside fullscreen. */
  statusSlot: ReactNode;
  /** How far a held touch closes in, as a multiplier — or `null` for "off", which means the
   *  gesture doesn't exist at all (no dwell timer is even started). Comes from the student's
   *  own setting; see docs/features/notebook-hold-to-zoom/ (סבב ה׳). */
  holdZoomFactor: number | null;
  /** How far the view jumps between finished strokes, as a fraction of the stage size — or
   *  `null` for "off", which means the jump never happens at all (no bounds are even
   *  tracked). Comes from the student's own setting; see
   *  docs/features/notebook-auto-scroll/. */
  autoScrollJumpFraction: number | null;
  /** How far one press of a directional nav button moves the view, in screen pixels —
   *  comes from the student's own setting; see docs/features/notebook-nav-settings/. */
  panStepPx: number;
  /** Milliseconds between repeats while a nav button is held down, or `null` for "off" —
   *  holding still performs the one step the press itself already did, it just never
   *  repeats on its own. */
  panHoldIntervalMs: number | null;
  /** This student's notebook toolbar button diameter, already resolved to pixels. See
   *  docs/features/notebook-toolbar-redesign/. */
  buttonDiameterPx: number;
  /** How long after a stroke/pan ends before the suggested-next-action animation starts, or
   *  `null` when the student has it switched off (the mechanic doesn't exist at all then). */
  suggestionDelayMs: number | null;
}

/**
 * The distance a second finger has to arrive within, after the first touches down, for
 * that first touch's mark to count as "the start of a pinch" rather than a real stroke —
 * see the pointerdown handler below. Ported from the external prototype
 * (docs/features/notebook-planning/), where the shorter version of this comment explains
 * why it exists: a pinch's first finger reports its pointerdown slightly before the
 * second, and the default tool is "pen", so without this every pinch left a stray dot.
 */
const PINCH_UNDO_WINDOW_MS = 220;

/**
 * Hold-to-zoom: a single pointer that stays still (within HOLD_ZOOM_MOVE_TOLERANCE_PX)
 * for HOLD_ZOOM_DWELL_MS from the moment it touches down — before any real movement —
 * triggers a temporary, bounded zoom-IN (by the `holdZoomFactor` prop), a closer/more
 * focused view — like leaning in to concentrate — for the rest of that same touch,
 * animated over HOLD_ZOOM_TRANSITION_MS; releasing the pointer animates back to
 * exactly the transform saved right before the touch started. See
 * docs/features/notebook-hold-to-zoom/ for the full design and architecture. The move
 * tolerance isn't in design.md — real touches never land on the exact same pixel twice,
 * so without it the dwell timer would never survive to fire.
 */
const HOLD_ZOOM_DWELL_MS = 180;
const HOLD_ZOOM_TRANSITION_MS = 120;
const HOLD_ZOOM_MOVE_TOLERANCE_PX = 4;

/** Ink is still stored and looked up as a quantized `cells`-sized block (unchanged — see
 *  fillCellBlock in notebook.ts), but drawn as a filled circle inscribed in that block
 *  instead of a hard-edged square: overlapping circles along a stroke fuse into a rounded
 *  line, while overlapping squares staircase at any angle that isn't axis-aligned. Used by
 *  both the live stroke (paintTo) and the stored-page redraw (redrawFromPage), so a page
 *  looks the same freshly drawn as it does after navigating away and back. */
function stampCell(ctx: CanvasRenderingContext2D, col: number, row: number, cells: number) {
  const half = Math.floor(cells / 2);
  const size = cells * CELL;
  const cx = (col - half) * CELL + size / 2;
  const cy = (row - half) * CELL + size / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fill();
}

/** How long the auto-scroll-jump's own hop animates — a quick, clearly-one-shot step, not a
 *  scroll. Same order of magnitude as HOLD_ZOOM_TRANSITION_MS, reusing the same
 *  animateTransformTo mechanism. See docs/features/notebook-auto-scroll/ (סבב ב׳). */
const AUTO_SCROLL_JUMP_TRANSITION_MS = 150;

/** Holding a directional nav button down: PAN_HOLD_DELAY_MS of stillness before the first
 *  repeat (long enough that a quick tap never triggers it — a tap is handled by the
 *  button's own onClick, once, not by this at all), then one more step every
 *  `panHoldIntervalMs` (the student's own setting) until released. The delay itself isn't
 *  part of that setting — see docs/features/notebook-nav-settings/architecture.md. */
const PAN_HOLD_DELAY_MS = 350;

export function PracticeNotebook({
  pages,
  currentPageIndex,
  onPagesChange,
  onCurrentPageIndexChange,
  locked,
  primaryAction,
  fullscreen,
  onToggleFullscreen,
  topSlot,
  statusSlot,
  holdZoomFactor,
  autoScrollJumpFraction,
  panStepPx,
  panHoldIntervalMs,
  buttonDiameterPx,
  suggestionDelayMs,
}: PracticeNotebookProps) {
  const [tool, setTool] = useState<DrawTool | "pan">("pen");
  /** Which destructive action, if any, is waiting on confirmation — "remove" (a whole page)
   *  or "clear" (everything drawn on the current page). One dialog, two copies of the
   *  question, never both pending at once. */
  const [pendingConfirm, setPendingConfirm] = useState<"remove" | "clear" | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  /** Bumped on every `applyTransform()` purely to force a re-render — `panZoomRef` is a
   *  ref (deliberately, see the comment above it: pan/draw events fire too often for
   *  state), but the nav buttons' disabled state depends on its current value, and a pure
   *  pan with no zoom change doesn't otherwise trigger one (`setZoomPercent` bails out when
   *  the rounded percentage is unchanged). */
  const [, setPanVersion] = useState(0);
  /** Whether "הצג את כל הדף" is currently zoomed out to fit the whole page — a toggle, not
   *  a mode this component enters automatically. `savedTransform` is what a second press
   *  restores: the exact zoom/pan from right before the first press, not a re-derived guess. */
  const [viewingWholePage, setViewingWholePage] = useState(false);
  const savedTransform = useRef<PanZoom | null>(null);
  /** Which button (if any) the "suggested next action" animation currently points at — a
   *  real React state, not a ref, because it drives a CSS attribute in the JSX (`pan`/`pen`
   *  only; the eraser is never suggested). See docs/features/notebook-toolbar-redesign/. */
  const [suggestedTool, setSuggestedTool] = useState<"pan" | "pen" | null>(null);

  // Drawing mutates currentPage.filledCells directly through refs, on purpose (see the
  // comment on panZoomRef above) — a pointermove can fire dozens of times a second, and
  // re-rendering React for each one would defeat that. But "does the page have content"
  // is now read at render time in the *parent* (Practice.tsx computes primaryAction.disabled
  // from it), so a stroke finishing has to make the parent re-render, not just this
  // component — passing a new array reference through the pages prop it already owns does
  // that without a reducer or an extra callback prop of its own.
  function notifyContentChanged() {
    onPagesChange([...pages]);
  }

  const stageRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const minimapViewRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // High-frequency interaction state lives in refs, not useState — a pointermove can fire
  // dozens of times a second, and re-rendering React for each one is exactly the kind of
  // cost the original prototype avoided by mutating the DOM directly (see applyTransform).
  const panZoomRef = useRef<PanZoom>({ panX: 0, panY: 0, zoom: 1 });
  const toolRef = useRef<DrawTool | "pan">("pen");
  const lockedRef = useRef(locked);
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const singlePanStart = useRef<{ x: number; y: number; panX0: number; panY0: number } | null>(null);
  const pinch = useRef<{
    startDist: number;
    startZoom: number;
    localFixed: { x: number; y: number };
  } | null>(null);
  const recordingCells = useRef<string[] | null>(null);
  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Suggested-next-action — see docs/features/notebook-toolbar-redesign/architecture.md.
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hold-to-zoom state — see the constants above and
  // docs/features/notebook-hold-to-zoom/architecture.md for the full mechanism.
  const holdZoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdZoomPointerId = useRef<number | null>(null);
  const holdZoomDownPos = useRef<{ x: number; y: number } | null>(null);
  /** null = not currently in the temporary zoomed-in state. Non-null = the transform to
   *  restore on release — also doubles as the "is this touch currently held-zoomed" flag. */
  const preHoldTransform = useRef<PanZoom | null>(null);
  const transitionClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdZoomFactorRef = useRef(holdZoomFactor);

  // Auto-scroll-jump: mirrored into a ref for the same reason as `holdZoomFactorRef` — read
  // at the end of every stroke, and a change to the setting has to apply to the very next
  // one with no reload. See docs/features/notebook-auto-scroll/ (סבב ב׳).
  const autoScrollJumpFractionRef = useRef(autoScrollJumpFraction);

  /** The bounding box (in cell/grid units) of the stroke currently being drawn — `null`
   *  between strokes. Reset at the start of every new stroke; grown in `paintTo` via
   *  `extendStrokeBounds`. Only tracked at all when the setting is on (see
   *  `extendStrokeBounds`), so "off" costs nothing. */
  const strokeBoundsRef = useRef<{ minCol: number; maxCol: number; minRow: number; maxRow: number } | null>(
    null,
  );
  /** The bounding box of the most recently *completed* stroke — what the next stroke's own
   *  bounds get compared against in `endPointer`. `null` means "nothing to compare yet" (a
   *  fresh page, right after a clear, or the very first stroke of the practice). */
  const lastStrokeBoundsRef = useRef<{ minCol: number; maxCol: number; minRow: number; maxRow: number } | null>(
    null,
  );

  // Hold-to-repeat on a directional nav button — see PAN_HOLD_DELAY_MS/PAN_HOLD_INTERVAL_MS
  // above. panHoldFired distinguishes "this press turned into a hold" (so the click that
  // follows release should be a no-op) from a plain tap (which onClick alone handles).
  const panHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panHoldInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const panHoldFired = useRef(false);

  const currentPage = pages[currentPageIndex];

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  // Mirrored into a ref for the same reason as `lockedRef`: triggerHoldZoom runs inside a
  // setTimeout scheduled back at pointerdown, and a closure reading the prop directly would
  // hold whatever value was current when the touch began. Reading the ref is also what makes
  // a change to the setting apply to the very next hold, with no reload.
  useEffect(() => {
    holdZoomFactorRef.current = holdZoomFactor;
  }, [holdZoomFactor]);

  useEffect(() => {
    autoScrollJumpFractionRef.current = autoScrollJumpFraction;
  }, [autoScrollJumpFraction]);

  function inkColor() {
    return getComputedStyle(document.documentElement).getPropertyValue("--text-h").trim() || "#08060d";
  }

  function applyTransform() {
    const { panX, panY, zoom } = panZoomRef.current;
    if (stackRef.current) {
      stackRef.current.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    }
    setZoomPercent(Math.round(zoom * 100));
    setPanVersion((v) => v + 1);
    updateMinimap();
  }

  function updateMinimap() {
    if (!stageRef.current || !minimapRef.current || !minimapViewRef.current) return;
    const stageRect = stageRef.current.getBoundingClientRect();
    const rect = minimapViewRect(
      panZoomRef.current,
      stageRect.width,
      stageRect.height,
      minimapRef.current.clientWidth,
      minimapRef.current.clientHeight,
    );
    minimapViewRef.current.style.left = `${rect.left}px`;
    minimapViewRef.current.style.top = `${rect.top}px`;
    minimapViewRef.current.style.width = `${rect.width}px`;
    minimapViewRef.current.style.height = `${rect.height}px`;
  }

  /** Turns off the inline `transition` on `.notebook-stack`, if one is currently running —
   *  called before any instant transform update (drawing, panning) so it never inherits a
   *  lingering hold-zoom transition and ends up feeling laggy relative to the pointer. */
  function clearTransition() {
    if (transitionClearTimer.current) {
      clearTimeout(transitionClearTimer.current);
      transitionClearTimer.current = null;
    }
    if (stackRef.current) stackRef.current.style.transition = "";
  }

  /** Animates `.notebook-stack`'s transform to `target` over `ms`, via a CSS transition
   *  toggled on then off — not a JS animation loop, since this is always a one-shot hop
   *  (hold-zoom's entry and exit), never something that needs to keep reacting to input
   *  mid-flight. `panZoomRef.current` is updated synchronously to the final value
   *  regardless of how long the CSS takes to visually catch up — it stays the single
   *  source of truth throughout. */
  function animateTransformTo(target: PanZoom, ms: number) {
    if (stackRef.current) stackRef.current.style.transition = `transform ${ms}ms ease`;
    panZoomRef.current = target;
    applyTransform();
    if (transitionClearTimer.current) clearTimeout(transitionClearTimer.current);
    transitionClearTimer.current = setTimeout(() => {
      transitionClearTimer.current = null;
      if (stackRef.current) stackRef.current.style.transition = "";
    }, ms);
  }

  /** Fires HOLD_ZOOM_DWELL_MS after a single pointer touches down, if it hasn't moved
   *  (see the cancellation check in handlePointerMove) and no second pointer arrived. */
  function triggerHoldZoom(pointerId: number) {
    holdZoomTimer.current = null;
    if (holdZoomPointerId.current !== pointerId) return;
    if (activePointers.current.size !== 1) return;
    // Defensive: the setting could have flipped to "off" between arming and firing.
    const factor = holdZoomFactorRef.current;
    if (factor === null) return;
    const down = holdZoomDownPos.current;
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!down || !stageRect) return;
    preHoldTransform.current = { ...panZoomRef.current };
    // zoomAroundPoint wants stage-relative screen pixels (like handleWheel/zoomButton
    // below), not the page-space coordinates localPoint() returns for drawing.
    const target = zoomAroundPoint(panZoomRef.current, down.x - stageRect.left, down.y - stageRect.top, factor);
    animateTransformTo(clampPan(target, stageRect.width, stageRect.height), HOLD_ZOOM_TRANSITION_MS);
  }

  function redrawFromPage(page: NotebookPage) {
    const ctx = ctxRef.current;
    if (!ctx || !canvasRef.current) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.restore();
    ctx.fillStyle = inkColor();
    for (const key of page.filledCells) {
      const [c, r] = key.split(",").map(Number);
      stampCell(ctx, c, r, 1);
    }
  }

  // The canvas bitmap is sized once, in the page's own fixed coordinate space — zoom/pan
  // are a pure CSS transform on .stack, so nothing here ever needs to resize or redraw
  // for them.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(PAGE_WIDTH * dpr);
    canvas.height = Math.round(PAGE_HEIGHT * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;

    // A fixed opening zoom and top-left position (INITIAL_ZOOM, panX/panY 0), not a
    // fit-to-viewport calculation: fitting the whole page into a narrow embedded panel could
    // come out small enough to be unusable for writing (16% was observed on a phone, see
    // docs/features/notebook-usability-fixes/), and centering hides where a real notebook
    // page actually starts. "See the whole page"/fullscreen use the dynamic
    // computeFitTransform on demand instead (below) — only this session-opening view is fixed.
    panZoomRef.current = computeInitialTransform();
    applyTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clears any pending hold-zoom timers if the component unmounts mid-touch (e.g.
  // navigating away while a finger is still down) — otherwise a stale timeout could fire
  // later and touch refs of an already-unmounted instance.
  useEffect(() => {
    return () => {
      if (holdZoomTimer.current) clearTimeout(holdZoomTimer.current);
      if (transitionClearTimer.current) clearTimeout(transitionClearTimer.current);
      if (panHoldTimer.current) clearTimeout(panHoldTimer.current);
      if (panHoldInterval.current) clearInterval(panHoldInterval.current);
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
    };
  }, []);

  // Redraw whenever the visible page changes (navigation, or a page was added/removed
  // out from under the currently-viewed index). Also drops out of "הצג את כל הדף" — a
  // memory of "the zoom/pan before I zoomed out" that belongs to the page it was captured
  // on, not to whichever page happens to be visible when the button is pressed again.
  useEffect(() => {
    if (currentPage) redrawFromPage(currentPage);
    setViewingWholePage(false);
    savedTransform.current = null;
    // The previous page's last stroke is not something a stroke on this page should ever be
    // compared against — the first stroke on a newly-visited/newly-created page never jumps.
    lastStrokeBoundsRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    // A resize (window resize, or most commonly a phone rotating) never recomputes zoom —
    // the student's zoom/pan stays exactly where it was regardless of what triggered the
    // resize, fullscreen included (see the fullscreen-toggle effect below for why fullscreen
    // itself no longer recomputes either). Reapplying the existing transform is still needed:
    // .notebook-stage's pixel size changed, so the minimap (computed from the stage's current
    // rect) has to be refreshed even though the zoom/pan numbers themselves don't move.
    function handleResize() {
      applyTransform();
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Refresh the minimap when fullscreen actually toggles: entering or leaving it changes
  // .notebook-stage's actual pixel size dramatically (embedded panel <-> full viewport), and
  // the minimap (computed from the stage's current rect inside applyTransform) needs to catch
  // up — but the zoom/pan themselves are deliberately left untouched, so the student returns
  // to exactly where they were (docs/features/notebook-usability-fixes/, "סבב רוויזיה א׳":
  // the previous revision recomputed a dynamic fit here, which was reverted).
  //
  // Still guarded against firing on mount, even though it no longer touches panZoomRef there
  // — an unconditional call would just be a harmless extra applyTransform() today, but the
  // guard already exists and removing it would be gratuitous churn for no behavior change.
  // Comparing against the *previous actual value*, not a "have I run yet" flag, because a
  // boolean flag gets consumed by StrictMode's dev-only double-invoke of mount effects
  // (mount → cleanup → mount again, same `fullscreen` both times) — comparing values is
  // idempotent instead: both passes see `prevFullscreen.current === fullscreen` and skip.
  const prevFullscreen = useRef(fullscreen);
  useEffect(() => {
    if (prevFullscreen.current === fullscreen) return;
    prevFullscreen.current = fullscreen;
    applyTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  function localPoint(clientX: number, clientY: number) {
    const rect = stackRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scaleX = rect.width / PAGE_WIDTH;
    const scaleY = rect.height / PAGE_HEIGHT;
    return { x: (clientX - rect.left) / scaleX, y: (clientY - rect.top) / scaleY };
  }

  function paintTo(p: { x: number; y: number }) {
    if (!currentPage) return;
    const cells = toolRef.current === "eraser" ? ERASER_CELLS : PEN_CELLS;
    const mode: DrawTool = toolRef.current === "eraser" ? "eraser" : "pen";
    const last = lastPoint.current;
    const points: { x: number; y: number }[] = [];
    if (last) {
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.ceil(dist / (CELL / 2)));
      for (let i = 1; i <= steps; i++) {
        points.push({ x: last.x + (dx * i) / steps, y: last.y + (dy * i) / steps });
      }
    } else {
      points.push(p);
    }
    const ctx = ctxRef.current;
    for (const point of points) {
      const changed = fillCellBlock(currentPage.filledCells, point.x, point.y, cells, mode);
      if (recordingCells.current) recordingCells.current.push(...changed);
      const col = Math.floor(point.x / CELL);
      const row = Math.floor(point.y / CELL);
      extendStrokeBounds(col, row);
      if (ctx) {
        const half = Math.floor(cells / 2);
        const rectX = (col - half) * CELL;
        const rectY = (row - half) * CELL;
        const size = cells * CELL;
        if (mode === "eraser") ctx.clearRect(rectX, rectY, size, size);
        else {
          ctx.fillStyle = inkColor();
          stampCell(ctx, col, row, cells);
        }
      }
    }
    lastPoint.current = p;
  }

  /** Grows the in-progress stroke's bounding box to cover (col, row) — called once per
   *  point painted. A no-op when the setting is off, so "off" costs nothing beyond this one
   *  ref check. See docs/features/notebook-auto-scroll/architecture.md. */
  function extendStrokeBounds(col: number, row: number) {
    if (autoScrollJumpFractionRef.current === null) return;
    const b = strokeBoundsRef.current;
    if (!b) {
      strokeBoundsRef.current = { minCol: col, maxCol: col, minRow: row, maxRow: row };
    } else {
      b.minCol = Math.min(b.minCol, col);
      b.maxCol = Math.max(b.maxCol, col);
      b.minRow = Math.min(b.minRow, row);
      b.maxRow = Math.max(b.maxRow, row);
    }
  }

  type StrokeBounds = { minCol: number; maxCol: number; minRow: number; maxRow: number };

  /**
   * Called once a stroke ends, comparing it against the previous completed stroke. If the
   * gap between their bounding boxes is clearly more than a single character's worth on
   * either axis, the view jumps once — via the same `animateTransformTo` hold-to-zoom
   * already uses for its own one-shot hop, not a continuous scroll. Bounding boxes, not just
   * endpoints: a multi-stroke character (like the digit `4`) can have its second stroke end
   * far from where the first one ended, even though the two strokes sit right next to each
   * other — see architecture.md, Risks/Tradeoffs.
   */
  function maybeJumpForNewStroke(finished: StrokeBounds | null, previous: StrokeBounds | null) {
    const fraction = autoScrollJumpFractionRef.current;
    if (fraction === null || !finished || !previous) return;
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    let dirX: 1 | -1 | 0 = 0;
    let gapCols = 0;
    if (finished.minCol > previous.maxCol) {
      gapCols = finished.minCol - previous.maxCol;
      dirX = -1; // new stroke is to the right — reveal more of the page to the right
    } else if (previous.minCol > finished.maxCol) {
      gapCols = previous.minCol - finished.maxCol;
      dirX = 1; // new stroke is to the left — reveal more of the page to the left
    }
    if (gapCols < AUTO_SCROLL_JUMP_GAP_THRESHOLD_CELLS) dirX = 0;

    let dirY: 1 | -1 | 0 = 0;
    let gapRows = 0;
    if (finished.minRow > previous.maxRow) {
      gapRows = finished.minRow - previous.maxRow;
      dirY = -1; // new stroke is lower — reveal more of the page below
    } else if (previous.minRow > finished.maxRow) {
      gapRows = previous.minRow - finished.maxRow;
      dirY = 1; // new stroke is higher — reveal more of the page above
    }
    if (gapRows < AUTO_SCROLL_JUMP_GAP_THRESHOLD_CELLS) dirY = 0;

    if (dirX === 0 && dirY === 0) return;

    const { panX, panY, zoom } = panZoomRef.current;
    const nextPanX = dirX !== 0 ? clampFollowPanX(panX + dirX * stageRect.width * fraction, zoom, stageRect.width) : panX;
    const nextPanY =
      dirY !== 0 ? clampFollowPanY(panY + dirY * stageRect.height * fraction, zoom, stageRect.height) : panY;
    if (nextPanX === panX && nextPanY === panY) return;
    animateTransformTo({ panX: nextPanX, panY: nextPanY, zoom }, AUTO_SCROLL_JUMP_TRANSITION_MS);
  }

  /** Schedules the "suggested next action" pulse on the hand or pen button, after
   *  `suggestionDelayMs` of stillness — called when a pen stroke just ended (target "pan")
   *  or a pan just ended (target "pen"). "off" (`suggestionDelayMs === null`) never arms
   *  anything, same reasoning as `holdZoomFactorRef`'s own "off" check elsewhere. */
  function armSuggestion(target: "pan" | "pen") {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (suggestionDelayMs === null) return;
    suggestTimer.current = setTimeout(() => setSuggestedTool(target), suggestionDelayMs);
  }

  /** Cancels any pending or active suggestion immediately — real movement started, or a
   *  tool button was pressed, so whatever the page was suggesting is no longer relevant. */
  function clearSuggestion() {
    if (suggestTimer.current) {
      clearTimeout(suggestTimer.current);
      suggestTimer.current = null;
    }
    setSuggestedTool(null);
  }

  function startRecording() {
    recordingCells.current = [];
    if (recordingTimer.current) clearTimeout(recordingTimer.current);
    recordingTimer.current = setTimeout(() => {
      recordingCells.current = null;
    }, PINCH_UNDO_WINDOW_MS);
  }

  function undoRecording() {
    if (recordingTimer.current) clearTimeout(recordingTimer.current);
    if (recordingCells.current && currentPage) {
      const ctx = ctxRef.current;
      if (recordingCells.current.length > 0) notifyContentChanged();
      for (const key of recordingCells.current) {
        currentPage.filledCells.delete(key);
        if (ctx) {
          const [c, r] = key.split(",").map(Number);
          ctx.clearRect(c * CELL, r * CELL, CELL, CELL);
        }
      }
    }
    recordingCells.current = null;
  }

  function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function mid(a: { x: number; y: number }, b: { x: number; y: number }) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // A pointer the browser no longer considers active can throw here — that must
      // never skip the gesture tracking below, or the tool silently stops working.
    }
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.current.size === 1) {
      if (toolRef.current === "pan") {
        // Real movement is starting — whatever was suggested (if anything) no longer
        // applies. See docs/features/notebook-toolbar-redesign/architecture.md.
        clearSuggestion();
        singlePanStart.current = {
          x: e.clientX,
          y: e.clientY,
          panX0: panZoomRef.current.panX,
          panY0: panZoomRef.current.panY,
        };
      } else if (!lockedRef.current) {
        // Once the page has been checked, pen/eraser stop marking it — but panning and
        // pinch-zoom (below) stay live so the student can still look the page over.
        // A new stroke starting also clears any pending suggestion, even the same tool's
        // own — see architecture.md's Risks/Tradeoffs for why this goes beyond what
        // design.md spelled out explicitly.
        clearSuggestion();
        drawing.current = true;
        lastPoint.current = null;
        strokeBoundsRef.current = null;
        startRecording();
        paintTo(localPoint(e.clientX, e.clientY));
      }
      // Armed regardless of the tool branch above — hold-to-zoom is a view-only gesture,
      // independent of pen/eraser/pan and of whether the page is locked. "Off" is the one
      // thing that stops it, and it stops it here rather than by passing a factor of 1:
      // nothing is scheduled, nothing is recorded, so there is no timer to fire, no
      // animation to run, and nothing to clean up — the gesture genuinely isn't there.
      if (holdZoomFactorRef.current !== null) {
        holdZoomPointerId.current = e.pointerId;
        holdZoomDownPos.current = { x: e.clientX, y: e.clientY };
        if (holdZoomTimer.current) clearTimeout(holdZoomTimer.current);
        holdZoomTimer.current = setTimeout(() => triggerHoldZoom(e.pointerId), HOLD_ZOOM_DWELL_MS);
      }
    } else if (activePointers.current.size === 2) {
      // A second pointer means this is a pinch — hold-to-zoom's dwell/held state for the
      // first pointer is discarded outright, not paused: panZoomRef already holds the
      // correct current value (synchronously updated even if already zoomed in), so the
      // pinch just continues from there with no separate snap-back step, and there's no
      // resumption of the temporary zoom once the pinch ends.
      if (holdZoomTimer.current) {
        clearTimeout(holdZoomTimer.current);
        holdZoomTimer.current = null;
      }
      preHoldTransform.current = null;
      holdZoomPointerId.current = null;
      holdZoomDownPos.current = null;
      clearTransition();
      drawing.current = false;
      lastPoint.current = null;
      singlePanStart.current = null;
      // The ink from any in-progress stroke is about to be undone below — its bounds must
      // not survive to be compared against as "the last stroke" for a jump that never
      // actually happened.
      strokeBoundsRef.current = null;
      undoRecording();
      const pts = Array.from(activePointers.current.values());
      const stageRect = stageRef.current?.getBoundingClientRect();
      if (!stageRect) return;
      const startMid = mid(pts[0], pts[1]);
      const startMidStage = { x: startMid.x - stageRect.left, y: startMid.y - stageRect.top };
      const { panX, panY, zoom } = panZoomRef.current;
      pinch.current = {
        startDist: dist(pts[0], pts[1]),
        startZoom: zoom,
        localFixed: { x: (startMidStage.x - panX) / zoom, y: (startMidStage.y - panY) / zoom },
      };
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Real movement before the dwell timer fires cancels hold-to-zoom for this touch,
    // permanently — it can only ever arm at the very start of a touch. A small tolerance
    // absorbs pointer jitter that isn't a real, intentional move (see the constant above).
    if (holdZoomPointerId.current === e.pointerId && holdZoomTimer.current && holdZoomDownPos.current) {
      const moved = Math.hypot(e.clientX - holdZoomDownPos.current.x, e.clientY - holdZoomDownPos.current.y);
      if (moved > HOLD_ZOOM_MOVE_TOLERANCE_PX) {
        clearTimeout(holdZoomTimer.current);
        holdZoomTimer.current = null;
      }
    }
    if (activePointers.current.size === 1) {
      if (singlePanStart.current) {
        const start = singlePanStart.current;
        const stageRect = stageRef.current?.getBoundingClientRect();
        if (!stageRect) return;
        clearTransition();
        panZoomRef.current = clampPan(
          {
            ...panZoomRef.current,
            panX: start.panX0 + (e.clientX - start.x),
            panY: start.panY0 + (e.clientY - start.y),
          },
          stageRect.width,
          stageRect.height,
        );
        applyTransform();
      } else if (drawing.current) {
        paintTo(localPoint(e.clientX, e.clientY));
      }
    } else if (activePointers.current.size === 2 && pinch.current) {
      const pts = Array.from(activePointers.current.values());
      const stageRect = stageRef.current?.getBoundingClientRect();
      if (!stageRect) return;
      const curDist = dist(pts[0], pts[1]);
      const curMid = mid(pts[0], pts[1]);
      const curMidStage = { x: curMid.x - stageRect.left, y: curMid.y - stageRect.top };
      const newZoom = clampZoom(pinch.current.startZoom * (curDist / pinch.current.startDist));
      clearTransition();
      panZoomRef.current = clampPan(
        {
          zoom: newZoom,
          panX: curMidStage.x - pinch.current.localFixed.x * newZoom,
          panY: curMidStage.y - pinch.current.localFixed.y * newZoom,
        },
        stageRect.width,
        stageRect.height,
      );
      applyTransform();
    }
  }

  function endPointer(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!activePointers.current.has(e.pointerId)) return;
    // Covers both pointerup and pointercancel (both call endPointer) — releasing the
    // pointer that held a temporary zoom-in animates back to exactly what was saved
    // right before it started, not a recomputed guess.
    if (holdZoomPointerId.current === e.pointerId) {
      if (holdZoomTimer.current) {
        clearTimeout(holdZoomTimer.current);
        holdZoomTimer.current = null;
      }
      if (preHoldTransform.current) {
        animateTransformTo(preHoldTransform.current, HOLD_ZOOM_TRANSITION_MS);
        preHoldTransform.current = null;
      }
      holdZoomPointerId.current = null;
      holdZoomDownPos.current = null;
    }
    const wasDrawing = drawing.current;
    const wasPanning = singlePanStart.current !== null;
    const finishedStrokeBounds = strokeBoundsRef.current;
    activePointers.current.delete(e.pointerId);
    drawing.current = false;
    lastPoint.current = null;
    singlePanStart.current = null;
    pinch.current = null;
    strokeBoundsRef.current = null;
    if (wasDrawing) {
      notifyContentChanged();
      // Read after any hold-zoom restore above, so a jump lands on top of the correctly
      // restored base view rather than being overwritten by it — see architecture.md.
      maybeJumpForNewStroke(finishedStrokeBounds, lastStrokeBoundsRef.current);
      lastStrokeBoundsRef.current = finishedStrokeBounds;
    }
    // Suggest the next action — a pan that just ended suggests the pen (even over a pen
    // stroke that also just ended, which can't happen on the same pointer anyway); a pen
    // stroke ending on its own suggests the hand. The eraser never arms a suggestion. See
    // docs/features/notebook-toolbar-redesign/architecture.md.
    if (wasPanning) {
      armSuggestion("pen");
    } else if (wasDrawing && toolRef.current === "pen") {
      armSuggestion("pan");
    }
    if (activePointers.current.size === 1) {
      const [, p] = Array.from(activePointers.current.entries())[0];
      if (toolRef.current === "pan") {
        singlePanStart.current = { x: p.x, y: p.y, panX0: panZoomRef.current.panX, panY0: panZoomRef.current.panY };
      } else {
        drawing.current = true;
      }
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;
    const sx = e.clientX - stageRect.left;
    const sy = e.clientY - stageRect.top;
    const target = zoomAroundPoint(panZoomRef.current, sx, sy, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    panZoomRef.current = clampPan(target, stageRect.width, stageRect.height);
    applyTransform();
  }

  function zoomButton(factor: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const target = zoomAroundPoint(panZoomRef.current, rect.width / 2, rect.height / 2, factor);
    panZoomRef.current = clampPan(target, rect.width, rect.height);
    applyTransform();
  }

  /** One press moves the view by panStepPx screen pixels in a direction — symmetric to
   *  `zoomButton` above, sharing the same clampPan() the page's other movement sources go
   *  through, so a button never appears able to move the view somewhere a drag couldn't. */
  function panButton(dx: number, dy: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    clearTransition();
    panZoomRef.current = clampPan(
      { ...panZoomRef.current, panX: panZoomRef.current.panX + dx, panY: panZoomRef.current.panY + dy },
      rect.width,
      rect.height,
    );
    applyTransform();
  }

  /** Whether a press of a directional button in this direction would actually move the
   *  view — reuses clampPan() itself rather than a parallel "am I at the edge" check, so
   *  the disabled state can never disagree with what panButton would really do. */
  function panDisabled(dx: number, dy: number): boolean {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return true;
    const current = panZoomRef.current;
    const attempted = { ...current, panX: current.panX + dx, panY: current.panY + dy };
    const clamped = clampPan(attempted, rect.width, rect.height);
    return clamped.panX === current.panX && clamped.panY === current.panY;
  }

  /** A quick tap: onClick fires once from the button itself. A hold firing this already
   *  means the click that follows release is the same press, not a second one — skip it
   *  rather than panning one extra step. Also the only suggestion-clearing path a keyboard
   *  activation (Enter/Space, no pointerdown at all) ever goes through — see
   *  architecture.md — so it clears on entry and re-arms "pen" on its own, not only via
   *  `stopPanHold`. */
  function panButtonClick(dx: number, dy: number) {
    clearSuggestion();
    if (panHoldFired.current) {
      panHoldFired.current = false;
      return;
    }
    panButton(dx, dy);
    armSuggestion("pen");
  }

  /** Arms on pointerdown: after PAN_HOLD_DELAY_MS of still holding, starts repeating the
   *  step every `panHoldIntervalMs`, stopping itself once that direction is disabled
   *  (reusing panDisabled — the same single source of truth panButton/the disabled prop
   *  already go through) rather than running past the edge and relying on clampPan alone
   *  to silently absorb it. "off" (`panHoldIntervalMs === null`) doesn't arm anything at
   *  all — the press's own onClick already moved one step, and that's all "off" promises. */
  function startPanHold(dx: number, dy: number) {
    clearSuggestion();
    if (panHoldIntervalMs === null) return;
    panHoldFired.current = false;
    panHoldTimer.current = setTimeout(() => {
      panHoldInterval.current = setInterval(() => {
        if (panDisabled(dx, dy)) {
          stopPanHold();
          return;
        }
        panHoldFired.current = true;
        panButton(dx, dy);
      }, panHoldIntervalMs);
    }, PAN_HOLD_DELAY_MS);
  }

  function stopPanHold() {
    if (panHoldTimer.current) {
      clearTimeout(panHoldTimer.current);
      panHoldTimer.current = null;
    }
    if (panHoldInterval.current) {
      clearInterval(panHoldInterval.current);
      panHoldInterval.current = null;
    }
    // Fired on every release (tap or end-of-hold) — the nav-pad equivalent of the drag
    // path's "pan just ended" branch in endPointer. See architecture.md.
    armSuggestion("pen");
  }

  /** Toggle for "הצג את כל הדף" — zooms out to fit the entire page (reusing
   *  `computeFitTransform`, the same "fit the whole page in this box" math the notebook
   *  already relies on elsewhere) on the first press, and restores the exact zoom/pan from
   *  right before that press on the second — not a re-derived guess, the real prior value. */
  function toggleWholePage() {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (viewingWholePage) {
      if (savedTransform.current) panZoomRef.current = savedTransform.current;
      savedTransform.current = null;
      setViewingWholePage(false);
    } else {
      savedTransform.current = panZoomRef.current;
      panZoomRef.current = computeFitTransform(rect.width, rect.height);
      setViewingWholePage(true);
    }
    applyTransform();
  }

  function clearCurrentPageNow() {
    if (!currentPage) return;
    currentPage.filledCells.clear();
    notifyContentChanged();
    redrawFromPage(currentPage);
    setPendingConfirm(null);
    // The ink that made this "the last stroke" is gone — the next stroke on the now-blank
    // page has nothing left to jump relative to.
    lastStrokeBoundsRef.current = null;
  }

  function requestClearPage() {
    if (currentPage && pageHasContent(currentPage)) {
      setPendingConfirm("clear");
    } else {
      clearCurrentPageNow();
    }
  }

  function addPage() {
    if (pages.length >= MAX_PAGES) return;
    const next = [...pages.slice(0, currentPageIndex + 1), createBlankPage(), ...pages.slice(currentPageIndex + 1)];
    onPagesChange(next);
    onCurrentPageIndexChange(currentPageIndex + 1);
  }

  function removeCurrentPageNow() {
    const next = pages.filter((_, i) => i !== currentPageIndex);
    onPagesChange(next);
    onCurrentPageIndexChange(Math.min(currentPageIndex, next.length - 1));
    setPendingConfirm(null);
  }

  function requestRemovePage() {
    if (pages.length <= 1) return;
    if (currentPage && pageHasContent(currentPage)) {
      setPendingConfirm("remove");
    } else {
      removeCurrentPageNow();
    }
  }

  const atMaxPages = pages.length >= MAX_PAGES;

  return (
    <div className={`notebook-screen${fullscreen ? " fullscreen" : ""}`}>
      {fullscreen && topSlot}
      <div className="notebook-topbar">
        <span className="notebook-page-indicator">
          דף {currentPageIndex + 1} מתוך {pages.length}
        </span>
        <span className="notebook-zoom-readout">{zoomPercent}%</span>
      </div>

      {/* .notebook-stage itself stays exactly the clipping pan/zoom viewport it always
          was (several e2e tests already treat it as that — see
          tests/e2e/helpers/notebookAnswer.ts's comment on .notebook-stage{overflow:hidden}
          — so its own class, size and behavior must not change). This outer frame exists
          only so the floating button columns below (siblings of .notebook-stage, not
          children of it) are free to extend past the stage's own box on a short embedded
          view without being clipped to invisible — found during manual verification of
          this feature: the embedded (non-fullscreen) stage can be as short as ~190px,
          too short for the new 5-button zoom column, and .notebook-stage's overflow:hidden
          silently clipped it there, landing its click target on "הסר דף" underneath. See
          docs/features/notebook-toolbar-redesign/status.md. */}
      <div className="notebook-stage-frame">
        <div className="notebook-stage" ref={stageRef} onWheel={handleWheel}>
          <div className="notebook-stack" ref={stackRef}>
            <canvas
              ref={canvasRef}
              className="notebook-canvas"
              aria-label="דף כתיבה במחברת"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
              // Some Android browsers show a context menu on a long press even with
              // touch-action:none — left uncaught, that native menu is one more way a
              // held touch can get interrupted mid hold-to-zoom. See
              // docs/features/notebook-hold-to-zoom/, "עדכון סבב ג׳".
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        </div>
        {/* Moved to the opposite top corner from .notebook-zoom-controls (below) — the
            zoom column takes over top-left per the redesign, so the minimap (purely
            informational, not interactive) moves to top-right instead of stacking under
            it. See docs/features/notebook-toolbar-redesign/. */}
        <div className="notebook-minimap" ref={minimapRef} aria-hidden="true">
          <div className="notebook-minimap-view" ref={minimapViewRef} />
        </div>
        {/* Zoom/fullscreen/whole-page/clear, now one column pinned top-left — see
            docs/features/notebook-toolbar-redesign/design.md for the exact icon order
            (fullscreen first, clear last behind a small gap, not a line). */}
        <div
          className="notebook-zoom-controls"
          style={{ "--notebook-btn-size": `${buttonDiameterPx}px` } as CSSProperties}
        >
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={fullscreen ? "צאו ממסך מלא" : "הגדילו את המחברת למסך מלא"}
          >
            {fullscreen ? "✕" : "⤢"}
          </button>
          <button type="button" onClick={() => zoomButton(1.3)} aria-label="הגדל">
            +
          </button>
          <button type="button" onClick={() => zoomButton(1 / 1.3)} aria-label="הקטן">
            −
          </button>
          <button
            type="button"
            aria-pressed={viewingWholePage}
            onClick={toggleWholePage}
            aria-label={viewingWholePage ? "חזרה לזום הקודם" : "הצגת כל הדף"}
          >
            ⛶
          </button>
          {/* Moved in from .notebook-toolbar — see docs/features/notebook-toolbar-redesign/. */}
          <button type="button" className="notebook-clear-btn" onClick={requestClearPage} aria-label="נקה דף">
            🧹
          </button>
        </div>
        {/* Spatial, not reading-order: these pan the view by its screen-visible direction
            (◀ always shows more of the page's visual left), unlike the ◀/▶ page-nav buttons
            in the toolbar below, which follow page order. The cross shape (not a row) plus
            the separate cluster from page-nav keeps the two meanings from colliding — see
            docs/features/notebook-nav-buttons/design.md. */}
        <div className="notebook-pan-controls">
          <div className="notebook-pan-grid" role="group" aria-label="הזזת התצוגה">
            <button
              type="button"
              className="notebook-pan-up"
              onClick={() => panButtonClick(0, panStepPx)}
              onPointerDown={() => startPanHold(0, panStepPx)}
              onPointerUp={stopPanHold}
              onPointerLeave={stopPanHold}
              onPointerCancel={stopPanHold}
              disabled={panDisabled(0, panStepPx)}
              aria-label="הזז למעלה"
            >
              ▲
            </button>
            <button
              type="button"
              className="notebook-pan-left"
              onClick={() => panButtonClick(panStepPx, 0)}
              onPointerDown={() => startPanHold(panStepPx, 0)}
              onPointerUp={stopPanHold}
              onPointerLeave={stopPanHold}
              onPointerCancel={stopPanHold}
              disabled={panDisabled(panStepPx, 0)}
              aria-label="הזז שמאלה"
            >
              ◀
            </button>
            <button
              type="button"
              className="notebook-pan-right"
              onClick={() => panButtonClick(-panStepPx, 0)}
              onPointerDown={() => startPanHold(-panStepPx, 0)}
              onPointerUp={stopPanHold}
              onPointerLeave={stopPanHold}
              onPointerCancel={stopPanHold}
              disabled={panDisabled(-panStepPx, 0)}
              aria-label="הזז ימינה"
            >
              ▶
            </button>
            <button
              type="button"
              className="notebook-pan-down"
              onClick={() => panButtonClick(0, -panStepPx)}
              onPointerDown={() => startPanHold(0, -panStepPx)}
              onPointerUp={stopPanHold}
              onPointerLeave={stopPanHold}
              onPointerCancel={stopPanHold}
              disabled={panDisabled(0, -panStepPx)}
              aria-label="הזז למטה"
            >
              ▼
            </button>
          </div>
        </div>
        {/* Tool switcher, moved out of .notebook-toolbar into its own corner column — see
            docs/features/notebook-toolbar-redesign/. Same bottom-end corner as
            .notebook-pan-controls (per design.md), positioned beside it rather than
            stacked above it — see the CSS for why. */}
        <div
          className="notebook-tool-controls"
          role="group"
          aria-label="כלי כתיבה"
          style={{ "--notebook-btn-size": `${buttonDiameterPx}px` } as CSSProperties}
        >
          <button
            type="button"
            className="tool-btn"
            aria-pressed={tool === "pan"}
            data-suggested={suggestedTool === "pan"}
            onClick={() => {
              clearSuggestion();
              setTool("pan");
            }}
            aria-label="הזזה"
          >
            ✋
          </button>
          <button
            type="button"
            className="tool-btn"
            aria-pressed={tool === "pen"}
            data-suggested={suggestedTool === "pen"}
            onClick={() => {
              clearSuggestion();
              setTool("pen");
            }}
            aria-label="עט"
          >
            ✏️
          </button>
          <button
            type="button"
            className="tool-btn"
            aria-pressed={tool === "eraser"}
            onClick={() => {
              clearSuggestion();
              setTool("eraser");
            }}
            aria-label="מחק"
          >
            🧽
          </button>
        </div>
      </div>

      {fullscreen && statusSlot}

      <div className="notebook-toolbar">
        {/* Prev/next page-nav, add-page and remove-page only — the pen/eraser/pan tool group
            moved to .notebook-tool-controls above. See docs/features/notebook-toolbar-redesign/. */}
        <div className="notebook-page-nav">
          <button
            type="button"
            onClick={() => onCurrentPageIndexChange(currentPageIndex - 1)}
            disabled={currentPageIndex === 0}
            aria-label="דף קודם"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => onCurrentPageIndexChange(currentPageIndex + 1)}
            disabled={currentPageIndex === pages.length - 1}
            aria-label="דף הבא"
          >
            ▶
          </button>
        </div>
        <div className="notebook-page-nav">
          <button type="button" onClick={addPage} disabled={atMaxPages} aria-label="דף חדש">
            +
          </button>
        </div>
        {/* "נקה דף" moved to .notebook-zoom-controls (see above) — "הסר דף" is the more
            destructive of the two and stays here, furthest from the writing tools. The
            page-nav group above already sits at this far edge (see
            .notebook-page-nav:last-of-type's margin-inline-start:auto), so placing it after
            them keeps it at that same edge with no extra CSS. */}
        <button
          type="button"
          className="notebook-remove-btn"
          onClick={requestRemovePage}
          disabled={pages.length <= 1}
          aria-label="הסר דף"
        >
          🗑
        </button>
      </div>
      {/* The question's one main action ("שלח למורה" / "הבא") lives in its own row, not among
          the tools: see docs/features/notebook-toolbar-actions/. */}
      <div className="notebook-action-row">
        <button
          type="button"
          className="notebook-send-btn"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
        >
          {primaryAction.label}
        </button>
      </div>
      {atMaxPages && <p className="notebook-max-pages-note">הגעתם למספר המרבי של דפים במחברת הזאת.</p>}

      {pendingConfirm && (
        <div className="notebook-confirm-backdrop">
          <div className="notebook-confirm-dialog" role="alertdialog" aria-modal="true">
            <p>
              {pendingConfirm === "remove"
                ? "למחוק את הדף? מה שכתוב עליו יימחק ולא ניתן יהיה לשחזר אותו."
                : "למחוק את מה שכתוב בדף? לא ניתן יהיה לשחזר."}
            </p>
            <div className="notebook-confirm-actions">
              <button
                type="button"
                className="notebook-confirm-delete"
                onClick={pendingConfirm === "remove" ? removeCurrentPageNow : clearCurrentPageNow}
              >
                מחיקה
              </button>
              <button type="button" className="secondary" onClick={() => setPendingConfirm(null)}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
