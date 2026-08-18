import type { Lesson } from "../data/style";
import { useEffect, useRef, useState } from "react";
import { isHebrewPrompt, promptSegments } from "../data/curriculum";
import type { Diagnosis } from "../data/diagnose";
import { diagnose } from "../data/diagnose";
import { explainQuestion } from "../data/explain";
import { fractionDiagram } from "../data/fractionDiagram";
import { methodSentence } from "../data/method";
import { verticalSum } from "../data/verticalSum";
import { numberLine } from "../data/numberLine";
import { tenFrame } from "../data/tenFrame";
import { twentyStrip } from "../data/twentyStrip";
import { geometryShape } from "../data/geometryShape";
import { pythagorasTriangle } from "../data/pythagorasTriangle";
import { percentStrip } from "../data/percentStrip";
import { ratioStrips } from "../data/ratioStrips";
import { linearGraph } from "../data/linearGraph";
import { NumberLine } from "./NumberLine";
import { TenFrame } from "./TenFrame";
import { TwentyStrip } from "./TwentyStrip";
import { FractionCircle } from "./FractionCircle";
import { GeometryShape } from "./GeometryShape";
import { PythagorasTriangle } from "./PythagorasTriangle";
import { PercentStrip } from "./PercentStrip";
import { RatioStrips } from "./RatioStrips";
import { LinearGraph } from "./LinearGraph";
import {
  explanationToSpeechParts,
  primeVoices,
  speak,
  speechParts,
  speechSupported,
  stopSpeaking,
} from "../data/speech";

/**
 * Which box is talking. One engine, three speak buttons — a boolean would light up "stop"
 * on all of them while only one is being read.
 */
type SpeakingBox = "question" | "diagnosis" | "explanation" | null;

/** How long a correct answer rests on screen before the next question opens itself. */
const COUNTDOWN_SECONDS = 5;

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
  /**
   * What is being practised: a difficulty level, or a lesson on one style of exercise.
   * Both are just a title and a list of questions, so this screen never learns which.
   */
  lesson: Lesson;
  onFinish: (correctCount: number) => void;
  onExit: () => void;
  /** This student has every new question read to them without asking. */
  readAloud: boolean;
}

