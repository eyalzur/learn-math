import type { NumberLine as NumberLineData } from "../data/numberLine";

const WIDTH = 280;
const HEIGHT = 76;
/** The axis, with room for the arrowhead past the last tick. */
const AXIS_Y = 52;
const MARGIN = 20;
const TICK_HALF = 7;
const LABEL_Y = 34;

/**
 * A five-pointed star as a path rather than the character ★.
 *
 * The glyph renders at a different size and baseline on every platform, and here it has
 * to sit centred on a tick — so it is drawn, not typed.
 */
function star(cx: number, cy: number, outer: number): string {
  const inner = outer * 0.42;
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = ((i * 36 - 90) * Math.PI) / 180;
    points.push(`${(cx + r * Math.cos(angle)).toFixed(1)} ${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return `M ${points.join(" L ")} Z`;
}

interface NumberLineProps {
  line: NumberLineData;
  /** Read out by a screen reader in place of the picture. */
  label: string;
}

export function NumberLine({ line, label }: NumberLineProps) {
  const { ticks, from, to } = line;
  const span = WIDTH - MARGIN * 2;
  const step = ticks.length > 1 ? span / (ticks.length - 1) : 0;
  const xOf = (value: number) => MARGIN + (value - ticks[0]) * step;

  return (
    <svg
      className="number-line"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
    >
      {/* The line runs left to right and ascends, the way it is drawn on the board in an
          Israeli first-grade classroom — the page is right-to-left, the line is not. */}
      <path className="nl-axis" d={`M 6 ${AXIS_Y} H ${WIDTH - 12}`} />
      <path
        className="nl-arrow"
        d={`M ${WIDTH - 12} ${AXIS_Y - 5} L ${WIDTH - 2} ${AXIS_Y} L ${WIDTH - 12} ${AXIS_Y + 5} Z`}
      />
      {ticks.map((value) => (
        <g key={value}>
          <path
            className="nl-tick"
            d={`M ${xOf(value)} ${AXIS_Y - TICK_HALF} V ${AXIS_Y + TICK_HALF}`}
          />
          <text className="nl-label" x={xOf(value)} y={LABEL_Y} textAnchor="middle">
            {value}
          </text>
        </g>
      ))}
      {from.map((value) => (
        <circle key={value} className="nl-from" cx={xOf(value)} cy={AXIS_Y} r={6.5} />
      ))}
      <path className="nl-to" d={star(xOf(to), AXIS_Y, 11)} />
    </svg>
  );
}
