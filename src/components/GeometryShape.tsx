import type { GeometryShape as GeometryShapeData } from "../data/geometryShape";

const WIDTH = 280;
const HEIGHT = 170;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2 + 6;
/** The longer on-screen side of the shape, in pixels — the other side scales to match
 *  the shape's real proportions. */
const MAX_PX = 140;
const MIN_PX = 34;

const px = (world: number, maxWorld: number) => Math.max(MIN_PX, (world / maxWorld) * MAX_PX);

interface GeometryShapeProps {
  shape: GeometryShapeData;
  /** Read out by a screen reader in place of the picture. */
  label: string;
}

export function GeometryShape({ shape, label }: GeometryShapeProps) {
  // Filled versus outlined, never one hue against another: the difference is what the
  // question is about, and it has to survive greyscale and colour blindness.
  const shapeClass = shape.measure === "area" ? "gs-shape gs-filled" : "gs-shape gs-outlined";

  let body;

  if (shape.kind === "rectangle") {
    const maxWorld = Math.max(shape.length, shape.width);
    const w = px(shape.length, maxWorld);
    const h = px(shape.width, maxWorld);
    const x = CENTER_X - w / 2;
    const y = CENTER_Y - h / 2;
    body = (
      <>
        <rect className={shapeClass} x={x} y={y} width={w} height={h} />
        <text className="gs-label" x={CENTER_X} y={y - 10} textAnchor="middle">
          {shape.unknown === "length" ? "?" : shape.length}
        </text>
        <text className="gs-label" x={x - 12} y={CENTER_Y} textAnchor="end" dominantBaseline="central">
          {shape.unknown === "width" ? "?" : shape.width}
        </text>
      </>
    );
  } else if (shape.kind === "square") {
    const s = px(shape.side, shape.side);
    const x = CENTER_X - s / 2;
    const y = CENTER_Y - s / 2;
    body = (
      <>
        <rect className={shapeClass} x={x} y={y} width={s} height={s} />
        <text className="gs-label" x={CENTER_X} y={y - 10} textAnchor="middle">
          {shape.side}
        </text>
      </>
    );
  } else if (shape.kind === "triangle" && shape.measure === "perimeter") {
    // Equilateral: three equal sides, drawn as such, one label — no dashed height, this
    // question is not about area.
    const s = px(shape.base, shape.base);
    const x0 = CENTER_X - s / 2;
    const x1 = CENTER_X + s / 2;
    const yBase = CENTER_Y + s * 0.43;
    const yTop = CENTER_Y - s * 0.43;
    body = (
      <>
        <path className={shapeClass} d={`M ${x0} ${yBase} L ${x1} ${yBase} L ${CENTER_X} ${yTop} Z`} />
        <text className="gs-label" x={CENTER_X} y={yBase + 22} textAnchor="middle">
          {shape.base}
        </text>
      </>
    );
  } else if (shape.kind === "triangle") {
    // Right triangle: base along the bottom, height a dashed line up the left side.
    const maxWorld = Math.max(shape.base, shape.height);
    const w = px(shape.base, maxWorld);
    const h = px(shape.height, maxWorld);
    const x0 = CENTER_X - w / 2;
    const x1 = CENTER_X + w / 2;
    const yBase = CENTER_Y + h / 2;
    const yTop = CENTER_Y - h / 2;
    body = (
      <>
        <path className={shapeClass} d={`M ${x0} ${yBase} L ${x1} ${yBase} L ${x0} ${yTop} Z`} />
        <path className="gs-height" d={`M ${x0} ${yTop} L ${x0} ${yBase}`} />
        <text className="gs-label" x={(x0 + x1) / 2} y={yBase + 22} textAnchor="middle">
          {shape.base}
        </text>
        <text className="gs-label" x={x0 - 12} y={(yTop + yBase) / 2} textAnchor="end" dominantBaseline="central">
          {shape.unknown === "height" ? "?" : shape.height}
        </text>
      </>
    );
  } else {
    const r = px(shape.radius, shape.radius);
    body = (
      <>
        <circle className={shapeClass} cx={CENTER_X} cy={CENTER_Y} r={r} />
        <path className="gs-radius" d={`M ${CENTER_X} ${CENTER_Y} L ${CENTER_X + r} ${CENTER_Y}`} />
        <text className="gs-label" x={CENTER_X + r / 2} y={CENTER_Y - 10} textAnchor="middle">
          {shape.radius}
        </text>
      </>
    );
  }

  return (
    <svg
      className="geometry-shape"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
    >
      {body}
    </svg>
  );
}
