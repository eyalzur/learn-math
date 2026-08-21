import { useState } from "react";
import type { Question } from "../data/curriculum";
import { isHebrewPrompt, promptSegments } from "../data/curriculum";
import { buildExplanation, explanationSpeechParts } from "../data/questionExplanation";
import { QuestionExplanation } from "./QuestionExplanation";
import { segmented } from "./segmented";
import { speak, speechParts, speechSupported, stopSpeaking } from "../data/speech";

interface TopicLessonProps {
  topicTitle: string;
  gradeLabel: string;
  /** The topic's worked examples — chosen by the caller (App.tsx), not here, so this
   *  component stays a pure "show these questions, solved" screen. One example for a
   *  topic without adaptive difficulty (מיקה), one per difficulty tier for a topic with
   *  it (רותם/עומר) — see `App.tsx`'s `lessonQuestions`. */
  questions: Question[];
  onBack: () => void;
  onPractice: () => void;
}

/**
 * "שיעור" — the same explanation a wrong answer would reveal in practice, shown for the
 * topic's easiest example without anyone having answered anything. No input, no "בדיקה"
 * button: see docs/features/topic-lesson.
 *
 * Named `TopicLesson`, not `Lesson` — `Lesson` is already `data/style.ts`'s type for a
 * practice session's title+questions, and a component of the same name would either
 * collide with that import or force every caller to alias one of them.
 */
export function TopicLesson({ topicTitle, gradeLabel, questions, onBack, onPractice }: TopicLessonProps) {
  const [speaking, setSpeaking] = useState(false);
  const showTierHeadings = questions.length > 1;

  function toggleSpeak() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const parts = questions.flatMap((question, i) => {
      const isWordProblem = isHebrewPrompt(question.prompt);
      // Same shape Practice.tsx's own question-speech button builds: a word problem's
      // arithmetic runs stay backtick-marked so speech.ts converts them to words, a bare
      // expression is backtick-marked whole.
      const promptText = isWordProblem
        ? promptSegments(question.prompt)
            .map((s) => (s.kind === "math" ? `\`${s.value}\`` : s.value))
            .join(" ")
        : `\`${question.prompt}\``;
      const heading = showTierHeadings ? speechParts([`דוגמה ${i + 1} מתוך ${questions.length}`]) : [];
      const bundle = buildExplanation(question);
      return [...heading, ...speechParts([promptText, ...question.hints]), ...explanationSpeechParts(bundle)];
    });
    if (!parts.length) return;
    setSpeaking(true);
    speak(parts, () => setSpeaking(false));
  }

  return (
    <div className="practice">
      <div className="practice-header">
        <button
          className="link-button"
          onClick={() => {
            stopSpeaking();
            onBack();
          }}
        >
          ← חזרה
        </button>
        <span className="progress">{gradeLabel}</span>
      </div>
      <h2>{topicTitle}</h2>
      {speechSupported() && (
        <div className="question-speech">
          <button
            type="button"
            className="speak-button"
            onClick={toggleSpeak}
            aria-label={speaking ? "עצרו את ההקראה" : "הקריאו לי את השיעור"}
          >
            {speaking ? "⏹" : "🔊"}
          </button>
        </div>
      )}
      {questions.map((question, i) => {
        const isWordProblem = isHebrewPrompt(question.prompt);
        const bundle = buildExplanation(question);
        return (
          <div key={question.id} className="lesson-example">
            {showTierHeadings && <h3>{`דוגמה ${i + 1} מתוך ${questions.length}`}</h3>}
            <div className={`problem-box ${isWordProblem ? "box-rtl" : "box-ltr"}`}>
              <span className={`problem-text ${isWordProblem ? "prompt-rtl" : "prompt-ltr"}`}>
                {isWordProblem ? segmented(question.prompt) : <>{`${question.prompt} =`}</>}
              </span>
            </div>
            <div className="hints">
              {question.hints.map((hint, j) => (
                <p key={j} className="hint">
                  {segmented(hint)}
                </p>
              ))}
            </div>
            <QuestionExplanation bundle={bundle} />
          </div>
        );
      })}
      <div className="actions">
        <button type="button" onClick={onPractice}>
          → לתרגול
        </button>
      </div>
    </div>
  );
}
