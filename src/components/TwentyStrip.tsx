import type { TwentyStrip as TwentyStripData } from "../data/twentyStrip";

const COLS = 10;
const ROWS = 2;
const CELL = 28;
const DOT_R = 9;
const PAD_X = 0;
const PAD_Y = 6;
const WIDTH = COLS * CELL;
const HEIGHT = ROWS * CELL + PAD_Y * 2;

interface TwentyStripProps {
  strip: TwentyStripData;
  /** Read out by a screen reader in place of the picture. */
  label: string;
}

/**
 * Twenty circles, ten to a row.
 *
 * **Ten per row, not five or fifteen.** The topic is tens and units, and ten per row
 * makes the structure visible without anyone saying it: at `13` the first row is full and
 * three sit in the second — one ten and three — and the empties are exactly the rest of
 * that second row. Any other layout throws that away.
 *
 * Filled against outlined, never one hue against another, like every other shape here.
 */
export function TwentyStrip({ strip, label }: TwentyStripProps) {
  const dots = Array.from({ length: COLS * ROWS }, (_, i) => ({
    key: i,
    cx: PAD_X + (i % COLS) * CELL + CELL / 2,
    cy: PAD_Y + Math.floor(i / COLS) * CELL + CELL / 2,
    filled: i < strip.filled,
  }));

  return (
    <svg
      className="twenty-strip"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
    >
      {dots.map((d) => (
        <circle
          key={d.key}
          className={d.filled ? "ts-dot filled" : "ts-dot"}
          cx={d.cx}
          cy={d.cy}
          r={DOT_R}
        />
      ))}
    </svg>
  );
}
