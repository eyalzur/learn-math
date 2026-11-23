import type { Lesson } from "../data/style";
import { useEffect, useRef, useState } from "react";
import { isHebrewPrompt, promptWithEquals } from "../data/curriculum";
import type { Diagnosis } from "../data/diagnose";
import { diagnose } from "../data/diagnose";
import { buildExplanation, explanationSpeechParts } from "../data/questionExplanation";
import { quantityDots } from "../data/quantityDots";
import { AngleShape } from "./AngleShape";
import { ClockFace } from "./ClockFace";
import { NumberPad } from "./NumberPad";
import { QuantityDots } from "./QuantityDots";
import { QuestionExplanation } from "./QuestionExplanation";
import { segmented } from "./segmented";
import { mathToWords, primeVoices, speak, speechParts, speechSupported, stopSpeaking } from "../data/speech";

/** Which box is talking. One engine, three speak buttons — a boolean would light up "stop"
 *  on all of them while only one is being read. */
type SpeakingBox = "question" | "diagnosis" | "explanation" | null;

interface PracticeProps {
  /**
   * What is being practised: a difficulty level, or a lesson on one style of exercise.
   * Both are just a title and a list of questions, so this screen never learns which.
   */
  lesson: Lesson;
  onFinish: (correctCount: number) => void;
  onExit: () => void;
  /** This student has every new question read to them without asking. */
  readAloud: boolean;
  /** Fires once per question, right after right/wrong is decided — before the child even
   *  sees the feedback or explanation. Only an adaptive lesson supplies this; every other
   *  lesson leaves it unset and nothing here changes for it. */
  onAnswered?: (correct: boolean) => void;
}

