import { useState } from "react";
import type { ExerciseSet } from "../data/exerciseSets";
import { answerOf } from "../data/exerciseSets";

interface PracticeProps {
  set: ExerciseSet;
  onFinish: (correctCount: number) => void;
  onExit: () => void;
}

export function Practice({ set, onFinish, onExit }: PracticeProps) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const problem = set.problems[index];
  const isLast = index === set.problems.length - 1;

  function checkAnswer() {
    if (input.trim() === "" || feedback !== null) return;
    const userAnswer = Number(input);
    const isCorrect = userAnswer === answerOf(problem);
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) setCorrectCount((c) => c + 1);
  }

  function next() {
    if (isLast) {
      onFinish(correctCount);
      return;
    }
    setIndex((i) => i + 1);
    setInput("");
    setFeedback(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    if (feedback === null) checkAnswer();
    else next();
  }

  return (
    <div className="practice">
      <div className="practice-header">
        <button className="link-button" onClick={onExit}>
          ← חזרה
        </button>
        <span className="progress">
          תרגיל {index + 1} מתוך {set.problems.length}
        </span>
      </div>
      <h2>{set.title}</h2>
      <div className="problem-box">
        <span className="problem-text">
          {problem.a} {problem.op} {problem.b} =
        </span>
        <input
          type="number"
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
          {feedback === "correct" ? "נכון מאוד! 🎉" : `לא נכון. התשובה היא ${answerOf(problem)}`}
        </p>
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
