import { useEffect, useState } from "react";
import type { Level } from "../data/curriculum";
import { isHebrewPrompt, promptSegments } from "../data/curriculum";
import { explainQuestion } from "../data/explain";
import {
  explanationToSpeech,
  primeVoices,
  speak,
  speechSupported,
  stopSpeaking,
} from "../data/speech";

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
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Voices load asynchronously, so warm the list before the first press.
  useEffect(primeVoices, []);
  // Leaving mid-sentence must not leave a voice talking over the next screen.
  useEffect(() => stopSpeaking, []);

  const question = level.questions[index];
  const isLast = index === level.questions.length - 1;
  const isWordProblem = isHebrewPrompt(question.prompt);
  const explanation = explainQuestion(question);

  function checkAnswer() {
    if (input.trim() === "" || feedback !== null) return;
    const isCorrect = Number(input) === question.answer;
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) setCorrectCount((c) => c + 1);
  }

  function next() {
    // Otherwise the previous question's explanation keeps playing over the new one.
    stopSpeaking();
    setIsSpeaking(false);

    if (isLast) {
      onFinish(correctCount);
      return;
    }
    setIndex((i) => i + 1);
    setInput("");
    setFeedback(null);
  }

  function toggleSpeech() {
    if (explanation === null) return;
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    speak(explanationToSpeech(explanation), () => setIsSpeaking(false));
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
      {feedback && (
        <p className={`feedback ${feedback}`}>
          {feedback === "correct" ? "נכון מאוד! 🎉" : `לא נכון. התשובה היא ${question.answer}`}
        </p>
      )}
      {feedback === "wrong" && explanation !== null && (
        <div className="explanation">
          <div className="explanation-header">
            <h3>איך פותרים?</h3>
            {speechSupported() && (
              <button
                type="button"
                className="speak-button"
                onClick={toggleSpeech}
                aria-label={isSpeaking ? "עצרו את ההקראה" : "הקריאו לי את ההסבר"}
              >
                {isSpeaking ? "⏹" : "🔊"}
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
    </div>
  );
}