export function Practice({ lesson, onFinish, onExit, readAloud, onAnswered }: PracticeProps) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [speakingBox, setSpeakingBox] = useState<SpeakingBox>(null);
  /** How many hints the student has asked for: 0, 1 or 2. A counter rather than two
   *  flags — the second is unreachable without the first, and one number resets in one
   *  line when the question changes. */
  const [hintsShown, setHintsShown] = useState(0);
  /** The student's typed final answer, not yet checked. */
  const [answerInput, setAnswerInput] = useState("");

  /** What the wrong answer says about the thinking behind it, when anything does. */
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpResult, setFollowUpResult] = useState<"right" | "wrong" | null>(null);
  const [askedToSee, setAskedToSee] = useState(false);

  // Voices load asynchronously, so warm the list before the first press.
  useEffect(primeVoices, []);
  // Leaving mid-sentence must not leave a voice talking over the next screen.
  useEffect(() => stopSpeaking, []);

  const question = lesson.questions[index];
  const isLast = index === lesson.questions.length - 1;
  const isWordProblem = isHebrewPrompt(question.prompt);
  /** Every diagram/explanation extractor for this question, computed once — see
   *  questionExplanation.ts. The lesson screen (docs/features/topic-lesson) builds the
   *  identical bundle for the same question, off the same function. */
  const bundle = buildExplanation(question);
  const { explanation } = bundle;
  /** Shown proactively above the problem, not gated behind a hint — null for anything
   *  but a small bare addition/subtraction expression. See quantityDots.ts. */
  const dots = quantityDots(question);

  /**
   * What has already been read out on its own, so it is never read twice.
   *
   * Not defensive clutter: StrictMode runs effects twice on purpose, and it caught this —
   * the question was spoken two times over. A remount would have done the same in
   * production. Recording what was said is what makes "read each new question once" true
   * rather than approximately true.
   */
  const autoSpoken = useRef<string | null>(null);

  // A new question reads itself when this student asked for that. Keyed on the question's
  // id rather than the object: every keystroke in the answer field is a render, and a
  // dependency on the object would restart the sentence on each one.
  useEffect(() => {
    if (!readAloud || !speechSupported()) return;
    const key = `q:${question.id}`;
    if (autoSpoken.current === key) return;
    autoSpoken.current = key;
    stopSpeaking();
    setSpeakingBox("question");
    speak(questionParts(), () => setSpeakingBox(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, readAloud]);

  // A hint that appears is text too, and a child who cannot read cannot use it. Only the
  // newly opened one is spoken, not the whole list from the top.
  useEffect(() => {
    if (!readAloud || hintsShown === 0 || !speechSupported()) return;
    const hint = question.hints[hintsShown - 1];
    const key = `h:${question.id}:${hintsShown}`;
    if (autoSpoken.current === key) return;
    autoSpoken.current = key;
    stopSpeaking();
    setSpeakingBox("question");
    speak(speechParts([hint]), () => setSpeakingBox(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintsShown]);

  // A correct answer moves on by itself — no extra tap. Scheduled from an effect, not from
  // inside checkAnswer() directly, so `next()` here closes over the *already-updated*
  // correctCount (checkAnswer's own closure still has the pre-increment value at the point
  // it calls setCorrectCount — see docs/features/scored-answer-practice/architecture.md).
  useEffect(() => {
    if (feedback !== "correct") return;
    const timer = setTimeout(() => next(), 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  /**
   * Whether the correct answer and the worked explanation are on screen yet.
   *
   * Derived rather than stored: it is already fully determined by how the conversation
   * ended, and a second copy of the same fact is how a screen starts contradicting
   * itself. With no diagnosis there is no conversation to wait for, so it is true at once
   * — that branch is the untouched, pre-existing screen. Same for a diagnosis with no
   * `followUp` (the off-by-one patterns): there is no conversation to wait for either, so
   * this reveals immediately instead of gating on an interaction that never happens.
   */
  const revealed =
    diagnosis === null || diagnosis.followUp === undefined || followUpResult !== null || askedToSee;

  /**
   * The question, plus any hints already opened, as spoken units.
   *
   * A bare expression prompt ("12 + 5") carries no Hebrew and is converted whole; a word
   * problem is already split into text and arithmetic runs, and only the runs need
   * turning into words.
   */
  function questionParts(): string[] {
    const prompt = isWordProblem ? question.prompt : `\`${question.prompt}\``;
    return speechParts([prompt, ...question.hints.slice(0, hintsShown)]);
  }

  function checkAnswer() {
    if (feedback !== null) return;
    const trimmed = answerInput.trim();
    if (trimmed === "") return;
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) return;
    const isCorrect = parsed === question.answer;
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) setCorrectCount((c) => c + 1);
    onAnswered?.(isCorrect);
    if (!isCorrect) setDiagnosis(diagnose(question, parsed));
  }

  function checkFollowUp() {
    if (followUpInput.trim() === "" || diagnosis?.followUp === undefined || followUpResult !== null) return;
    setFollowUpResult(Number(followUpInput) === diagnosis.followUp.answer ? "right" : "wrong");
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
    setFeedback(null);
    setHintsShown(0);
    setAnswerInput("");
    setDiagnosis(null);
    setFollowUpInput("");
    setFollowUpResult(null);
    setAskedToSee(false);
  }

  function toggleSpeech(box: Exclude<SpeakingBox, null>) {
    if (speakingBox !== null) {
      stopSpeaking();
      setSpeakingBox(null);
      // Pressing the box that was already talking means stop; pressing the other means
      // switch to it, which the cancel above has just made room for.
      if (speakingBox === box) return;
    }
    const parts =
      box === "question"
        ? questionParts()
        : box === "diagnosis"
          ? diagnosis?.followUp && speechParts([diagnosis.headline, diagnosis.followUp.question])
          : explanation && [
              // No conversation box exists to read the headline for an off-by-one
              // diagnosis, so this button says it instead — an unreadable diagnosis is
              // exactly as good as one that was never said (see design.md, Accessibility).
              ...(diagnosis && diagnosis.followUp === undefined ? speechParts([diagnosis.headline]) : []),
              ...explanationSpeechParts(bundle),
            ];
    if (!parts?.length) return;
    setSpeakingBox(box);
    speak(parts, () => setSpeakingBox(null));
  }

  /** The one diagram in the app that renders next to the question itself instead of only
   *  inside `QuestionExplanation` — see docs/features/grade2-clock/design.md. `bundle.clock`
   *  is `null` for every other topic, so this is a no-op everywhere else. */
  const clockSlot = bundle.clock ? <ClockFace data={bundle.clock} label={bundle.clock.caption} /> : null;

  /** A second such diagram — see docs/features/grade8-angles-congruence/design.md's round
   *  ג׳ revision. `bundle.angle` is `null` for every other topic, so this is a no-op
   *  everywhere else, same as `clockSlot`. */
  const angleSlot = bundle.angle ? <AngleShape shape={bundle.angle} label={bundle.angle.srLabel} /> : null;

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
          שאלה {index + 1} מתוך {lesson.questions.length}
        </span>
      </div>
      <h2>{lesson.title}</h2>

      {dots && <QuantityDots data={dots} label={mathToWords(question.prompt)} />}

      {/* Same prompt-parsing/LTR-isolation pattern TopicLesson.tsx already uses for the
          identical question shape — see docs/features/scored-answer-practice/design.md. */}
      <div className={`problem-box ${isWordProblem ? "box-rtl" : "box-ltr"}`}>
        <span className={`problem-text ${isWordProblem ? "prompt-rtl" : "prompt-ltr"}`}>
          {isWordProblem ? segmented(question.prompt) : <>{promptWithEquals(question.prompt)}</>}
        </span>
        {speechSupported() && (
          <button
            type="button"
            className="speak-button"
            onClick={() => toggleSpeech("question")}
            aria-label={speakingBox === "question" ? "עצרו את ההקראה" : "הקריאו לי את השאלה"}
          >
            {speakingBox === "question" ? "⏹" : "🔊"}
          </button>
        )}
      </div>
      {clockSlot}
      {angleSlot}

      <div className="answer-row">
        <input
          type="text"
          inputMode="none"
          /* Read-only on purpose, not just visually: the on-screen number pad below is
             now the only way to answer (reported live — the native keyboard popping up
             was worse than the pad, not a fallback worth keeping). `readOnly` is what
             actually stops the virtual keyboard across browsers; `inputMode="none"` is
             the matching semantic hint for assistive tech, but isn't reliable alone. A
             physical/external keyboard still reaches this input for Enter-to-submit
             below (readOnly blocks value edits, not every keyboard event) — only typing
             a new value is blocked. */
          readOnly
          className="answer-input"
          value={answerInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") checkAnswer();
          }}
          disabled={feedback !== null}
          autoFocus
          aria-label="התשובה שלכם"
          placeholder="התשובה"
        />
        {feedback === null && (
          <button type="button" onClick={checkAnswer} disabled={answerInput.trim() === ""}>
            בדיקה
          </button>
        )}
        {feedback === "wrong" && (
          <button type="button" onClick={next}>
            {isLast ? "סיום" : "הבא"}
          </button>
        )}
      </div>

      {feedback === null && (
        <NumberPad
          onDigit={(d) => setAnswerInput((v) => v + d)}
          onBackspace={() => setAnswerInput((v) => v.slice(0, -1))}
        />
      )}

      {feedback !== null && (feedback === "correct" || revealed) && (
        <p className={`feedback ${feedback}`}>
          {feedback === "correct" ? "נכון מאוד! 🎉" : `לא נכון. התשובה היא ${question.answer}`}
          {feedback === "correct" && (
            <span className="feedback-star" aria-hidden="true">
              ⭐
            </span>
          )}
        </p>
      )}

      {feedback === "wrong" && diagnosis !== null && (
        <p className="diagnosis" aria-live="polite">
          {segmented(diagnosis.headline)}
        </p>
      )}
      {feedback === "wrong" && diagnosis !== null && diagnosis.followUp !== undefined && (
        <div className="followup">
          <div className="followup-header">
            <h3>בואי נבדוק משהו</h3>
            {speechSupported() && (
              <button
                type="button"
                className="speak-button"
                onClick={() => toggleSpeech("diagnosis")}
                aria-label={speakingBox === "diagnosis" ? "עצרו את ההקראה" : "הקריאו לי מה קרה"}
              >
                {speakingBox === "diagnosis" ? "⏹" : "🔊"}
              </button>
            )}
          </div>
          <p className="followup-question">{segmented(diagnosis.followUp.question)}</p>
          <div className="followup-row">
            <input
              type="text"
              inputMode="decimal"
              value={followUpInput}
              onChange={(e) => setFollowUpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") checkFollowUp();
              }}
              disabled={followUpResult !== null}
              autoFocus
              className="followup-input"
              aria-label={diagnosis.followUp.question}
            />
            {followUpResult === null && (
              <button type="button" onClick={checkFollowUp} disabled={followUpInput.trim() === ""}>
                בדיקה
              </button>
            )}
          </div>
          {followUpResult !== null && (
            <p className={`followup-reply ${followUpResult}`} aria-live="polite">
              {segmented(followUpResult === "right" ? diagnosis.followUp.onRight : diagnosis.followUp.onWrong)}
            </p>
          )}
          {!revealed && (
            <button type="button" className="link-button reveal-link" onClick={() => setAskedToSee(true)}>
              אני רוצה לראות את התשובה
            </button>
          )}
        </div>
      )}

      {feedback === "wrong" && revealed && explanation !== null && (
        <QuestionExplanation
          bundle={bundle}
          speak={
            speechSupported()
              ? { active: speakingBox === "explanation", onToggle: () => toggleSpeech("explanation") }
              : undefined
          }
        />
      )}

      {hintsShown > 0 && (
        <div className="hints">
          {question.hints.slice(0, hintsShown).map((hint, i) => (
            <p key={i} className="hint">
              {segmented(hint)}
            </p>
          ))}
        </div>
      )}
      {feedback === null && hintsShown < 2 && (
        <button type="button" className="hint-button" onClick={() => setHintsShown((n) => n + 1)}>
          {hintsShown === 0 ? "רמז 💡" : "עוד רמז 💡"}
        </button>
      )}
    </div>
  );
}
