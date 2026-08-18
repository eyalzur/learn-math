import type { Grade } from "../data/curriculum";

interface GradePickerProps {
  grades: Grade[];
  onSelect: (grade: Grade) => void;
  onBack: () => void;
  /** Only offered when this is the first screen after picking a student — same
   *  convention as `TopicPicker`'s `onHistory`. */
  onHistory?: () => void;
}

/**
 * Which grade to practise in, for a student with more than one available (today, only
 * Mika). A single large letter per card — not just the label text — because this can be
 * the very first screen a pre-reader meets after picking her name.
 */
export function GradePicker({ grades, onSelect, onBack, onHistory }: GradePickerProps) {
  return (
    <div className="grade-picker">
      <div className="grade-header">
        <button className="link-button" onClick={onBack}>
          {onHistory ? "← החלף תלמיד" : "← חזרה"}
        </button>
      </div>
      {onHistory && (
        <button className="link-button history-link" onClick={onHistory}>
          ההתקדמות שלי →
        </button>
      )}

      <h1>באיזו כיתה מתרגלים היום?</h1>

      <div className="grade-list">
        {grades.map((grade) => (
          <button
            key={grade.id}
            className={`grade-card grade-card-${grade.id}`}
            onClick={() => onSelect(grade)}
          >
            <span className="grade-card-letter" aria-hidden="true">
              {grade.shortLabel}
            </span>
            <span className="grade-card-label">{grade.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
