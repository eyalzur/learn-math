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
  /** The topic's easiest written example — chosen by the caller (App.tsx), not here, so
   *  this component stays a pure "show this question, solved" screen. */
  question: Question;
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
export function TopicLesson({ topicTitle, gradeLabel, question, onBack, onPractice }: TopicLessonProps) {
  const [speaking, setSpeaking] = useState(false);
  const isWordProblem = isHebrewPrompt(question.prompt);
  const bundle = buildExplanation(question);

  function toggleSpeak() {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    // Same shape Practice.tsx's own question-speech button builds: a word problem's
    // arithmetic runs stay backtick-marked so speech.ts converts them to words, a bare
    // expression is backtick-marked whole.
    const promptText = isWordProblem
      ? promptSegments(question.prompt)
          .map((s) => (s.kind === "math" ? `\`${s.value}\`` : s.value))
          .join(" ")
      : `\`${question.prompt}\``;
    const parts = [
      ...speechParts([promptText, ...question.hints]),
      ...explanationSpeechParts(bundle),
    ];
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
      <div className={`problem-box ${isWordProblem ? "box-rtl" : "box-ltr"}`}>
        <span className={`problem-text ${isWordProblem ? "prompt-rtl" : "prompt-ltr"}`}>
          {isWordProblem ? segmented(question.prompt) : <>{`${question.prompt} =`}</>}
        </span>
      </div>
      <div className="hints">
        {question.hints.map((hint, i) => (
          <p key={i} className="hint">
            {segmented(hint)}
          </p>
        ))}
      </div>
      <QuestionExplanation bundle={bundle} />
      <div className="actions">
        <button type="button" onClick={onPractice}>
          → לתרגול
        </button>
      </div>
    </div>
  );
}
