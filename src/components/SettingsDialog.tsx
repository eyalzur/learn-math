import {
  AUTO_SCROLL_JUMP_LEVELS,
  BUTTON_SIZE_LEVELS,
  HOLD_ZOOM_LEVELS,
  PAN_SPEED_LEVELS,
  SUGGESTION_SENSITIVITY_LEVELS,
} from "../data/notebook";
import { speechSupported } from "../data/speech";
import type { SettingsValues } from "../lib/settingsVisibility";

/**
 * The ⚙️ settings dialog — extracted from `TopicPicker.tsx` (docs/features/
 * notebook-nav-buttons-visibility/) so the same dialog can be opened from two separate
 * screens: the topic-list screen (`TopicPicker`) and the notebook practice screen
 * (`PracticeNotebook`, via `Practice`). Neither of those owns this component's open/closed
 * state any more — that lives in `App.tsx`, their one shared ancestor — this component is
 * purely controlled via `open`/`onClose`. `hasAnySettings`, which both entry points use to
 * decide whether to show their own ⚙️ button, lives in `src/lib/settingsVisibility.ts`
 * rather than here — a component file with more than one export breaks React Fast Refresh.
 */
export interface SettingsDialogProps extends SettingsValues {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({
  readAloud,
  onReadAloudChange,
  holdZoomLevel,
  onHoldZoomLevelChange,
  autoScrollJumpLevel,
  onAutoScrollJumpLevelChange,
  panSpeedLevel,
  onPanSpeedLevelChange,
  buttonSizeLevel,
  onButtonSizeLevelChange,
  suggestionSensitivityLevel,
  onSuggestionSensitivityLevelChange,
  navPadVisible,
  onNavPadVisibleChange,
  open,
  onClose,
}: SettingsDialogProps) {
  const showReadAloud = readAloud !== undefined && onReadAloudChange !== undefined && speechSupported();
  const showHoldZoom = holdZoomLevel !== undefined && onHoldZoomLevelChange !== undefined;
  const showAutoScrollJump = autoScrollJumpLevel !== undefined && onAutoScrollJumpLevelChange !== undefined;
  const showPanSpeed = panSpeedLevel !== undefined && onPanSpeedLevelChange !== undefined;
  const showButtonSize = buttonSizeLevel !== undefined && onButtonSizeLevelChange !== undefined;
  const showSuggestionSensitivity =
    suggestionSensitivityLevel !== undefined && onSuggestionSensitivityLevelChange !== undefined;
  const showNavPadVisible = navPadVisible !== undefined && onNavPadVisibleChange !== undefined;

  if (!open) return null;
  if (!showReadAloud && !showHoldZoom && !showAutoScrollJump && !showPanSpeed && !showButtonSize &&
      !showSuggestionSensitivity && !showNavPadVisible) {
    return null;
  }

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
          {showReadAloud && (
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
          )}

          {showHoldZoom && (
            <div className="hold-zoom-setting">
              <div className="hold-zoom-header">
                <span className="hold-zoom-icon" aria-hidden="true">
                  🔍
                </span>
                <span className="read-aloud-text">
                  <span className="read-aloud-title">התקרבות כשמחזיקים את האצבע</span>
                  <span className="read-aloud-note">כמה הדף מתקרב כשעוצרים לרגע לפני שכותבים</span>
                </span>
              </div>
              <div className="hold-zoom-options" role="group" aria-label="התקרבות כשמחזיקים את האצבע">
                {HOLD_ZOOM_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    className="hold-zoom-option"
                    aria-pressed={level.id === holdZoomLevel}
                    onClick={() => onHoldZoomLevelChange!(level.id)}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showAutoScrollJump && (
            <div className="auto-scroll-setting">
              <div className="auto-scroll-header">
                <span className="auto-scroll-icon" aria-hidden="true">
                  ↔️
                </span>
                <span className="read-aloud-text">
                  <span className="read-aloud-title">התצוגה קופצת בין תו לתו</span>
                  <span className="read-aloud-note">
                    כשמסיימים לכתוב ספרה או אות, הדף זז קצת כדי לפנות מקום להמשך
                  </span>
                </span>
              </div>
              <div className="auto-scroll-options" role="group" aria-label="התצוגה קופצת בין תו לתו">
                {AUTO_SCROLL_JUMP_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    className="auto-scroll-option"
                    aria-pressed={level.id === autoScrollJumpLevel}
                    onClick={() => onAutoScrollJumpLevelChange!(level.id)}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showPanSpeed && (
            <div className="pan-speed-setting">
              <div className="pan-speed-header">
                <span className="pan-speed-icon" aria-hidden="true">
                  🧭
                </span>
                <span className="read-aloud-text">
                  <span className="read-aloud-title">מהירות הזזת התצוגה</span>
                  <span className="read-aloud-note">
                    כמה רחוק זזים כפתורי הכיוון, וכמה מהר ממשיכים כשמחזיקים
                  </span>
                </span>
              </div>
              <div className="pan-speed-options" role="group" aria-label="מהירות הזזת התצוגה">
                {PAN_SPEED_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    className="pan-speed-option"
                    aria-pressed={level.id === panSpeedLevel}
                    onClick={() => onPanSpeedLevelChange!(level.id)}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showButtonSize && (
            <div className="button-size-setting">
              <div className="button-size-header">
                <span className="button-size-icon" aria-hidden="true">
                  🔘
                </span>
                <span className="read-aloud-text">
                  <span className="read-aloud-title">גודל כפתורי המחברת</span>
                  <span className="read-aloud-note">כמה גדולים כפתורי הזום והכלים</span>
                </span>
              </div>
              <div className="button-size-options" role="group" aria-label="גודל כפתורי המחברת">
                {BUTTON_SIZE_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    className="button-size-option"
                    aria-pressed={level.id === buttonSizeLevel}
                    onClick={() => onButtonSizeLevelChange!(level.id)}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showSuggestionSensitivity && (
            <div className="suggestion-sensitivity-setting">
              <div className="suggestion-sensitivity-header">
                <span className="suggestion-sensitivity-icon" aria-hidden="true">
                  👆
                </span>
                <span className="read-aloud-text">
                  <span className="read-aloud-title">רגישות הצעת הפעולה הבאה</span>
                  <span className="read-aloud-note">כמה מהר הדף מציע לעבור בין כתיבה להזזה</span>
                </span>
              </div>
              <div className="suggestion-sensitivity-options" role="group" aria-label="רגישות הצעת הפעולה הבאה">
                {SUGGESTION_SENSITIVITY_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    className="suggestion-sensitivity-option"
                    aria-pressed={level.id === suggestionSensitivityLevel}
                    onClick={() => onSuggestionSensitivityLevelChange!(level.id)}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showNavPadVisible && (
            // Same anatomy as the read-aloud toggle above — this is also a true binary,
            // not a scale, so it reuses that layout's classes directly rather than
            // inventing near-duplicate CSS (docs/features/notebook-nav-buttons-visibility/
            // design.md).
            <div className="read-aloud-setting">
              <span className="read-aloud-icon" aria-hidden="true">
                🧭
              </span>
              <span className="read-aloud-text">
                <span className="read-aloud-title">הצגת פאד הניווט</span>
                <span className="read-aloud-note">מראים כפתורי חץ להזזת התצוגה</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={navPadVisible}
                className={`read-aloud-switch ${navPadVisible ? "on" : "off"}`}
                onClick={() => onNavPadVisibleChange!(!navPadVisible)}
              >
                <span className="read-aloud-knob" />
                <span className="visually-hidden">הצגת פאד הניווט</span>
              </button>
            </div>
          )}
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
