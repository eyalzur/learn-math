# פאד הניווט במחברת: לצד שמאל, כבוי כברירת מחדל, ונגיש מהדף עצמו — Architecture

## Overview
שלושה חלקים עצמאיים: (1) `navPadVisible` — שדה בוליאני פשוט ב-`preferences.ts`,
מראה מדויק של `readAloud` הקיים, לא מערך-דרגות כמו שאר הגדרות המחברת; (2)
`.notebook-pan-controls` עובר מ-`inset-inline-start` ל-`inset-inline-end`
ב-`App.css`, וה-JSX שלו ב-`PracticeNotebook.tsx` נכנס תחת `{navPadVisible &&
(...)}` כדי שלא יהיה ב-DOM בכלל כשכבוי — לא `display:none`; (3) **השינוי
המרכזי**: דיאלוג ⚙️ שהיום חי כולו בתוך `TopicPicker.tsx` (state מקומי + JSX)
עובר להיות רכיב עצמאי חדש (`SettingsDialog.tsx`), עם ה-state ("פתוח/סגור")
עולה ל-`App.tsx` — ההורה המשותף היחיד בין מסך הנושאים למסך התרגול — כדי
ששני כפתורי ⚙️ (הקיים והחדש) יפתחו *את אותו מופע רכיב בדיוק*.

