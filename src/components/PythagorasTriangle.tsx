import type { PythagorasTriangle as PythagorasTriangleData } from "../data/pythagorasTriangle";

const WIDTH = 280;
const HEIGHT = 170;
const MAX_PX = 150;
const MIN_PX = 40;
const PAD_X = 60;
const PAD_Y = 30;
const RIGHT_ANGLE = 12;

interface PythagorasTriangleProps {
  triangle: PythagorasTriangleData;
  /** Read out by a screen reader in place of the picture. */
  label: string;
}

/**
 * A right triangle drawn in true proportion — the design decision that keeps a `5,12`
 * triangle looking properly narrow rather than fudged toward square, because the theorem
 * is a claim about the ratio between the sides.
 */
export function PythagorasTriangle({ triangle, label }: PythagorasTriangleProps) {
  const { legA, legB, hyp, unknown } = triangle;
  const maxWorld = Math.max(legA, legB);
  const w = Math.max(MIN_PX, (legA / maxWorld) * MAX_PX);
  const h = Math.max(MIN_PX, (legB / maxWorld) * MAX_PX);

  const x0 = PAD_X;
  const x1 = PAD_X + w;
  const yBase = HEIGHT - PAD_Y;
  const yTop = yBase - h;

  const legALabel = unknown === "legA" || unknown === "bothLegs" ? "?" : legA;
  const legBLabel = unknown === "legB" || unknown === "bothLegs" ? "?" : legB;
  // The hypotenuse only carries a label when it is given or asked. A triangle known only
  // by its equal legs and their area has nothing honest to write on its third side.
  const hypLabel = unknown === "hyp" ? "?" : hyp;

  return (
    <svg
      className="pythagoras-triangle"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
    >
      <path className="pt-triangle" d={`M ${x0} ${yBase} L ${x1} ${yBase} L ${x0} ${yTop} Z`} />
      <path
        className="pt-right-angle"
        d={`M ${x0} ${yBase - RIGHT_ANGLE} H ${x0 + RIGHT_ANGLE} V ${yBase}`}
      />
      <text className="pt-label" x={(x0 + x1) / 2} y={yBase + 22} textAnchor="middle">
        {legALabel}
      </text>
      <text className="pt-label" x={x0 - 12} y={(yTop + yBase) / 2} textAnchor="end" dominantBaseline="central">
        {legBLabel}
      </text>
      {hypLabel !== null && (
        <text className="pt-label" x={(x0 + x1) / 2 + 16} y={(yTop + yBase) / 2 - 10} textAnchor="middle">
          {hypLabel}
        </text>
      )}
    </svg>
  );
}
