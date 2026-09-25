import type { Topic } from "../data/curriculum";
import { HOLD_ZOOM_LEVELS } from "../data/notebook";
import { speechSupported } from "../data/speech";

interface TopicPickerProps {
  gradeLabel: string;
  topics: Topic[];
  onSelect: (topic: Topic) => void;
  /** Opens the topic's lesson screen instead of practice — a secondary action beside the
   *  card, not a step in front of it, so picking a topic still goes straight to practice
   *  exactly as it always has (see docs/features/topic-lesson). Absent means no lesson
   *  entry point is offered here at all. */
  onLesson?: (topic: Topic) => void;
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
  /** Which hold-to-zoom strength this student is set to — a `HOLD_ZOOM_LEVELS` id. Absent
   *  when there is no student yet, exactly like `readAloud`. */
  holdZoomLevel?: string;
  onHoldZoomLevelChange?: (levelId: string) => void;
}

export function TopicPicker({
  gradeLabel,
  topics,
  onSelect,
  onLesson,
  onBack,
  backLabel,
  onHistory,
  readAloud,
  onReadAloudChange,
  holdZoomLevel,
  onHoldZoomLevelChange,
}: TopicPickerProps) {
  // The setting belongs to a student, so it only appears once one is chosen — and only
  // where a voice exists to honour it.
  const showReadAloud =
    readAloud !== undefined && onReadAloudChange !== undefined && speechSupported();
  // Same "only once a student is chosen" rule, without the speech check — this one has
  // nothing to do with a voice being available.
  const showHoldZoom = holdZoomLevel !== undefined && onHoldZoomLevelChange !== undefined;
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

      {showHoldZoom && (
        <div className="hold-zoom-setting">
          <div className="hold-zoom-header">
            <span className="hold-zoom-icon" aria-hidden="true">
              🔍
            </span>
            <span className="read-aloud-text">
              <span className="read-aloud-title">התקרבות כשמחזיקים את האצבע</span>
              <span className="read-aloud-note">כמה הדף מתקרב כשעוצרים לרגע לפני שכותבים</span>
            </span>
          </div>
          <div className="hold-zoom-options" role="group" aria-label="התקרבות כשמחזיקים את האצבע">
            {HOLD_ZOOM_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                className="hold-zoom-option"
                aria-pressed={level.id === holdZoomLevel}
                onClick={() => onHoldZoomLevelChange(level.id)}
              >
                {level.label}
              </button>
            ))}
          </div>
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
          <div key={topic.id} className="topic-row">
            <button
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
            {onLesson && topic.reviewed && (
              /* Beside the card, never inside it — same reason StylePicker's speaker
                 button sits beside its card: a button within a button is invalid HTML,
                 and nesting them would make tapping this one ambiguous with picking
                 practice. */
              <button
                type="button"
                className="lesson-link"
                aria-label={`שיעור: ${topic.title}`}
                onClick={() => onLesson(topic)}
              >
                <span aria-hidden="true">📖</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
