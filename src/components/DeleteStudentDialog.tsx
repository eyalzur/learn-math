import type { Student } from "../data/curriculum";

export interface DeleteStudentDialogProps {
  student: Student | null;
  onConfirm: () => void;
  onClose: () => void;
}

/** Same overlay+card anatomy as `VersionLog`/`CreateStudentDialog`, under its own class
 *  names — see the comment above `.settings-backdrop` in App.css. */
export function DeleteStudentDialog({ student, onConfirm, onClose }: DeleteStudentDialogProps) {
  if (!student) return null;

  return (
    <div className="delete-student-backdrop" onClick={onClose}>
      <div
        className="delete-student-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-student-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="delete-student-title" id="delete-student-title">
          למחוק את {student.name}?
        </h2>
        <p className="delete-student-body">כל ההתקדמות וההיסטוריה שלו/ה יימחקו לצמיתות.</p>

        <div className="settings-actions">
          <button type="button" className="secondary" onClick={onClose}>
            ביטול
          </button>
          <button type="button" className="delete-student-confirm" onClick={onConfirm}>
            מחיקה
          </button>
        </div>
      </div>
    </div>
  );
}
