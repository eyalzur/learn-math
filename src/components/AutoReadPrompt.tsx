import { useState } from "react";

export interface AutoReadPromptProps {
  onYes: () => void;
  onNo: () => void;
}

/**
 * Asked at most once (per ~2-day window — see `preferences.ts`'s
 * `isAutoReadPromptSuppressed`/`suppressAutoReadPrompt`) right after the student manually
 * stops an auto-read-aloud reading before it finished — see
 * docs/features/ask-before-disabling-autoread/.
 *
 * Deliberately **not** a modal: no backdrop, no `aria-modal`, nothing that captures clicks
 * outside it. It renders as ordinary content in the page flow (passed into
 * `QuestionScreenTemplate`'s `diagrams` slot by `Practice.tsx`, same as `ClockFace`/
 * `AngleShape`), so a student who keeps practicing without touching it never has anything
 * in their way — see design.md's "ננטש בלי תשובה" state. The parent is what hides it again
 * when that happens; this component's own job is only to render and fire its two callbacks.
 *
 * The "don't ask again" checkbox is local-only and never reported to the parent: per
 * product-spec.md's acceptance criteria, checking it changes nothing about the stored
 * suppression (same ~2-day window either way) — it only reflects the student's own
 * intent back at them, so there is nothing for `onYes`/`onNo` to vary on.
 */
export function AutoReadPrompt({ onYes, onNo }: AutoReadPromptProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  return (
    <div className="auto-read-prompt" role="status" aria-labelledby="auto-read-prompt-title">
      <p className="auto-read-prompt-title" id="auto-read-prompt-title">
        לכבות הקראה אוטומטית?
      </p>
      <p className="auto-read-prompt-body">שמתי לב שעצרת את ההקראה.</p>
      <div className="auto-read-prompt-actions">
        <button type="button" onClick={onYes}>
          כן, כבו
        </button>
        <button type="button" className="secondary" onClick={onNo}>
          לא, המשיכו
        </button>
      </div>
      <label className="auto-read-prompt-checkbox">
        <input type="checkbox" checked={dontAskAgain} onChange={(e) => setDontAskAgain(e.target.checked)} />
        לא לשאול אותי יותר
      </label>
    </div>
  );
}
