import type { LinearGraph as LinearGraphData } from "../data/linearGraph";

const WIDTH = 280;
const HEIGHT = 170;
const PAD = 30;

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

  return (
    <svg
      className="linear-graph"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
    >
      <path className="lg-axis" d={`M ${xOf(xMin)} ${yOf(0)} H ${xOf(xMax)}`} />
      <path className="lg-axis" d={`M ${xOf(0)} ${yOf(yMin)} V ${yOf(yMax)}`} />
      {lines.map((l, i) => (
        <path
          key={i}
          className="lg-line"
          d={`M ${xOf(xMin)} ${yOf(l.slope * xMin + l.intercept)} L ${xOf(xMax)} ${yOf(l.slope * xMax + l.intercept)}`}
        />
      ))}
      <circle className="lg-point" cx={xOf(point.x)} cy={yOf(point.y)} r={5} />
    </svg>
  );
}
