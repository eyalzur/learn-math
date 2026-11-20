# הרגשה כיפית, כמו משחק — Architecture

## Overview
שכבת CSS-בלבד (grouped selectors על קלאסים קיימים, לא class-names חדשים) נותנת לכל
כרטיס/כפתור לחיץ "מדף" (ledge-shadow) שנלחץ שטוח, וכניסה מדורגת (pop-in) לכרטיסים
כשמסך נטען. תוספת TSX יחידה ומכוונת: `span` דקורטיבי לפרץ ה-⭐ בתוך בלוק ה-feedback
הקיים ב-`Practice.tsx`, רק כשהתשובה נכונה.

## Affected Files / Components

- **`src/App.css`** — הרוב המכריע של השינוי:
  - קבוצת-סלקטורים חדשה (`.student-card, .grade-card, .topic-card, .level-card,
    .style-card, button { ... }`) שנותנת ledge-shadow + press-down — **לא** class חדש,
    רק כלל CSS נוסף שחל על השמות הקיימים. `.app-version` נשאר מחוץ לקבוצה הזו
    במפורש (נשאר שקט, לפי design.md).
  - `animation: pop-in ... backwards` עם `:nth-child` staggering, באותה קבוצת-סלקטורים,
    שמחיל קפיצת-כניסה על כל כרטיס בפעם שהוא נכנס ל-DOM.
  - `@keyframes pop-in`, `@keyframes star-burst` חדשים.
  - `.feedback-star` (קלאס חדש, יחיד) לאלמנט ה-⭐ עצמו.
  - `@media (prefers-reduced-motion: reduce)` שמבטל את `animation` על כל הסלקטורים
    החדשים (pop-in, press-down transition, star-burst) — משאיר רק את הצבעים/הצללים
    הסטטיים, בלי תנועה.
- **`src/components/Practice.tsx`** — שינוי יחיד, שורה ~276-280: הוספת
  `<span className="feedback-star" aria-hidden="true">⭐</span>` בתוך ה-`<p
  className="feedback correct">`, מוצג רק כש-`feedback === "correct"` (אותו תנאי
  שכבר קיים שם היום — לא תנאי חדש, לא נוגע ב-`revealed`/באבחון-טעות).
- **שום קובץ אחר לא משתנה.** אין class-names חדשים על כרטיסים/כפתורים עצמם
  (`StudentPicker.tsx`, `GradePicker.tsx`, `TopicPicker.tsx`, `LevelPicker.tsx`,
  `StylePicker.tsx` — אפס שינוי).

## Data / State Changes
None. אין state חדש, אין prop חדש — התנאי שה-⭐ נשען עליו (`feedback === "correct"`)
כבר קיים ב-`Practice.tsx`.

## Technical Approach

**קבוצת-סלקטורים משותפת, לא class חדש:** `.student-card, .grade-card, .topic-card,
.level-card, .style-card, button { box-shadow: 0 5px 0 var(--accent-border);
transition: transform 0.08s, box-shadow 0.08s; }` ואז `:active` שמוריד את האלמנט
ומאפס את ה-shadow. זה עובד על השמות הקיימים כמו שהם — באה בחינם בלי לגעת באף קובץ
`.tsx`, בדיוק כמו שproduct-spec דרש. `button` הגלובלי כולל גם כפתורים שלא "כרטיס"
(כמו "בדיקה", "יצירה", "נסו שוב") — זה הנכון: אלה בדיוק הכפתורים-הראשיים ש-design.md
רוצה שירגישו כמו לחיצה אמיתית.

**Pop-in בלי "לקפוץ מחדש" בכל רינדור:** האנימציה מוגדרת עם `animation-fill-mode:
backwards` ומשך קצר (0.35s). ברגע שה-React component עצמו לא מקבל `key` משתנה (אין
סיבה שיקבל — הכרטיסים האלה כבר לא מקבלים `key` דינמי היום), ה-DOM node של כל כרטיס
לא נהרס ונוצר מחדש בין רינדורים רגילים (שינוי state שלא נוגע ברשימה עצמה) — ל-CSS
animation אין שום סיבה "לרוץ שוב" אלא אם האלמנט עצמו מורכב מחדש (ניווט למסך, לא
רינדור בתוך אותו מסך). זה בדיוק ההתנהגות הרצויה: קופץ-פנימה פעם אחת בכניסה למסך,
לא בכל הקלדה בשדה תשובה.

**⭐ burst:** `<span className="feedback-star">` עם `@keyframes star-burst` (scale+
rotate+fade, אותו רעיון כמו בגלריית-הקונספטים). מוצג/נעלם יחד עם ה-`<p>` שמכיל אותו
— React ממונט את שניהם יחד כש-`feedback` הופך ל-`"correct"`, כך שהאנימציה (עם
`backwards` fill) רצה אוטומטית בכל פעם מחדש, בלי JS נוסף לאיפוס/הפעלה.

