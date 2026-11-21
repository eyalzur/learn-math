# זרקור-מנוחה — Architecture

## Overview
שתי שכבות עצמאיות, שתיהן CSS-מונע: (1) זוהר-נשימה שעובר בין כרטיסים/כפתורים
ראשיים, ממוספר ע"י סקריפט-אינדוקס זעיר אחד ב-`App.tsx` שמריץ-מחדש אחרי כל
רינדור; (2) זוהר-רקע ענק דרך `::before` על `#root`, אנימציה-CSS טהורה, בלי
JS בכלל. בלי state חדש, בלי prop חדש, בלי class חדש ברוב הרכיבים.

## Affected Files / Components
- **`src/App.tsx`** — `useEffect` חדש (רץ אחרי כל רינדור, בלי מערך-תלויות)
  שקורא לפונקציה `reindexIdleSpotlight()` (ב-`src/data/idleSpotlight.ts` חדש).
- **`src/data/idleSpotlight.ts`** (חדש) — קובץ-עזר קטן, לא React component:
  פונקציה אחת שסורקת את ה-DOM ומעדכנת custom properties. אין state, אין
  תלות ב-React חוץ מזה שנקראת מ-`useEffect`.
- **`src/App.css`** — קבוצת-סלקטורים חדשה (זרקור-כרטיסים), `@keyframes
  idle-breathe`, חוקי-השהיה (hover/focus/active/`:has()`-דיאלוג), ו-`::before`
  על `#root` לזוהר-הרקע + `@keyframes idle-bg-drift`.
- **שום קובץ `.tsx` אחר לא משתנה.** אין class-names חדשים על כרטיסים/כפתורים
  עצמם — אותו עיקרון כמו playful-redesign.

## Data / State Changes
None — אין state חדש, אין prop. ה-"state" היחיד הוא custom properties CSS
(`--spot-i`, `--spot-n`) שנכתבים ישירות כ-inline style בלי לעבור דרך React.

## Technical Approach

### איזה אלמנטים נכנסים למחזור
**לא** כל מה שplayful-redesign's `button:not(.app-version)` תופס — קבוצה
יותר מצומצמת, רק פעולות ראשיות:
```
.student-card, .grade-card, .topic-card, .level-card, .style-card,
button:not(.app-version):not(.speak-button):not(.hint-button)
  :not(.link-button):not(.student-card-delete):not(.settings-button)
```
**למה לצמצם ביחס לplayful-redesign:** design.md עצמו מדגיש "עדין, לא עמוס" —
מחזור שכולל גם 🔊/💡/⚙️/🗑/קישורי-טקסט יהיה ארוך ומעייף-לעין על מסכים עם הרבה
כפתורי-עזר קטנים (למשל מסך תרגול: כרטיס-שאלה + 🔊 + רמז + בדיקה = היה הופך
ל-4 תורות במקום 1). מצומצם ל"הבחירות המרכזיות" בלבד — פרשנות של tech-lead
לרוח-העיצוב, לא סתירה לקריטריון-הקבלה ("כל כרטיס/כפתור" ב-product-spec
מתייחס ל*סוג* האלמנט, לא לכל כפתור-עזר קטן שקיים אי-שם על המסך).

### אינדוקס דינמי — `src/data/idleSpotlight.ts`
```ts
const SELECTOR =
  ".student-card, .grade-card, .topic-card, .level-card, .style-card, " +
  "button:not(.app-version):not(.speak-button):not(.hint-button)" +
  ":not(.link-button):not(.student-card-delete):not(.settings-button)";

export function reindexIdleSpotlight(): void {
  const visible = [...document.querySelectorAll<HTMLElement>(SELECTOR)].filter(
    (el) => el.offsetParent !== null,
  );
  visible.forEach((el, i) => {
    el.style.setProperty("--spot-i", String(i));
    el.style.setProperty("--spot-n", String(visible.length));
  });
}
```
נקרא מ-`App.tsx` דרך `useEffect(() => { reindexIdleSpotlight(); });` — **בלי**
מערך-תלויות, כך שזה רץ מחדש אחרי כל רינדור (מעבר-מסך, יצירת/מחיקת תלמיד/ה,
כל שינוי) — תמיד משקף את מה שבאמת גלוי עכשיו. זו סריקת-DOM זולה (כמה עשרות
אלמנטים לכל היותר) — לא expensive, לא צריך debounce/throttle.

