import type { QuantityDots as QuantityDotsData } from "../data/quantityDots";

interface QuantityDotsProps {
  data: QuantityDotsData;
  /** Read out by a screen reader in place of the picture. */
  label: string;
}

/** Filled versus outlined, never one hue against another — same colorblind/greyscale-safe
 *  principle TenFrame already uses, applied to "already counted" vs "taken away". */
export function QuantityDots({ data, label }: QuantityDotsProps) {
  const { operation, a, b } = data;

  if (operation === "subtract") {
    const remaining = a - b;
    return (
      <div className="quantity-dots" role="img" aria-label={label}>
        <div className="qd-group">
          {Array.from({ length: remaining }, (_, i) => (
            <span key={`r-${i}`} className="qd-dot qd-dot-a" />
          ))}
          {Array.from({ length: b }, (_, i) => (
            <span key={`x-${i}`} className="qd-dot qd-dot-a qd-dot-outline" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="quantity-dots" role="img" aria-label={label}>
      <div className="qd-group">
        {Array.from({ length: a }, (_, i) => (
          <span key={`a-${i}`} className="qd-dot qd-dot-a" />
        ))}
      </div>
      <span className="qd-sign" aria-hidden="true">
        +
      </span>
      <div className="qd-group">
        {Array.from({ length: b }, (_, i) => (
          <span key={`b-${i}`} className="qd-dot qd-dot-b" />
        ))}
      </div>
    </div>
  );
}
