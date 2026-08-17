import type { RatioStrips as RatioStripsData } from "../data/ratioStrips";

const MAX_BLOCK = 36;
const BLOCK_H = 30;
const PAD = 16;
const ROW1_Y = 14;
const ROW_GAP = 20;
const ROW2_Y = ROW1_Y + BLOCK_H + ROW_GAP;
const HEIGHT = ROW2_Y + BLOCK_H + 14;
const MAX_TRACK = 240;

interface RatioStripsProps {
  strips: RatioStripsData;
  /** Read out by a screen reader in place of the picture. */
  label: string;
}

function row(count: number, y: number, blockW: number, filled: boolean) {
  const className = filled ? "rs-block rs-filled" : "rs-block";
  return Array.from({ length: count }, (_, i) => (
    <rect key={i} className={className} x={PAD + i * blockW} y={y} width={blockW - 3} height={BLOCK_H} />
  ));
}

/** Two strips at the same unit size — the ratio made visible, one block per unit. */
export function RatioStrips({ strips, label }: RatioStripsProps) {
  const { ratioA, ratioB } = strips;
  const blockW = Math.min(MAX_BLOCK, MAX_TRACK / Math.max(ratioA, ratioB));
  const width = PAD * 2 + Math.max(ratioA, ratioB) * blockW;

  return (
    <svg
      className="ratio-strips"
      width={width}
      height={HEIGHT}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      role="img"
      aria-label={label}
    >
      {/* The two strips are distinguished by fill, not colour alone — the first strip
          coloured, the second outlined, per design.md's mockup. */}
      {row(ratioA, ROW1_Y, blockW, true)}
      {row(ratioB, ROW2_Y, blockW, false)}
    </svg>
  );
}
