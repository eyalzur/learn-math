import type { Level } from "../data/curriculum";

interface LevelPickerProps {
  /** Shown above the levels — a topic title, or the grade when there is no topic. */
  heading: string;
  subheading: string;
  levels: Level[];
  onSelect: (level: Level) => void;
  onBack: () => void;
  /** Only offered from the first screen, where "back" means switching student. */
  onHistory?: () => void;
}

const levelClass: Record<Level["id"], string> = {
  easy: "level-easy",
  medium: "level-medium",
  hard: "level-hard",
};

export function LevelPicker({
  heading,
  subheading,
  levels,
  onSelect,
  onBack,
  onHistory,
}: LevelPickerProps) {
  return (
    <div className="grade-home">
      <div className="grade-header">
        <button className="link-button" onClick={onBack}>
          {onHistory ? "← החלף תלמיד" : "← חזרה"}
        </button>
        <span className="greeting">{subheading}</span>
      </div>
      {onHistory && (
        <button className="link-button history-link" onClick={onHistory}>
          ההתקדמות שלי →
        </button>
      )}

      <h1>{heading}</h1>

      <p className="subtitle">בחרו רמה כדי להתחיל</p>
      <div className="level-grid">
        {levels.map((level) => (
          <button
            key={level.id}
            className={`level-card ${levelClass[level.id]}`}
            onClick={() => onSelect(level)}
          >
            <span className="level-title">{level.title}</span>
            <span className="level-description">{level.description}</span>
            <span className="level-count">{level.questions.length} שאלות</span>
          </button>
        ))}
      </div>
    </div>
  );
}
