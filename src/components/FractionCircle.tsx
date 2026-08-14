import type { FractionDiagram } from "../data/fractionDiagram";

const SIZE = 180;
const R = SIZE / 2 - 6;
const CENTER = SIZE / 2;
/** Where the value sits inside its slice: far enough out to be centred, in enough to fit. */
const LABEL_R = R * 0.62;

/** Counting starts at twelve o'clock and runs clockwise, the way fraction circles are drawn. */
const point = (angleDeg: number, radius: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)] as const;
};

interface FractionCircleProps {
  diagram: FractionDiagram;
  /** Read out by a screen reader in place of the picture. */
  label: string;
}

export function FractionCircle({ diagram, label }: FractionCircleProps) {
  const { numerator, denominator, perPart } = diagram;
  const sweep = 360 / denominator;

  const slices = Array.from({ length: denominator }, (_, i) => {
    const start = i * sweep;
    const [x0, y0] = point(start, R);
    const [x1, y1] = point(start + sweep, R);
    // At exactly 180° both large-arc values describe the same semicircle for a fixed
    // sweep, so a denominator of 2 needs no special case.
    const largeArc = sweep > 180 ? 1 : 0;
    const [lx, ly] = point(start + sweep / 2, LABEL_R);
    return {
      key: i,
      d: `M ${CENTER} ${CENTER} L ${x0} ${y0} A ${R} ${R} 0 ${largeArc} 1 ${x1} ${y1} Z`,
      taken: i < numerator,
      lx,
      ly,
    };
  });

  return (
    <svg
      className="fraction-circle"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      role="img"
      aria-label={label}
    >
      {slices.map((slice) => (
        <path
          key={slice.key}
          d={slice.d}
          // Filled versus empty, not one hue versus another: the difference survives
          // greyscale and colour blindness, which a hue pair does not.
          className={slice.taken ? "slice taken" : "slice"}
        />
      ))}
      {slices.map((slice) => (
        <text
          key={`t${slice.key}`}
          x={slice.lx}
          y={slice.ly}
          className={slice.taken ? "slice-value taken" : "slice-value"}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {perPart}
        </text>
      ))}
    </svg>
  );
}
