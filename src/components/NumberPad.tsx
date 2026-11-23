interface NumberPadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"] as const;

/** An on-screen keypad beside the existing text field, not instead of it — writes into
 *  the same answer string a physical keyboard would. The "." matters: the field it
 *  feeds is `inputMode="decimal"`, and grade 6 topics have decimal answers — without it
 *  the pad couldn't produce an answer a physical keyboard could.
 *
 *  Unmounted by the caller once feedback is on screen, rather than disabled in place —
 *  the correct/wrong screen has no use for it, and a disabled grid left sitting under the
 *  feedback was exactly the extra screen real-estate this removed. */
export function NumberPad({ onDigit, onBackspace }: NumberPadProps) {
  return (
    <div className="number-pad">
      {KEYS.map((key) =>
        key === "⌫" ? (
          <button
            key={key}
            type="button"
            className="number-pad-button number-pad-backspace"
            aria-label="מחיקת ספרה"
            onClick={onBackspace}
          >
            {key}
          </button>
        ) : (
          <button
            key={key}
            type="button"
            className="number-pad-button"
            aria-label={key === "." ? "נקודה עשרונית" : undefined}
            onClick={() => onDigit(key)}
          >
            {key}
          </button>
        ),
      )}
    </div>
  );
}
