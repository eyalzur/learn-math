import "./profile.css";
import { AVATARS } from "../data/avatars";

interface AvatarPickerProps {
  /** The currently selected avatar id, or null/undefined for "none chosen yet". */
  value: string | null | undefined;
  onChange: (id: string) => void;
  /** Smaller buttons for the create-student dialog. */
  compact?: boolean;
}

/** A grid of the 12 avatars. Shared by the profile drawer and the create-student dialog. */
export function AvatarPicker({ value, onChange, compact }: AvatarPickerProps) {
  return (
    <div className={`avatar-picker ${compact ? "avatar-picker-compact" : ""}`} role="group">
      {AVATARS.map((a) => (
        <button
          key={a.id}
          type="button"
          className={`avatar-option ${a.id === value ? "avatar-option-selected" : ""}`}
          aria-label={a.label}
          aria-pressed={a.id === value}
          onClick={() => onChange(a.id)}
        >
          <span aria-hidden="true">{a.emoji}</span>
        </button>
      ))}
    </div>
  );
}
