import { useEffect, useState } from "react";
import type { Level } from "../data/curriculum";
import { isHebrewPrompt, promptSegments } from "../data/curriculum";
import type { Diagnosis } from "../data/diagnose";
import { diagnose } from "../data/diagnose";
import { explainQuestion } from "../data/explain";
import {
  explanationToSpeechParts,
  mathToWords,
  primeVoices,
  speak,
  speechSupported,
  stopSpeaking,
} from "../data/speech";

/** The diagnosis as spoken units: the sentence naming the mistake, then the question. */
function diagnosisToSpeechParts(diagnosis: Diagnosis): string[] {
  return [diagnosis.headline, diagnosis.question]
    .map((text) => text.replace(/`([^`]+)`/g, (_, expr) => mathToWords(expr)))
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Hebrew wrapped around an arithmetic run, split so the run can be isolated. */
function segmented(text: string) {
  return promptSegments(text).map((segment, i) =>
    segment.kind === "math" ? (
      <span key={i} className="prompt-math">
        {segment.value}
      </span>
    ) : (
      <span key={i}>{segment.value}</span>
    ),
  );
}

interface PracticeProps {
  level: Level;
  onFinish: (correctCount: number) => void;
  onExit: () => void;
}

export function Practice({ level, onFinish, onExit }: PracticeProps) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  /** Which box is talking. One engine, two speak buttons — a boolean would light up
   *  "stop" on both while only one of them is being read. */
  const [speakingBox, setSpeakingBox] = useState<"diagnosis" | "explanation" | null>(null);
  /** How many hints the student has asked for: 0, 1 or 2. A counter rather than two
   *  flags — the second is unreachable without the first, and one number resets in one
   *  line when the question changes. */
  const [hintsShown, setHintsShown] = useState(0);

  /** What the wrong answer says about the thinking behind it, when anything does. */
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpResult, setFollowUpResult] = useState<"right" | "wrong" | null>(null);
  const [askedToSee, setAskedToSee] = useState(false);

  // Voices load asynchronously, so warm the list before the first press.
  useEffect(primeVoices, []);
  // Leaving mid-sentence must not leave a voice talking over the next screen.
  useEffect(() => stopSpeaking, []);

  const question = level.questions[index];
  const isLast = index === level.questions.length - 1;
  const isWordProblem = isHebrewPrompt(question.prompt);
  const explanation = explainQuestion(question);

  /**
   * Whether the correct answer and the worked explanation are on screen yet.
   *
   * Derived rather than stored: it is already fully determined by how the conversation
   * ended, and a second copy of the same fact is how a screen starts contradicting
   * itself. With no diagnosis there is no conversation to wait for, so it is true at once
   * — that branch is the untouched, pre-existing screen.
   */
  const revealed = diagnosis === null || followUpResult !== null || askedToSee;

  function checkAnswer() {
    if (input.trim() === "" || feedback !== null) return;
    const isCorrect = Number(input) === question.answer;
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) setCorrectCount((c) => c + 1);
    // The score is closed on this line, before the conversation can begin. Nothing that
    // happens in it moves the number.
    else setDiagnosis(diagnose(question, Number(input)));
  }

  function checkFollowUp() {
    if (followUpInput.trim() === "" || diagnosis === null || followUpResult !== null) return;
    setFollowUpResult(Number(followUpInput) === diagnosis.answer ? "right" : "wrong");
  }

  function next() {
    // Otherwise the previous question's explanation keeps playing over the new one.
    stopSpeaking();
    setSpeakingBox(null);

    if (isLast) {
      onFinish(correctCount);
      return;
    }
    setIndex((i) => i + 1);
    setInput("");
    setFeedback(null);
    setHintsShown(0);
    setDiagnosis(null);
    setFollowUpInput("");
    setFollowUpResult(null);
    setAskedToSee(false);
  }

  function toggleSpeech(box: "diagnosis" | "explanation") {
    if (speakingBox !== null) {
      stopSpeaking();
      setSpeakingBox(null);
      // Pressing the box that was already talking means stop; pressing the other means
      // switch to it, which the cancel above has just made room for.
      if (speakingBox === box) return;
    }
    const parts =
      box === "diagnosis"
        ? diagnosis && diagnosisToSpeechParts(diagnosis)
        : explanation && explanationToSpeechParts(explanation);
    if (!parts) return;
    setSpeakingBox(box);
    speak(parts, () => setSpeakingBox(null));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    if (feedback === null) checkAnswer();
    else next();
  }

  return (
    <div className="practice">
      <div className="practice-header">
        <button
          className="link-button"
          onClick={() => {
            stopSpeaking();
            onExit();
          }}
        >
          ← חזרה
        </button>
        <span className="progress">
          שאלה {index + 1} מתוך {level.questions.length}
        </span>
      </div>
      <h2>{level.title}</h2>
      <div className={`problem-box ${isWordProblem ? "box-rtl" : "box-ltr"}`}>
        <span className={`problem-text ${isWordProblem ? "prompt-rtl" : "prompt-ltr"}`}>
          {isWordProblem ? (
            promptSegments(question.prompt).map((segment, i) =>
              segment.kind === "math" ? (
                <span key={i} className="prompt-math">
                  {segment.value}
                </span>
              ) : (
                <span key={i}>{segment.value}</span>
              ),
            )
          ) : (
            <>{`${question.prompt} =`}</>
          )}
        </span>
        <input
          type="number"
          step="any"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={feedback !== null}
          autoFocus
          className="answer-input"
        />
      </div>
      {feedback === "wrong" && diagnosis !== null && (
        <p className="diagnosis" aria-live="polite">
          {segmented(diagnosis.headline)}
        </p>
      )}
      {feedback === "wrong" && diagnosis !== null && (
        <div className="followup">
          <div className="followup-header">
            <h3>בואי נבדוק משהו</h3>
            {speechSupported() && (
              <button
                type="button"
                className="speak-button"
                onClick={() => toggleSpeech("diagnosis")}
                aria-label={
                  speakingBox === "diagnosis" ? "עצרו את ההקראה" : "הקריאו לי מה קרה"
                }
              >
                {speakingBox === "diagnosis" ? "⏹" : "🔊"}
              </button>
            )}
          </div>
          <p className="followup-question">{segmented(diagnosis.question)}</p>
          <div className="followup-row">
            <input
              type="number"
              step="any"
              value={followUpInput}
              onChange={(e) => setFollowUpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") checkFollowUp();
              }}
              disabled={followUpResult !== null}
              autoFocus
              className="followup-input"
              aria-label={diagnosis.question}
            />
            {followUpResult === null && (
              <button type="button" onClick={checkFollowUp} disabled={followUpInput.trim() === ""}>
                בדיקה
              </button>
            )}
          </div>
          {followUpResult !== null && (
            <p className={`followup-reply ${followUpResult}`} aria-live="polite">
              {segmented(followUpResult === "right" ? diagnosis.onRight : diagnosis.onWrong)}
            </p>
          )}
          {!revealed && (
            <button type="button" className="link-button reveal-link" onClick={() => setAskedToSee(true)}>
              אני רוצה לראות את התשובה
            </button>
          )}
        </div>
      )}
      {feedback && (feedback === "correct" || revealed) && (
        <p className={`feedback ${feedback}`}>
          {feedback === "correct" ? "נכון מאוד! 🎉" : `לא נכון. התשובה היא ${question.answer}`}
        </p>
      )}
      {feedback === "wrong" && revealed && explanation !== null && (
        <div className="explanation">
          <div className="explanation-header">
            <h3>איך פותרים?</h3>
            {speechSupported() && (
              <button
                type="button"
                className="speak-button"
                onClick={() => toggleSpeech("explanation")}
                aria-label={
                  speakingBox === "explanation" ? "עצרו את ההקראה" : "הקריאו לי את ההסבר"
                }
              >
                {speakingBox === "explanation" ? "⏹" : "🔊"}
              </button>
            )}
          </div>
          {explanation.steps.map((step, i) => (
            <p key={i} className="explanation-step">
              <span>{step.label}</span>
              {step.math && <span className="explanation-math">{step.math}</span>}
            </p>
          ))}
          <p className="explanation-analogy">💡 {explanation.analogy}</p>
        </div>
      )}
      <div className="actions">
        {feedback === null ? (
          <button onClick={checkAnswer} disabled={input.trim() === ""}>
            בדיקה
          </button>
        ) : (
          <button onClick={next}>{isLast ? "סיום" : "הבא"}</button>
        )}
      </div>
      {hintsShown > 0 && (
        <div className="hints">
          {question.hints!.slice(0, hintsShown).map((hint, i) => (
            <p key={i} className="hint">
              {/* Same isolation the prompts get: a hint like "כמה זה `8 + 2`?" is a
                  Hebrew sentence wrapped around an expression, which is exactly what the
                  bidi algorithm mangles. */}
              {segmented(hint)}
            </p>
          ))}
        </div>
      )}
      {question.hints && feedback === null && hintsShown < 2 && (
        <button
          type="button"
          className="hint-button"
          onClick={() => setHintsShown((n) => n + 1)}
        >
          {hintsShown === 0 ? "רמז 💡" : "עוד רמז 💡"}
        </button>
      )}
    </div>
  );
}
