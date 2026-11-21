import { speechSupported } from "../data/speech";
import type { SettingsValues } from "../lib/settingsVisibility";

/**
 * The ⚙️ settings dialog — extracted from `TopicPicker.tsx` (docs/features/
 * notebook-nav-buttons-visibility/) so it's controlled from one shared ancestor
 * (`App.tsx`) rather than owned by the screen that opens it. `hasAnySettings`, which the
 * topic-list screen uses to decide whether to show its own ⚙️ button, lives in
 * `src/lib/settingsVisibility.ts` rather than here — a component file with more than one
 * export breaks React Fast Refresh.
 */
export interface SettingsDialogProps extends SettingsValues {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ readAloud, onReadAloudChange, open, onClose }: SettingsDialogProps) {
  const showReadAloud = readAloud !== undefined && onReadAloudChange !== undefined && speechSupported();

  if (!open) return null;
  if (!showReadAloud) return null;

  return (
    /* Same anatomy as the notebook's confirm dialog, but `dialog` rather than `alertdialog`
       (nothing here is a warning) and with an explicit close. Clicking the dimmed backdrop
       closes too; the card stops the click from reaching it, which also covers a tap that
       lands on the card's own padding. */
    <div className="settings-backdrop" onClick={onClose}>
      <div
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="settings-title" id="settings-title">
          הגדרות
        </h2>

        <div className="settings-body">
          <div className="read-aloud-setting">
            <span className="read-aloud-icon" aria-hidden="true">
              🔊
            </span>
            <span className="read-aloud-text">
              <span className="read-aloud-title">להקריא את השאלות בקול</span>
              <span className="read-aloud-note">מומלץ למי שעדיין לומד/ת לקרוא</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={readAloud}
              className={`read-aloud-switch ${readAloud ? "on" : "off"}`}
              onClick={() => onReadAloudChange!(!readAloud)}
            >
              <span className="read-aloud-knob" />
              <span className="visually-hidden">להקריא את השאלות בקול</span>
            </button>
          </div>
        </div>

        <div className="settings-actions">
          <button type="button" className="secondary" onClick={onClose}>
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}
