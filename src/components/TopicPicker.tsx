import type { Topic } from "../data/curriculum";
import { hasAnySettings } from "../lib/settingsVisibility";
import { statsByTopic, starsForAccuracy } from "../data/progress";

interface TopicPickerProps {
  /** Whose history the star rating below each topic is computed from. */
  studentId: string;
  gradeLabel: string;
  topics: Topic[];
  /** Picking a reviewed topic's card opens its lesson first, not practice directly — see
   *  docs/features/lesson-always-first. The caller decides where that actually leads
   *  (today: `App.tsx`'s `enterLesson`). */
  onSelect: (topic: Topic) => void;
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
  /** Opens the settings dialog — owned and rendered by `App.tsx`, not this component. See
   *  docs/features/notebook-nav-buttons-visibility/architecture.md. */
  onOpenSettings: () => void;
}

export function TopicPicker({
  studentId,
  gradeLabel,
  topics,
  onSelect,
  onBack,
  backLabel,
  onHistory,
  readAloud,
  onReadAloudChange,
  onOpenSettings,
}: TopicPickerProps) {
  /* Whether there is anything to open a dialog for at all — the invariant that the ⚙️
     button never leads to an empty dialog. Shared with `SettingsDialog` itself via the
     same `hasAnySettings()` helper, so the two can never disagree about whether settings
     exist right now. */
  const showSettings = hasAnySettings({ readAloud, onReadAloudChange });
  // Computed once per render, not once per card — statsByTopic's `label` is exactly
  // `topic.title` (how PracticeRecord.topicTitle is saved), so a direct lookup is enough.
  const statsByTitle = new Map(statsByTopic(studentId).map((row) => [row.label, row]));
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
        {topics.map((topic) => {
          const row = statsByTitle.get(topic.title);
          const stars = starsForAccuracy(row?.correct ?? 0, row?.total ?? 0);
          return (
            <button
              key={topic.id}
              className="topic-card"
              onClick={() => onSelect(topic)}
              /* The real attribute, not just a class: it keeps the card out of the tab
                 order and announces it to a screen reader. Dimming alone would leave it
                 reachable by keyboard — a block you can walk around. */
              disabled={!topic.reviewed}
            >
              <span className="topic-title">{topic.title}</span>
              {/* Decorative, like Result.tsx's own .result-stars: an aria-label here (even
                  on a hidden child) still gets pulled into *this* button's accessible name
                  by the accname algorithm, which is exactly what broke
                  topics-and-progress.spec.ts's "shows its name and nothing else" and every
                  getByRole('button', { name: <topic title>, exact: true }) lookup in
                  scored-answer-practice.spec.ts. The card's own title is still read by a
                  screen reader; the rating itself just isn't announced, same tradeoff
                  Result.tsx already made for its stars. */}
              {topic.reviewed && (
                <span className="topic-stars" aria-hidden="true">
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={`topic-star ${n <= stars ? "topic-star-on" : ""}`}>
                      ⭐
                    </span>
                  ))}
                </span>
              )}
              {!topic.reviewed && <span className="topic-soon">בקרוב</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
