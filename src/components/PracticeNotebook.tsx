import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { DrawTool, NotebookPage, PanZoom } from "../data/notebook";
import {
  CELL,
  ERASER_CELLS,
  MAX_PAGES,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PEN_CELLS,
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
}: PracticeNotebookProps) {
  const [tool, setTool] = useState<DrawTool | "pan">("pen");
  /** Which destructive action, if any, is waiting on confirmation — "remove" (a whole page)
   *  or "clear" (everything drawn on the current page). One dialog, two copies of the
   *  question, never both pending at once. */
  const [pendingConfirm, setPendingConfirm] = useState<"remove" | "clear" | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  /** Whether "הצג את כל הדף" is currently zoomed out to fit the whole page — a toggle, not
   *  a mode this component enters automatically. `savedTransform` is what a second press
   *  restores: the exact zoom/pan from right before the first press, not a re-derived guess. */
  const [viewingWholePage, setViewingWholePage] = useState(false);
  const savedTransform = useRef<PanZoom | null>(null);

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

  const currentPage = pages[currentPageIndex];

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  function inkColor() {
    return getComputedStyle(document.documentElement).getPropertyValue("--text-h").trim() || "#08060d";
  }

  function applyTransform() {
    const { panX, panY, zoom } = panZoomRef.current;
    if (stackRef.current) {
      stackRef.current.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    }
    setZoomPercent(Math.round(zoom * 100));
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
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
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

  // Redraw whenever the visible page changes (navigation, or a page was added/removed
  // out from under the currently-viewed index). Also drops out of "הצג את כל הדף" — a
  // memory of "the zoom/pan before I zoomed out" that belongs to the page it was captured
  // on, not to whichever page happens to be visible when the button is pressed again.
  useEffect(() => {
    if (currentPage) redrawFromPage(currentPage);
    setViewingWholePage(false);
    savedTransform.current = null;
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
      if (ctx) {
        const col = Math.floor(point.x / CELL);
        const row = Math.floor(point.y / CELL);
        const half = Math.floor(cells / 2);
        const rectX = (col - half) * CELL;
        const rectY = (row - half) * CELL;
        const size = cells * CELL;
        if (mode === "eraser") ctx.clearRect(rectX, rectY, size, size);
        else {
          ctx.fillStyle = inkColor();
          ctx.fillRect(rectX, rectY, size, size);
        }
      }
    }
    lastPoint.current = p;
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
        singlePanStart.current = {
          x: e.clientX,
          y: e.clientY,
          panX0: panZoomRef.current.panX,
          panY0: panZoomRef.current.panY,
        };
      } else if (!lockedRef.current) {
        // Once the page has been checked, pen/eraser stop marking it — but panning and
        // pinch-zoom (below) stay live so the student can still look the page over.
        drawing.current = true;
        lastPoint.current = null;
        startRecording();
        paintTo(localPoint(e.clientX, e.clientY));
      }
    } else if (activePointers.current.size === 2) {
      drawing.current = false;
      lastPoint.current = null;
      singlePanStart.current = null;
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
    if (activePointers.current.size === 1) {
      if (singlePanStart.current) {
        const start = singlePanStart.current;
        panZoomRef.current = {
          ...panZoomRef.current,
          panX: start.panX0 + (e.clientX - start.x),
          panY: start.panY0 + (e.clientY - start.y),
        };
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
      panZoomRef.current = {
        zoom: newZoom,
        panX: curMidStage.x - pinch.current.localFixed.x * newZoom,
        panY: curMidStage.y - pinch.current.localFixed.y * newZoom,
      };
      applyTransform();
    }
  }

  function endPointer(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!activePointers.current.has(e.pointerId)) return;
    const wasDrawing = drawing.current;
    activePointers.current.delete(e.pointerId);
    drawing.current = false;
    lastPoint.current = null;
    singlePanStart.current = null;
    pinch.current = null;
    if (wasDrawing) notifyContentChanged();
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
    panZoomRef.current = zoomAroundPoint(panZoomRef.current, sx, sy, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    applyTransform();
  }

  function zoomButton(factor: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    panZoomRef.current = zoomAroundPoint(panZoomRef.current, rect.width / 2, rect.height / 2, factor);
    applyTransform();
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
          />
        </div>
        <div className="notebook-minimap" ref={minimapRef} aria-hidden="true">
          <div className="notebook-minimap-view" ref={minimapViewRef} />
        </div>
        <div className="notebook-zoom-controls">
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
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={fullscreen ? "צאו ממסך מלא" : "הגדילו את המחברת למסך מלא"}
          >
            {fullscreen ? "✕" : "⤢"}
          </button>
        </div>
      </div>

      {fullscreen && statusSlot}

      <div className="notebook-toolbar">
        <div className="tool-group" role="group" aria-label="כלי כתיבה">
          <button
            type="button"
            className="tool-btn"
            aria-pressed={tool === "pen"}
            onClick={() => setTool("pen")}
            aria-label="עט"
          >
            ✏️
          </button>
          <button
            type="button"
            className="tool-btn"
            aria-pressed={tool === "eraser"}
            onClick={() => setTool("eraser")}
            aria-label="מחק"
          >
            🧽
          </button>
          <button
            type="button"
            className="tool-btn"
            aria-pressed={tool === "pan"}
            onClick={() => setTool("pan")}
            aria-label="הזזה"
          >
            ✋
          </button>
        </div>
        <button
          type="button"
          className="notebook-send-btn"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
        >
          {primaryAction.label}
        </button>
        {/* Prev/next stay right after "שלח למורה" — the page-nav actions actually used while
            solving. Add/remove page (below) come last: used far less often, so they're the
            ones that scroll out of view first if the row doesn't fully fit. */}
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
        {/* Furthest from the pen/eraser/pan tool-group on purpose — increasingly destructive
            actions least likely to be hit by accident while reaching for the writing tools.
            The page-nav group above already sits at this same far edge (see
            .notebook-page-nav:last-of-type's margin-inline-start:auto), so placing these
            after it keeps them at that same edge with no extra CSS. "נקה דף" (clears this
            page's content) sits before "הסר דף" (removes the whole page, the more severe
            of the two) — the more severe action is the very last, hardest-to-reach button. */}
        <button type="button" className="notebook-clear-btn" onClick={requestClearPage} aria-label="נקה דף">
          🧹
        </button>
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
