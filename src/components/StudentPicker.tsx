import { useState } from "react";
import { grades } from "../data/curriculum";
import type { Student } from "../data/curriculum";
import { studentBadge } from "../data/studentBadge";
import { avatarFor } from "../data/avatars";
import { APP_VERSION } from "../data/version";
import { VersionLog } from "./VersionLog";
import { CreateStudentDialog } from "./CreateStudentDialog";
import { DeleteStudentDialog } from "./DeleteStudentDialog";

interface StudentPickerProps {
  students: Student[];
  onSelect: (student: Student) => void;
  onCreate: (name: string, gradeId: string, avatar?: string) => void;
  onDelete: (id: string) => void;
}

export function StudentPicker({ students, onSelect, onCreate, onDelete }: StudentPickerProps) {
  const [versionLogOpen, setVersionLogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);

  return (
    <div className="student-picker">
      <h1>מי לומד היום?</h1>
      <div className="student-list">
        {students.map((student) => {
          const grade = grades.find((g) => g.id === student.gradeId);
          const badge = studentBadge(student.id);
          const avatar = avatarFor(student);
          return (
            <div key={student.id} className="student-card-wrap">
              <button className="student-card" onClick={() => onSelect(student)}>
                <span className="student-badge" aria-hidden="true" style={{ color: badge.color }}>
                  {avatar.emoji}
                </span>
                <span className="student-name">{student.name}</span>
                <span className="student-grade">{grade?.label}</span>
              </button>
              <button
                type="button"
                className="student-card-delete"
                aria-label={`מחיקת ${student.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(student);
                }}
              >
                🗑
              </button>
            </div>
          );
        })}
        <button type="button" className="student-card student-card-add" onClick={() => setCreateOpen(true)}>
          <span className="student-card-add-icon" aria-hidden="true">
            ➕
          </span>
          <span className="student-grade">הוספת תלמיד/ה</span>
        </button>
      </div>
      {/* Label and number are separate elements on purpose: a mixed Hebrew/LTR string
          handed to the browser's bidi algorithm is how this project shipped three
          direction bugs already. */}
      <button type="button" className="app-version" onClick={() => setVersionLogOpen(true)}>
        גרסה <span className="app-version-number">{APP_VERSION}</span>
      </button>
      <VersionLog open={versionLogOpen} onClose={() => setVersionLogOpen(false)} />
      <CreateStudentDialog
        open={createOpen}
        grades={grades}
        onCreate={(name, gradeId, avatar) => {
          onCreate(name, gradeId, avatar);
          setCreateOpen(false);
        }}
        onClose={() => setCreateOpen(false)}
      />
      <DeleteStudentDialog
        student={deleteTarget}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
