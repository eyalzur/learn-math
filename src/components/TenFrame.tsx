import type { TenFrame as TenFrameData } from "../data/tenFrame";

const CELL = 24;
const COLS = 5;
const ROWS = 2;
const DOT_R = 7;
const BOX_W = CELL * COLS;
const BOX_H = CELL * ROWS;
const BOX_X = 8;
const BOX_Y = 18;
const GAP = 18;
/** The loose ones start clear of the box, on the same grid. */
const LOOSE_X = BOX_X + BOX_W + GAP;
const WIDTH = 280;
const HEIGHT = 96;

/** Cell centres of a COLS×ROWS grid whose top-left corner is (x, y). */
const gridCells = (x: number, y: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    key: i,
    cx: x + (i % COLS) * CELL + CELL / 2,
    cy: y + Math.floor(i / COLS) * CELL + CELL / 2,
  }));

interface TenFrameProps {
  frame: TenFrameData;
  /** Read out by a screen reader in place of the picture. */
  label: string;
}

export function TenFrame({ frame, label }: TenFrameProps) {
  const { tens, units, highlight } = frame;
  // Filled versus outlined, never one hue against another: the distinction has to
  // survive greyscale and colour blindness.
  const tensFilled = highlight === "tens" || highlight === "both";
  const unitsFilled = highlight === "units" || highlight === "both";

  // The loose ones sit on the same grid as the ones inside the box, at the same size.
  // That is the point of the picture: they are the same kind of thing, just not boxed.
  const boxed = gridCells(BOX_X, BOX_Y, COLS * ROWS);
  const loose = gridCells(LOOSE_X, BOX_Y, units);

  return (
    <svg
      className="ten-frame"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
    >
      <rect className="tf-box" x={BOX_X} y={BOX_Y} width={BOX_W} height={BOX_H} rx={3} />
      {boxed.map((c) => (
        <circle
          key={`in-${c.key}`}
          className={tensFilled ? "tf-dot filled" : "tf-dot"}
          cx={c.cx}
          cy={c.cy}
          r={DOT_R}
        />
      ))}
      <text className="tf-caption" x={BOX_X + BOX_W / 2} y={HEIGHT - 14} textAnchor="middle">
        {tens * 10}
      </text>

      {loose.map((c) => (
        <circle
          key={`out-${c.key}`}
          className={unitsFilled ? "tf-dot filled" : "tf-dot"}
          cx={c.cx}
          cy={c.cy}
          r={DOT_R}
        />
      ))}
      {units > 0 && (
        <text
          className="tf-caption"
          x={LOOSE_X + (Math.min(units, COLS) * CELL) / 2}
          y={HEIGHT - 14}
          textAnchor="middle"
        >
          {units}
        </text>
      )}
    </svg>
  );
}