### האנימציה עצמה — negative animation-delay stagger
טכניקת-CSS מוכרת למחזור-מדורג: כל האלמנטים מקבלים **בדיוק את אותה** אנימציה,
אבל `animation-delay` **שלילי**, כך שכל אחד "כבר באמצע" המחזור-שלו-עצמו מהרגע
הראשון — זה מה שיוצר את הרושם של זרקור-אחד-עובר, בלי לתזמן שום דבר ב-JS:
```css
.student-card, .grade-card, .topic-card, .level-card, .style-card,
button:not(.app-version):not(.speak-button):not(.hint-button)
  :not(.link-button):not(.student-card-delete):not(.settings-button) {
  animation: idle-breathe calc(var(--spot-n, 1) * 1s) ease-in-out infinite;
  animation-delay: calc(var(--spot-i, 0) * -1s);
}

@keyframes idle-breathe {
  0%, 100% { box-shadow: none; }
  12.5% {
    transform: scale(1.025);
    box-shadow: 0 0 0 6px var(--accent-bg), 0 0 18px var(--accent-border);
  }
  25% { transform: scale(1); box-shadow: none; }
}
```
**קירוב מכוון, לא תקלה:** אחוזי-ה-keyframe חייבים להיות מספרים קבועים (CSS לא
תומך ב-`calc()` בתוך בורר-keyframe) — כך ש"משך-הנשימה" בפועל הוא `25% ×
N שניות`, לא בדיוק שנייה אחת קבועה. ל-N=4 (למשל `.grade-list`) זה בדיוק
שנייה אחת. ל-N קטן יותר (2, למסך-תרגול עם שני כפתורים) זה ~0.5 שניות; ל-N
גדול יותר (7, טבלת-נושאים מלאה) זה ~1.75 שניות — עדיין "נשימה עדינה של בערך
שנייה", לא סטייה שתורגש כבעיה, אבל זו קירוב מתועד במפורש, לא התאמה מדויקת
לכל N אפשרי.

**developer: תבדקו ויזואלית (לא רק "זה מתקמפל") שהרצף-המדורג אכן נראה כמו
"זרקור עובר אחד-אחד" ולא כמו "כולם מהבהבים ביחד" או "הסדר הפוך" — אם זה נראה
הפוך, הפתרון הוא לשנות את הסימן (`animation-delay: calc(var(--spot-i, 0) *
1s)` בלי המינוס) ולא לשנות את מנגנון-האינדוקס.**

### השהיה — שלוש דרכים, לא אחת
1. **hover/focus/active על האלמנט עצמו** (לא מתנגש עם ledge-press):
```css
.student-card:hover, .student-card:focus, .student-card:active,
/* ...אותו דבר לכל שם-קלאס בקבוצה... */ {
  animation-play-state: paused;
}
```
2. **דיאלוג פתוח — `:has()`** (נתמך Chrome/Safari מודרניים, אותה הנחת-תמיכה
   כמו `interactive-widget=resizes-content` שכבר נוסף ל-`index.html`):
```css
body:has(.create-student-backdrop, .delete-student-backdrop,
          .settings-backdrop, .version-log-backdrop)
  [style*="--spot-i"] {
  animation-play-state: paused;
}
```
3. **`prefers-reduced-motion: reduce`** — מבטל `animation` לגמרי (לא `paused`,
   `none`) על שתי השכבות (זרקור-כרטיסים + זוהר-רקע), אותו דפוס-קוד שכבר קיים
   ב-playful-redesign.

### זוהר-רקע — `::before` על `#root`, בלי JS בכלל
```css
#root::before {
  content: "";
  position: fixed;
  inset: -20% -20% auto auto;
  width: 60vw;
  height: 60vw;
  max-width: 600px;
  max-height: 600px;
  border-radius: 50%;
  background: var(--accent-bg);
  filter: blur(80px);
  z-index: -1;
  pointer-events: none;
  animation: idle-bg-drift 28s ease-in-out infinite;
}

@keyframes idle-bg-drift {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-8%, 6%); }
}
```
`z-index: -1` + `pointer-events: none` כדי שזה לעולם לא יפריע ללחיצות/לא
ייראה מעל תוכן אמיתי. `#root` כבר `position`-לא-מוגדר כברירת-מחדל (`static`)
— `position: fixed` על ה-`::before` לא תלוי ב-`#root` עצמו להיות
`relative`/`absolute`, כך שאין צורך לשנות שום CSS קיים של `#root`.

