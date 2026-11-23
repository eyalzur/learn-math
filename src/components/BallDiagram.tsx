import { useEffect, useState } from "react";
import type { BallDiagram as BallDiagramData } from "../data/ballDiagram";

const CELL = 26;
const COLS = 5;
const DOT_R = 9;
const PAD = 14;
/** How far the "mobile" group sits from its base position while separate from the
 *  stationary one. A fixed pixel value, not computed from CELL, so it stays in sync with
 *  the matching `.bd-group.bd-shifted` transform in src/App.css without a shared constant
 *  the two files would have to agree on at build time. */
const OFFSET = 46;

type Phase = "start" | "settled";

/** Cell centres of a row-of-`COLS` grid, `count` cells, top-left corner at (x, y). Same
 *  idiom as TenFrame's `gridCells`. */
const gridCells = (x: number, y: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    key: i,
    cx: x + (i % COLS) * CELL + CELL / 2,
    cy: y + Math.floor(i / COLS) * CELL + CELL / 2,
  }));

interface Layout {
  width: number;
  height: number;
  /** Never moves, never changes fill — the operand that's already "settled" either way. */
  stationary: { key: number; cx: number; cy: number }[];
  /** The `b` balls that join (addition) or leave (subtraction) — same base grid slots as
   *  a direct continuation of `stationary`, so the two groups read as one pile whenever
   *  they sit at the same offset. */
  mobile: { key: number; cx: number; cy: number }[];
}

/** The picture's geometry — always sized to fit the wider of its two phases (the base
 *  grid plus the mobile group's possible offset), so nothing is clipped either way. */
function layout(diagram: BallDiagramData): Layout {
  const { op, a, b } = diagram;
  const total = op === "add" ? a + b : a;
  const stationaryCount = op === "add" ? a : a - b;
  const rows = Math.max(1, Math.ceil(total / COLS));
  const cols = Math.min(COLS, Math.max(total, 1));
  const width = cols * CELL + OFFSET + PAD * 2;
  const height = rows * CELL + PAD * 2;
  const cells = gridCells(PAD, PAD, total);
  return {
    width,
    height,
    stationary: cells.slice(0, stationaryCount),
    mobile: cells.slice(stationaryCount),
  };
}

/** Whether the mobile group sits at its offset position, and whether it's filled, for a
 *  given op and phase.
 *
 *  Addition: the second operand starts pulled apart and outlined ("a separate pile"),
 *  and settles merged and filled ("now part of the sum").
 *  Subtraction: the subtrahend starts merged and filled ("one pile"), and settles pulled
 *  apart and outlined ("taken out"). */
function mobileState(op: BallDiagramData["op"], phase: Phase): { shifted: boolean; filled: boolean } {
  if (op === "add") {
    return phase === "start" ? { shifted: true, filled: false } : { shifted: false, filled: true };
  }
  return phase === "start" ? { shifted: false, filled: true } : { shifted: true, filled: false };
}

interface BallGroupSvgProps {
  diagram: BallDiagramData;
  phase: Phase;
  hidden?: boolean;
}

/** One static (or, left to CSS, animatable) snapshot of the picture at a given phase. The
 *  same markup renders every phase — only the class names driving fill/transform differ —
 *  so the animated path and the reduced-motion static pair can't drift apart. */
function BallGroupSvg({ diagram, phase, hidden }: BallGroupSvgProps) {
  const { width, height, stationary, mobile } = layout(diagram);
  const { shifted, filled } = mobileState(diagram.op, phase);

  return (
    <svg
      className="ball-diagram"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible" }}
      aria-hidden={hidden ? "true" : undefined}
    >
      {stationary.map((c) => (
        <circle key={`s-${c.key}`} className="bd-ball filled" cx={c.cx} cy={c.cy} r={DOT_R} />
      ))}
      <g className={shifted ? "bd-group bd-shifted" : "bd-group"}>
        {mobile.map((c) => (
          <circle
            key={`m-${c.key}`}
            className={filled ? "bd-ball filled" : "bd-ball"}
            cx={c.cx}
            cy={c.cy}
            r={DOT_R}
          />
        ))}
      </g>
    </svg>
  );
}

interface BallDiagramProps {
  diagram: BallDiagramData;
  /** Read out by a screen reader in place of the picture — the same string shown as the
   *  figcaption outside this component, backticks already stripped by the caller. */
  label: string;
}

/**
 * An animated ball-pile: two groups that merge (addition) or split (subtraction), via a
 * plain CSS transition on `transform`/`fill` — no `@keyframes`, no animation library.
 *
 * Plays once, settling permanently, the moment this mounts (which is the moment the
 * wrong-answer explanation panel opens — there's no earlier point it could start). Under
 * `prefers-reduced-motion`, it never animates at all: it shows the start and the settled
 * state as two separate, permanently static pictures instead, each labelled.
 */
export function BallDiagram({ diagram, label }: BallDiagramProps) {
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  const [phase, setPhase] = useState<Phase>("start");

  useEffect(() => {
    if (reduced) return;
    // One frame so the browser commits the "start" look before the class change that
    // drives the transition — flipping synchronously on mount can land in the same
    // frame and never be seen as a change at all.
    const id = requestAnimationFrame(() => setPhase("settled"));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  if (reduced) {
    return (
      <div className="ball-diagram-frames" role="img" aria-label={label}>
        <div className="ball-diagram-frame">
          <span className="ball-diagram-frame-label" aria-hidden="true">
            לפני
          </span>
          <BallGroupSvg diagram={diagram} phase="start" hidden />
        </div>
        <div className="ball-diagram-frame">
          <span className="ball-diagram-frame-label" aria-hidden="true">
            אחרי
          </span>
          <BallGroupSvg diagram={diagram} phase="settled" hidden />
        </div>
      </div>
    );
  }

  return (
    <div role="img" aria-label={label}>
      <BallGroupSvg diagram={diagram} phase={phase} />
    </div>
  );
}
