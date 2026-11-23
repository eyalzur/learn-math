interface NumberPadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  /** Mirrors the answer field's own disabled condition exactly — never typeable once
   *  there's feedback on screen, same as the text input beside it. */
  disabled: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"] as const;

/** An on-screen keypad beside the existing text field, not instead of it — writes into
 *  the same answer string a physical keyboard would. The "." matters: the field it
 *  feeds is `inputMode="decimal"`, and grade 6 topics have decimal answers — without it
 *  the pad couldn't produce an answer a physical keyboard could. */
export function NumberPad({ onDigit, onBackspace, disabled }: NumberPadProps) {
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
            disabled={disabled}
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
            disabled={disabled}
          >
            {key}
          </button>
        ),
      )}
    </div>
  );
}
