import { useEffect, useReducer, useRef, useState } from "react";
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
  createBlankPage,
  fillCellBlock,
  minimapViewRect,
  pageHasContent,
  zoomAroundPoint,
} from "../data/notebook";
import { readPageWithTeacher, type TeacherReading } from "../lib/notebookServer";
import { speak, speechParts, speechSupported, stopSpeaking } from "../data/speech";

interface PracticeNotebookProps {
  pages: NotebookPage[];
  currentPageIndex: number;
  onPagesChange: (pages: NotebookPage[]) => void;
  onCurrentPageIndexChange: (index: number) => void;
  onClose: () => void;
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
  onClose,
}: PracticeNotebookProps) {
  const [tool, setTool] = useState<DrawTool | "pan">("pen");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [sendState, setSendState] = useState<"idle" | "sending" | "error">("idle");
  const [teacherResult, setTeacherResult] = useState<TeacherReading | null>(null);
  const [teacherSpeaking, setTeacherSpeaking] = useState(false);

  // Drawing mutates currentPage.filledCells directly through refs, on purpose (see the
  // comment on panZoomRef above) — a pointermove can fire dozens of times a second, and
  // re-rendering React for each one would defeat that. But "does the page have content"
  // (canSendToTeacher below) is read at render time, so something still has to tell React
  // a render is due once a stroke actually finishes — this is that something.
  const [, notifyContentChanged] = useReducer((c: number) => c + 1, 0);

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

  // Leaving the notebook mid-reading must not leave a voice talking over whatever screen
  // comes next — same reasoning as Practice.tsx's identical cleanup.
  useEffect(() => stopSpeaking, []);

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

    if (stageRef.current) {
      const rect = stageRef.current.getBoundingClientRect();
      panZoomRef.current = { zoom: 1, panX: (rect.width - PAGE_WIDTH) / 2, panY: 20 };
    }
    applyTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw whenever the visible page changes (navigation, or a page was added/removed
  // out from under the currently-viewed index).
  useEffect(() => {
    if (currentPage) redrawFromPage(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    function handleResize() {
      applyTransform();
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      } else {
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

  function fitToScreen() {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    panZoomRef.current = computeFitTransform(rect.width, rect.height);
    applyTransform();
  }

  function clearCurrentPage() {
    if (!currentPage) return;
    currentPage.filledCells.clear();
    notifyContentChanged();
    redrawFromPage(currentPage);
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
    setConfirmDelete(false);
  }

  function requestRemovePage() {
    if (pages.length <= 1) return;
    if (currentPage && pageHasContent(currentPage)) {
      setConfirmDelete(true);
    } else {
      removeCurrentPageNow();
    }
  }

  async function sendToTeacher() {
    if (!currentPage) return;
    setSendState("sending");
    try {
      const result = await readPageWithTeacher(currentPage);
      setTeacherResult(result);
      setSendState("idle");
    } catch {
      setSendState("error");
    }
  }

  function closeTeacherResult() {
    stopSpeaking();
    setTeacherSpeaking(false);
    setTeacherResult(null);
  }

  function toggleTeacherSpeech() {
    if (teacherSpeaking) {
      stopSpeaking();
      setTeacherSpeaking(false);
      return;
    }
    if (!teacherResult || !teacherResult.reading.certain) return;
    const { question, answer } = teacherResult.reading;
    setTeacherSpeaking(true);
    speak(speechParts([`מה שכתבת: \`${question}\`.`, `התשובה שרשמת: \`${answer}\`.`]), () => setTeacherSpeaking(false));
  }

  const atMaxPages = pages.length >= MAX_PAGES;
  const canSendToTeacher = !!currentPage && pageHasContent(currentPage) && sendState !== "sending";

  return (
    <div className="notebook-screen">
      <div className="notebook-topbar">
        <button type="button" className="link-button" onClick={onClose}>
          ← חזרה לתרגול
        </button>
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
          <button type="button" onClick={fitToScreen} aria-label="הצג את כל הדף במסך אחד">
            ⤢
          </button>
        </div>
      </div>

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
        <button type="button" className="notebook-clear-btn" onClick={clearCurrentPage}>
          נקה דף
        </button>
        <button type="button" className="notebook-send-btn" onClick={sendToTeacher} disabled={!canSendToTeacher}>
          {sendState === "sending" ? "המורה קוראת..." : "שלח למורה"}
        </button>
        <div className="notebook-page-nav">
          <button type="button" onClick={() => onCurrentPageIndexChange(currentPageIndex - 1)} disabled={currentPageIndex === 0}>
            ◀ דף קודם
          </button>
          <button type="button" onClick={addPage} disabled={atMaxPages}>
            + דף חדש
          </button>
          <button type="button" className="notebook-remove-btn" onClick={requestRemovePage} disabled={pages.length <= 1}>
            🗑 הסר דף
          </button>
          <button
            type="button"
            onClick={() => onCurrentPageIndexChange(currentPageIndex + 1)}
            disabled={currentPageIndex === pages.length - 1}
          >
            דף הבא ▶
          </button>
        </div>
      </div>
      {atMaxPages && <p className="notebook-max-pages-note">הגעתם למספר המרבי של דפים במחברת הזאת.</p>}
      {sendState === "error" && (
        <p className="notebook-send-error" aria-live="polite">
          לא הצלחנו לשלוח את הדף. נסו שוב.
        </p>
      )}

      {teacherResult && (
        <div className="notebook-confirm-backdrop">
          <div className="notebook-confirm-dialog notebook-image-dialog" role="alertdialog" aria-modal="true">
            <h2>זה הדף שהמורה מסתכל עליו</h2>
            <img
              src={teacherResult.imageDataUrl}
              alt="הדף שכתבתם, כפי שהמורה רואה אותו"
              className="notebook-server-image"
            />
            <div className="teacher-reading">
              <div className="teacher-reading-header">
                <h3>מה המורה הבינה</h3>
                {teacherResult.reading.certain && speechSupported() && (
                  <button
                    type="button"
                    className="speak-button"
                    onClick={toggleTeacherSpeech}
                    aria-label={teacherSpeaking ? "עצרו את ההקראה" : "הקריאו לי את מה שהמורה הבינה"}
                  >
                    {teacherSpeaking ? "⏹" : "🔊"}
                  </button>
                )}
              </div>
              {teacherResult.reading.certain ? (
                <>
                  <p className="teacher-reading-line">
                    <span>מה שכתבת: </span>
                    <span className="prompt-math">{teacherResult.reading.question}</span>
                  </p>
                  <p className="teacher-reading-line">
                    <span>התשובה שרשמת: </span>
                    <span className="prompt-math">{teacherResult.reading.answer}</span>
                  </p>
                </>
              ) : (
                <p className="teacher-reading-line">לא הצלחתי לקרוא את זה בבירור. אפשר לכתוב שוב, קצת יותר גדול או ברור?</p>
              )}
            </div>
            <div className="notebook-confirm-actions">
              <button type="button" className="secondary" onClick={closeTeacherResult}>
                סגירה
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="notebook-confirm-backdrop">
          <div className="notebook-confirm-dialog" role="alertdialog" aria-modal="true">
            <p>למחוק את הדף? מה שכתוב עליו יימחק ולא ניתן יהיה לשחזר אותו.</p>
            <div className="notebook-confirm-actions">
              <button type="button" className="notebook-confirm-delete" onClick={removeCurrentPageNow}>
                מחיקה
              </button>
              <button type="button" className="secondary" onClick={() => setConfirmDelete(false)}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
