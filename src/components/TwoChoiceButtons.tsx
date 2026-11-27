interface TwoChoiceButtonsProps {
  /** The two numbers offered, in the order the question names them. */
  choices: readonly [number, number];
  /** The right one — used only to colour the result, never to decide anything. */
  answer: number;
  /** What the student picked, or `null` before they have. */
  chosen: number | null;
  /** `null` until an answer is in; both buttons are disabled from then on. */
  feedback: "correct" | "wrong" | null;
  onChoose: (value: number) => void;
}

/**
 * The answer area for a two-answer question: two big buttons instead of the number pad
 * (docs/features/two-choice-buttons/). Tapping one *is* the answer — there is no "check".
 *
 * The number on each button is isolated left-to-right inside the right-to-left page, the
 * same rule as `.problem-box`, so "13" never reads as "31". The DOM order is the question's
 * own order, which the RTL page lays out right-to-left — the first number named is on the
 * right, the way the sentence reads.
 */
export function TwoChoiceButtons({ choices, answer, chosen, feedback, onChoose }: TwoChoiceButtonsProps) {
  return (
    <div className="two-choice" role="group" aria-label="בחרו תשובה">
      {choices.map((value) => {
        const isChosen = chosen === value;
        const state =
          feedback === null
            ? ""
            : isChosen
              ? feedback === "correct"
                ? "correct"
                : "wrong"
              : feedback === "wrong" && value === answer
                ? "reveal"
                : "";
        return (
          <button
            key={value}
            type="button"
            className={`two-choice-button ${state}`}
            disabled={feedback !== null}
            onClick={() => onChoose(value)}
          >
            <span className="two-choice-number">{value}</span>
            {(state === "correct" || state === "reveal") && (
              <span className="two-choice-mark" aria-hidden="true">✓</span>
            )}
            {state === "wrong" && <span className="two-choice-mark" aria-hidden="true">✗</span>}
          </button>
        );
      })}
    </div>
  );
}