**`prefers-reduced-motion`:** `@media (prefers-reduced-motion: reduce) { .student-card,
.grade-card, .topic-card, .level-card, .style-card, button, .feedback-star { animation:
none !important; transition: none !important; } }` — אותה קבוצת-סלקטורים בדיוק,
כדי שלא יישכח איבר. הצללים הסטטיים (ה-ledge) נשארים — רק התנועה נעלמת.

## Edge Cases
- **כפתורים מושבתים (`disabled`)**: `button:active` על כפתור `disabled` לא מקבל
  אירועי-עכבר ממילא (התנהגות-ברירת-מחדל של הדפדפן) — אין צורך בטיפול מיוחד, אבל
  developer should still check `:disabled` doesn't get the hover/press shadow-shift
  visually (כבר יש `.topic-card:disabled` קיים ב-CSS שממילא דוחה hover — ודאו שה-
  ledge-shadow לא "נתקע" חצי-לחוץ על כפתור מושבת).
- **כרטיס שנכנס אחרי טעינה ראשונית** (למשל כרטיס תלמיד/ה חדש שנוצר דרך `manage-students`
  ומתווסף לרשימה): יקבל את ה-pop-in שלו כרגיל כי זה DOM node חדש — זו התנהגות נכונה
  ורצויה (לא edge case שצריך לתקן), לא רק "המסך הראשוני".
- **תשובה נכונה שנייה באותה שאלה** (לא אמור לקרות — ברגע שנכון, הכל ננעל) — לא
  רלוונטי, `feedback` לא חוזר ל-`null` בלי מעבר לשאלה הבאה.

## Risks / Tradeoffs
- **קבוצת-סלקטורים גלובלית על `button`** משפיעה על *כל* כפתור באפליקציה, כולל
  כפתורים בתוך דיאלוגים (⚙️, לוג-גרסאות, אישור-מחיקה) שה-design.md לא דן בהם
  במפורש אבל גם לא אסר. זו הרחבה קלה מעבר למה שdesign.md פירט מילה-במילה, אבל
  עקבית עם הכוונה שלו ("כל כפתור ראשי") — אם זה מרגיש-רע בפועל (למשל כפתור "מחיקה"
  האדום בדיאלוג-אישור לא אמור להרגיש "כיפי"), developer can scope it out with a
  `:not()` exclusion, אבל זו לא החלטה לקבוע מראש בלי לראות את זה בפועל.
- **לא נבדק viewport-ישן/מכשיר חלש** — האנימציות הן transform/box-shadow בלבד
  (GPU-friendly), לא משהו שצפוי לגרום לבעיית-ביצועים אמיתית, אבל אין מדידה בפועל.

## Open Questions
None.

## Implementation Notes

Deviated from the plan in two ways, both found through testing, not guessed up front:

1. **The grouped selector's `:active` rule dropped its `transition`.** The original
   plan called for a smooth 0.08s tween on press. A first full e2e run showed 9 real
   failures — long streak-style tests (dozens of rapid answers in a row) timing out
   with "element is not stable", Playwright's actionability check for an element whose
   bounding box is still mid-transition. Removed the transition; `:active` now snaps
   instantly, which still reads as a real press and fully resolved those failures.
2. **The pop-in entrance animation moved off `button` entirely, staying only on the
   five card selectors.** design.md's own wording already only describes *cards*
   entering a screen this way, but the first draft also put it on `button` for
   consistency. That broke things for a reason worth recording: `Practice.tsx`'s
   "בדיקה" button is conditionally rendered on `feedback === null`, so it unmounts and
   remounts fresh on every single question — giving it an entrance animation meant it
   replayed on every answer in a streak, and the accumulated cost pushed several long
   streak-style tests past their 30s timeout. Buttons keep the static ledge-shadow and
   the instant `:active` press; only cards pop in.

Both were caught by running the real e2e suite after implementation, not inferred from
the architecture alone — see tests.md.

323/324 e2e, single clean run — the one failure is the pre-existing
`grade8-angles-congruence.spec.ts` flake, unrelated. A second failure seen on an
earlier run of this same suite (`mika-adaptive-difficulty.spec.ts`'s "history records
the topic without a level suffix", 19/20 instead of 20/20) reran green 9/9 times in
isolation — a pre-existing flake in the adaptive question generator (duplicate
consecutive questions, already tracked separately, unmerged PR #91), not caused by
this change. `npm run build`/`npm run lint` clean. Version 1.46.1 → 1.47.0.
