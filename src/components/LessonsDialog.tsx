import { useState } from "react";
import { LESSON_PACKS } from "../data/lessonAllowance";
import { speak, speechParts, speechSupported, stopSpeaking } from "../data/speech";

/**
 * The weekly-lessons dialog (docs/features/weekly-lesson-cap/): the child-facing message
 * ("blocked" when the cap stopped a practice, "info" when the counter chip was tapped),
 * then — behind a parent gate — the list of packs. No payment of any kind: a pack that
 * costs 0 is granted on confirm; a priced pack will need a provider wired in here later.
 */
export type LessonsDialogMode = "blocked" | "info";

type Step = "message" | "gate" | "packs" | "done";

interface LessonsDialogProps {
  mode: LessonsDialogMode;
  remaining: number;
  onGrant: (packId: string) => void;
  onClose: () => void;
}

/** A multiplication a 7-year-old cannot do (6-9 × 6-9) — the gate needs no memorised code. */
function newGateQuestion(): { a: number; b: number } {
  return { a: 6 + Math.floor(Math.random() * 4), b: 6 + Math.floor(Math.random() * 4) };
}

export function LessonsDialog({ mode, remaining, onGrant, onClose }: LessonsDialogProps) {
  const [step, setStep] = useState<Step>("message");
  const [gate, setGate] = useState(newGateQuestion);
  const [answer, setAnswer] = useState("");
  const [wrong, setWrong] = useState(false);
  const [granted, setGranted] = useState(0);

  const headline =
    mode === "blocked" ? "נגמרו השיעורים של השבוע." : `נשארו ${remaining} שיעורים השבוע.`;
  const sub = mode === "blocked" ? "אפשר לבקש מאמא או אבא." : "";

  function close() {
    stopSpeaking();
    onClose();
  }

  function submitGate() {
    if (Number(answer) === gate.a * gate.b) {
      setWrong(false);
      setAnswer("");
      setStep("packs");
    } else {
      setWrong(true);
      setAnswer("");
      setGate(newGateQuestion());
    }
  }

  return (
    <div className="settings-backdrop" onClick={close}>
      <div
        className="settings-dialog lessons-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lessons-title"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "message" && (
          <>
            <h2 className="settings-title" id="lessons-title">
              {headline}
            </h2>
            {sub && <p className="lessons-sub">{sub}</p>}
            <div className="lessons-actions">
              {speechSupported() && (
                <button
                  type="button"
                  className="speak-button"
                  aria-label="הקריאו לי"
                  onClick={() => speak(speechParts([`${headline} ${sub}`.trim()]))}
                >
                  🔊
                </button>
              )}
              <button type="button" onClick={() => setStep("gate")}>
                {mode === "blocked" ? "בקשו מההורים" : "עוד שיעורים (להורים)"}
              </button>
              <button type="button" className="secondary" onClick={close}>
                סגירה
              </button>
            </div>
          </>
        )}

        {step === "gate" && (
          <>
            <h2 className="settings-title" id="lessons-title">
              למבוגרים בלבד
            </h2>
            <p className="lessons-sub">
              כמה זה{" "}
              <span className="lessons-gate-math" dir="ltr">
                {gate.a} × {gate.b}
              </span>
              ?
            </p>
            {wrong && (
              <p className="lessons-wrong" role="alert">
                לא נכון, נסו שוב.
              </p>
            )}
            <form
              className="lessons-gate-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitGate();
              }}
            >
              <input
                className="lessons-gate-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label="תשובה"
                value={answer}
                onChange={(e) => setAnswer(e.target.value.replace(/\D/g, ""))}
              />
              <div className="lessons-actions">
                <button type="submit">המשך</button>
                <button type="button" className="secondary" onClick={close}>
                  סגירה
                </button>
              </div>
            </form>
          </>
        )}

        {step === "packs" && (
          <>
            <h2 className="settings-title" id="lessons-title">
              שיעורים נוספים
            </h2>
            <ul className="lessons-packs">
              {LESSON_PACKS.map((pack) => (
                <li key={pack.id} className="lessons-pack">
                  <span className="lessons-pack-text">
                    <span className="lessons-pack-title">{pack.lessons} שיעורים נוספים</span>
                    <span className="lessons-pack-price">
                      {pack.priceIls === 0 ? "חינם כרגע" : `${pack.priceIls} ₪`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onGrant(pack.id);
                      setGranted(pack.lessons);
                      setStep("done");
                    }}
                  >
                    קבלו
                  </button>
                </li>
              ))}
            </ul>
            <div className="lessons-actions">
              <button type="button" className="secondary" onClick={close}>
                סגירה
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <h2 className="settings-title" id="lessons-title">
              נוספו {granted} שיעורים!
            </h2>
            <div className="lessons-actions">
              <button type="button" onClick={close}>
                סגירה
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
