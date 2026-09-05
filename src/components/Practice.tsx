import type { Lesson } from "../data/style";
import { useEffect, useRef, useState } from "react";
import { isHebrewPrompt, promptSegments } from "../data/curriculum";
import type { Diagnosis } from "../data/diagnose";
import { diagnose } from "../data/diagnose";
import type { NotebookPage } from "../data/notebook";
import { createBlankPage, MAX_PAGES, pageHasContent } from "../data/notebook";
import type { PageReading } from "../lib/notebookServer";
import { readPageWithTeacher } from "../lib/notebookServer";
import { buildExplanation, explanationSpeechParts } from "../data/questionExplanation";
import { ClockFace } from "./ClockFace";
import { PracticeNotebook } from "./PracticeNotebook";
import { QuestionExplanation } from "./QuestionExplanation";
import { segmented } from "./segmented";
import { primeVoices, speak, speechParts, speechSupported, stopSpeaking } from "../data/speech";

/**
 * Which box is talking. One engine, four speak buttons — a boolean would light up "stop"
 * on all of them while only one is being read.
 */
type SpeakingBox = "question" | "diagnosis" | "explanation" | "teacher" | null;

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

  /** What the wrong answer says about the thinking behind it, when anything does. */
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpResult, setFollowUpResult] = useState<"right" | "wrong" | null>(null);
  const [askedToSee, setAskedToSee] = useState(false);

  /**
   * The notebook's pages. Deliberately state on *this* component, not a screen of its own
   * in App.tsx: that's what lets it survive across questions (nothing here resets when
   * `index` changes — see `next()`, which appends a fresh page rather than clearing this)
   * while still disappearing the moment the child leaves practice.
   */
  const [pages, setPages] = useState<NotebookPage[]>(() => [createBlankPage()]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  /** Talking to the teacher: idle (nothing sent yet, or a previous reading is showing),
   *  sending (waiting on the server), or error (the call itself failed — network/server,
   *  distinct from a reading that came back but wasn't confident, see `uncertain` below). */
  const [sendState, setSendState] = useState<"idle" | "sending" | "error">("idle");
  /** The teacher read the page but wasn't confident what was written — an invitation to
   *  write again, not a verdict. Never set alongside `feedback`: an uncertain reading has
   *  no answer to check. */
  const [uncertain, setUncertain] = useState(false);
  /** What the teacher understood, once a reading comes back confident. */
  const [teacherNote, setTeacherNote] = useState<{ reflection: string; errorPointer?: string } | null>(null);

  /** Telling the teacher she got it wrong (docs/features/notebook-teacher-feedback/):
   *  whether the free-text correction form is open, its content, and whether the reading
   *  currently on screen is the result of one (so the heading can say "...עכשיו"). */
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const [isCorrectedReading, setIsCorrectedReading] = useState(false);
  /** Whether *this* question is currently included in `correctCount` — lets a corrected
   *  reading that flips right/wrong adjust the score by exactly one instead of guessing
   *  from the reading alone (see architecture.md, "מונה כפול"). Reset in `next()`. */
  const questionCountedRef = useRef(false);
  /** Whether `onAnswered` has already fired for this question. It drives adaptive
   *  difficulty (docs/features/adaptive-difficulty/), which assumes exactly one call per
   *  question — a corrected reading updates everything else on screen but deliberately
   *  never fires this a second time (see architecture.md, Risks). Reset in `next()`. */
  const onAnsweredFiredRef = useRef(false);

  /** The notebook box expanded to (almost) the whole screen — a writing-mode toggle, not a
   *  result mode: see the effect below, which drops it the moment a reading comes back
   *  confident (design.md, מצב F). */
  const [fullscreen, setFullscreen] = useState(false);

  // Voices load asynchronously, so warm the list before the first press.
  useEffect(primeVoices, []);
  // Leaving mid-sentence must not leave a voice talking over the next screen.
  useEffect(() => stopSpeaking, []);
  // A confident reading means the page is locked and the result is showing — the whole
  // reason to expand the notebook (room to write) is gone, and the result needs the normal
  // full-width layout, not the compact strip. See design.md, מצב F: "מסך מלא הוא
  // מצב-כתיבה, לא מצב-תוצאה".
  useEffect(() => {
    if (feedback !== null) setFullscreen(false);
  }, [feedback]);

  const question = lesson.questions[index];
  const isLast = index === lesson.questions.length - 1;
  const isWordProblem = isHebrewPrompt(question.prompt);
  /** Every diagram/explanation extractor for this question, computed once — see
   *  questionExplanation.ts. The lesson screen (docs/features/topic-lesson) builds the
   *  identical bundle for the same question, off the same function. */
  const bundle = buildExplanation(question);
  const { explanation } = bundle;

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

  /** Never the correct answer — only the exercise text already on screen. Judging
   *  correct/incorrect stays entirely with the local check below, never with the model. */
  function currentExpectedPrompt(): string {
    return question.prompt.replace(/`/g, "");
  }

  /**
   * What the teacher's reading means for this question — the direct replacement for the
   * old `checkAnswer`, driven by `reading.finalAnswer` instead of a typed number.
   *
   * Reentrant by design (docs/features/notebook-teacher-feedback/architecture.md): a
   * corrected reading calls this again for the same question, so it always resets what the
   * *previous* reading derived before applying the new one, rather than assuming it's the
   * first and only call. `questionCountedRef`/`onAnsweredFiredRef` start `false`, so the
   * very first call behaves exactly as before this feature existed.
   */
  function handleTeacherReading(reading: PageReading, corrected: boolean) {
    setIsCorrectedReading(corrected);
    setFollowUpInput("");
    setFollowUpResult(null);
    setAskedToSee(false);
    setDiagnosis(null);

    if (!reading.certain) {
      setUncertain(true);
      setTeacherNote(null);
      setFeedback(null);
      if (questionCountedRef.current) {
        setCorrectCount((c) => c - 1);
        questionCountedRef.current = false;
      }
      return;
    }
    setUncertain(false);
    setTeacherNote({ reflection: reading.processReflection, errorPointer: reading.errorPointer });
    const isCorrect = reading.finalAnswer === question.answer;
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect && !questionCountedRef.current) {
      setCorrectCount((c) => c + 1);
      questionCountedRef.current = true;
    } else if (!isCorrect && questionCountedRef.current) {
      setCorrectCount((c) => c - 1);
      questionCountedRef.current = false;
    }

    // Adaptive difficulty assumes exactly one call per question — firing it again on a
    // corrected reading could double-count a question it already reacted to. See
    // architecture.md, Risks: a deliberate choice, not an oversight.
    if (!onAnsweredFiredRef.current) {
      onAnswered?.(isCorrect);
      onAnsweredFiredRef.current = true;
    }

    if (!isCorrect) {
      setDiagnosis(diagnose(question, reading.finalAnswer));
    }
  }

  async function sendToTeacher() {
    const currentPage = pages[currentPageIndex];
    if (!currentPage || !pageHasContent(currentPage) || sendState === "sending" || feedback !== null) return;
    // Pressing "send" means she is done listening, and a fresh attempt clears the last
    // "couldn't read that" message so it doesn't linger next to a new reading.
    stopSpeaking();
    setSpeakingBox(null);
    setUncertain(false);
    setSendState("sending");
    try {
      const { reading } = await readPageWithTeacher(currentPage, currentExpectedPrompt());
      setSendState("idle");
      handleTeacherReading(reading, false);
    } catch {
      setSendState("error");
    }
  }

  function openCorrection() {
    // The form needs the regular width, not the compact fullscreen strip — same reason a
    // confident reading already drops out of fullscreen on its own (design.md, מצב F). A
    // no-op when we're not in fullscreen already.
    setFullscreen(false);
    setCorrectionOpen(true);
  }

  function cancelCorrection() {
    setCorrectionOpen(false);
    setCorrectionText("");
    if (sendState === "error") setSendState("idle");
  }

  async function sendCorrection() {
    const currentPage = pages[currentPageIndex];
    if (!currentPage || sendState === "sending" || correctionText.trim() === "") return;
    setSendState("sending");
    try {
      const { reading } = await readPageWithTeacher(currentPage, currentExpectedPrompt(), correctionText.trim());
      setSendState("idle");
      handleTeacherReading(reading, true);
      setCorrectionOpen(false);
      setCorrectionText("");
    } catch {
      setSendState("error");
    }
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
    setDiagnosis(null);
    setFollowUpInput("");
    setFollowUpResult(null);
    setAskedToSee(false);
    setSendState("idle");
    setUncertain(false);
    setTeacherNote(null);
    setCorrectionOpen(false);
    setCorrectionText("");
    setIsCorrectedReading(false);
    questionCountedRef.current = false;
    onAnsweredFiredRef.current = false;

    // One fresh page per question — "one page = one exercise", like a real notebook, and
    // it means a locked, already-checked page can never end up being "the current page"
    // when a new question loads. At the page cap, reuse the last page instead of growing
    // past it (see docs/features/notebook-default-practice/architecture.md, Edge Cases).
    if (pages.length >= MAX_PAGES) {
      setPages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = createBlankPage();
        return updated;
      });
      setCurrentPageIndex(pages.length - 1);
    } else {
      setPages((prev) => [...prev, createBlankPage()]);
      setCurrentPageIndex(pages.length);
    }
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
          : box === "teacher"
            ? teacherNote &&
              speechParts([teacherNote.reflection, ...(teacherNote.errorPointer ? [teacherNote.errorPointer] : [])])
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

  const currentPage = pages[currentPageIndex];
  /** The single action rendered in the notebook's toolbar — see PracticeNotebook.tsx and
   *  docs/features/notebook-default-practice/architecture.md, "primaryAction בכל שלב". */
  const primaryAction =
    feedback !== null
      ? { label: isLast ? "סיום" : "הבא", onClick: next, disabled: false }
      : sendState === "sending"
        ? { label: "המורה קוראת...", onClick: () => {}, disabled: true }
        : { label: "שלח למורה", onClick: sendToTeacher, disabled: !currentPage || !pageHasContent(currentPage) };

  // Shared between the regular header and the fullscreen strip below, so the two never
  // drift apart — same markup, same RTL/LTR isolation, rendered in two different places.
  const questionSpeakButton = (
    <button
      type="button"
      className="speak-button"
      onClick={() => toggleSpeech("question")}
      aria-label={speakingBox === "question" ? "עצרו את ההקראה" : "הקריאו לי את השאלה"}
    >
      {speakingBox === "question" ? "⏹" : "🔊"}
    </button>
  );
  const questionBox = (
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
    </div>
  );

  /** The one diagram in the app that renders next to the question itself instead of only
   *  inside `QuestionExplanation` — see docs/features/grade2-clock/design.md. `bundle.clock`
   *  is `null` for every other topic, so this is a no-op everywhere else. */
  const clockSlot = bundle.clock ? <ClockFace data={bundle.clock} label={bundle.clock.caption} /> : null;

  /** What the notebook shows above the writing surface while it fills the screen: the
   *  question (so writing it down never means forgetting what's being solved) plus a way
   *  back out, replacing the regular header/title/hint-button that fullscreen hides — see
   *  design.md, מצב F. Rendered by PracticeNotebook, which has no idea what it is (same
   *  split as primaryAction). Null outside fullscreen: the regular header below covers it. */
  const topSlot = fullscreen ? (
    <div className="notebook-fullscreen-topbar">
      <button
        type="button"
        className="notebook-fullscreen-exit"
        onClick={() => setFullscreen(false)}
        aria-label="צאו ממסך מלא"
      >
        ✕
      </button>
      {questionBox}
      {clockSlot}
      {speechSupported() && questionSpeakButton}
    </div>
  ) : null;

  /** States C (uncertain reading) and E (send failed) stay reachable in fullscreen — they
   *  are small, sit beside the toolbar, and don't need the full header back (design.md,
   *  "מצב C/E בתוך מסך מלא"). Outside fullscreen these render in their usual spot below
   *  instead, unchanged from before this revision. */
  const statusSlot = fullscreen ? (
    <>
      {uncertain && (
        <>
          <p className="teacher-uncertain" aria-live="polite">
            לא הצלחתי לקרוא את זה בבירור. אפשר לכתוב שוב, קצת יותר גדול או ברור?
          </p>
          {/* Only the link, never the form: opening it exits fullscreen (openCorrection),
              so the form itself always renders in the regular layout below — see
              docs/features/notebook-teacher-feedback/design.md, מצב C. */}
          <button type="button" className="link-button teacher-correction-link" onClick={openCorrection}>
            ספרו למורה מה כתבתם
          </button>
        </>
      )}
      {sendState === "error" && (
        <p className="notebook-send-error" aria-live="polite">
          לא הצלחנו לשלוח את הדף. נסו שוב.
        </p>
      )}
    </>
  ) : null;

  /** The free-text correction form (מצב G/H/I) — the same form regardless of which trigger
   *  opened it (an uncertain reading, or a confident-but-wrong one), since only one of
   *  `uncertain`/`teacherNote` is ever set at a time. See design.md, מצב G–I. */
  const correctionForm = (
    <div className="teacher-correction-form">
      <textarea
        className="teacher-correction-input"
        value={correctionText}
        onChange={(e) => setCorrectionText(e.target.value)}
        placeholder="מה באמת כתבתם?"
        aria-label="מה באמת כתבתם?"
        disabled={sendState === "sending"}
        autoFocus
      />
      <div className="teacher-correction-actions">
        <button
          type="button"
          onClick={sendCorrection}
          disabled={sendState === "sending" || correctionText.trim() === ""}
        >
          {sendState === "sending" ? "המורה קוראת..." : "שליחה למורה"}
        </button>
        <button type="button" className="link-button" onClick={cancelCorrection} disabled={sendState === "sending"}>
          ביטול
        </button>
      </div>
      {sendState === "error" && (
        <p className="teacher-correction-error" aria-live="polite">
          לא הצלחנו לשלוח את התיקון. נסו שוב.
        </p>
      )}
    </div>
  );

  return (
    <div className="practice">
      {/* The regular header/title/hint-button hide while the notebook fills the screen —
          fullscreen's topSlot above carries a compact replacement for the one part of this
          (the question) that still has to stay visible. See design.md, מצב F. */}
      {!fullscreen && (
        <>
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
          {speechSupported() && <div className="question-speech">{questionSpeakButton}</div>}
          {questionBox}
          {clockSlot}
        </>
      )}
      {!fullscreen && uncertain && (
        <>
          <p className="teacher-uncertain" aria-live="polite">
            לא הצלחתי לקרוא את זה בבירור. אפשר לכתוב שוב, קצת יותר גדול או ברור?
          </p>
          {correctionOpen ? (
            correctionForm
          ) : (
            <button type="button" className="link-button teacher-correction-link" onClick={openCorrection}>
              ספרו למורה מה כתבתם
            </button>
          )}
        </>
      )}
      {teacherNote && (
        <div className="teacher-reading">
          <div className="teacher-reading-header">
            <h3>{isCorrectedReading ? "מה המורה הבינה עכשיו" : "מה המורה הבינה"}</h3>
            {speechSupported() && (
              <button
                type="button"
                className="speak-button"
                onClick={() => toggleSpeech("teacher")}
                aria-label={speakingBox === "teacher" ? "עצרו את ההקראה" : "הקראת מה שהמורה הבינה"}
              >
                {speakingBox === "teacher" ? "⏹" : "🔊"}
              </button>
            )}
          </div>
          <p className="teacher-reading-line">{segmented(teacherNote.reflection)}</p>
          {teacherNote.errorPointer && (
            <p
              className={`teacher-reading-line${feedback === "correct" ? " teacher-reading-flag" : ""}`}
            >
              {segmented(teacherNote.errorPointer)}
            </p>
          )}
          {/* Corrects the reading, not the correct/wrong verdict below it — always visible
              here regardless of feedback, including a reading that already came out
              correct (design.md, מצב D: "מופיע תמיד כשיש teacherNote"). */}
          {correctionOpen ? (
            correctionForm
          ) : (
            <button type="button" className="link-button teacher-correction-link" onClick={openCorrection}>
              המורה טעתה? ספרו לה מה קרה
            </button>
          )}
        </div>
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
        // A correct answer whose process the teacher flagged (errorPointer) still reads as
        // correct, but not as an unqualified "🎉" — same amber accent as .diagnosis below,
        // "points at something, does not mark work as failed" applied to a right answer too.
        <p
          className={`feedback ${feedback === "correct" && teacherNote?.errorPointer ? "correct-flagged" : feedback}`}
        >
          {feedback === "correct"
            ? teacherNote?.errorPointer
              ? "התשובה נכונה"
              : "נכון מאוד! 🎉"
            : `לא נכון. התשובה היא ${question.answer}`}
        </p>
      )}
      {feedback === "wrong" && revealed && explanation !== null && (
        <QuestionExplanation
          bundle={bundle}
          speak={
            speechSupported()
              ? {
                  active: speakingBox === "explanation",
                  onToggle: () => toggleSpeech("explanation"),
                }
              : undefined
          }
        />
      )}
      <PracticeNotebook
        pages={pages}
        currentPageIndex={currentPageIndex}
        onPagesChange={setPages}
        onCurrentPageIndexChange={setCurrentPageIndex}
        locked={feedback !== null}
        primaryAction={primaryAction}
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((f) => !f)}
        topSlot={topSlot}
        statusSlot={statusSlot}
      />
      {!fullscreen && sendState === "error" && (
        <p className="notebook-send-error" aria-live="polite">
          לא הצלחנו לשלוח את הדף. נסו שוב.
        </p>
      )}
      {!fullscreen && hintsShown > 0 && (
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
      {!fullscreen && feedback === null && hintsShown < 2 && (
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
