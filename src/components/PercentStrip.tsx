import type { PercentStrip as PercentStripData } from "../data/percentStrip";

const BAR_WIDTH = 220;
const BAR_HEIGHT = 34;
const PAD = 16;
const EXTRA_ROOM = 60;
const WIDTH = BAR_WIDTH + PAD * 2 + EXTRA_ROOM;
const HEIGHT = 78;
const LABEL_Y = 30;
const Y = 40;

interface PercentStripProps {
  strip: PercentStripData;
  /** Read out by a screen reader in place of the picture. */
  label: string;
}

export function PercentStrip({ strip, label }: PercentStripProps) {
  const { base, filled, extra } = strip;
  const filledWidth = (filled / base) * BAR_WIDTH;
  const extraWidth = extra ? (extra / base) * BAR_WIDTH : 0;

  // The real quantities behind the strip, marked where they sit — not left to the
  // caption alone. A price increase marks the 100% boundary and the new total; every
  // other strip marks where the colour stops and what the whole is worth.
  const marks = extra
    ? [
        { x: PAD, value: 0 },
        { x: PAD + BAR_WIDTH, value: base },
        { x: PAD + BAR_WIDTH + extraWidth, value: base + extra },
      ]
    : [
        { x: PAD, value: 0 },
        { x: PAD + filledWidth, value: filled },
        { x: PAD + BAR_WIDTH, value: base },
      ];

  return (
    <svg
      className="percent-strip"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
    >
      {/* The 100% track, with guide lines every 25% so the eye can estimate a share
          without counting pixels. */}
      <rect className="ps-track" x={PAD} y={Y} width={BAR_WIDTH} height={BAR_HEIGHT} />
      {[0.25, 0.5, 0.75].map((f) => (
        <path key={f} className="ps-tick" d={`M ${PAD + f * BAR_WIDTH} ${Y} V ${Y + BAR_HEIGHT}`} />
      ))}
      <rect className="ps-filled" x={PAD} y={Y} width={filledWidth} height={BAR_HEIGHT} />
      {/* A price increase runs past its own 100% mark — a distinct, lighter segment so
          "past the whole" reads differently from "part of the whole". */}
      {extraWidth > 0 && (
        <rect className="ps-extra" x={PAD + BAR_WIDTH} y={Y} width={extraWidth} height={BAR_HEIGHT} />
      )}
      {marks.map((m, i) => (
        <text key={i} className="ps-label" x={m.x} y={LABEL_Y} textAnchor="middle">
          {m.value}
        </text>
      ))}
    </svg>
  );
}
