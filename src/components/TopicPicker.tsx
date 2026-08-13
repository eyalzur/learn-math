import type { Topic } from "../data/curriculum";

interface TopicPickerProps {
  gradeLabel: string;
  topics: Topic[];
  onSelect: (topic: Topic) => void;
  onBack: () => void;
  /** Only offered from the first screen, where "back" means switching student. */
  onHistory?: () => void;
}

export function TopicPicker({
  gradeLabel,
  topics,
  onSelect,
  onBack,
  onHistory,
}: TopicPickerProps) {
  return (
    <div className="topic-picker">
      <div className="grade-header">
        <button className="link-button" onClick={onBack}>
          {onHistory ? "← החלף תלמיד" : "← חזרה"}
        </button>
        <span className="greeting">{gradeLabel}</span>
      </div>
      {onHistory && (
        <button className="link-button history-link" onClick={onHistory}>
          ההתקדמות שלי →
        </button>
      )}

      <h1>מה נתרגל היום?</h1>

      <div className="topic-grid">
        {topics.map((topic) => (
          <button key={topic.id} className="topic-card" onClick={() => onSelect(topic)}>
            <span className="topic-title">{topic.title}</span>
            <span className="topic-count">{topic.levels.length} רמות</span>
          </button>
        ))}
      </div>
    </div>
  );
}
