import { formatDate, historyFor } from "../data/progress";
import { stuckTopicsFor } from "../data/struggleDiagnosis";
import type { Student, Topic } from "../data/curriculum";

interface HistoryProps {
  student: Student;
  onBack: () => void;
  onStartTopic: (topic: Topic, gradeId: string) => void;
}

export function History({ student, onBack, onStartTopic }: HistoryProps) {
  const records = historyFor(student.id);
  const stuckTopics = stuckTopicsFor(student.id);

  return (
    <div className="history">
      <div className="grade-header">
        <button className="link-button" onClick={onBack}>
          ← חזרה
        </button>
        <span className="greeting">{student.name}</span>
      </div>

      <h1>ההתקדמות שלי</h1>

      {stuckTopics.length > 0 && (
        <ul className="stuck-topics">
          {stuckTopics.map((stuck) => (
            <li key={`${stuck.gradeId}:${stuck.topicTitle}`} className="stuck-topic-card">
              <span className="stuck-topic-icon" aria-hidden="true">
                💡
              </span>
              <span className="stuck-topic-text">
                <span>נראה ש{stuck.topicTitle} קצת מאתגר השבוע</span>
                <button type="button" onClick={() => onStartTopic(stuck.topic, stuck.gradeId)}>
                  לתרגל עכשיו
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

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
