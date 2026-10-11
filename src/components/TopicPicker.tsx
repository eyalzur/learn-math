import type { Topic } from "../data/curriculum";
import { hasAnySettings } from "../lib/settingsVisibility";

interface TopicPickerProps {
  gradeLabel: string;
  topics: Topic[];
  onSelect: (topic: Topic) => void;
  /** Opens the topic's lesson screen instead of practice — a secondary action beside the
   *  card, not a step in front of it, so picking a topic still goes straight to practice
   *  exactly as it always has (see docs/features/topic-lesson). Absent means no lesson
   *  entry point is offered here at all. */
  onLesson?: (topic: Topic) => void;
  onBack: () => void;
  /** What `onBack` actually does, in the caller's own words — a mid-flow "back" and a
   *  first-screen "switch student" read differently, and only the caller (who wires
   *  `onBack` itself) reliably knows which one this is. Guessing it from whether
   *  `onHistory` was also passed broke the moment a screen could have both a history
   *  link and a "back" that doesn't switch student — a student with more than one grade
   *  does exactly that. */
  backLabel: string;
  /** The history link's reachability is independent of what "back" does — a student with
   *  more than one grade still wants it here, not only on the grade-choice screen. */
  onHistory?: () => void;
  /** Read every question aloud for this student. Absent when there is no student yet. */
  readAloud?: boolean;
  onReadAloudChange?: (value: boolean) => void;
  /** Which hold-to-zoom strength this student is set to — a `HOLD_ZOOM_LEVELS` id. Absent
   *  when there is no student yet, exactly like `readAloud`. */
  holdZoomLevel?: string;
  onHoldZoomLevelChange?: (levelId: string) => void;
  /** How far this student's notebook view jumps between finished strokes — an
   *  `AUTO_SCROLL_JUMP_LEVELS` id. Absent when there is no student yet, exactly like
   *  `readAloud`/`holdZoomLevel`. */
  autoScrollJumpLevel?: string;
  onAutoScrollJumpLevelChange?: (levelId: string) => void;
  /** Which nav-button speed this student is set to — a `PAN_SPEED_LEVELS` id. Absent when
   *  there is no student yet, exactly like `holdZoomLevel`. */
  panSpeedLevel?: string;
  onPanSpeedLevelChange?: (levelId: string) => void;
  /** Which notebook toolbar button size this student is set to — a `BUTTON_SIZE_LEVELS`
   *  id. Absent when there is no student yet, exactly like `holdZoomLevel`. */
  buttonSizeLevel?: string;
  onButtonSizeLevelChange?: (levelId: string) => void;
  /** Which suggested-next-action sensitivity this student is set to — a
   *  `SUGGESTION_SENSITIVITY_LEVELS` id. Absent when there is no student yet, exactly like
   *  `holdZoomLevel`. */
  suggestionSensitivityLevel?: string;
  onSuggestionSensitivityLevelChange?: (levelId: string) => void;
  /** Whether this student's notebook shows the directional nav pad. Absent when there is
   *  no student yet, exactly like `holdZoomLevel`. Not rendered here — only used (together
   *  with the other settings values above) to decide whether the ⚙️ button has anything to
   *  open at all; the dialog itself now lives in `App.tsx` as `<SettingsDialog>`, reachable
   *  from both this screen and the notebook practice screen. */
  navPadVisible?: boolean;
  onNavPadVisibleChange?: (value: boolean) => void;
  /** Opens the settings dialog — owned and rendered by `App.tsx`, not this component. See
   *  docs/features/notebook-nav-buttons-visibility/architecture.md. */
  onOpenSettings: () => void;
}

export function TopicPicker({
  gradeLabel,
  topics,
  onSelect,
  onLesson,
  onBack,
  backLabel,
  onHistory,
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
  onOpenSettings,
}: TopicPickerProps) {
  /* Whether there is anything to open a dialog for at all — the invariant that the ⚙️
     button never leads to an empty dialog. Shared with `PracticeNotebook`'s own ⚙️ button
     and with `SettingsDialog` itself via the same `hasAnySettings()` helper, so the three
     can never disagree about whether settings exist right now.
     See docs/features/notebook-nav-buttons-visibility/architecture.md for why the dialog
     itself (and its open/closed state) no longer lives in this component. */
  const showSettings = hasAnySettings({
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
  });
  return (
    <div className="topic-picker">
      <div className="grade-header">
        <button className="link-button" onClick={onBack}>
          {backLabel}
        </button>
        <span className="greeting">{gradeLabel}</span>
        {showSettings && (
          /* Third child of a `space-between` row, so in RTL it lands at the far left —
             the opposite end from "← חזרה", which is what the design asks for, with no
             CSS change to `.grade-header`. */
          <button
            type="button"
            className="settings-button"
            aria-label="הגדרות"
            onClick={onOpenSettings}
          >
            <span aria-hidden="true">⚙️</span>
          </button>
        )}
      </div>
      {onHistory && (
        <button className="link-button history-link" onClick={onHistory}>
          ההתקדמות שלי →
        </button>
      )}

      <h1>מה נתרגל היום?</h1>

      {topics.length > 0 && topics.every((topic) => !topic.reviewed) && (
        <p className="topics-notice">
          עוד מעט! מכינים כאן תרגילים חדשים. בינתיים אפשר להסתכל בהיסטוריה.
        </p>
      )}

      <div className="topic-grid">
        {topics.map((topic) => (
          <div key={topic.id} className="topic-row">
            <button
              className="topic-card"
              onClick={() => onSelect(topic)}
              /* The real attribute, not just a class: it keeps the card out of the tab
                 order and announces it to a screen reader. Dimming alone would leave it
                 reachable by keyboard — a block you can walk around. */
              disabled={!topic.reviewed}
            >
              <span className="topic-title">{topic.title}</span>
              {!topic.reviewed && <span className="topic-soon">בקרוב</span>}
            </button>
            {onLesson && topic.reviewed && (
              /* Beside the card, never inside it — same reason StylePicker's speaker
                 button sits beside its card: a button within a button is invalid HTML,
                 and nesting them would make tapping this one ambiguous with picking
                 practice. */
              <button
                type="button"
                className="lesson-link"
                aria-label={`שיעור: ${topic.title}`}
                onClick={() => onLesson(topic)}
              >
                <span aria-hidden="true">📖</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
