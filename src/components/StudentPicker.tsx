import { useState } from "react";
import { students, grades } from "../data/curriculum";
import type { Student } from "../data/curriculum";
import { APP_VERSION } from "../data/version";
import { VersionLog } from "./VersionLog";

interface StudentPickerProps {
  onSelect: (student: Student) => void;
}

export function StudentPicker({ onSelect }: StudentPickerProps) {
  const [versionLogOpen, setVersionLogOpen] = useState(false);

  return (
    <div className="student-picker">
      <h1>מי לומד היום?</h1>
      <div className="student-list">
        {students.map((student) => {
          const grade = grades.find((g) => g.id === student.gradeId);
          return (
            <button
              key={student.id}
              className="student-card"
              onClick={() => onSelect(student)}
            >
              <span className="student-name">{student.name}</span>
              <span className="student-grade">{grade?.label}</span>
            </button>
          );
        })}
      </div>
      {/* Label and number are separate elements on purpose: a mixed Hebrew/LTR string
          handed to the browser's bidi algorithm is how this project shipped three
          direction bugs already. */}
      <button type="button" className="app-version" onClick={() => setVersionLogOpen(true)}>
        גרסה <span className="app-version-number">{APP_VERSION}</span>
      </button>
      <VersionLog open={versionLogOpen} onClose={() => setVersionLogOpen(false)} />
    </div>
  );
}
