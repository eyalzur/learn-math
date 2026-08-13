import { gradeOf } from "../data/curriculum";
import type { Level, Student } from "../data/curriculum";

interface GradeHomeProps {
  student: Student;
  onSelectLevel: (level: Level) => void;
  onSwitchStudent: () => void;
}

const levelClass: Record<Level["id"], string> = {
  easy: "level-easy",
  medium: "level-medium",
  hard: "level-hard",
};

export function GradeHome({ student, onSelectLevel, onSwitchStudent }: GradeHomeProps) {
  const grade = gradeOf(student);

  return (
    <div className="grade-home">
      <div className="grade-header">
        <button className="link-button" onClick={onSwitchStudent}>
          ← החלף תלמיד
        </button>
        <span className="greeting">שלום {student.name}!</span>
      </div>

      <h1>{grade.label}</h1>

      <section className="syllabus">
        <h2>מה לומדים ב{grade.label}</h2>
        <p className="topic-list">{grade.topics.join(" · ")}</p>
      </section>

      <p className="subtitle">בחרו רמה כדי להתחיל</p>
      <div className="level-grid">
        {grade.levels.map((level) => (
          <button
            key={level.id}
            className={`level-card ${levelClass[level.id]}`}
            onClick={() => onSelectLevel(level)}
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
