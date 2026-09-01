import type { AngleShape as AngleShapeData } from "../data/angleShape";

const WIDTH = 280;
const HEIGHT = 170;

interface Pt {
  x: number;
  y: number;
}

/** A point at distance `r` from `c`, at `deg` degrees measured counter-clockwise from the
 *  positive x-axis (ordinary maths convention) — the y-flip that makes that true on
 *  screen (SVG y grows downward) lives in this one place. */
function pointAt(c: Pt, r: number, deg: number): Pt {
  const rad = (deg * Math.PI) / 180;
  return { x: c.x + r * Math.cos(rad), y: c.y - r * Math.sin(rad) };
}

/** The direction from one point to another, in the same convention as `pointAt` — the
 *  inverse of it. */
function angleOfDeg(from: Pt, to: Pt): number {
  return (Math.atan2(-(to.y - from.y), to.x - from.x) * 180) / Math.PI;
}

/** Degrees from `fromDeg` to `toDeg`, taking whichever of the two directions is shorter —
 *  always in `(-180, 180]`. Shared by every arc and every midpoint label in this file, so
 *  an angle drawn the "long way round" can't happen by accident. */
function shortDelta(fromDeg: number, toDeg: number): number {
  let d = toDeg - fromDeg;
  while (d <= -180) d += 360;
  while (d > 180) d -= 360;
  return d;
}

/** A polyline approximation of the arc from `fromDeg` to `toDeg` — not a true SVG arc
 *  command, deliberately: a handful of straight segments looks identical at this size and
 *  sidesteps the large-arc/sweep flags a real `A` command would need to get right for
 *  every one of this file's five shapes. */
