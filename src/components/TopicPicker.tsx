import type { Topic } from "../data/curriculum";
import { speechSupported } from "../data/speech";

interface TopicPickerProps {
  gradeLabel: string;
  topics: Topic[];
  onSelect: (topic: Topic) => void;
  onBack: () => void;
  /** What `onBack` actually does, in the caller's own words — a mid-flow "back" and a
   *  first-screen "switch student" read differently, and only the caller (who wires
   *  `onBack` itself) reliably knows which one this is. Guessing it from whether
   *  `onHistory` was also passed broke the moment a screen could have both a history
   *  link and a "back" that doesn't switch student — a student with more than one grade
   *  does exactly that. */
  backLabel: string;
  /** The history link's reachability is independent of what "back" does — a student with
   *  more than one grade still wants it here, not only on the grade-choice screen. */
  onHistory?: () => void;
  /** Read every question aloud for this student. Absent when there is no student yet. */
  readAloud?: boolean;
  onReadAloudChange?: (value: boolean) => void;
}

export function TopicPicker({
  gradeLabel,
  topics,
  onSelect,
  onBack,
  backLabel,
  onHistory,
  readAloud,
  onReadAloudChange,
}: TopicPickerProps) {
  // The setting belongs to a student, so it only appears once one is chosen — and only
  // where a voice exists to honour it.
  const showReadAloud =
    readAloud !== undefined && onReadAloudChange !== undefined && speechSupported();
  return (
    <div className="topic-picker">
      <div className="grade-header">
        <button className="link-button" onClick={onBack}>
          {backLabel}
        </button>
        <span className="greeting">{gradeLabel}</span>
      </div>
      {onHistory && (
        <button className="link-button history-link" onClick={onHistory}>
          ההתקדמות שלי →
        </button>
      )}

      {showReadAloud && (
        <div className="read-aloud-setting">
          <span className="read-aloud-icon" aria-hidden="true">
            🔊
          </span>
          <span className="read-aloud-text">
            <span className="read-aloud-title">להקריא את השאלות בקול</span>
            <span className="read-aloud-note">מומלץ למי שעדיין לומד/ת לקרוא</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={readAloud}
            className={`read-aloud-switch ${readAloud ? "on" : "off"}`}
            onClick={() => onReadAloudChange(!readAloud)}
          >
            <span className="read-aloud-knob" />
            <span className="visually-hidden">להקריא את השאלות בקול</span>
          </button>
        </div>
      )}

      <h1>מה נתרגל היום?</h1>

      {topics.length > 0 && topics.every((topic) => !topic.reviewed) && (
        <p className="topics-notice">
          עוד מעט! מכינים כאן תרגילים חדשים. בינתיים אפשר להסתכל בהיסטוריה.
        </p>
      )}

      <div className="topic-grid">
        {topics.map((topic) => (
          <button
            key={topic.id}
            className="topic-card"
            onClick={() => onSelect(topic)}
            /* The real attribute, not just a class: it keeps the card out of the tab
               order and announces it to a screen reader. Dimming alone would leave it
               reachable by keyboard — a block you can walk around. */
            disabled={!topic.reviewed}
          >
            <span className="topic-title">{topic.title}</span>
            {!topic.reviewed && <span className="topic-soon">בקרוב</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
