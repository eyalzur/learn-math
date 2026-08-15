import type { Lesson } from "../data/style";
interface ResultProps {
  /**
   * What is being practised: a difficulty level, or a lesson on one style of exercise.
   * Both are just a title and a list of questions, so this screen never learns which.
   */
  lesson: Lesson;
  correctCount: number;
  onRetry: () => void;
  onHome: () => void;
}

export function Result({ lesson, correctCount, onRetry, onHome }: ResultProps) {
  const total = lesson.questions.length;
  const percent = Math.round((correctCount / total) * 100);

  let message = "כל הכבוד!";
  if (percent < 50) message = "כדאי לתרגל עוד קצת";
  else if (percent < 80) message = "יפה מאוד, המשיכו כך!";
  else if (percent < 100) message = "מצוין! שליטה מלאה!";
  else message = "🌟 ציון מושלם! פתרת הכל נכון!";

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
