import { exerciseSets } from "../data/exerciseSets";
import type { ExerciseSet } from "../data/exerciseSets";

interface HomeProps {
  onSelect: (set: ExerciseSet) => void;
}

const levelClass: Record<ExerciseSet["level"], string> = {
  קל: "level-easy",
  בינוני: "level-medium",
  קשה: "level-hard",
};

export function Home({ onSelect }: HomeProps) {
  return (
    <div className="home">
      <h1>לומדים חשבון</h1>
      <p className="subtitle">בחרו תרגול כדי להתחיל</p>
      <div className="set-grid">
        {exerciseSets.map((set) => (
          <button key={set.id} className="set-card" onClick={() => onSelect(set)}>
            <span className={`level-badge ${levelClass[set.level]}`}>{set.level}</span>
            <h2>{set.title}</h2>
            <p>{set.description}</p>
            <span className="problem-count">{set.problems.length} תרגילים</span>
          </button>
        ))}
      </div>
    </div>
  );
}
