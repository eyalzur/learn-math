import type { Lesson } from "../data/style";
import { starsForAccuracy } from "../data/progress";
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

  // Every tier gets its own icon — a game-style "how well did I do" readout, not just a
  // plain sentence. The star count itself is shared with TopicPicker's cumulative rating
  // (starsForAccuracy), so "3 stars" means the same thing in both places.
  let icon = "💪";
  let message = "כדאי לתרגל עוד קצת";
  if (percent >= 100) {
    icon = "🌟";
    message = "ציון מושלם! פתרת הכל נכון!";
  } else if (percent >= 80) {
    icon = "🎉";
    message = "מצוין! שליטה מלאה!";
  } else if (percent >= 50) {
    icon = "😊";
    message = "יפה מאוד, המשיכו כך!";
  }
  const stars = starsForAccuracy(correctCount, total);

  return (
    <div className="result">
      <div className="result-card">
        <span className="result-icon" aria-hidden="true">
          {icon}
        </span>
        <div className="result-stars" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`result-star ${n <= stars ? "result-star-on" : ""}`}>
              ⭐
            </span>
          ))}
        </div>
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
    </div>
  );
}
