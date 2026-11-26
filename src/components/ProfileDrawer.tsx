import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { avatarFor } from "../data/avatars";
import { historyFor } from "../data/progress";
import type { Student } from "../data/curriculum";
import { AvatarPicker } from "./AvatarPicker";

interface ProfileDrawerProps {
  student: Student;
  gradeLabel: string;
  onClose: () => void;
  onAvatarChange: (avatarId: string) => void;
  /** Opens the full progress screen (`History`). */
  onOpenHistory: () => void;
  onSwitchStudent: () => void;
  /** Extension point: anything that belongs in the profile but not on the main screen
   *  (e.g. "lessons left this week"). Not rendered at all when absent. */
  extras?: ReactNode;
}

const FOCUSABLE = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

/**
 * The profile side drawer (docs/features/student-profile-avatar/). Slides in from the
 * start edge (right in RTL). Closes on ✕, Escape, or a tap on the dimmed backdrop; Tab
 * stays inside while it is open. Focus returns to whatever opened it when it closes.
 */
export function ProfileDrawer({
  student,
  gradeLabel,
  onClose,
  onAvatarChange,
  onOpenHistory,
  onSwitchStudent,
  extras,
}: ProfileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const avatar = avatarFor(student);
  const recent = historyFor(student.id).slice(0, 3);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const items = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="profile-backdrop" onClick={onClose}>
      <div
        ref={drawerRef}
        className="profile-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="profile-head">
          <span className="profile-head-avatar" aria-hidden="true">
            {avatar.emoji}
          </span>
          <span className="profile-head-text">
            <span className="profile-name" id="profile-title">
              {student.name}
            </span>
            <span className="profile-grade">{gradeLabel}</span>
          </span>
          <button ref={closeRef} type="button" className="profile-close" aria-label="סגירה" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="profile-body">
          {extras && <div className="profile-extras">{extras}</div>}

          <section className="profile-section">
            <h2>התמונה שלי</h2>
            <AvatarPicker value={avatar.id} onChange={onAvatarChange} />
          </section>

          <section className="profile-section">
            <h2>ההתקדמות שלי</h2>
            {recent.length === 0 ? (
              <p className="profile-empty">עוד לא תרגלת</p>
            ) : (
              <ul className="profile-recent">
                {recent.map((r, i) => (
                  <li key={`${r.at}-${i}`}>
                    <span className="profile-recent-topic">{r.topicTitle || r.gradeLabel}</span>
                    {/* Own element, own direction: the score is math-adjacent text. */}
                    <span className="profile-recent-score">
                      {r.correct} מתוך {r.total}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="link-button profile-link" onClick={onOpenHistory}>
              לכל ההתקדמות ←
            </button>
          </section>
        </div>

        <div className="profile-foot">
          <button type="button" className="link-button profile-link" onClick={onSwitchStudent}>
            ← החלף תלמיד
          </button>
        </div>
      </div>
    </div>
  );
}
