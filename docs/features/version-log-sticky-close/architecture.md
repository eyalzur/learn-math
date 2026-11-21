# לוג גרסאות — כפתור-חזרה קבוע על המסך — Architecture

## Overview
`VersionLog.tsx` מקבל עטיפה חדשה סביב `.version-log-list` (אזור-גלילה
משלה), ו-`.version-log-dialog` עובר מ-"קופסה אחת שגוללת כולה" ל-flex column
שבו רק אזור-הרשימה גדל/גולל; הכותרת וכפתור-הסגירה נשארים `flex-shrink: 0`
מחוץ לאזור הזה.

## Affected Files / Components
- **`src/components/VersionLog.tsx`** — `<ul className="version-log-list">`
  עוטפת ב-`<div className="version-log-scroll">` חדש. שום שינוי אחר ב-JSX
  (אותם elements, אותו מיפוי-נתונים).
- **`src/App.css`** — `.version-log-dialog` (שורה ~1352): מוסיף
  `display: flex; flex-direction: column;`, מעביר `overflow-y`/
  `overscroll-behavior` משם ל-selector חדש `.version-log-scroll`. כלל חדש
  `.version-log-dialog .settings-actions { flex-shrink: 0; }` (scoped, לא
  נוגע ב-`.settings-actions` הבסיסי ש-`SettingsDialog.tsx` גם משתמש בו —
  ראו Risks/Tradeoffs).

## Data / State Changes
אין. שום שינוי ל-`CHANGELOG`/`APP_VERSION`/ה-props של `VersionLog`.

## Technical Approach
```css
.version-log-dialog {
  max-width: 420px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border-radius: 14px;
  padding: 20px;
  box-shadow: var(--shadow);
  /* overflow-y/overscroll-behavior moved to .version-log-scroll below */
}

.version-log-scroll {
  overflow-y: auto;
  overscroll-behavior: contain;
  /* min-height: 0 is required on a flex child for its own overflow to work at all —
     without it a flex item refuses to shrink below its content's natural height, and
     "overflow-y: auto" never actually triggers. */
  min-height: 0;
}

.version-log-title {
  flex-shrink: 0;
  /* existing margin/font-size/color/text-align unchanged */
}

.version-log-dialog .settings-actions {
  flex-shrink: 0;
}
```
`.version-log-title` already has no `flex-shrink` declared — adding it is a
no-op *risk*-wise (a title never shrank before either, since the dialog
wasn't flex), but makes the "never shrinks" intent explicit now that the
parent actually is a flex container.

## Edge Cases
- **Short changelog (fits without scrolling)**: `.version-log-scroll`'s
  `overflow-y: auto` simply shows no scrollbar — same as today's behavior
  when content is shorter than `max-height`, no special-casing needed.
- **Very short viewport (phone, keyboard-ish height)**: `max-height: 90vh`
  on the dialog still caps the whole thing; the flex column means the
  scroll area is whatever's left after the (small, fixed) title+button
  heights — it shrinks correctly instead of pushing the button off-screen,
  which is exactly the bug being fixed.
- **`SettingsDialog.tsx`'s own `.settings-actions`**: unaffected — the new
  `flex-shrink: 0` rule is scoped to `.version-log-dialog .settings-actions`
  only. `SettingsDialog`'s own dialog isn't `display: flex` (unchanged), so
  `flex-shrink` has no effect there regardless.

## Risks / Tradeoffs
- **Reusing `.settings-actions` for the button row, not a new class**: kept
  as-is (per Out of Scope — no visual change to the button itself), scoped
  the one new structural rule it needs (`flex-shrink: 0`) to
  `.version-log-dialog .settings-actions` specifically, rather than editing
  the shared base rule — avoids any risk of this fix changing
  `SettingsDialog`'s layout, which is explicitly out of scope.
- **Not fixing `SettingsDialog`'s own identical pattern** (its `.settings-actions`
  also sits at the bottom of a single scrolling dialog) — product-spec.md's
  Out of Scope is explicit this is a point-fix for `VersionLog` only. Flagging
  it here as a known, deliberately-not-fixed candidate for a future identical
  revision, not a gap in this plan.

## Open Questions
None.