export function Practice({ lesson, onFinish, onExit, readAloud }: PracticeProps) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [speakingBox, setSpeakingBox] = useState<SpeakingBox>(null);
  /** How many hints the student has asked for: 0, 1 or 2. A counter rather than two
   *  flags — the second is unreachable without the first, and one number resets in one
   *  line when the question changes. */
  const [hintsShown, setHintsShown] = useState(0);

  /** What the wrong answer says about the thinking behind it, when anything does. */
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpResult, setFollowUpResult] = useState<"right" | "wrong" | null>(null);
  const [askedToSee, setAskedToSee] = useState(false);

  /** Seconds still to wait before the next question opens itself, or null when idle. */
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  /** The child asked to stay here. Cleared when the question changes, never before. */
  const [countdownStopped, setCountdownStopped] = useState(false);

  // Voices load asynchronously, so warm the list before the first press.
  useEffect(primeVoices, []);
  // Leaving mid-sentence must not leave a voice talking over the next screen.
  useEffect(() => stopSpeaking, []);

  const question = lesson.questions[index];
  const isLast = index === lesson.questions.length - 1;
  const isWordProblem = isHebrewPrompt(question.prompt);
  const explanation = explainQuestion(question);
  /** A picture of the fraction, when one can be drawn honestly from this question. */
  const diagram = fractionDiagram(question);
  /** How to approach this kind of exercise — the sentence a teacher opens with. */
  const method = methodSentence(question);
  /** The exercise in columns, when the column arithmetic reproduces the answer. */
  const vertical = verticalSum(question);
  /** Where the question's numbers sit on a line — Mika's first topic. */
  const line = numberLine(question);
  /** Full boxes of ten and the loose ones beside them — Mika's second topic. */
  const frame = tenFrame(question);
  /** Twenty circles, some filled — how many are missing to reach twenty. */
  const strip = twentyStrip(question);
  /** A rectangle, square, triangle or circle — area and perimeter. */
  const geometry = geometryShape(question);
  /** A right triangle, in true proportion — Pythagoras. */
  const pythagoras = pythagorasTriangle(question);
  /** A strip out of a hundred — percentages. */
  const percent = percentStrip(question);
  /** Two strips at the same unit size — ratio and proportion. */
  const ratio = ratioStrips(question);
  /** A line on axes, with the point that answers the question marked. */
  const linear = linearGraph(question);

  /**
   * The countdown's clock.
   *
   * Two effects rather than one, and that split is the point: an interval that called
   * `next()` from inside itself would capture `correctCount`, `index` and `isLast` from
   * the render that created it — the very values `next()` depends on. This one only
   * decrements, functionally, capturing nothing; the effect below sees the zero on a
   * fresh render and calls the current `next`.
   *
   * `speakingBox` is in the dependencies, so silence is reactive rather than polled: while
   * anything is being read the condition fails, no interval exists, and the digit simply
   * waits. When `speak` clears the box the effect runs and counting begins.
   *
   * StrictMode is safe here for a different reason than `autoSpoken` below: two intervals
   * are created, but the cleanup between them clears the first, and `clearInterval` undoes
   * an interval completely before it is ever heard from. `speak()` has no such symmetry,
   * which is why it needs a guard and this does not. It is also why the timer lives in an
   * effect rather than in the click handler — a timer started there would have no cleanup,
   * and would go on to skip a question after the child had already left the screen.
   */
  useEffect(() => {
    if (feedback !== "correct" || isLast || countdownStopped) return;
    if (secondsLeft === null || secondsLeft <= 0) return;
    if (speakingBox !== null) return;
    const id = setInterval(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearInterval(id);
  }, [feedback, isLast, countdownStopped, secondsLeft, speakingBox]);

  useEffect(() => {
    if (secondsLeft === 0) next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

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
    const prompt = isWordProblem
      ? promptSegments(question.prompt)
          .map((s) => (s.kind === "math" ? `\`${s.value}\`` : s.value))
          .join(" ")
      : `\`${question.prompt}\``;
    return speechParts([prompt, ...question.hints.slice(0, hintsShown)]);
  }

  function checkAnswer() {
    // Pressing "check" means she is done listening.
    stopSpeaking();
    setSpeakingBox(null);
    if (input.trim() === "" || feedback !== null) return;
    const isCorrect = Number(input) === question.answer;
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      // The whole of starting the countdown; the effect above waits for silence and ticks.
      // Not on the last question: there is no next one to open, and finishing a practice
      // is a moment to arrive at rather than be delivered to. Guarded here rather than
      // only in the effect, because the effect governs the *ticking* and this governs
      // whether the row exists at all — without it the row appears and sits at five.
      if (!isLast) setSecondsLeft(COUNTDOWN_SECONDS);
    }
    // The score is closed on this line, before the conversation can begin. Nothing that
    // happens in it moves the number.
    else setDiagnosis(diagnose(question, Number(input)));
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
    setInput("");
    setFeedback(null);
    setHintsShown(0);
    setDiagnosis(null);
    setFollowUpInput("");
    setFollowUpResult(null);
    setAskedToSee(false);
    setSecondsLeft(null);
    setCountdownStopped(false);
  }

  /** The child asked for a moment. It does not start again on this question. */
  function stopCountdown() {
    setCountdownStopped(true);
    setSecondsLeft(null);
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
            ...(method ? speechParts([method]) : []),
            ...(diagram ? speechParts([diagram.caption]) : []),
            ...(frame ? speechParts([frame.caption]) : []),
            ...(strip ? speechParts([strip.caption]) : []),
            ...(vertical ? speechParts([vertical.caption]) : []),
            // Already an array of lines: the rule, then this question. Separate parts so
            // a listener gets a pause between them rather than twenty words in one breath.
            ...(line ? speechParts(line.caption) : []),
            ...(geometry ? speechParts([geometry.caption]) : []),
            ...(pythagoras ? speechParts([pythagoras.caption]) : []),
            ...(percent ? speechParts([percent.caption]) : []),
            // Two strips, two things to say — a pause between them, same reason as the
            // number line above.
            ...(ratio ? speechParts(ratio.caption) : []),
            ...(linear ? speechParts([linear.caption]) : []),
            ...explanationToSpeechParts(explanation),
          ];
    if (!parts?.length) return;
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
          שאלה {index + 1} מתוך {lesson.questions.length}
        </span>
      </div>
      <h2>{lesson.title}</h2>
      {/* Outside .problem-box on purpose: that box forces a direction, and a button
          inside it would join the isolated context and shift the expression's alignment. */}
      {speechSupported() && (
        <div className="question-speech">
          <button
            type="button"
            className="speak-button"
            onClick={() => toggleSpeech("question")}
            aria-label={speakingBox === "question" ? "עצרו את ההקראה" : "הקריאו לי את השאלה"}
          >
            {speakingBox === "question" ? "⏹" : "🔊"}
          </button>
        </div>
      )}
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
          inputMode="decimal"
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
      {feedback === "wrong" && diagnosis !== null && diagnosis.followUp !== undefined && (
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
          <p className="followup-question">{segmented(diagnosis.followUp.question)}</p>
          <div className="followup-row">
            <input
              type="number"
              inputMode="decimal"
              step="any"
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
      {feedback && (feedback === "correct" || revealed) && (
        <p className={`feedback ${feedback}`}>
          {feedback === "correct" ? "נכון מאוד! 🎉" : `לא נכון. התשובה היא ${question.answer}`}
        </p>
      )}
      {secondsLeft !== null && (
        /* A screen that changes on its own has to be seen coming, be stoppable, and be
           announced — so it is a button, it is visible for five seconds first, and the row
           is a live region. The digit itself is hidden from the reader: announcing
           "5, 4, 3" would drown out everything else. */
        <button
          type="button"
          className="countdown"
          onClick={stopCountdown}
          aria-live="polite"
          aria-label="עוד רגע ואנחנו ממשיכים. לחצו כדי להישאר כאן"
        >
          <span className="countdown-digit" aria-hidden="true">
            {secondsLeft}
          </span>
          <span className="countdown-text" aria-hidden="true">
            עוד רגע ואנחנו ממשיכים
          </span>
        </button>
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
          {method && <p className="explanation-method">{segmented(method)}</p>}
          {diagram && (
            <figure className="fraction-figure">
              <FractionCircle diagram={diagram} label={diagram.caption.replace(/`/g, "")} />
              <figcaption className="fraction-caption">{segmented(diagram.caption)}</figcaption>
            </figure>
          )}
          {frame && (
            <figure className="ten-frame-figure">
              <TenFrame frame={frame} label={frame.caption.replace(/`/g, "")} />
              <figcaption className="figure-caption">{segmented(frame.caption)}</figcaption>
            </figure>
          )}
          {strip && (
            <figure className="twenty-strip-figure">
              <TwentyStrip strip={strip} label={strip.caption.replace(/`/g, "")} />
              <figcaption className="figure-caption">{segmented(strip.caption)}</figcaption>
            </figure>
          )}
          {vertical && (
            <figure className="vertical-figure">
              {/* One LTR island. Rows arrive pre-padded from the data module, so the
                  alignment lives where a test can read it off a string — never in CSS,
                  and never at the mercy of the page's bidi algorithm. */}
              <div className="vertical-sum" role="img" aria-label={vertical.caption.replace(/`/g, "")}>
                {vertical.carries && (
                  <div className="vs-carries" aria-hidden="true">
                    {vertical.carries}
                  </div>
                )}
                <div className="vs-row" aria-hidden="true">
                  {vertical.top}
                </div>
                <div className="vs-row" aria-hidden="true">
                  {vertical.bottom}
                </div>
                <div className="vs-row vs-result" aria-hidden="true">
                  {vertical.result}
                </div>
              </div>
              <figcaption className="vertical-caption">{segmented(vertical.caption)}</figcaption>
            </figure>
          )}
          {line && (
            <figure className="number-line-figure">
              {/* One aria-label because it is one picture, even though the caption is
                  two lines and is spoken as two parts. */}
              <NumberLine line={line} label={line.caption.join(" ").replace(/`/g, "")} />
              <figcaption className="figure-caption">
                {line.caption.map((part, i) => (
                  <span key={i} className="caption-line">
                    {segmented(part)}
                  </span>
                ))}
              </figcaption>
            </figure>
          )}
          {geometry && (
            <figure className="geometry-figure">
              <GeometryShape shape={geometry} label={geometry.caption.replace(/`/g, "")} />
              <figcaption className="figure-caption">{segmented(geometry.caption)}</figcaption>
            </figure>
          )}
          {pythagoras && (
            <figure className="pythagoras-figure">
              <PythagorasTriangle triangle={pythagoras} label={pythagoras.caption.replace(/`/g, "")} />
              <figcaption className="figure-caption">{segmented(pythagoras.caption)}</figcaption>
            </figure>
          )}
          {percent && (
            <figure className="percent-figure">
              <PercentStrip strip={percent} label={percent.caption.replace(/`/g, "")} />
              <figcaption className="figure-caption">{segmented(percent.caption)}</figcaption>
            </figure>
          )}
          {ratio && (
            <figure className="ratio-figure">
              {/* One aria-label because it is one picture, even though the caption is two
                  lines and is spoken as two parts — same reasoning as the number line. */}
              <RatioStrips strips={ratio} label={ratio.caption.join(" ").replace(/`/g, "")} />
              <figcaption className="figure-caption">
                {ratio.caption.map((part, i) => (
                  <span key={i} className="caption-line">
                    {segmented(part)}
                  </span>
                ))}
              </figcaption>
            </figure>
          )}
          {linear && (
            <figure className="linear-figure">
              <LinearGraph graph={linear} label={linear.caption.replace(/`/g, "")} />
              <figcaption className="figure-caption">{segmented(linear.caption)}</figcaption>
            </figure>
          )}
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
          {question.hints.slice(0, hintsShown).map((hint, i) => (
            <p key={i} className="hint">
              {/* Same isolation the prompts get: a hint like "כמה זה `8 + 2`?" is a
                  Hebrew sentence wrapped around an expression, which is exactly what the
                  bidi algorithm mangles. */}
              {segmented(hint)}
            </p>
          ))}
        </div>
      )}
      {feedback === null && hintsShown < 2 && (
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
