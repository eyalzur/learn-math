import type { ExerciseSet } from "../data/exerciseSets";

interface ResultProps {
  set: ExerciseSet;
  correctCount: number;
  onRetry: () => void;
  onHome: () => void;
}

export function Result({ set, correctCount, onRetry, onHome }: ResultProps) {
  const total = set.problems.length;
  const percent = Math.round((correctCount / total) * 100);

  let message = "כל הכבוד!";
  if (percent < 50) message = "כדאי לתרגל עוד קצת";
  else if (percent < 80) message = "יפה מאוד, המשיכו כך!";
  else message = "מצוין! שליטה מלאה!";

  return (
    <div className="result">
      <h1>{message}</h1>
      <p className="score">
        {correctCount} מתוך {total} נכונות ({percent}%)
      </p>
      <div className="actions">
        <button onClick={onRetry}>נסו שוב</button>
        <button className="secondary" onClick={onHome}>
          חזרה לתפריט
        </button>
      </div>
    </div>
  );
}
