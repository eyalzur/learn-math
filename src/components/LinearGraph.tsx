import type { LinearGraph as LinearGraphData } from "../data/linearGraph";

const WIDTH = 280;
const HEIGHT = 170;
const PAD = 34;

interface LinearGraphProps {
  graph: LinearGraphData;
  /** Read out by a screen reader in place of the picture. */
  label: string;
}

/** A line (or two) on axes windowed around the point that answers the question — the
 *  same windowing idea `numberLine.ts` uses, just in two dimensions. */
export function LinearGraph({ graph, label }: LinearGraphProps) {
  const { lines, point, xMin, xMax } = graph;

  const ys = [
    ...lines.flatMap((l) => [l.slope * xMin + l.intercept, l.slope * xMax + l.intercept]),
    point.y,
  ];
  const yMin = Math.min(0, ...ys) - 1;
  const yMax = Math.max(0, ...ys) + 1;

  const plotW = WIDTH - PAD * 2;
  const plotH = HEIGHT - PAD * 2;
  const xOf = (x: number) => PAD + ((x - xMin) / (xMax - xMin)) * plotW;
  const yOf = (y: number) => HEIGHT - PAD - ((y - yMin) / (yMax - yMin)) * plotH;

  const xAxisY = yOf(0);
  const yAxisX = xOf(0);
  const pointX = xOf(point.x);
  const pointY = yOf(point.y);

  return (
    <svg
      className="linear-graph"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
    >
      <path className="lg-axis" d={`M ${xOf(xMin)} ${xAxisY} H ${xOf(xMax)}`} />
      <path className="lg-axis" d={`M ${yAxisX} ${yOf(yMin)} V ${yOf(yMax)}`} />
      {lines.map((l, i) => (
        <path
          key={i}
          className="lg-line"
          d={`M ${xOf(xMin)} ${yOf(l.slope * xMin + l.intercept)} L ${xOf(xMax)} ${yOf(l.slope * xMax + l.intercept)}`}
        />
      ))}
      {/* Dashed guides from the point down to each axis, with the real coordinate
          written where it lands — design.md's rule that the axes carry only the values
          this question is about, not a full scale. */}
      {point.x !== 0 && <path className="lg-guide" d={`M ${pointX} ${xAxisY} V ${pointY}`} />}
      {point.y !== 0 && <path className="lg-guide" d={`M ${yAxisX} ${pointY} H ${pointX}`} />}
      <text className="lg-tick" x={pointX} y={xAxisY + 16} textAnchor="middle">
        {point.x}
      </text>
      <text className="lg-tick" x={yAxisX - 8} y={pointY} textAnchor="end" dominantBaseline="central">
        {point.y}
      </text>
      <circle className="lg-point" cx={pointX} cy={pointY} r={5} />
    </svg>
  );
}
