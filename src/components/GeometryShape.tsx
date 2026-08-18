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

/**
 * The internal lines of a unit-square grid over a `cols`×`rows` rectangle — so a child
 * can count the squares that make up an area, rather than trust a filled block.
 */
function gridLines(x: number, y: number, w: number, h: number, cols: number, rows: number): string {
  const parts: string[] = [];
  for (let i = 1; i < cols; i++) {
    const lx = x + (i * w) / cols;
    parts.push(`M ${lx} ${y} V ${y + h}`);
  }
  for (let j = 1; j < rows; j++) {
    const ly = y + (j * h) / rows;
    parts.push(`M ${x} ${ly} H ${x + w}`);
  }
  return parts.join(" ");
}

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
    const lengthLabel = shape.unknown === "length" ? "?" : shape.length;
    const widthLabel = shape.unknown === "width" ? "?" : shape.width;
    body = (
      <>
        <rect className={shapeClass} x={x} y={y} width={w} height={h} />
        {/* Area: a grid of unit squares to count, not a solid block to trust. */}
        {shape.measure === "area" && (
          <path className="gs-grid" d={gridLines(x, y, w, h, shape.length, shape.width)} />
        )}
        <text className="gs-label" x={CENTER_X} y={y - 10} textAnchor="middle">
          {lengthLabel}
        </text>
        {/* Perimeter: every side gets its own number, not just the two distinct values —
            the point is a length a child can add up, all four in view at once. */}
        {shape.measure === "perimeter" && (
          <text className="gs-label" x={CENTER_X} y={y + h + 22} textAnchor="middle">
            {lengthLabel}
          </text>
        )}
        <text className="gs-label" x={x - 12} y={CENTER_Y} textAnchor="end" dominantBaseline="central">
          {widthLabel}
        </text>
        {shape.measure === "perimeter" && (
          <text className="gs-label" x={x + w + 12} y={CENTER_Y} textAnchor="start" dominantBaseline="central">
            {widthLabel}
          </text>
        )}
      </>
    );
  } else if (shape.kind === "square") {
    const s = px(shape.side, shape.side);
    const x = CENTER_X - s / 2;
    const y = CENTER_Y - s / 2;
    body = (
      <>
        <rect className={shapeClass} x={x} y={y} width={s} height={s} />
        {shape.measure === "area" && (
          <path className="gs-grid" d={gridLines(x, y, s, s, shape.side, shape.side)} />
        )}
        <text className="gs-label" x={CENTER_X} y={y - 10} textAnchor="middle">
          {shape.side}
        </text>
        {shape.measure === "perimeter" && (
          <>
            <text className="gs-label" x={CENTER_X} y={y + s + 22} textAnchor="middle">
              {shape.side}
            </text>
            <text className="gs-label" x={x - 12} y={CENTER_Y} textAnchor="end" dominantBaseline="central">
              {shape.side}
            </text>
            <text className="gs-label" x={x + s + 12} y={CENTER_Y} textAnchor="start" dominantBaseline="central">
              {shape.side}
            </text>
          </>
        )}
      </>
    );
  } else if (shape.kind === "triangle" && shape.measure === "perimeter") {
    // Equilateral: three equal sides, drawn as such — a label on every side, not just
    // the base, so the three numbers a child would add up are all on the picture.
    const s = px(shape.base, shape.base);
    const x0 = CENTER_X - s / 2;
    const x1 = CENTER_X + s / 2;
    const yBase = CENTER_Y + s * 0.43;
    const yTop = CENTER_Y - s * 0.43;
    const leftMidX = (x0 + CENTER_X) / 2 - 14;
    const leftMidY = (yBase + yTop) / 2 + 6;
    const rightMidX = (CENTER_X + x1) / 2 + 14;
    const rightMidY = (yBase + yTop) / 2 + 6;
    body = (
      <>
        <path className={shapeClass} d={`M ${x0} ${yBase} L ${x1} ${yBase} L ${CENTER_X} ${yTop} Z`} />
        <text className="gs-label" x={CENTER_X} y={yBase + 22} textAnchor="middle">
          {shape.base}
        </text>
        <text className="gs-label" x={leftMidX} y={leftMidY} textAnchor="middle">
          {shape.base}
        </text>
        <text className="gs-label" x={rightMidX} y={rightMidY} textAnchor="middle">
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
