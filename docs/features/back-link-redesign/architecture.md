# קישורי-טקסט (חזרה / החלף תלמיד / ההתקדמות שלי) — Architecture

## Overview
שינוי CSS-בלבד ב-`src/App.css`: מוציאים `.link-button` משני selectors רחבים של
playful-redesign (הצל הסטטי וה-`:active` snap), ונותנים ל-`.link-button` הבסיסי את
מתכון "הפילה העדינה" שכבר קיים ב-`.history-link` — כולל תיקון-גרירה קטן ל-
`.reveal-link` כדי שלא יתרחב לרוחב-מלא ברגע שיש לו רקע.

## Affected Files / Components
- **`src/App.css`** — הקובץ היחיד שמשתנה:
  - שורה 706: `button:not(.app-version)` → `button:not(.app-version):not(.link-button)`
    (הצל הסטטי).
  - שורה 757: `button:active:not(:disabled):not(.app-version)` →
    מוסיפים `:not(.link-button)` גם כאן (ה-`:active` snap).
  - שורה 326 (`.link-button`): מוסיפים `background: var(--accent-bg)`,
    `border-radius: 999px`, `padding: 6px 14px`, `width: fit-content` — אותן
    תכונות שכבר יש ב-`.history-link` היום. `font: inherit` ו-`color: var(--accent)`
    הקיימים נשארים.
  - שורה 904 (`.history-link`): מוציאים את ה-`background`/`border-radius`/`padding`
    הכפולים שלו (עכשיו מגיעים מהבסיס `.link-button`) — נשאר רק `display: block`,
    `margin: 10px 0 24px auto`, `font-size: 14px` (ה-margin-bottom גדל מ-20px ל-24px
    לפי design.md's דרישת-המרווח המוגדלת).
  - שורה 564 (`.reveal-link`): מוסיפים `width: fit-content` — בלעדיו, ברגע ש-
    `.link-button`'s הבסיסי מקבל `background`, ה-`display: block` הקיים של
    `.reveal-link` יגרום לו להתרחב לכל רוחב ה-container (פס ורוד רחב, לא פילה
    קטנה) — זה **לא** היה בעיה קודם כי לא היה לו רקע-רחב-גלוי להבחין בו.
  - **`.link-button:hover`/`:active` חדשים** (לא קיימים היום): מוסיפים rule קטן —
    `:hover` מעט כהה/רווי יותר ברקע, `:active` דועך-אטימות (`opacity: 0.8`) —
    כנדרש ב-design.md, כדי שהקישורים לא "ישתקו" בלי שום משוב-לחיצה אחרי שה-
    `:active` snap הכללי כבר לא חל עליהם.

## Data / State Changes
none — אין שינוי ב-TSX, ב-state, או ב-props בכל אחד מ-7 הקבצים שמשתמשים ב-
`.link-button` (GradePicker.tsx, LevelPicker.tsx, StylePicker.tsx, TopicPicker.tsx,
Practice.tsx, History.tsx, TopicLesson.tsx — שני האחרונים לא הוזכרו בספק/עיצוב
אבל משתמשים באותו class הבסיסי ולכן מקבלים את אותו תיקון אוטומטית, מה שרצוי:
עקביות על **כל** מקום שמשתמש ב-`.link-button`, לא רק חמשת שהוזכרו קודם).

## Technical Approach
1. **הוצאה מה-selectors הכוללים (playful-redesign):** `:not(.link-button)` נוסף
   לשני ה-selectors ב-App.css (706, 757) — לא מוחקים/משנים שום דבר אחר בהם, רק
   מוסיפים את ה-exclusion, באותה טכניקה שכבר קיימת שם ל-`.app-version`.
2. **מתכון-הפילה עובר לבסיס:** `.link-button` עצמו (לא עוד וריאנט ספציפי) מקבל
   את ה-background/radius/padding; `.history-link` ו-`.reveal-link` יורשים את זה
   אוטומטית ומוסיפים רק את ה-layout-overrides הספציפיים שלהם (display/margin/
   width) — כך שכל קישור-טקסט עתידי שישתמש ב-`.link-button` יקבל את ההתנהגות
   הנכונה "בחינם", בלי לשכפל CSS.
3. **משוב-לחיצה עדין חדש:** `.link-button:hover`/`:active` חדשים, scoped רק
   לקלאס הזה (לא ל-`button` הכללי) — כדי לא להשפיע על שום buttons אחרים.
4. אין צורך לגעת ב-`idle-spotlight`'s selector — הוא **כבר** מחריג `.link-button`
   במפורש (`:not(.link-button)` כבר שם, מה-feature הקודם) — נבדק בפועל, לא ניחוש.

## Edge Cases
- **`.reveal-link`'s רוחב** — מטופל במפורש למעלה (`width: fit-content`), אחרת
  רגרסיה ויזואלית אמיתית (פס רחב במקום פילה).
- **קישור בתוך דיאלוג מודאלי** — אין קישורי-`.link-button` בתוך אף דיאלוג קיים
  (CreateStudentDialog/DeleteStudentDialog/SettingsDialog/VersionLog משתמשים
  בכפתורי-פעולה רגילים, לא ב-link-button) — אין edge case בפועל, נבדק.
- **`disabled` state** — `.link-button` לא נמצא היום בשום מקום עם `disabled`
  (זה לא כפתור-שליחה) — אין התנגשות עם `button:disabled`'s `opacity: 0.5`.
- **`.history-link`'s margin-bottom גדל (20px→24px)** — שינוי קטן שעלול להזיז
  מעט תוכן מתחתיו (כותרת המסך) — נבדק ויזואלית ב-QA/developer, לא אמור לשבור
  פריסה (זה רק 4px נוספים).

## Risks / Tradeoffs
- `:not(.link-button)` מתווסף לשני selectors נפרדים (706, 757) — אם מישהו בעתיד
  יוסיף selector-רחב-שלישי (`button:...`) וישכח את ה-exclusion, הבעיה חוזרת.
  לא נפתר ארכיטקטונית כאן (זה ידרוש מבנה-class-ים שונה לגמרי, כמו `.playful-btn`
  ייעודי על כפתורי-פעולה בלבד) — מתועד כאן כדי שהתחזוקה הבאה תדע למה לשים לב,
  לא מתוקן כחלק מהפיצ'ר הזה (scope-creep לא-נדרש).

## Open Questions
None.

## Implementation Notes

Built exactly per plan, one deviation worth flagging: the design.md/plan didn't specify
the exact hover background value, and the first pick (`var(--accent-border)`, a 50%-opacity
pink) turned out to be a real contrast problem — that token is used elsewhere in the
codebase only for borders/strokes (`.lesson-link:hover`'s `border-color`), never as a
background with text on top, and pink text over a 50%-opacity pink tint would have been
hard to read. Switched to the same solid-accent + white-text combination the base
`button` rule already uses for primary actions (`background: var(--accent); color: #fff`)
— good contrast, and a natural "fills in" hover feel for a pill.

`.history-link` and `.reveal-link` now only carry their own layout specifics
(display/width/margin) — the shared look (background/padding/radius/font-size) lives
once on the base `.link-button`, as architecture.md intended.

Verified live (dev server, screenshots): the GradePicker first-visit screen's two
stacked links, the topic-picker header, and the practice screen's back-link all show the
light pill instead of the old heavy ledge-shadow button look, with no visual regression
to actual action buttons ("בדיקה", "רמז", grade/topic cards) — confirmed those still
keep their full ledge-shadow + ledge-press treatment unchanged.

`npm run build`/`npm run lint` clean. Version 1.48.1 → 1.49.0.