**הנחת-יסוד (כמו ב-design.md):** נבנה בהנחה ש-[PR #80](https://github.com/eyalzur/learn-math/pull/80)
כבר ב-`main`. כל התייחסות ל-`.notebook-zoom-controls`/`.notebook-tool-controls`/
`.notebook-minimap`/`.notebook-stage-frame`/`--notebook-btn-size` למטה מבוססת
על ה-CSS/JSX בפועל בענף `feature/notebook-toolbar-redesign` (נבדק ישירות דרך
`git show feature/notebook-toolbar-redesign:src/App.css` ו-`:src/components/PracticeNotebook.tsx`,
לא ניחוש).

## Affected Files / Components

- **`src/data/preferences.ts`** — שדה חדש `navPadVisible?: Record<string, boolean>`
  ב-`Preferences`, פלוס `navPadVisible(studentId): boolean` (ברירת מחדל
  `false`) ו-`setNavPadVisible(studentId, value): void` — מראה מדויק של
  `readAloud`/`setReadAloud` הקיימים (לא דפוס ה-LEVELS; זו בחירה בינארית
  אמיתית, אין "דרגות").
- **`src/App.tsx`** —
  - `const navPadVisible = navPadVisibleFor(student.id);` (אותו מקום בדיוק
    כמו `readAloud`/`holdZoomLevel` וכו', ליד שורה ~303).
  - `const [settingsOpen, setSettingsOpen] = useState(false);` — **state
    חדש, עולה מ-`TopicPicker.tsx`** (ראו Technical Approach למטה — זו
    החלטת הארכיטקטורה המרכזית כאן).
  - מעביר ל-`TopicPicker` (סעיף `screen.name === "home"`): `onOpenSettings`
    (לא `settingsOpen`/`onSettingsOpenChange` — `TopicPicker` לא צריך
    לדעת אם הדיאלוג פתוח, רק לבקש לפתוח אותו), ושני ה-props החדשים
    (`navPadVisible`, `onNavPadVisibleChange`) לבורר עצמו.
  - מעביר ל-`Practice` (סעיף `screen.name === "practice"`): `navPadVisible`
    (ערך מוחלט, כמו `holdZoomFactor`/`panStepPx` כבר עוברים — `Practice`/
    `PracticeNotebook` אף פעם לא מקבלים level+setter גולמיים, רק ערכים
    פתורים) ו-`onOpenSettings` (אותו callback type בדיוק כמו ב-`TopicPicker`).
  - שני אתרי ה-`return` (`home` ו-`practice`) עוטפים את מה שהם כבר
    מחזירים ב-`<>...<SettingsDialog .../></>`, עם `{settingsOpen && (
    <SettingsDialog ... onClose={() => setSettingsOpen(false)} />)}` —
    ראו Risks/Tradeoffs לנימוק למה זו כפילות מכוונת של שתי שורות, לא
    ריפקטור גדול יותר של מבנה ה-`return`-ים המוקדמים הקיימים ב-`App.tsx`.
- **`src/components/SettingsDialog.tsx`** (קובץ חדש) — כל ה-JSX של הדיאלוג
  עצמו, מועתק/מועבר כמעט מילה-במילה מ-`TopicPicker.tsx` (השורות שכיום בנויות
  תחת `settingsOpen && showSettings`, כולל ה-backdrop), פלוס בלוק רביעי/חמישי
  חדש לבורר `navPadVisible` (toggle, לא שורת-אפשרויות — ראו design.md).
  Props: כל זוגות level+onChange הקיימים (`readAloud`, `holdZoomLevel`,
  `autoScrollJumpLevel`, `panSpeedLevel`, ואם PR #80 כבר ב-`main`:
  `buttonSizeLevel`, `suggestionSensitivityLevel`) פלוס `navPadVisible`/
  `onNavPadVisibleChange` החדשים, פלוס `open: boolean` ו-`onClose: () =>
  void`. גם מייצא פונקציית עזר `hasAnySettings(props): boolean` (אותה
  לוגיקת `showReadAloud || showHoldZoom || ...` שכבר קיימת ב-`TopicPicker`
  היום, רק מועברת לכאן) — **שני** הצרכנים (`TopicPicker` ו-`PracticeNotebook`)
  קוראים לה כדי להחליט אם בכלל להציג את כפתור ⚙️ שלהם (דיאלוג ריק אסור
  להיות נגיש, אותו עיקרון כמו היום).
- **`src/components/TopicPicker.tsx`** — **הקובץ הכי מצומצם מבחינת שינוי,
  למרות שזה הרכיב שה-state עבר ממנו**: ה-`useState` המקומי ו-כל ה-JSX
  של הדיאלוג (שורות ~69, ~154–295 היום) **נמחקים** — מוחלפים בקריאה אחת
  ל-`<SettingsDialog .../>` ב-`App.tsx` (לא ב-`TopicPicker` עצמו — ראו
  Technical Approach). `TopicPicker` מקבל `onOpenSettings: () => void`
  במקום לנהל state בעצמו; כפתור ⚙️ הקיים קורא לו ישירות. משתמש ב-
  `hasAnySettings()` המיובא כדי להחליט אם להציג את הכפתור (כמו `showSettings`
  היום).
- **`src/components/Practice.tsx`** — שני props חדשים (`navPadVisible: boolean`,
  `onOpenSettings: () => void`), מועברים ללא שינוי ל-`<PracticeNotebook>`
  (אותו דפוס passthrough כמו `holdZoomFactor` וכו').
- **`src/components/PracticeNotebook.tsx`** —
  - שני props חדשים כנ"ל.
  - `.notebook-pan-controls` (היום תמיד מוצג) עובר ל-`{navPadVisible && (
    <div className="notebook-pan-controls">...)}` — אותו דפוס בדיוק כמו
    `{fullscreen && statusSlot}` הקיים בקובץ.
  - כפתור ⚙️ חדש, `<button aria-label="הגדרות" onClick={onOpenSettings}>`,
    כ-sibling ישיר אחרי ה-`</div>` הסוגר של `.notebook-minimap` (לפי
    ה-JSX בפועל ב-`feature/notebook-toolbar-redesign`, תוך
    `.notebook-stage-frame`) — **לא** בתוך המינימפ עצמו ולא מעליו/מתחתיו,
    לצידו — ראו CSS למטה. מוצג רק אם `hasAnySettings(...)` עם הערכים
    הזמינים כאן (`true` תמיד בפועל, כי תלמיד/ה תמיד נבחר/ת במסך הזה —
    אבל נקרא במפורש, לא מניחים, לעקביות עם `TopicPicker`).
- **`src/App.css`** —
  - `.notebook-pan-controls`: `inset-inline-start: 10px` → `inset-inline-end:
    10px` (נשאר `bottom: 10px`). הערת ה-RTL הקיימת ליד ההגדרה הזו (שמסבירה
    למה `direction:ltr` יושב רק על `.notebook-pan-grid` הפנימי) נשארת
    נכונה כמו שהיא — זה לא קשור לאיזה צד הפיזי הקלאסטר כולו יושב בו.
  - **תוצאת-לוואי נדרשת:** `.notebook-tool-controls` ב-PR #80 יושב היום
    ב-`inset-inline-start: 120px` (= offset הפאד `10px` + רוחבו `100px`
    + רווח `10px`) בדיוק *כדי* לשבת לצד הפאד באותו צד. אחרי שהפאד עובר
    לצד הנגדי, שום דבר כבר לא יושב לצד `.notebook-tool-controls` — הוא
    חוזר ל-`inset-inline-start: 10px` (צמוד לקצה, במקום דחוף-פנימה
    בלי צורך). **אם PR #80 עדיין לא ב-`main`** כשהענף הזה נבנה בפועל,
    שינוי ה-`120px`→`10px` הזה לא רלוונטי (הערך הזה עוד לא קיים) — מי
    שמיישב את הסדר בפועל (ראו Open Questions ב-product-spec.md) צריך
    לזכור את התיקון הזה כצעד נלווה.
  - `.notebook-settings-btn` (מחלקה חדשה) — אותו טיפול כמו כפתורי עמודת
    הזום: `width/height: var(--notebook-btn-size, 40px); border-radius:
    50%;` וכו' (אם PR #80 עדיין לא ב-`main`, המשתנה הזה לא קיים עדיין —
    הכפתור מקבל גודל קבוע סביר, 40px, עד שהוא ממוזג). ממוקם
    `position:absolute` ביחס ל-`.notebook-stage-frame` (או `.notebook-stage`
    הישן אם #80 עדיין לא מוזג — ראו הנחת-יסוד), `top: 10px`,
    `inset-inline-start: 80px` (= רוחב המינימפ `60px` + offset שלו `10px`
    + רווח `10px`) — לצד המינימפ, לא מעליו.

## Data / State Changes
- `preferences.ts`: `navPadVisible?: Record<string, boolean>` — בוליאני
  פשוט, לא level-id. ברירת מחדל `false` (הפוך מכל שאר ה-defaults שהם
  "דרגה אמצעית" — כאן ברירת המחדל היא ה"off" הלוגי, לפי product-spec.md).
- `App.tsx`: `settingsOpen: boolean` — **state שעבר ממיקום** (היה ב-
  `TopicPicker`, עכשיו ב-`App`). שום state חדש מבחינת *מה* הוא מייצג,
  רק *איפה* הוא יושב.
- `SettingsDialog.tsx`: אין state פנימי משלו — רכיב מוצג-בלבד (controlled),
  כל הערכים וה-callbacks מגיעים כ-props מ-`App.tsx`, אותו דפוס כמו
  `TopicLesson`/`LevelPicker` וכו' הקיימים.

## Technical Approach

### העברת state הדיאלוג — למה, ולמה זה בטוח
`TopicPicker.tsx` כיום מתעד במפורש (שורות ~61-68) שה-state הזה נשאר
מקומי **בכוונה**, עם אזהרה ספציפית: "אל תיתנו ל-`<TopicPicker>` ב-`App.tsx`
`key` משתנה, אחרת כל בחירה תסגור את הדיאלוג" (ראו
`docs/features/notebook-hold-to-zoom/architecture.md`, "סבב ו׳"). זו לא
אזהרה כללית נגד להעלות את ה-state — זו אזהרה ספציפית נגד `key` משתנה על
הרכיב שמחזיק אותו, שגורם ל-React לפרק ולבנות מחדש את הרכיב (ומאפס `useState`
פנימי). הפיצ'ר הזה **חייב** להעלות את ה-state בכל מקרה: הדיאלוג צריך
להיות נגיש גם ממסך שאינו `TopicPicker` בכלל (מסך התרגול), ו-`TopicPicker`
ו-`Practice` הם ענפי `if` נפרדים לגמרי ב-`App.tsx` — אין דרך ש-state
שיושב בתוך אחד מהם ישפיע על השני. ה-state עובר ל-`App.tsx` עצמו (לא
ל-`TopicPicker` ולא ל-`Practice`), שכבר מחזיק state ארוך-חיים דומה
(`screen`, `adaptiveSession`, `preferencesTick`) ללא `key` משתנה על אף
ילד — אותו עיקרון שכבר עובד שם נכון. developer צריך לוודא בפירוש ש **אף
`<TopicPicker>`/`<Practice>` לא מקבל `key` prop** (אף אחד מהם לא מקבל
כזה היום) כדי לא לשבור את ההנחה הזו.

### שני אתרי render לדיאלוג — למה לא render יחיד גלובלי
`App.tsx` מבנה היום סדרת `if (...) return (...)` מוקדמים (לא עץ-JSX אחד
עם ענף יחיד בסוף). שינוי המבנה הזה לרינדור-דיאלוג-יחיד-גלובלי (למשל קליטת
כל ה-return-ים הקיימים למשתנה ואז return בודד בסוף) הוא ריפקטור שחוצה
חלקים לא-קשורים של הקובץ (`history`/`lesson`/`levels`/`styles`/`result`)
שאף אחד מהם לא זקוק לדיאלוג הזה כרגע. הבחירה כאן: רק שני אתרי ה-`return`
הרלוונטיים (`home`, `practice`) עוטפים את עצמם ב-Fragment עם אותו בלוק
`{settingsOpen && <SettingsDialog ... />}` — שתי שורות JSX כפולות, לא
ריפקטור מבני. ראו Risks/Tradeoffs לנימוק המלא.

### הדיאלוג עצמו
`SettingsDialog.tsx` הוא כמעט העתקה ישירה של ה-JSX שכבר קיים ב-`TopicPicker`
היום (backdrop, כותרת, בלוקי הבוררים, כפתור "סגירה") — התוספת היחידה היא
בלוק חדש ל-`navPadVisible` (toggle, בדיוק מבנה `.read-aloud-setting` הקיים:
`<input type="checkbox">` מוסתר + `<span>` עם `role` מתאים, לא רשימת-
אפשרויות). שום לוגיקת-תצוגה (`showX`) לא משתנה במהות — רק עוברת מהיות
`const` מקומיים ב-`TopicPicker` להיות הפונקציה המיוצאת `hasAnySettings()`.

### `PracticeNotebook.tsx` — שני מקומות נפרדים
כפתור ה-⚙️ החדש לא תלוי במנגנון ההצעה/הדגשה מ-PR #80 (`data-suggested`)
— זה כפתור ניווט-מסך רגיל, לא כלי-כתיבה. אין לו `aria-pressed` (הוא לא
toggle, הוא פעולה — פותח דיאלוג, לא "נבחר/לא נבחר").

## Edge Cases
- **הפאד כבוי כברירת מחדל לתלמיד/ה חדש/ה** — `navPadVisibleFor` מחזיר
  `false` כשאין ערך שמור, אותו דפוס `readAloud` כבר מטפל בו.
- **מעבר בין תלמידים** — ההגדרה היא per-student (כמו כולן), אין state
  "דולף" בין תלמיד/ה לתלמיד/ה כי `navPadVisibleFor(student.id)` תמיד
  נקרא עם ה-`student.id` הנוכחי.
- **פתיחת ⚙️ מתוך תרגול, ואז מעבר דף/שאלה הבאה בזמן שהדיאלוג פתוח** —
  לא קורה בפועל: הדיאלוג הוא overlay מעל הכל (`z-index` גבוה כבר קיים
  ל-backdrop), אין דרך ללחוץ על "הבא"/"שלח למורה" מתחתיו כשהוא פתוח.
  לא דורש טיפול מיוחד.
- **הפעלת הפאד תוך כדי תרגול, דרך ⚙️ שנפתח מהתרגול עצמו** — סוגרים את
  הדיאלוג וחוזרים לאותה שאלה בדיוק; הפאד מופיע/נעלם מיד, בלי לאבד את
  מה שכתוב על הדף (overlay בלבד, לא ניווט/טעינה-מחדש).
- **PR #80 טרם מוזג כשהפיתוח בפועל מתחיל** — ראו הערות "הנחת-יסוד" למעלה
  וב-CSS: הקואורדינטות/המשתנה `--notebook-btn-size` לא יהיו קיימים עדיין;
  developer צריך להתאים (לרוב: להמתין למיזוג #80 קודם, כפי שגם product-spec.md
  מציע כברירת מחדל).

## Risks / Tradeoffs
- **כפילות שתי השורות `{settingsOpen && <SettingsDialog .../>}`** ב-two
  אתרי `return` ב-`App.tsx`, במקום render-יחיד — נבחר במכוון כדי לא
  להרחיב את הסקופ של הפיצ'ר הזה לריפקטור של כל מבנה ה-`App.tsx`. הסיכון
  היחיד: אם מישהו יוסיף בעתיד נקודת-כניסה שלישית לדיאלוג (ממסך נוסף),
  יהיה צריך להוסיף שורה דומה שם גם — לא אוטומטי. זה סביר לסבב הזה; אם
  מספר נקודות הכניסה יגדל עוד, שווה לשקול את הריפקטור הגדול יותר אז.
- **שינוי ה-signature של `TopicPicker`** (מוותר על `settingsOpen`/
  `setSettingsOpen` הפנימיים, מקבל `onOpenSettings` חדש) — זה שינוי
  לרכיב קיים שעבר כבר כמה סבבים (ראו `notebook-hold-to-zoom/architecture.md`).
  הבדיקות הקיימות שמניחות שה-⚙️ פותח/סוגר דיאלוג (למשל ב-
  `notebook-nav-settings.spec.ts`) לא אמורות להישבר — הן בודקות התנהגות
  נצפית (קליק פותח דיאלוג, קליק על אפשרות משנה אותה), לא את מיקום ה-
  state הפנימי. developer צריך לוודא את זה בפועל (build+lint+test
  מלאים), לא להניח.
- **ברירת המחדל `false` שונה מכל שאר ה-defaults ב-preferences.ts** (שכולם
  "דרגה אמצעית", לא "כבוי") — זו החלטת product-spec.md מפורשת, לא בחירה
  טכנית; מוזכר כאן רק כדי ש-developer לא "יתקן" את זה לעקביות מדומה עם
  שאר ההגדרות.

## Open Questions
None.

## Implementation Notes
בנוי בדיוק לפי התוכנית למעלה, עם סטייה אחת מתועדת:

- **הענף נבנה על בסיס מיזוג מקומי** של `feature/notebook-toolbar-redesign`
  (PR #80) — לא ממוזג שום דבר ל-`main`/ל-PR #80 עצמו, רק קומיט מיזוג מקומי
  על הענף הזה כדי שהקוד יתאים בפועל להנחת-היסוד (`.notebook-zoom-controls`
  למעלה-שמאל, `.notebook-tool-controls` למטה-ימין, `--notebook-btn-size`
  וכו'). **מישהו צריך לזכור את זה כשסדר המיזוג בפועל מתברר** — אם PR #80
  ייפתח/ישתנה לפני שהענף הזה נפתח כ-PR, ייתכן שה-diff מול `main` ייראה
  גדול מדי (כולל את כל השינויים של #80) עד ש-#80 עצמו ימוזג קודם. ראו
  Open Questions ב-product-spec.md — זו בדיוק התלות שתועדה שם.
- **כפתור ⚙️ החדש ב-`PracticeNotebook.tsx` לא קורא ל-`hasAnySettings()`**,
  בניגוד למה שתוכנן. הסיבה: לעשות זאת נכון היה דורש להעביר את כל שנים-עשר
  ה-props של ערכי/callbacks ההגדרות (readAloud, holdZoomLevel וכו') דרך
  `Practice.tsx` עד ל-`PracticeNotebook.tsx` רק כדי לבדוק תנאי שתמיד אמת
  במסך הזה בפועל — מסך התרגול לעולם לא מוצג בלי תלמיד/ה נבחר/ת, ולכן
  "יש משהו להציג בהגדרות" תמיד נכון שם, מה שאין ב-`TopicPicker` (ששם
  הבדיקה היא התנהגות קיימת ששומרים עליה, לא נבדקת מחדש). כפתור ⚙️ של
  `PracticeNotebook` מוצג תמיד ללא תנאי — תיעוד מפורש כדי שזה לא ייראה
  כמו פספוס.
- כל שאר הפרטים (מיקום CSS, `navPadVisible` כבוליאני פשוט, `SettingsDialog.tsx`
  כקומפוננטה נשלטת, `settingsOpen` שעולה ל-`App.tsx`) תואמים בדיוק את
  התוכנית.
- **תיקון קטן מעבר לתוכנית**: `hasAnySettings()` לא נשאר ב-`SettingsDialog.tsx`
  כמתוכנן — `oxlint`'s `react(only-export-components)` התריע ש-export שני
  (פונקציה, לא קומפוננטה) מאותו קובץ שובר React Fast Refresh. הועבר ל-
  `src/lib/settingsVisibility.ts` חדש (אותה תבנית כמו `src/lib/notebookServer.ts`
  הקיים — לוגיקה לא-ויזואלית חיה ב-`lib/`, לא ב-`components/`), יחד עם
  טיפוס `SettingsValues` המשותף. `SettingsDialogProps` כעת `extends
  SettingsValues`.

**אומת בפועל** (לא רק build/lint): תצוגה מקדימה אינטראקטיבית אישרה
שהפאד נעדר לגמרי מה-DOM כברירת מחדל (לא רק מוסתר), שכפתור ה-⚙️ החדש
יושב פיזית לצד המינימפ (לא מתחתיו), שפתיחה/סגירה של ⚙️ מתוך תרגול לא
מאבדת תוכן שכבר צויר, ושאותו דיאלוג בדיוק (כולל הבורר החדש) נפתח
משני נקודות הכניסה. גיאומטריית ה-RTL אומתה ב-screenshots בפועל, לא רק
בהיגיון CSS: הפאד (אחרי הדלקה) יושב פיזית בצד שמאל של ה-stage, עמודת
הכלים חזרה לשבת צמודה לקצה הימני.

`npm run build && npm run lint` — נקי, אפס אזהרות. גרסה הועלתה
`1.37.0 → 1.38.0` (`npm run bump:feature`).

### תיקון נוסף, שנמצא בשלב qa: חפיפה אמיתית בין הפאד לעמודת הזום

הרצת הסוויטה המלאה בשלב qa חשפה כשל אמיתי (לא flake) ב-
`notebook-nav-buttons.spec.ts:149`, "the existing zoom buttons still work
exactly as before": לחיצה על "הקטן" נתפסה בפועל ע"י "הזז שמאלה". מדידה
ישירה (`boundingBox()` + `document.elementFromPoint()`, מול שרת פיתוח חי,
לא היגיון בלבד) אישרה שעל ה-stage המוטמע בתצוגת הבדיקה הסטנדרטית
(1280×720, ~190px גובה), עמודת הזום (מעוגנת למעלה, עד 240px) חורגת על
פני כל גובה ה-stage — ופאד שמעוגן למטה (`bottom:10px; inset-inline-end:
10px`, כפי שתוכנן למעלה) נופל **לגמרי בתוכה**, לא רק חופף בשוליים. בדיוק
אותה בעיית-גובה-stage-קצר שכבר תועדה כאן למעלה (ושב-PR #80 גרמה למעבר
`.notebook-tool-controls` מערימה-מתחת-עמודת-הזום לישיבה-בפינה-נגדית).

**התיקון:** `.notebook-pan-controls` עבר מעיגון תחתון לעיגון עליון, לצד
עמודת הזום במקום מתחתיה — `top: 10px; inset-inline-end: 68px;` (= 10px
offset עמודת הזום עצמה + 48px רוחב-כפתור מרבי + 10px רווח). "לצד, לא
ערימה" — אותו עיקרון בדיוק שכבר הוכח פעמיים בסשן הזה לאותה סיבת-שורש. זו
סטייה מ-design.md's "הנחת-יסוד" המקורית (פינה שמאלית-**תחתונה**), לא
מהדרישה המוצרית עצמה ("צד שמאל" — product-spec.md קובע במפורש שהמיקום
המדויק ביחס לכפתורים אחרים הוא החלטת עיצוב/ארכיטקטורה, לא קריטריון קבלה
בפני עצמו). design.md עודכן עם הערת-תיקון מפורשת, כולל סקיצה מתוקנת.

אומת: מדידה חוזרת (`boundingBox()`) מאשרת אפס חפיפה בין
`.notebook-zoom-controls` ל-`.notebook-pan-controls`, גם מוטמע וגם
מסך-מלא; `document.elementFromPoint()` על מרכז כל כפתור ("הקטן", "הזז
למעלה") מגיע עכשיו ליעד הנכון; צילומי מסך אישרו שאין שום התנגשות חזותית
חדשה. כל 82 הבדיקות בסט הקבצים המושפע עוברות אחרי התיקון.

### תיקון שלישי: כפתור ה-⚙️ עובר לצד שמאל-למטה, אחרי משוב מפורש של המשתמש

המשתמש בדק את התצוגה המקדימה וביקש במפורש: "כפתור הגדרות בצד שמאל למטה"
— העברה מהמיקום המקורי (לצד המינימפ, ימנית-עליונה) לצד השמאלי, למטה.
`.notebook-settings-btn` עבר מ-`top:10px; inset-inline-start:80px` ל-
`inset-inline-end`, בתחילה בניסיון נאיבי (`bottom:10px; inset-inline-end:
10px`, צמוד לקצה — אותו מיקום בדיוק ש-`.notebook-tool-controls` יושב בו
בצד הנגדי). הניסיון הזה **נכשל** בבדיקות (`notebook-nav-buttons-visibility.spec.ts`,
שלוש בדיקות שלוחצות על הכפתור) — אותה סיבת-שורש בדיוק שתועדה למעלה:
עמודת הזום חורגת ~60px מתחת לקצה התחתון של ה-stage הקצר, כך שגם אלמנט
שמעוגן-למטה (לא רק מעוגן-למעלה) באותו צד פיזי נופל בתוך הטווח שלה.
אומת ישירות: `document.elementFromPoint()` על מרכז הכפתור מחזיר את "הצגת
כל הדף" (⛶, מעמודת הזום) במקום הכפתור עצמו.

**התיקון:** אותו offset מהקצה שכבר פתר בדיוק את זה עבור הפאד —
`inset-inline-end: 68px` (לא `10px`) — כעת גם על `.notebook-settings-btn`,
עם `bottom: 10px` (לא `top`, כדי שלא יתנגש עם הפאד עצמו כששניהם קיימים
יחד: הפאד למעלה באותה "נתיב", הכפתור למטה בה). אומת: `boundingBox()`
מאשר אפס חפיפה מול עמודת הזום **וגם** מול הפאד (כולל כששניהם פעילים בו
זמנית), `elementFromPoint()` על מרכז הכפתור מגיע אליו ולא לעמודת הזום,
בדיקה חוזרת-בפועל (לחיצה אמיתית דרך Playwright) פותחת את הדיאלוג בהצלחה,
גם מוטמע וגם מסך-מלא. `82/82` בדיקות בסט הקבצים המושפע עוברות שוב אחרי
התיקון. ראו design.md, "כפתור ⚙️ חדש — צד שמאל, למטה" לפרטים המלאים.

### תיקון רביעי: חפיפה אמיתית בין המפה הקטנה לעמודת הכלים — התגלתה רק במובייל

**כל האימות הגיאומטרי בפיצ'ר הזה עד כה (כולל שלוש פעמים קודם בסשן הזה) נעשה
אך ורק בתצוגת הבדיקה הדסקטופית הרגילה (1280×720) — אף פעם לא במובייל
בפועל.** המשתמש העיר על זה ישירות: "אתה בוחן את הדברים לא טוב. אנחנו
עובדים במובייל והתמונה שלך היא דסקטופ." זו הערה נכונה ומהותית — סוויטת
ה-e2e כולה (`playwright.config.ts`) רצה אך ורק ב-viewport ברירת המחדל של
Chromium, בלי שום פרויקט/מכשיר מובייל מוגדר, ואין אף `@media` query ב-
`App.css` שמתאים את הפריסה לרוחב מסך. בדיקה ידנית עם `devices["iPhone 13"]`
ו-`devices["Pixel 5"]` גילתה חפיפה ויזואלית אמיתית וחמורה שלא תועדה
קודם: `.notebook-tool-controls` (שתוקן קודם בסשן הזה חזרה ל-`inset-inline-
start: 10px`, "כי שום דבר כבר לא חולק איתו פינה") בפועל **כן** חולק פינה
עם `.notebook-minimap` (אותו `inset-inline-start`, top-anchored, 82px
גובה) — על stage קצר **וגם** צר (לא רק קצר כמו בדסקטופ), שתי העמודות
האלה יחד (82+136=218px) פשוט לא נכנסות בגובה ה-stage המלא (190-210px
במכשירים שנבדקו), בדיוק אותו מנגנון שכבר תוקן פעמיים בסשן הזה בצד השני
(עמודת הזום מול הפאד) — רק שהפעם לא היה שום בדיקת-e2e שתפסה את זה כי
אין בדיקות שרצות ברוחב מובייל כלל.

**התיקון:** `.notebook-tool-controls` עבר מ-`inset-inline-start: 10px`
(צמוד לקצה, אותו צד כמו המפה) ל-`inset-inline-start: 82px` (= offset
המפה `10px` + רוחבה `62px` + רווח `10px`) — מרחיק אותו אופקית מהמפה,
בלי תלות בגובה ה-stage, אותו עיקרון "לצד, לא ערימה" פעם רביעית. אומת:
`boundingBox()` על `devices["iPhone 13"]` ו-`devices["Pixel 5"]`, מוטמע
וגם מסך-מלא — אפס חפיפה בכל הצירופים (זום/פאד/⚙️/מפה/כלים). צילומי מסך
אמיתיים ממכשיר מובייל מדומה (לא רק מדידות) אישרו חזותית. `82/82` בדיקות
desktop-viewport (סוויטת ה-e2e בפועל) עדיין עוברות — השינוי הזה לא נגע
במה שהבדיקות כבר תופסות.

**מה לא תוקן כאן, ונשאר פער ידוע:** סוויטת ה-e2e של הפרויקט כולו עדיין
רצה אך ורק ב-viewport דסקטופי. זה לא פער שהפיצ'ר הזה פותח — זה פער
קיים בכל הפרויקט, שהתגלה כאן רק כי המשתמש בדק בפועל במובייל. תיקון
מערכתי (הוספת project מובייל ל-`playwright.config.ts`, הרצת כל הסוויטה
עליו) הוא מחוץ לסקופ של הפיצ'ר הזה — ראוי לדיון נפרד עם המשתמש.
