import { formatDate, historyFor } from "../data/progress";
import type { Student } from "../data/curriculum";

interface HistoryProps {
  student: Student;
  onBack: () => void;
}

export function History({ student, onBack }: HistoryProps) {
  const records = historyFor(student.id);

  return (
    <div className="history">
      <div className="grade-header">
        <button className="link-button" onClick={onBack}>
          ← חזרה
        </button>
        <span className="greeting">{student.name}</span>
      </div>

      <h1>ההתקדמות שלי</h1>

      {records.length === 0 ? (
        <p className="history-empty">עוד לא תרגלת. אחרי התרגול הראשון הוא יופיע כאן.</p>
      ) : (
        <ul className="history-list">
          {records.map((record, i) => (
            <li key={i} className="history-row">
              <span className="history-what">
                {record.topicTitle}
                {record.topicTitle && record.levelTitle ? " · " : ""}
                {record.levelTitle}
              </span>
              <span className="history-score">
                {record.correct}/{record.total}
              </span>
              <span className="history-when">{formatDate(record.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
