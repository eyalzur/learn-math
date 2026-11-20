import { useState } from "react";
import type { Grade } from "../data/curriculum";

export interface CreateStudentDialogProps {
  open: boolean;
  grades: Grade[];
  onCreate: (name: string, gradeId: string) => void;
  onClose: () => void;
}

/**
 * Same overlay+card anatomy as `VersionLog`, under its own class names — see the
 * comment above `.settings-backdrop` in App.css for why dialogs here don't share one
 * set of classes.
 */
export function CreateStudentDialog({ open, grades, onCreate, onClose }: CreateStudentDialogProps) {
  const [name, setName] = useState("");
  const [gradeId, setGradeId] = useState(grades[0]?.id ?? "");

  if (!open) return null;

  const trimmedName = name.trim();

  function submit() {
    if (!trimmedName) return;
    onCreate(trimmedName, gradeId);
    setName("");
    setGradeId(grades[0]?.id ?? "");
  }

  return (
    <div className="create-student-backdrop" onClick={onClose}>
      <div
        className="create-student-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-student-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="create-student-title" id="create-student-title">
          תלמיד/ה חדש/ה
        </h2>

        <label className="create-student-label" htmlFor="create-student-name">
          שם
        </label>
        <input
          id="create-student-name"
          className="create-student-input"
          type="text"
          value={name}
          placeholder="לדוגמה: דנה"
          onChange={(e) => setName(e.target.value)}
        />

        <p className="create-student-label">כיתה רגילה</p>
        <div className="grade-list create-student-grade-list">
          {grades.map((grade) => (
            <button
              key={grade.id}
              type="button"
              className={`grade-card grade-card-${grade.id} ${
                grade.id === gradeId ? "grade-card-selected" : ""
              }`}
              onClick={() => setGradeId(grade.id)}
            >
              <span className="grade-card-letter" aria-hidden="true">
                {grade.shortLabel}
              </span>
              <span className="grade-card-label">{grade.label}</span>
            </button>
          ))}
        </div>
        <p className="create-student-hint">אפשר ללמוד מכל כיתה גם אחר כך</p>

        <div className="settings-actions">
          <button type="button" onClick={submit} disabled={!trimmedName}>
            יצירה
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
