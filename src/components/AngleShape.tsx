import { drawnLabels, type AngleShape as AngleShapeData } from "../data/angleShape";

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

/** `count` short perpendicular hash marks at the midpoint of a segment — the standard
 *  "these sides are equal/corresponding" tick(s), shared by the congruent-triangles and
 *  isosceles-triangle drawings. `count` distinguishes which pair a mark belongs to (one
 *  tick, two ticks, three ticks — the same convention a teacher draws on a board), not how
 *  many marks are needed to prove anything; a single call with `count = 1` (every existing
 *  caller before this) draws exactly the one tick it always did. */
function tickMark(p1: Pt, p2: Pt, count = 1, length = 9): string {
  const dir = angleOfDeg(p1, p2);
  const perpDeg = dir + 90;
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const spacing = 5;
  return Array.from({ length: count }, (_, i) => {
    const along = (i - (count - 1) / 2) * spacing;
    const center = pointAt(mid, along, dir);
    const a = pointAt(center, length / 2, perpDeg);
    const b = pointAt(center, length / 2, perpDeg + 180);
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }).join(" ");
}

/** `count` concentric arcs at the same vertex/span — the angle equivalent of `tickMark`'s
 *  multiple hash marks: one arc, two arcs, three arcs marking which angles correspond. */
function arcMark(c: Pt, r: number, fromDeg: number, toDeg: number, count = 1, spacing = 5): string {
  return Array.from({ length: count }, (_, i) => arcPath(c, r + i * spacing, fromDeg, toDeg)).join(" ");
}

interface AngleShapeProps {
  shape: AngleShapeData;
  /** Read out by a screen reader in place of the picture. */
  label: string;
}

export function AngleShape({ shape, label }: AngleShapeProps) {
  let body;
  // Every vertex/line letter this figure draws, name -> position. Checked at the end
  // against `drawnLabels(shape)` (the list the content rule reads), so the picture and the
  // rule cannot drift apart.
  const names: Record<string, Pt> = {};
  // The congruence drawing has two different points both named C (shared vertex name in
  // ABC ≅ EDC), so the second one cannot live in the by-name map.
  const extra: { text: string; at: Pt }[] = [];

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
    names.A = { x: A.x, y: A.y - 13 };
    names.B = { x: B.x - 12, y: B.y + 9 };
    names.C = { x: C.x, y: C.y + 15 };
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
    // The top end of the transversal is extended to carry the name "c": the bottom end has no
    // room (the second line sits low for steep angles), and the top end always has. Far
    // enough out to clear line a even when the transversal is nearly parallel to it.
    const cDist = Math.min(60, Math.max(36, 20 / Math.sin((shape.known * Math.PI) / 180)));
    const cStart = pointAt(P1, cDist - 14, cDir + 180);
    const cEnd = pointAt(P2, 22, cDir);
    // The second arc's position is the geometric fact this picture illustrates: the same
    // straight transversal, at the same P1→P2 direction, puts corresponding/alternate/
    // co-interior angles at these specific rays relative to line b — not a stand-in
    // drawing, the actual angle relation named in the caption.
    // Line names go just past whichever end of each line is on screen (line b slides sideways
    // with the angle, so its right end can leave the picture for a small angle and its left
    // end for a large one).
    const lineName = (line: typeof lineA) =>
      line.to.x + 12 <= WIDTH - 10 ? { x: line.to.x + 12, y: line.to.y } : { x: line.from.x - 12, y: line.from.y };
    names.a = lineName(lineA);
    names.b = lineName(lineB);
    // For a very wide angle the lines are close together and the angle number sits between
    // them, right beside the end of line b - so its name goes under the line instead.
    if (shape.known >= 145) names.b = { x: names.b.x + 16, y: names.b.y + 10 };
    names.c = pointAt(P1, cDist, cDir + 180);
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
    names.A = { x: A.x, y: A.y - 13 };
    names.B = { x: B.x - 6, y: B.y + 14 };
    names.C = { x: C1.x + 6, y: C1.y + 14 };
    names.E = { x: E.x, y: E.y - 13 };
    names.D = { x: D.x - 6, y: D.y + 14 };
    extra.push({ text: "C", at: { x: C2.x - 4, y: C2.y + 14 } });
    body = (
      <>
        <path className="as-line" d={`M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C1.x} ${C1.y} Z`} />
        <path className="as-line" d={`M ${E.x} ${E.y} L ${D.x} ${D.y} L ${C2.x} ${C2.y} Z`} />
        {/* Six correspondences between ABC and EDC (three sides, three angles), per the
            congruence's own lettering (A↔E, B↔D, C↔C) — one/two/three tick or arc marks
            per pair, the standard convention for "these go together" without reading the
            correspondence off the letters. Only the pair the question is actually about
            also gets a number/"?" label; the rest just show they're equal. */}
        <path className="as-tick" d={tickMark(A, B, 1)} />
        <path className="as-tick" d={tickMark(E, D, 1)} />
        <path className="as-tick" d={tickMark(B, C1, 2)} />
        <path className="as-tick" d={tickMark(D, C2, 2)} />
        <path className="as-tick" d={tickMark(C1, A, 3)} />
        <path className="as-tick" d={tickMark(C2, E, 3)} />
        <path className="as-arc" d={arcMark(A, 18, angleOfDeg(A, B), angleOfDeg(A, C1), 1)} />
        <path className="as-arc" d={arcMark(E, 18, angleOfDeg(E, D), angleOfDeg(E, C2), 1)} />
        <path className="as-arc" d={arcMark(B, 14, angleOfDeg(B, A), angleOfDeg(B, C1), 2)} />
        <path className="as-arc" d={arcMark(D, 14, angleOfDeg(D, E), angleOfDeg(D, C2), 2)} />
        <path className="as-arc" d={arcMark(C1, 14, angleOfDeg(C1, A), angleOfDeg(C1, B), 3)} />
        <path className="as-arc" d={arcMark(C2, 14, angleOfDeg(C2, E), angleOfDeg(C2, D), 3)} />
        {shape.valueKind === "side" ? (
          <>
            <text {...labelAt(midpoint(A, B), -8)}>{`${shape.value}`}</text>
            <text {...labelAt(midpoint(E, D), -8)}>?</text>
          </>
        ) : (
          <>
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
    names.A = { x: A.x, y: A.y - 13 };
    names.B = { x: B.x - 12, y: B.y + 9 };
    names.C = { x: C.x + 12, y: C.y + 9 };
    if (shape.variant === "medianRightAngle") names.D = { x: D.x, y: D.y + 14 };
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

  const drawn = drawnLabels(shape);
  for (const k of Object.keys(names)) {
    if (!drawn.includes(k)) throw new Error(`AngleShape draws "${k}" but drawnLabels() omits it`);
  }
  for (const k of drawn) {
    if (!names[k]) throw new Error(`drawnLabels() lists "${k}" but AngleShape has no position for it`);
  }

  return (
    <div className="angle-figure-inline" role="img" aria-label={label}>
      <svg className="angle-shape" width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        {body}
        {[...Object.entries(names).map(([text, at]) => ({ text, at })), ...extra].map(({ text, at }, i) => (
          <text key={`${text}${i}`} {...labelAt(at)} className="as-label as-vertex" data-vertex={text}>
            {text}
          </text>
        ))}
      </svg>
    </div>
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