## Edge Cases
- **מסך עם אלמנט-מועמד אחד בלבד (`N=1`)**: `animation-duration: calc(1 * 1s)
  = 1s` — "נושם" כל שנייה בלי שום אחד אחר "לתורו" — זה בסדר, זה בדיוק מה
  שאמור לקרות (אין למי "להעביר תור").
- **מסך עם אפס אלמנטים-מועמדים** (למשל מסך היסטוריה): `reindexIdleSpotlight`
  פשוט לא מוצא כלום, לא קורה שום דבר — אין branch מיוחד נדרש.
- **מעבר-מסך תוך-כדי נשימה של כרטיס**: ברגע שה-DOM הישן נהרס (ניווט), ה-CSS
  animation שלו נעלם איתו — אין "זיכרון" שצריך לנקות, `reindexIdleSpotlight`
  פשוט בונה מחדש על הכרטיסים החדשים מ-`--spot-i=0`.
- **`button:not(...)` המצומצם עלול לפספס כפתור-ראשי עתידי** שלא קיים עדיין
  בקוד (מישהו מוסיף תכונה חדשה) — זה בסדר: ברירת-המחדל היא *כן* להיכלל
  (הסלקטור הוא "כל button חוץ מרשימת-יוצאים-מהכלל", לא "כל button ברשימת-
  היתר") — רק כפתורי-עזר ידועים מוחרגים במפורש.

## Risks / Tradeoffs
- **קירוב-האחוזים ב-keyframe** (למעלה) — תלוי-N, לא מדויק לכל גודל-מסך. אם
  בפועל זה מרגיש ארוך-מדי במסכים עם הרבה כרטיסים (7+), אפשר לכוונן את אחוז-
  ה-25% כלפי מטה (למשל 15%) — זו כוונון-מספר, לא שינוי-ארכיטקטורה.
- **`:has()`** דורש דפדפן מודרני (Chrome 105+/Safari 15.4+) — באותה קטגוריה
  כמו `interactive-widget` שכבר נוסף; בדפדפן ישן יותר, ה-fallback הוא
  "הזרקור ממשיך לרוץ מתחת לדיאלוג בלי שרואים אותו" — לא שובר כלום, רק מאבד
  את ההשהיה היפה, acceptable degradation.
- **אין בדיקת-ביצועים כמותית** (FPS/CPU בפועל) — רק "CSS בלבד, לא JS-per-
  frame" כעיקרון-תכנון. אם מתברר כבעיה בפועל על מכשיר חלש, זו עבודת-כוונון
  נפרדת (למשל להקטין את מספר-השכבות הפעילות בו-זמנית), לא ידוע-מראש כבעיה.

## Open Questions
None.

## Implementation Notes

Two real bugs found and fixed through live verification, not caught by reasoning alone:

1. **`box-shadow: none` in the rest keyframe was blanking out playful-redesign's
   static ledge-shadow.** `box-shadow` is a single property — the rest state has to
   repeat the exact same ledge value (`0 5px 0 var(--accent-border)`), layering the
   glow on top of it only at the peak, or every card loses its ledge look 75% of
   each cycle instead of just occasionally glowing on top of it. Looked identical by
   eye to the correct version until checked via computed styles.
2. **Two separate CSS rules can't both set the `animation` shorthand on the same
   selector and have both animations run** — the later rule in source order replaces
   the property whole, not layers on top of it like `box-shadow` can. idle-breathe's
   rule (added after playful-pop-in's) silently killed the entrance pop-in for every
   card. Fixed by merging into one `animation:` declaration (comma-separated:
   `playful-pop-in ..., idle-breathe ...`), with every `animation-delay` override
   (including the `:nth-child` pop-in stagger rules) updated to two comma-separated
   values positionally matching the two animation names.
3. **A related, nastier version of the same overlap**: every card (`.student-card`
   etc.) is itself a `<button>`, so the idle-breathe rule meant for "buttons only"
   (`button:not(.app-version):not(.speak-button)...`, six chained `:not()` clauses)
   also matched every card — and its accumulated specificity (0,6,1) beat the
   dedicated card rule (0,1,0) outright, silently overriding it. This also meant the
   `:hover`/`:focus`/`:active` pause rule's shorter `button:not(.app-version)` branch
   (specificity 0,2,1) couldn't win against it either, so pausing never worked on
   plain buttons. Fixed by explicitly excluding the five card classes from the
   button-only rule, and by giving the pause rule's button branch the identical full
   `:not()` chain so its specificity actually wins.

All three were caught by checking real computed styles (`getComputedStyle`,
`element.matches()`, and sampling box-shadow blur radius over time to confirm the
cycle visits cards one at a time in the right order) — not by reading the CSS and
reasoning it should work. Confirmed live: pop-in still fires on screen entry,
hover/focus/active correctly pause the breathing on both cards and plain buttons, and
a 3-card screen's spotlight visits each card in DOM order with no overlap, matching
the negative-delay math exactly.

`npm run build`/`npm run lint` clean. Version 1.48.0 → 1.49.0.

## Revision — three fixes found live (2026-11-21, `fix/idle-spotlight-dialog-reindex`)

Reported live: "in the create-student dialog, all the buttons breathe together at the
same time" (too-fast flashing in sync, not staggered). Investigated directly
(`getComputedStyle`/inline-style inspection on the actual dialog, not guessed) and
found three distinct, real issues:

1. **The reindex never ran when the create-student dialog opened.** `reindexIdleSpotlight()`
   was only called from a `useEffect` tied to `App`'s own render cycle — but the
   dialog's open state lives in `StudentPicker`'s own `useState` (`createOpen`), which
   re-renders `StudentPicker`, not `App`. Every `.grade-card` inside the dialog was left
   with no `--spot-i` at all, so `calc(var(--spot-i, 0) * -1s)` defaulted to the same
   `0s` for all of them — synchronized flashing, not a staggered cycle. Fixed by
   replacing the render-cycle effect with `startIdleSpotlightObserver()`
   (`src/data/idleSpotlight.ts`): a `MutationObserver` on `document.body` that reindexes
   on *any* DOM change, regardless of which component's state caused it.
2. **A lone element's cycle (N=1) was too fast** — `calc(var(--spot-n, 1) * 1s)` gives a
   1-second cycle for a single element (e.g. the version-log's close button), reported
   live as "blinks too fast." Fixed with `max(3s, calc(var(--spot-n, 1) * 1s))` — floors
   the cycle at 3s for N≤3, unchanged for N≥3. The per-element delay step also had to
   change from a flat `1s` to `cycle / N` (via the same `max(3s, ...)` expression). so
   peaks stay evenly spaced under the floor too, not just for N≥3 where the two
   formulas coincide.
3. **Off-screen elements kept animating.** The same investigation added viewport-
   awareness: `startIdleSpotlightObserver()` now also runs an `IntersectionObserver` and
   excludes anything not currently intersecting the viewport from indexing, explicitly
   setting `animation-play-state: paused` on it instead — found, while verifying this,
   that the version-log dialog's own close button sits ~1668px below the visible
   viewport (the dialog's content isn't height-constrained, so it extends the whole
   page) — a separate, pre-existing layout issue, not fixed here, but concrete evidence
   for the user's own separate "screens shouldn't scroll vertically" point.

Separately, the breathing glow's peak intensity was bumped (ring-spread 6px→9px,
blur 18px→26px) after live review showed it was genuinely hard to notice on the
topic-picker screen, especially against the app's pink-on-pink palette — same colors,
bigger halo, no change to timing.

New regression test: `tests/e2e/idle-spotlight-dialog-reindex.spec.ts` (every grade-card
inside the create-student dialog gets a distinct `--spot-i`). Existing
`idle-spotlight.spec.ts` suite re-verified unaffected (N≥4 cases are mathematically
identical before/after the floor change). Full suite: 343/344, single clean isolated
run (`--workers=1`) — only the pre-existing documented grade8-angles-congruence flake.
Version 1.50.0 → 1.50.1.