function arcPath(c: Pt, r: number, fromDeg: number, toDeg: number, steps = 12): string {
  const d = shortDelta(fromDeg, toDeg);
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) pts.push(pointAt(c, r, fromDeg + (d * i) / steps));
  return `M ${pts.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
}

function midDeg(fromDeg: number, toDeg: number): number {
  return fromDeg + shortDelta(fromDeg, toDeg) / 2;
}

/** A short perpendicular hash mark at the midpoint of a segment — the standard "these two
 *  sides are equal/corresponding" tick, shared by the congruent-triangles and
 *  isosceles-triangle drawings. */
function tickMark(p1: Pt, p2: Pt, length = 9): string {
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const perpDeg = angleOfDeg(p1, p2) + 90;
  const a = pointAt(mid, length / 2, perpDeg);
  const b = pointAt(mid, length / 2, perpDeg + 180);
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

interface AngleShapeProps {
  shape: AngleShapeData;
  /** Read out by a screen reader in place of the picture. */
  label: string;
}

export function AngleShape({ shape, label }: AngleShapeProps) {
  let body;

  if (shape.kind === "straightAngle") {
    const vertex: Pt = { x: 140, y: 130 };
    const rayLen = 95;
    const end0 = pointAt(vertex, rayLen, 0);
    const endTotal = pointAt(vertex, rayLen, shape.total);
    const endKnown = pointAt(vertex, rayLen, shape.known);
    body = (
      <>
        <path className="as-line" d={`M ${end0.x} ${end0.y} L ${vertex.x} ${vertex.y} L ${endTotal.x} ${endTotal.y}`} />
        <path className="as-line" d={`M ${vertex.x} ${vertex.y} L ${endKnown.x} ${endKnown.y}`} />
        {shape.total === 90 && (
          <path
            className="as-right-angle"
            d={`M ${vertex.x + 14} ${vertex.y} L ${vertex.x + 14} ${vertex.y - 14} L ${vertex.x} ${vertex.y - 14}`}
          />
        )}
        <path className="as-arc" d={arcPath(vertex, 28, 0, shape.known)} />
        <path className="as-arc" d={arcPath(vertex, 42, shape.known, shape.total)} />
        <text {...labelAt(pointAt(vertex, 40, midDeg(0, shape.known)))}>{`${shape.known}°`}</text>
        <text {...labelAt(pointAt(vertex, 56, midDeg(shape.known, shape.total)))}>?</text>
      </>
    );
  } else if (shape.kind === "triangleAngles") {
    const A: Pt = { x: 140, y: 38 };
    const B: Pt = { x: 68, y: 142 };
    const C: Pt = { x: 212, y: 142 };
    const extended = shape.exterior ? pointAt(C, 55, angleOfDeg(B, C)) : null;
    body = (
      <>
        <path className="as-line" d={`M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C.x} ${C.y} Z`} />
        {extended && (
          <path className="as-dashed" d={`M ${C.x} ${C.y} L ${extended.x} ${extended.y}`} />
        )}
        <text {...labelAt(pointAt(A, 26, angleOfDeg(A, B) + shortDelta(angleOfDeg(A, B), angleOfDeg(A, C)) / 2))}>
          {`${shape.angleA}°`}
        </text>
        <text {...labelAt(pointAt(B, 26, angleOfDeg(B, A) + shortDelta(angleOfDeg(B, A), angleOfDeg(B, C)) / 2))}>
          {`${shape.angleB}°`}
        </text>
        {!shape.exterior && (
          <text {...labelAt(pointAt(C, 26, angleOfDeg(C, B) + shortDelta(angleOfDeg(C, B), angleOfDeg(C, A)) / 2))}>
            ?
          </text>
        )}
        {extended && (
          <>
            <path className="as-arc" d={arcPath(C, 24, angleOfDeg(C, A), angleOfDeg(C, extended))} />
            <text {...labelAt(pointAt(C, 40, midDeg(angleOfDeg(C, A), angleOfDeg(C, extended))))}>?</text>
          </>
        )}
      </>
    );
  } else if (shape.kind === "parallelLines") {
    const P1: Pt = { x: 100, y: 55 };
    const cDir = -shape.known;
    const P2 = pointAt(P1, 85, cDir);
    const lineA = {
      from: { x: P1.x - 95, y: P1.y },
      to: { x: P1.x + 95, y: P1.y },
    };
    const lineB = {
      from: { x: P2.x - 95, y: P2.y },
      to: { x: P2.x + 95, y: P2.y },
    };
    const cStart = pointAt(P1, 22, cDir + 180);
    const cEnd = pointAt(P2, 22, cDir);
    // The second arc's position is the geometric fact this picture illustrates: the same
    // straight transversal, at the same P1→P2 direction, puts corresponding/alternate/
    // co-interior angles at these specific rays relative to line b — not a stand-in
    // drawing, the actual angle relation named in the caption.
    const secondArc =
      shape.relation === "corresponding"
        ? { from: 0, to: cDir }
        : shape.relation === "alternate"
          ? { from: 180, to: 180 + cDir }
          : { from: 0, to: 180 + cDir }; // coInterior
    body = (
      <>
        <path className="as-line" d={`M ${lineA.from.x} ${lineA.from.y} L ${lineA.to.x} ${lineA.to.y}`} />
        <path className="as-line" d={`M ${lineB.from.x} ${lineB.from.y} L ${lineB.to.x} ${lineB.to.y}`} />
        <path className="as-line" d={`M ${cStart.x} ${cStart.y} L ${cEnd.x} ${cEnd.y}`} />
        {/* Small parallel-mark chevrons on both lines — the ">" convention for "these two
            are parallel", away from where the transversal crosses. */}
        {[lineA, lineB].map((line, i) => {
          const at = { x: line.from.x + 18, y: line.from.y };
          const t1 = pointAt(at, 7, 200);
          const t2 = pointAt(at, 7, 160);
          return (
            <path
              key={i}
              className="as-line"
              d={`M ${t1.x} ${t1.y} L ${at.x} ${at.y} L ${t2.x} ${t2.y}`}
            />
          );
        })}
        <path className="as-arc" d={arcPath(P1, 26, 0, cDir)} />
        <text {...labelAt(pointAt(P1, 42, midDeg(0, cDir)))}>{`${shape.known}°`}</text>
        <path className="as-arc" d={arcPath(P2, 26, secondArc.from, secondArc.to)} />
        <text {...labelAt(pointAt(P2, 42, midDeg(secondArc.from, secondArc.to)))}>?</text>
      </>
    );
  } else if (shape.kind === "congruentTriangles") {
    const A: Pt = { x: 70, y: 40 };
    const B: Pt = { x: 15, y: 140 };
    const C1: Pt = { x: 125, y: 140 };
    const E: Pt = { x: 215, y: 40 };
    const D: Pt = { x: 160, y: 140 };
    const C2: Pt = { x: 270, y: 140 };
    body = (
      <>
        <path className="as-line" d={`M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C1.x} ${C1.y} Z`} />
        <path className="as-line" d={`M ${E.x} ${E.y} L ${D.x} ${D.y} L ${C2.x} ${C2.y} Z`} />
        <text {...labelAt({ x: A.x, y: A.y - 8 })}>A</text>
        <text {...labelAt({ x: B.x - 10, y: B.y + 4 })}>B</text>
        <text {...labelAt({ x: C1.x + 8, y: C1.y + 4 })}>C</text>
        <text {...labelAt({ x: E.x, y: E.y - 8 })}>E</text>
        <text {...labelAt({ x: D.x - 10, y: D.y + 4 })}>D</text>
        <text {...labelAt({ x: C2.x + 8, y: C2.y + 4 })}>C</text>
        {shape.valueKind === "side" ? (
          <>
            <path className="as-tick" d={tickMark(A, B)} />
            <path className="as-tick" d={tickMark(E, D)} />
            <text {...labelAt(midpoint(A, B), -8)}>{`${shape.value}`}</text>
            <text {...labelAt(midpoint(E, D), -8)}>?</text>
          </>
        ) : (
          <>
            <path className="as-arc" d={arcPath(A, 18, angleOfDeg(A, B), angleOfDeg(A, C1))} />
            <path className="as-arc" d={arcPath(E, 18, angleOfDeg(E, D), angleOfDeg(E, C2))} />
            <text {...labelAt(pointAt(A, 30, midDeg(angleOfDeg(A, B), angleOfDeg(A, C1))))}>{`${shape.value}°`}</text>
            <text {...labelAt(pointAt(E, 30, midDeg(angleOfDeg(E, D), angleOfDeg(E, C2))))}>?</text>
          </>
        )}
      </>
    );
  } else {
    // isoscelesTriangle
    const A: Pt = { x: 140, y: 35 };
    const B: Pt = { x: 60, y: 145 };
    const C: Pt = { x: 220, y: 145 };
    const D: Pt = { x: 140, y: 145 };
    const apexLabel = shape.variant === "baseFromApex" ? `${shape.given}°` : "?";
    const baseLabel = shape.variant === "baseFromApex" ? "?" : `${shape.given}°`;
    body = (
      <>
        <path className="as-line" d={`M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C.x} ${C.y} Z`} />
        <path className="as-tick" d={tickMark(A, B)} />
        <path className="as-tick" d={tickMark(A, C)} />
        {shape.variant === "medianRightAngle" ? (
          <>
            <path className="as-line" d={`M ${A.x} ${A.y} L ${D.x} ${D.y}`} />
            <path
              className="as-right-angle"
              d={`M ${D.x - 12} ${D.y} L ${D.x - 12} ${D.y - 12} L ${D.x} ${D.y - 12}`}
            />
            <path className="as-arc" d={arcPath(A, 20, angleOfDeg(A, B), angleOfDeg(A, D))} />
            <text {...labelAt(pointAt(A, 34, midDeg(angleOfDeg(A, B), angleOfDeg(A, D))))}>?</text>
            <path className="as-arc" d={arcPath(B, 22, angleOfDeg(B, A), angleOfDeg(B, C))} />
            <text {...labelAt(pointAt(B, 36, midDeg(angleOfDeg(B, A), angleOfDeg(B, C))))}>{`${shape.given}°`}</text>
          </>
        ) : (
          <>
            <path className="as-arc" d={arcPath(A, 22, angleOfDeg(A, B), angleOfDeg(A, C))} />
            <text {...labelAt(pointAt(A, 36, midDeg(angleOfDeg(A, B), angleOfDeg(A, C))))}>{apexLabel}</text>
            <path className="as-arc" d={arcPath(B, 22, angleOfDeg(B, A), angleOfDeg(B, C))} />
            <text {...labelAt(pointAt(B, 36, midDeg(angleOfDeg(B, A), angleOfDeg(B, C))))}>{baseLabel}</text>
          </>
        )}
      </>
    );
  }

  return (
    <svg className="angle-shape" width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label}>
      {body}
    </svg>
  );
}

function midpoint(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Shared text props for every label in this file — centred on the point, with an
 *  optional vertical nudge for a label that sits beside a segment rather than a vertex. */
function labelAt(p: Pt, dy = 0) {
  return { className: "as-label", x: p.x, y: p.y + dy, textAnchor: "middle" as const, dominantBaseline: "central" as const };
}
