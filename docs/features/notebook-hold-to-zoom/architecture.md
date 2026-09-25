# זום זמני בהחזקת מגע — התקרבות למחברת — Architecture

**עדכון סבב ב׳ (2026-09-13):** כיוון הזום התהפך — התקרבות (זום-אין), לא
התרחקות. מכונת המצבים (טיימר המתנה, ביטול-על-תזוזה, המשך-לאורך-המגע, שחזור
מדויק, עצמאות מכלי/נעילה, מסירה ל-pinch) **לא השתנתה** — היפוך אמיתי יחיד:
`HOLD_ZOOM_FACTOR` עובר מ-`0.7` (התרחקות) ל-`1.3` (התקרבות, "כ-30% יותר
זום" — סבב ד׳ העלה את זה בהמשך ל-`1.7`, ראו למטה). בנוסף, נבדק במפורש
(ראו "וידוא: `zoomAroundPoint` עם factor > 1")
שהמתמטיקה הקיימת עובדת סימטרית לשני הכיוונים, ונבדק מחדש איזה גבול זום
(`MIN_ZOOM`/`MAX_ZOOM`) רלוונטי כעת — ראו Edge Cases.

**עדכון סבב ג׳ (2026-09-13) — תיקון באג אמיתי ממכשיר מגע:** המשתמש דיווח
(ואומת: מסך מגע, אצבע) שבפעם השנייה/השלישית, כשמתחילים לכתוב תוך כדי
ההחזקה, הזום "יוצא בחזרה" — כאילו האצבע הורמה, גם שהיא לא. לא שוחזר עם
מגע-עכבר מדומה ב-Playwright (כמה נסיונות שונים, כולל מדידת ה-CSS transform
בזמן אמת) — זה עצמו מצביע על הסיבה: ל-`.notebook-stage`/`.notebook-canvas`
יש `touch-action: none` (מונע גלילה/זום דפדפן), אבל **אין** דיכוי למחוות
מגע-ממושך אחרות של הדפדפן/המערכת (callout על תמונה/קנבס, הדגשת טקסט,
תפריט-הקשר של Android) — וחלון ההמתנה שלנו (`~180ms`) נמצא בדיוק בטווח שבו
מחוות כאלה יכולות להיפעל *במקביל* לטיימר שלנו. כשזה קורה, הדפדפן שולח
`pointercancel` לאפליקציה — וזה עובר בקוד דרך `endPointer`, שמפעיל בדיוק את
לוגיקת "שחזור התצוגה", בדיוק כאילו האצבע הורמה. זה סיכון **חדש שהפיצ'ר הזה
הכניס** — שום דבר לפני זה לא דרש מהתלמיד/ה להישאר ללא תזוזה תחת מגע אמיתי
למשך זמן, כך שההתנגשות הזו לא הייתה רלוונטית קודם. ראו Edge Cases ו-Technical
Approach למטה לתיקון. **לא ניתן לאמת את זה בבדיקות e2e** — Playwright לא
מדמה שכבת מחוות-מגע-ארוך של מערכת ההפעלה/הדפדפן (בדיוק כמו שגם לפינץ' אין
בדיקה, מהסיבה הזו), כך שהתיקון מאומת מול הדיווח בפועל של המשתמש על מכשיר
אמיתי, לא מול הסוויטה.

**עדכון סבב ד׳ (2026-09-25) — כיוונון עוצמה בלבד:** המשתמש ניסה את התצוגה
המקדימה (אחרי תיקון סבב ג׳) וביקש ששינוי הזום ירגיש יותר משמעותי.
`HOLD_ZOOM_FACTOR` עובר מ-`1.3` ל-`1.7` (זום בהחזקה: `91%` → `120%`, מזום
פתיחה `70%`). שום דבר אחר לא משתנה — לא מכונת המצבים, לא `zoomAroundPoint`,
לא חלון ההמתנה. נבדק מחדש (לא רק הונח) שהדיון על `MAX_ZOOM` עדיין תקף באותו
אופן — ראו Edge Cases: המסקנה על מקרה הבסיס (זום פתיחה) לא משתנה, אבל הסף
שבו זום-ידני-מראש מתחיל להיחתך יורד בפועל.

**עדכון סבב ה׳ (2026-09-25) — בורר עוצמה שנשמר:** העוצמה מפסיקה להיות
קבוע בקובץ והופכת להעדפה per-student. שלוש תוספות: ערך חדש ב-`preferences.ts`,
שרשור שלו מ-`App.tsx` דרך `Practice.tsx` אל `PracticeNotebook.tsx`, ושורת
בורר חדשה ב-`TopicPicker.tsx`. **מכונת המצבים של המחווה לא משתנה** — מה
שמשתנה זה מאיפה מגיע הפקטור, ושבמצב "כבוי" הטיימר לא נזרע מלכתחילה. ראו
"סבב ה׳: מהעדפה שמורה אל פקטור חי" ב-Technical Approach.

**עדכון סבב ו׳ (2026-09-25) — האפשרויות עוברות מאחורי כפתור הגדרות:** המשתמש
דחה את הפרישה הקבועה של סבב ה׳. **אין שינוי במכונת המצבים, בשרשרת הפקטור,
בשמירה, או בדרגות עצמן** — כל מה שסבב ה׳ בנה מ-`notebook.ts` ועד
`PracticeNotebook.tsx` נשאר ביט-בביט. מה שמשתנה הוא **מסך אחד**: שתי שורות
ההגדרה ב-`TopicPicker.tsx` (ההקראה הקיימת ובורר הזום מסבב ה׳) עוברות לתוך
דיאלוג שנפתח מכפתור `⚙️`, ונוסף מצב מקומי אחד ("פתוח/סגור"). ראו "סבב ו׳:
הכפתור, הדיאלוג, ושתי השורות שעוברות" ב-Technical Approach. **הגרסה:** נבדק
בפועל מול `origin/main` (`node scripts/check-version-bump.mjs main feature/notebook-hold-to-zoom`)
— `1.31.0 → 1.32.0` עובר, כלומר ההעלאה שנעשתה בסבב ה׳ מספיקה ואין צורך
בהעלאה נוספת בסבב הזה.

## Overview
תוספת אחת בלבד ל-`PracticeNotebook.tsx`: טיימר "אין תזוזה" לצד לוגיקת המגע
הבודד הקיימת, שמפעיל/מחזיר זום דרך `zoomAroundPoint` הקיים (מ-`src/data/notebook.ts`,
בלי שינוי בו) — עם מעברי תצוגה מרוככים שממומשים כ-CSS `transition` על תכונת
`transform` הקיימת, שמופעל ומכובה ידנית ב-JS (לא לופ אנימציה, לא ספריה חדשה).
אין שינוי בקובץ CSS: הכל מבוצע דרך `style.transition`/`style.transform` inline,
בדיוק כמו ש-`applyTransform()` הקיים כבר מגדיר את `transform` inline.

## Affected Files / Components
- **`src/components/PracticeNotebook.tsx`** — הקובץ היחיד שמשתנה. תוספות:
  קבועים חדשים (דמוי `PINCH_UNDO_WINDOW_MS` הקיים), refs חדשים, שינויים ב-
  `handlePointerDown`/`handlePointerMove`/`endPointer`, ופונקציות עזר חדשות
  (`triggerHoldZoom`, `animateTransformTo`). אין שינוי ב-props, ב-JSX
  המוצג, או בשום callback שההורה (`Practice.tsx`) מקבל. **סבב ב׳: שינוי יחיד
  בקובץ הזה — ערך `HOLD_ZOOM_FACTOR` והתיעוד לצידו (ראו למטה); שום דבר אחר
  בקובץ לא זז.**
- **`src/data/notebook.ts`** — לא משתנה. `zoomAroundPoint`, `clampZoom`,
  ו-`PanZoom` נשארים כמו שהם ומשמשים ישירות — כולל בכיוון ההפוך (ראו "וידוא"
  למטה).
- **`src/App.css`** — **סבב ג׳: כן משתנה כעת** (בסבב א׳/ב׳ לא היה שינוי כאן).
  `.notebook-stage` ו-`.notebook-canvas` מקבלים דיכוי מפורש למחוות מגע-ממושך
  של הדפדפן/מערכת ההפעלה (`-webkit-touch-callout`, `user-select`) — ראו
  Technical Approach. ה-`transition`/`transform` עצמם עדיין נשארים inline
  בלבד, כמו קודם. **סבב ה׳:** נוספות מחלקות לשורת הבורר החדשה (ראו למטה).

### סבב ה׳ — קבצים נוספים שמשתנים
- **`src/data/notebook.ts`** — **משתנה לראשונה** (בכל הסבבים הקודמים נשאר
  כמו שהוא). נוסף מערך מסודר של דרגות העוצמה: מזהה, כיתוב עברי, ופקטור
  (`null` ל"כבוי"), פלוס מזהה ברירת המחדל. זה המקום הנכון כי זו הסקאלה של
  המחברת עצמה, לצד `MIN_ZOOM`/`MAX_ZOOM`/`INITIAL_ZOOM` ו-`zoomAroundPoint`
  שכבר יושבים שם — ולא ב-`preferences.ts`, שתפקידו אחסון ולא מתמטיקה.
- **`src/data/preferences.ts`** — נוסף שדה per-student שני לצד `readAloud`,
  עם קורא שמאמת את הערך השמור ומחזיר ברירת מחדל כשהוא חסר או לא מוכר.
- **`src/App.tsx`** — קורא את ההעדפה החדשה (בדיוק כמו `readAloudFor(student.id)`
  בשורה 292), מזרים אותה ל-`TopicPicker` (ערך + callback) ול-`Practice`
  (ערך בלבד). ה-tick הקיים שמכריח קריאה מחדש אחרי כתיבה (`setReadAloudTick`,
  שורה 156) משרת מעכשיו את שתי ההעדפות — ראו Technical Approach.
- **`src/components/TopicPicker.tsx`** — שורת ההגדרה השנייה (שישה כפתורים),
  מתחת לשורת ההקראה הקיימת, עם אותה אנטומיה ואותו כלל הסתרה כשה-props חסרים.
- **`src/components/Practice.tsx`** — prop חדש שעובר הלאה ל-`PracticeNotebook`,
  בלי שום לוגיקה משלו (בדיוק כמו `readAloud` שהוא כבר מעביר).

### סבב ו׳ — קבצים שמשתנים
- **`src/components/TopicPicker.tsx`** — הקובץ המרכזי בסבב הזה: נוסף כפתור
  `⚙️` ב-`grade-header`, נוסף `useState` יחיד למצב הדיאלוג, ושתי שורות
  ההגדרה הקיימות **עוברות מקום בתוך אותו קובץ** (מגוף המסך אל תוך הדיאלוג)
  — ה-JSX שלהן עצמו לא משתנה.
- **`src/App.css`** — מחלקות חדשות לדיאלוג ההגדרות, ושתי התאמות קטנות
  בשורות ההגדרה הקיימות (שכבר לא צריכות למרכז את עצמן בעמוד).
- **לא משתנים בכלל:** `src/data/notebook.ts`, `src/data/preferences.ts`,
  `src/App.tsx`, `src/components/Practice.tsx`, `src/components/PracticeNotebook.tsx`.
  זו לא הערת-אגב אלא הבדיקה שהסבב הזה הוא באמת שינוי מסך: ה-props שמגיעים
  ל-`TopicPicker` נשארים אותם ארבעה props, ולכן ל-`App.tsx` אין בכלל מה
  לדעת על הדיאלוג.

## Data / State Changes
אין שינוי טיפוסים, props, או מבנה נתונים חוצה-קבצים. כל התוספת היא refs
פנימיים חדשים ב-`PracticeNotebook.tsx` (לא `useState` — בדיוק כמו
`panZoomRef`/`toolRef` הקיימים, כדי לא לגרום ל-re-render על כל תזוזה/טיימר):

```ts
const holdZoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const holdZoomPointerId = useRef<number | null>(null);
const holdZoomDownPos = useRef<{ x: number; y: number } | null>(null);
/** null = לא במצב "מוזם-אין זמני". לא-null = הזום/מיקום שצריך לחזור אליו
 *  בהרמת האצבע — גם משמש כדגל "האם המגע הזה כרגע במצב מוזם-אין". */
const preHoldTransform = useRef<PanZoom | null>(null);
const transitionClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
```

קבועים חדשים, לצד `PINCH_UNDO_WINDOW_MS` הקיים:
```ts
const HOLD_ZOOM_DWELL_MS = 180;        // design.md: חלון "בלי תזוזה" לפני הפעלה
const HOLD_ZOOM_TRANSITION_MS = 120;   // design.md: משך התנועה המרוככת, בכניסה ובחזרה
const HOLD_ZOOM_FACTOR = 1.7;          // סבב ה׳: הקבוע הזה **נמחק** — הפקטור מגיע עכשיו כ-prop
const HOLD_ZOOM_MOVE_TOLERANCE_PX = 4; // לא בדיזיין — סף רעד/רעש חושי, ראו Risks
```

### סבב ה׳ — הדרגות, ההעדפה, וה-props
**`src/data/notebook.ts`** — מערך מסודר אחד, שהוא מקור האמת גם לסדר, גם
לכיתובים וגם לפקטורים:
```ts
export interface HoldZoomLevel { id: string; label: string; factor: number | null }
export const HOLD_ZOOM_LEVELS: HoldZoomLevel[] = [
  { id: "off",        label: "כבוי",      factor: null },
  { id: "veryLittle", label: "מעט מאוד",  factor: 1.09 },
  { id: "little",     label: "מעט",       factor: 1.15 },
  { id: "medium",     label: "בינוני",    factor: 1.25 },
  { id: "much",       label: "הרבה",      factor: 1.42 },
  { id: "veryMuch",   label: "הרבה מאוד", factor: 1.7  },
];
export const DEFAULT_HOLD_ZOOM_LEVEL = "veryMuch";
```
מערך אחד ולא שלוש מפות נפרדות (סדר/כיתובים/פקטורים) — שלוש מפות היו יכולות
להיפרד אחת מהשנייה בעריכה עתידית, ואז השורה בממשק והפקטור בפועל היו מתארים
דברים שונים.

**`src/data/preferences.ts`** — שדה שני, באותו דפוס של `readAloud`:
```ts
interface Preferences {
  readAloud?: Record<string, boolean>;
  holdZoomLevel?: Record<string, string>;   // student id → HoldZoomLevel["id"]
}
```
הקורא מאמת מול `HOLD_ZOOM_LEVELS` ומחזיר `DEFAULT_HOLD_ZOOM_LEVEL` אם הערך
חסר או לא מוכר; הכותב שומר מזהה.

**שרשרת ה-props:**
- `App.tsx` → `TopicPicker`: `holdZoomLevel` (מזהה) + `onHoldZoomLevelChange`,
  שניהם אופציונליים בדיוק כמו `readAloud`/`onReadAloudChange`, ומועברים רק
  במסלול שבו יש תלמיד/ה.
- `App.tsx` → `Practice` → `PracticeNotebook`: `holdZoomFactor: number | null`
  — **הפקטור המוכן, לא המזהה.** המחברת לא צריכה לדעת שמות דרגות; `null`
  פירושו "כבוי" והבדיקה נעשית במקום אחד.

### סבב ו׳ — מצב "הדיאלוג פתוח"
**מחזיק: `TopicPicker` עצמו, ב-`useState` מקומי אחד.**
```ts
const [settingsOpen, setSettingsOpen] = useState(false);
```
(`TopicPicker` הוא היום רכיב בלי state בכלל, כך שזה ה-state הראשון בו.)

**למה לא ב-`App.tsx`:** המצב הזה זמני, לא נשמר, ואף אחד מחוץ ל-`TopicPicker`
לא צריך לדעת עליו — הכפתור והדיאלוג שניהם שלו. שתי ההגדרות עצמן כן ממשיכות
להגיע מ-`App.tsx`, בדיוק כמו היום, כי **הן** נשמרות ומשמשות גם את `Practice`.
ההבחנה היא בין ערך שנשמר (למעלה) לבין מצב תצוגה רגעי (למטה) — לא "הכל
באותו מקום".

**נקודה שחייבת להחזיק, והיא לא מובנת מאליה:** לחיצה על אפשרות בבורר קוראת
ל-`onHoldZoomLevelChange`, ש-`App.tsx` מממש כ-`setHoldZoomLevel(...)` +
`setPreferencesTick((n) => n + 1)` — כלומר **כל בחירה מפעילה render מחדש של
`App`**. הדיאלוג צריך להישאר פתוח אחרי בחירה (אין כפתור שמירה, והקריטריון
דורש שהפתיחה תציג את כל האפשרויות ואת הנבחרת). זה מחזיק כי `TopicPicker`
נשאר באותו מקום בעץ ובאותו טיפוס בין ה-renderים, ולכן React שומר את ה-state
המקומי שלו. **המסקנה המעשית:** אסור להוסיף ל-`<TopicPicker>` שב-`App.tsx`
`key` שמשתנה (למשל `key={preferencesTick}`) — זה היה מאפס את המצב וסוגר את
הדיאלוג בכל בחירה. נרשם כאן כי זה בדיוק סוג השינוי שנראה תמים בעריכה
עתידית.

## Technical Approach

### סבב ו׳: הכפתור, הדיאלוג, ושתי השורות שעוברות

**1. שני דגלי ההצגה הקיימים נשארים כמו שהם, ונוסף שלישי מעליהם.**
`showReadAloud` (props קיימים + `speechSupported()`) ו-`showHoldZoom` (props
קיימים) לא משתנים באות אחת — הם פשוט עוברים לשמש כתנאי לשורות **בתוך**
הדיאלוג. מעליהם:
```ts
const showSettings = showReadAloud || showHoldZoom;
```
`showSettings` הוא מה שקובע אם כפתור `⚙️` מוצג בכלל. בפועל היום
`showHoldZoom` מתקיים בכל מקום שבו יש תלמיד/ה, כך שזה שווה-ערך לו — אבל
הביטוי כ-OR הוא האינווריאנטה שהעיצוב דורש במפורש ("הכפתור לעולם לא מוביל
לדיאלוג ריק"), והוא יישאר נכון גם אם בעתיד הבורר יקבל תנאי הצגה משלו.

**2. הכפתור: ב-`grade-header`, אחרי ה-`<span className="greeting">`.**
`.grade-header` הוא `display: flex; justify-content: space-between` עם שני
ילדים (הכפתור "← חזרה" ו-`greeting`). הוספת ילד שלישי ב-RTL מציבה אותו
בקצה השמאלי — כלומר בקצה הנגדי ל"← חזרה", בדיוק כמו שהעיצוב דורש — **בלי
שום שינוי ב-CSS של `.grade-header`**. הכפתור: `type="button"`,
`aria-label="הגדרות"`, תוכן `<span aria-hidden="true">⚙️</span>`,
`onClick={() => setSettingsOpen(true)}`. הדפוס הזה (אייקון ב-`span` עם
`aria-hidden` + `aria-label` על הכפתור) הוא בדיוק מה ש-`lesson-link` באותו
קובץ עושה היום.

**3. הדיאלוג: JSX inline ב-`TopicPicker.tsx`, לא רכיב חדש.**
מרונדר בסוף ה-JSX של `TopicPicker` (אחרי `.topic-grid`), מותנה ב-
`settingsOpen && showSettings`, על אנטומיית דיאלוג האישור הקיים: `div` רקע
ממורכז עם `position: fixed; inset: 0`, ובתוכו כרטיס.
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` שמצביע ל-`id`
  של הכותרת (`<h2 id="settings-title">הגדרות</h2>`). `dialog` ולא
  `alertdialog` — אין כאן אזהרה (הכרעת עיצוב).
- סגירה ברקע: `onClick` על הרקע שקורא `setSettingsOpen(false)`, ועל הכרטיס
  `onClick={(e) => e.stopPropagation()}` כדי שלחיצה בתוכו לא תסגור. (לא
  בדיקת `e.target === e.currentTarget` — `stopPropagation` על הכרטיס עובד גם
  כשהלחיצה נופלת על ילד עמוק, וזה המצב הרגיל כאן.)
- כפתור `סגירה` בתחתית, `className="secondary"` — אותה מחלקה שכפתור
  "ביטול" בדיאלוג הקיים משתמש בה.
- בתוכו, בסדר הזה: שורת ההקראה (אם `showReadAloud`) ואחריה שורת הבורר (אם
  `showHoldZoom`) — **אותו JSX בדיוק** שיושב היום בגוף המסך, מועבר כמו שהוא
  בלי שינוי מחרוזות, מחלקות או התנהגות.

**למה inline ולא `SettingsDialog.tsx` חדש:** התקדים היחיד לדיאלוג בפרויקט
(`PracticeNotebook.tsx`, שורות 790–811) הוא inline, כלומר אין רכיב דיאלוג
משותף שאפשר לצרוך. רכיב משותף חדש עם שני צרכנים שהאנטומיה שלהם שונה (זה
`alertdialog` עם שני כפתורי פעולה, זה `dialog` עם תוכן הגדרות) היה מתחיל
כהפשטה שרוב ה-props שלה אומרים "תהיה שונה" — וגם היה מפריד את שתי שורות
ההגדרה מהדגלים שקובעים אם להציג אותן, שיושבים ב-`TopicPicker` לפי ה-props
שהוא מקבל. **התנאי שיהפוך את זה להחלטה אחרת, במפורש:** נקודת כניסה שנייה
להגדרות (ממסך אחר), או דיאלוג שלישי בפרויקט — אז יש הפשטה עם צרכנים
אמיתיים. `TopicPicker.tsx` גדל בעקבות זה מ-`158` לכ-`200` שורות, בעוד
`PracticeNotebook.tsx` מחזיק `814` — כלומר זה לא הקובץ שהגודל שלו הוא
הבעיה כאן.

**4. CSS: מחלקות חדשות משלהן, עם אותה אנטומיה.**
- `.settings-backdrop` / `.settings-dialog` — חדשות, מועתקות בערכיהן מ-
  `.notebook-confirm-backdrop`/`.notebook-confirm-dialog` (רקע
  `rgba(0, 0, 0, 0.35)`, `position: fixed; inset: 0`, `z-index: 31`, מרכוז
  flex, כרטיס עם `border-radius: 14px`, `padding`, `var(--shadow)`). **לא
  שימוש חוזר ישיר במחלקות הקיימות:** שם שמתחיל ב-`notebook-confirm-` על
  דיאלוג במסך הנושאים הוא שקר לקורא הבא, והצמדת שני דיאלוגים שונים לאותה
  מחלקה מבטיחה שכל כיוונון עתידי של אחד יזיז גם את השני. שני הבדלים
  מכוונים בערכים: `max-width: 420px` (ולא `360px`) כי שש האפשרויות צריכות
  את הרוחב שהבורר כבר תוכנן אליו, ו-`max-height: 90vh` + `overflow-y: auto`
  כדי שהדיאלוג לא ייחתך על מסך נמוך.
- `.settings-title` לכותרת, `.settings-body` (`display: flex;
  flex-direction: column; gap: 12px`) שמערים את שתי השורות, ו-
  `.settings-actions` לכפתור הסגירה.
- **שתי השורות הקיימות:** `.read-aloud-setting` ו-`.hold-zoom-setting`
  מאבדות את `max-width: 420px` ואת `margin: 0 auto 20px` — שתי התכונות האלה
  קיימות רק כדי למרכז אותן בעמוד, וכשהן בתוך דיאלוג ברוחב קבוע הן מיותרות
  (ומזיקות: ה-`margin-bottom` היה יוצר רווח כפול מול ה-`gap` של
  `.settings-body`). כל השאר בהן — המסגרת, הרדיוס, הרקע, `text-align: right`,
  וכל מחלקות הבן (`.hold-zoom-options`, `.hold-zoom-option`,
  `.read-aloud-switch`…) — לא נוגעים. **לא מוסיפים override של
  `.settings-dialog .read-aloud-setting`:** אחרי הסבב הזה אין יותר אף שימוש
  בשורות האלה מחוץ לדיאלוג, ולכן עדיף לתקן את הכלל עצמו מלהשאיר בו תכונות
  מתות שכלל אחר מבטל.

**5. מקלדת ומיקוד: במפורש לא מוסיפים.** אין `Escape`, אין העברת מיקוד
לדיאלוג בפתיחה, ואין focus trap. הנימוק: התקדים היחיד בפרויקט
(`.notebook-confirm-dialog`) לא עושה אף אחד מהשלושה, וקהל היעד של המסך הזה
הוא מבוגר על אותו מכשיר מגע שהאפליקציה כולה נועדה אליו — כלומר היינו
מוסיפים קונבנציית מקלדת שאין לה צרכן, ובמקביל יוצרים שני דיאלוגים שמתנהגים
שונה. **זה פער מתועד ולא השמטה:** אם יוחלט שדיאלוגים בפרויקט תופסים מיקוד
ונסגרים ב-`Escape`, זה שינוי שצריך להיעשות לשני הדיאלוגים בבת אחת, לא רק
לזה שנכתב אחרון. מה שכן מתקבל בלי עבודה נוספת: הכפתור, האפשרויות והסגירה
כולם `<button>` אמיתיים, ולכן נגישים ב-`Tab` וב-`Enter`/רווח.

### סבב ה׳: מהעדפה שמורה אל פקטור חי

**למה נשמר מזהה דרגה ולא הפקטור המספרי.** העוצמה כבר כוונה פעמיים
(`30%` → `70%`), ו-design.md אומר במפורש שהתקרה עשויה לזוז שוב. אם נשמר
`1.42` ואז הסקאלה משתנה, הערך השמור הוא יתום: הוא כבר לא אף דרגה, אף כפתור
לא ייראה מסומן, ונצטרך להמציא לוגיקת "הדרגה הקרובה ביותר". מזהה (`"much"`)
שומר על מה שהמשתמש **התכוון** אליו — "השנייה מלמעלה" — גם אחרי כיוונון
הסקאלה, וזה גם מה שהממשק באמת הוא: רשימה סגורה של אפשרויות מסומנות, לא מספר.
בונוס: "כבוי" הוא פשוט עוד מזהה, כך ששדה אחד מכסה את כל שש המצבים ואין צורך
בבוליאני נפרד לצד המספר.

**קריאה מחדש אחרי כתיבה (ה-tick).** `App.tsx` לא מחזיק את ההעדפות ב-state
אלא קורא אותן מהאחסון בכל render, ומכריח render אחרי כתיבה דרך
`setReadAloudTick` (שורה 156). מעכשיו יש שתי העדפות שצריכות בדיוק את זה, אז
ה-tick משנה שם ל-`setPreferencesTick` (והערה מעליו מתעדכנת), ושתי הפונקציות
`onReadAloudChange`/`onHoldZoomLevelChange` מקדמות אותו. שינוי שם של שלוש
שורות, ולא tick שני זהה — tick בשם "readAloud" שמקודם בשינוי הזום הוא שם
שמשקר.

**הפקטור חייב להיקרא מ-ref, לא מה-prop, בתוך הטיימר.** `triggerHoldZoom` רץ
בתוך `setTimeout` שנקבע ב-pointerdown; closure שקורא את ה-prop ישירות יתפוס
ערך ישן. הדפוס כבר קיים בקובץ בדיוק בשביל זה — `lockedRef`/`toolRef`
מתעדכנים ב-`useEffect` קטן ונקראים בזמן האירוע. מוסיפים באותה צורה:
```ts
const holdZoomFactorRef = useRef(holdZoomFactor);
useEffect(() => { holdZoomFactorRef.current = holdZoomFactor; }, [holdZoomFactor]);
```
זה גם מה שמקיים את הקריטריון "השינוי נכנס לתוקף מיד": ההחזקה הבאה קוראת את
הערך העדכני בלי שום איפוס/רענון.

**"כבוי" = לא זורעים טיימר בכלל.** ב-`handlePointerDown`, ענף
`activePointers.current.size === 1`, ההפעלה (arm) מתבצעת רק אם
`holdZoomFactorRef.current !== null`. כשהוא `null`: לא נקבע `setTimeout`, לא
נכתבים `holdZoomPointerId`/`holdZoomDownPos`, אין אנימציה, אין `transition`,
ואין מה לנקות אחר כך — כלומר המחווה באמת לא קיימת, לא "קיימת עם פקטור 1".
ב-`triggerHoldZoom` נשארת בדיקת `null` הגנתית (הערך יכול היה להתחלף בין
הזריעה לירייה), ומחוץ לזה הפונקציה משתמשת ב-`holdZoomFactorRef.current`
במקום בקבוע שנמחק.

**מה ממשיך לעבוד בדיוק כמו היום, בכל הדרגות וגם ב"כבוי":** ציור ומחיקה,
כלי "הזזה", זום-שתי-אצבעות (pinch) ו-`undoRecording` שלו, כפתורי הזום
והמיני-מפה, `onContextMenu` preventDefault, ודיכוי ה-callout/הבחירה ב-CSS
שנוסף בסבב ג׳. שימו לב במיוחד לאחרון: הוא **לא** מותנה בהגדרה — הוא מגן גם
על כתיבה רגילה מהפרעות מגע-ממושך של הדפדפן, ולהתנות אותו היה מוסיף סיבוך
בלי תועלת.

**CSS (`src/App.css`).** שלוש מחלקות חדשות, בלי לגעת בקיימות:
`.hold-zoom-setting` — אותו "ארגז הגדרה" כמו `.read-aloud-setting` (מסגרת,
רקע `--code-bg`, יישור לימין, אותו מרווח), אבל בפריסת עמודה: גוש
האייקון+כותרת+הערה למעלה, ושורת הכפתורים מתחתיו — כי שישה כפתורים לא
נכנסים לצד הטקסט ברוחב טלפון. `.hold-zoom-options` — `display:flex` עם
`flex-wrap: wrap` ו-`gap` (**wrap ולא `overflow-x`** — דרישת העיצוב, ובדיוק
הכשל שסרגל המחברת סובל ממנו). `.hold-zoom-option` — הכפתור עצמו, ומצב נבחר
דרך `[aria-pressed="true"]` עם `--accent-bg`/`--text-h`, בדיוק כמו
`.tool-btn[aria-pressed=true]` ו-`.notebook-zoom-controls button[aria-pressed=true]`
שכבר קיימים.

### תיקון סבב ג׳: דיכוי מחוות מגע-ממושך מתנגשות, ב-CSS ובקנבס
שתי תוספות, שתיהן הגנתיות (לא נוגעות במכונת המצבים הקיימת):

**1. `src/App.css` — דיכוי callout/בחירה על משטח הכתיבה:**
```css
.notebook-stage,
.notebook-canvas {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}
```
נוסף לצד ה-`touch-action: none` הקיים בשני הסלקטורים האלה (לא מחליף אותו —
`touch-action` מונע גלילה/זום-דפדפן, זה כאן מונע callout/הדגשת-טקסט, שני
דיכויים נפרדים). הקובץ הזה כבר כותב ערכי `-webkit-` ידנית במקום אחר
(`-webkit-overflow-scrolling` בכלל אחר) — לא מסתמכים על autoprefixing.

**2. `src/components/PracticeNotebook.tsx` — מניעת תפריט-הקשר על ה-canvas:**
```tsx
<canvas
  ...
  onContextMenu={(e) => e.preventDefault()}
  onPointerDown={handlePointerDown}
  ...
/>
```
דפדפני Android מסוימים מציגים תפריט-הקשר (context menu) על מגע-ממושך גם
כש-`touch-action: none` פעיל — ה-CSS למעלה לא בהכרח מכבה את זה. `preventDefault`
על `contextmenu` הוא התיקון הסטנדרטי לזה באפליקציות ציור מבוססות-קנבס.

**חשוב:** אף אחת מהתוספות האלה **לא נוגעת** בלוגיקת `handlePointerDown`/
`handlePointerMove`/`endPointer`/`triggerHoldZoom`/`animateTransformTo` —
מכונת המצבים שסבב א׳/ב׳ בנו נשארת בדיוק כמו שהיא. זה תיקון בשכבה שמתחת —
מונע מהדפדפן להתערב *לפני* שהאירועים שלנו מגיעים לקוד, לא שינוי באיך שהקוד
מטפל בהם.

**לא ניתן לאמת אוטומטית:** אין ל-Playwright דרך לדמות שכבת המחוות-הטבעיות
של דפדפן מגע אמיתי (בדיוק כמו שאין בדיקה לזום-שתי-אצבעות) — התיקון הזה
מאומת מול תיאור המשתמש ("מסך מגע, אצבע", דיווח על התנהגות בפועל), לא מול
בדיקה חדשה. אם הבעיה חוזרת אחרי התיקון, זה סימן שיש עוד מקור למחווה
מתנגשת שלא זוהה כאן — לא שהתיקון "לא עבד באופן חלקי".

### וידוא: `zoomAroundPoint` עם `factor > 1` (סבב ב׳)
`src/data/notebook.ts`:
```ts
export function zoomAroundPoint(current: PanZoom, screenX: number, screenY: number, factor: number): PanZoom {
  const newZoom = clampZoom(current.zoom * factor);
  const actualFactor = newZoom / current.zoom;
  return {
    zoom: newZoom,
    panX: screenX - actualFactor * (screenX - current.panX),
    panY: screenY - actualFactor * (screenY - current.panY),
  };
}
```
זו כפל טהור בלי הנחת כיוון — `current.zoom * factor` גדל עבור `factor > 1`
בדיוק כמו שהוא קטן עבור `factor < 1`, ו-`actualFactor` (המשמש לתיקון ה-pan
כך שנקודת העיגון נשארת קבועה על המסך) נגזר מהיחס בין הזום החדש לישן —
סימטרי לשני הכיוונים. **אין שינוי נדרש בפונקציה הזו.** ההבדל היחיד בין
`factor=0.7` ל-`factor=1.3` הוא איזה גבול `clampZoom` עשוי לפגוע בו קודם
(`MIN_ZOOM` מול `MAX_ZOOM`) — ראו Edge Cases.

### עיקרון מפתח: `panZoomRef` הוא מקור האמת, ה-CSS transition הוא קוסמטי בלבד
`panZoomRef.current` מתעדכן תמיד **באופן סינכרוני ומיידי** לערך הסופי הנכון
(בדיוק כמו היום) — ה-`transition` שמתווסף הוא רק שכבת החלקה חזותית מעל
`applyTransform()`, לא מנגנון state נפרד. המשמעות: קריאה ל-`preHoldTransform.current`
בכל רגע נתון (אפילו באמצע אנימציה חזותית) מחזירה ערך נכון, ואין race בין
"מה ה-CSS מציג עכשיו" ל"מה הזום *באמת* צריך להיות".

### מנגנון האנימציה: הפעלה/כיבוי ידני של `style.transition`, לא לופ JS
```ts
function animateTransformTo(target: PanZoom, ms: number) {
  if (stackRef.current) stackRef.current.style.transition = `transform ${ms}ms ease`;
  panZoomRef.current = target;
  applyTransform();
  if (transitionClearTimer.current) clearTimeout(transitionClearTimer.current);
  transitionClearTimer.current = setTimeout(() => {
    if (stackRef.current) stackRef.current.style.transition = "";
  }, ms);
}
```
נבחר CSS transition על JS-driven animation loop (rAF) כי כל מה שצריך הוא
"קפיצה חד-פעמית עם ease, פעמיים" (כניסה, חזרה) — לא אנימציה שממשיכה להגיב
לקלט בזמן שהיא רצה. הדפדפן כבר עושה easing חלק וזול יותר מלופ ידני, וזה
משתלב בטבעיות עם `applyTransform()` הקיים ש-*כבר* קובע `transform` ב-inline
style — כל מה שמתווסף הוא הפעלה/כיבוי של `transition` לצידו. `style.transition = ""`
(לא `"none"`) כדי לחזור בדיוק למצב המקורי של האלמנט (בלי `transition` מוגדר
בכלל), לא להשאיר ערך מפורש שיצטרך טיפול נפרד.

**הכיבוי לא קשור לטיימר-שהושלם — הוא קשור לתזוזה בפועל:** אם pointermove
אמיתי (המשך כתיבה/הזזה) מגיע לפני שחלפו `HOLD_ZOOM_TRANSITION_MS` מרגע
ההפעלה, מבטלים את ה-timeout הקיים (`transitionClearTimer`) ומכבים את
ה-transition **באופן מיידי, סינכרונית, לפני** עדכון ה-transform הבא
(`applyTransform()` של אותה תזוזה) — אחרת התזוזה הבאה (ציור/הזזה) הייתה
עוברת דרך ה-transition שנשאר דלוק ומרגישה "עם lag" ביחס לאצבע, מה שהופך
כתיבה/הזזה רגילה לפחות מדויקת. זה קורה בטבעיות כי `endPointer`/`handlePointerMove`
כבר קוראים ל-`applyTransform()` ישירות עבור פאן/pinch — צריך רק לוודא
שקריאה כזו תמיד "מנקה" `style.transition` קודם אם הוא עדיין דלוק מ-hold-zoom.
מומש כפונקציית עזר קטנה `clearTransition()` שנקראת גם מ-`handlePointerMove`
(ראו למטה) וגם בכל מקום שממשיך תזוזה רגילה.

### הפעלה: `handlePointerDown`, בתוך `activePointers.current.size === 1`
בדיוק לצד הלוגיקה הקיימת (התחלת ציור/פאן) — לא מחליף אותה, לא תלוי בכלי
הנבחר. בסוף הבלוק הקיים:
```ts
holdZoomPointerId.current = e.pointerId;
holdZoomDownPos.current = { x: e.clientX, y: e.clientY };
if (holdZoomTimer.current) clearTimeout(holdZoomTimer.current);
holdZoomTimer.current = setTimeout(() => triggerHoldZoom(e.pointerId), HOLD_ZOOM_DWELL_MS);
```

### ביטול על תזוזה: `handlePointerMove`, לפני הלוגיקה הקיימת
```ts
if (holdZoomPointerId.current === e.pointerId && holdZoomTimer.current && holdZoomDownPos.current) {
  const moved = Math.hypot(e.clientX - holdZoomDownPos.current.x, e.clientY - holdZoomDownPos.current.y);
  if (moved > HOLD_ZOOM_MOVE_TOLERANCE_PX) {
    clearTimeout(holdZoomTimer.current);
    holdZoomTimer.current = null;
  }
}
```
זה רץ בנוסף ללוגיקה הקיימת של `handlePointerMove` (ציור/פאן/pinch) — לא
מחליף אותה. אם המגע הזה כבר במצב מוזם-אין (`preHoldTransform.current`
לא-null), הבדיקה הזו לא רלוונטית יותר (`holdZoomTimer.current` כבר `null`
כי הטיימר כבר *הופעל*, לא בוטל) — הזרימה הרגילה (ציור/פאן) ממשיכה על
התצוגה המוזמת-אין בלי שום קוד נוסף.

### ההפעלה בפועל: `triggerHoldZoom`
```ts
function triggerHoldZoom(pointerId: number) {
  holdZoomTimer.current = null;
  if (holdZoomPointerId.current !== pointerId) return;       // בוטל/עבר pinch בינתיים
  if (activePointers.current.size !== 1) return;              // הגנה כפולה
  const down = holdZoomDownPos.current;
  if (!down || !stageRef.current) return;
  const stageRect = stageRef.current.getBoundingClientRect();
  preHoldTransform.current = { ...panZoomRef.current };
  const target = zoomAroundPoint(panZoomRef.current, down.x - stageRect.left, down.y - stageRect.top, HOLD_ZOOM_FACTOR);
  animateTransformTo(target, HOLD_ZOOM_TRANSITION_MS);
}
```
**שים לב:** `zoomAroundPoint` מצפה לקואורדינטות יחסיות ל-`.notebook-stage`
(כמו ב-`handleWheel`/`zoomButton` הקיימים — `clientX/Y - stageRect.left/top`),
**לא** לקואורדינטות-דף כמו שמחזיר `localPoint()` (ששימושי לציור, לא לזום).
זו טעות קלה לעשות בהעתקה — `localPoint()` מחלק גם ב-scale, שזה לא מה ש-
`zoomAroundPoint` מצפה לו. **זה הופך משמעותי יותר בהתקרבות** (ראו design.md,
"מה שונה במיוחד עבור מיקה") — נקודת העיגון היא מה ששומר שהמגע לא "בורח" עם
הזום; קואורדינטה שגויה כאן לא רק תזיז את הדף, אלא תגרום למה שנכתב רגע קודם
לצאת מהתצוגה בלי שום סיבה טובה.

### חזרה: `endPointer`, בתחילת הפונקציה (לפני הלוגיקה הקיימת)
```ts
if (holdZoomPointerId.current === e.pointerId) {
  if (holdZoomTimer.current) { clearTimeout(holdZoomTimer.current); holdZoomTimer.current = null; }
  if (preHoldTransform.current) {
    animateTransformTo(preHoldTransform.current, HOLD_ZOOM_TRANSITION_MS);
    preHoldTransform.current = null;
  }
  holdZoomPointerId.current = null;
  holdZoomDownPos.current = null;
}
```
`endPointer` הוא כבר הפונקציה המשותפת ל-`onPointerUp` **וגם** `onPointerCancel`
(ראו ה-JSX הקיים) — כך ששני האירועים מטופלים בלי קוד נוסף.

### מגע שני (pinch): `handlePointerDown`, תחילת ענף `activePointers.current.size === 2`
```ts
if (holdZoomTimer.current) { clearTimeout(holdZoomTimer.current); holdZoomTimer.current = null; }
preHoldTransform.current = null;   // ויתור מכוון על שיקום — אין "חזרה" אחרי pinch
holdZoomPointerId.current = null;
holdZoomDownPos.current = null;
```
לא נדרשת "קפיצה" נוספת של התצוגה כאן: אם ה-hold-zoom כבר הופעל
(`preHoldTransform.current` לא-null לפני האיפוס), `panZoomRef.current` כבר
מכיל את הערך המוזם-אין הסופי (עודכן סינכרונית ב-`triggerHoldZoom`) —
ה-pinch ממשיך פשוט מהזום הנוכחי, בלי חשבון נפרד. זו הפרשנות הישירה של
design.md, שלב 5: "מבטל... לחלוטין... בלי חזרה לאחר סיום ה-pinch."

### ניקוי ב-unmount
טיימר בודד יכול לחכות ברקע אם הרכיב מתפרק תוך כדי (למשל ניווט בין מסכים
תוך כדי מגע). מוסיפים effect קטן:
```ts
useEffect(() => {
  return () => {
    if (holdZoomTimer.current) clearTimeout(holdZoomTimer.current);
    if (transitionClearTimer.current) clearTimeout(transitionClearTimer.current);
  };
}, []);
```

## Edge Cases
- **מחוות מגע-ממושך מתנגשות של הדפדפן/המערכת (סבב ג׳, אושר בדיווח אמיתי
  ממכשיר מגע):** חלון ההמתנה (`~180ms`) חופף לטווח שבו דפדפן מגע (iOS/Android)
  יכול להפעיל בעצמו callout/הדגשת-טקסט/תפריט-הקשר על מגע-ממושך, גם עם
  `touch-action: none`. כשזה קורה, הדפדפן שולח `pointercancel` שמפעיל את
  לוגיקת השחזור שלנו (`endPointer`) בטעות — בדיוק מרגיש כמו "הזום קרס
  באמצע הכתיבה". תוקן ב-CSS (`-webkit-touch-callout`/`user-select: none`
  על `.notebook-stage`/`.notebook-canvas`) ו-`onContextMenu` preventDefault
  על ה-canvas — ראו Technical Approach. זה לא היה רלוונטי לפני הפיצ'ר הזה
  (שום דבר קודם לא דרש מגע-ללא-תזוזה ממושך תחת אצבע אמיתית).
- **רעד/רעש חושי בהחזקה:** אצבע/עט לעולם לא נשארים ב-100% אותה נקודת פיקסל.
  `HOLD_ZOOM_MOVE_TOLERANCE_PX` (4px, לא הוזכר ב-design.md) קיים בדיוק בשביל
  זה — בלי סף כלשהו, כל רעד חושי היה מבטל את הטיימר תמיד ומונע מהמחווה
  להיפעל אף פעם. ניתן לכוונן.
- **`locked` משתנה תוך כדי מגע:** לא רלוונטי לזרימה הזו בכלל — הלוגיקה
  החדשה לא קוראת ל-`lockedRef` בשום מקום (בדיוק כמו שדרש design.md: "לא
  תלוי בנעילת הדף"). נעילה עדיין חוסמת ציור חדש בדיוק כמו היום, בנפרד
  לגמרי מהמחווה הזו.
- **שינוי דף (`currentPageIndex`) תוך כדי מגע מוזם-אין:** תיאורטי (מחייב
  שני מגעים נפרדים בו-זמנית — אחד מחזיק על הקנבס, אחד מקליק על ◀▶) ולא
  נפתר כאן — אבל זה זהה בדיוק להתנהגות הקיימת היום (זום/פאן לא מתאפסים
  ב-`useEffect` שרץ על שינוי `currentPage`, ראו השורות שמאתחלות רק
  `viewingWholePage`/`savedTransform`). לא סיכון חדש שהפיצ'ר הזה מכניס.
- **גבול הזום העליון (`MAX_ZOOM = 2.5`) — סבב ב׳, הגבול הרלוונטי התחלף
  מ-`MIN_ZOOM`; סבב ד׳ מקרב אליו:** בגרסת ההתרחקות (`factor=0.7`) הגבול
  הרלוונטי היה `MIN_ZOOM` (זום כבר נמוך). בהתקרבות הגבול הרלוונטי הוא
  **`MAX_ZOOM`**: אם התלמיד/ה כבר התקרב/ה ידנית לזום גבוה (כפתור `+` חוזר,
  או pinch) לפני שמפעילים hold-zoom, `zoomAroundPoint` (שכבר עושה
  `clampZoom`) עשוי להחזיר שינוי קטן מאוד או אפסי בפועל — זהה בדיוק
  להתנהגות כפתור `+`/pinch הקיימים באותו מצב.
  **מקרה הבסיס (מזום הפתיחה) לא השתנה בסבב ד׳:** זום פתיחה `70%`,
  `MAX_ZOOM=2.5` (`250%`) — מרחק של פי `3.57` מזום הפתיחה, בין אם הפקטור
  `1.3` או `1.7`; שניהם קטנים בהרבה מ-`3.57`, כך שמזום הפתיחה עצמו הגבול
  עדיין רחוק ולא רלוונטי בפועל.
  **מה כן השתנה:** הסף שבו זום-ידני-מראש מתחיל "להיחתך" ע"י `clampZoom`.
  בפקטור `1.3`, זה קורה כשהזום הקיים לפני ההחזקה עובר `250%/1.3 ≈ 192%`.
  בפקטור `1.7` (סבב ד׳) זה קורה כבר מ-`250%/1.7 ≈ 147%` — טווח זום ידני
  אמיתי (בין `MIN_ZOOM=15%` ל-`MAX_ZOOM=250%`), לא תיאורטי. תלמיד/ה שכבר
  התקרב/ה ידנית מעבר ל-`147%` יקבל/תקבל התקרבות-החזקה חלקית (פחות מהפקטור
  המלא) במקום המלאה — עדיין לא שבור (עדיין קורה *משהו*, לא כלום), רק פחות
  מורגש. לא דורש טיפול מיוחד — התנהגות זהה לכפתור `+`/pinch באותו מצב —
  אבל שווה תיעוד ל-QA כמקרה נפרד אם רוצים כיסוי מלא, לא חובה.
  **עדכון סבב ה׳ — כבר לא פקטור אחד:** הסף תלוי עכשיו בדרגה שנבחרה, ורק
  העליונה קרובה אליו בפועל: `250/1.09 ≈ 229%`, `250/1.15 ≈ 217%`,
  `250/1.25 = 200%`, `250/1.42 ≈ 176%`, `250/1.70 ≈ 147%`. כלומר ככל
  שהדרגה חלשה יותר, החיתוך רחוק יותר — והמקרה היחיד שכדאי לזכור הוא
  `הרבה מאוד` (ברירת המחדל), שנשאר בדיוק כמו שתואר למעלה.

### Edge Cases חדשים — סבב ה׳ (הבורר)
- **ערך שמור לא מוכר** (סקאלה שהשתנתה בעתיד, או `localStorage` שנערך ביד):
  הקורא ב-`preferences.ts` מאמת מול `HOLD_ZOOM_LEVELS` ומחזיר את ברירת
  המחדל כשאין התאמה — לא זורק, ולא מחזיר `undefined` שיגלוש הלאה. זו בדיוק
  הסיבה שנשמר מזהה ולא מספר (ראו Technical Approach): מזהה אפשר לאמת מול
  רשימה סגורה, מספר שרירותי לא.
- **אין מה להגר:** הפיצ'ר מעולם לא הגיע לאתר החי, כך שאין ולו מכשיר אחד
  עם ערך שמור מסבב קודם. אין צורך בקוד מיגרציה.
- **שינוי ההגדרה בזמן שהחזקה פעילה:** לא אפשרי בפועל (הבורר יושב במסך אחר;
  אי אפשר להחזיק את הקנבס ובו-זמנית ללחוץ במסך הנושאים), אבל ההתנהגות
  מוגדרת בכל זאת: ה-ref יתעדכן ב-render הבא, ההחזקה שכבר בתהליך תשלים את
  עצמה עם הפקטור שכבר חושב, וההרמה תשחזר את ה-transform השמור כרגיל.
  **במפורש: לא מוסיפים ביטול-באמצע-מחווה** — אין לזה תרחיש אמיתי, והוא היה
  מוסיף מסלול יציאה נוסף למכונת מצבים שכבר יש לה כמה.
- **מעבר בין תלמידים:** הערך מגיע כ-prop שנגזר מ-`student.id`, כך שהחלפת
  תלמיד/ה מזרימה פקטור אחר; ה-`useEffect` שמסנכרן את ה-ref רץ על שינוי
  ה-prop, ולכן ההחזקה הבאה כבר משתמשת בערך של התלמיד/ה החדש/ה.
- **"כבוי" ומצב נעילה/כלי:** הקריטריון "לא תלוי בכלי/בנעילה" נשאר נכון
  בתוך כל דרגה פעילה; "כבוי" מבטל את המחווה עבור כולם באופן אחיד — הוא לא
  הופך אותה לתלוית-כלי, הוא פשוט מסיר אותה.
- **מגע שני שמגיע *אחרי* שהטיימר כבר נורה אבל *לפני* שהאנימציה הסתיימה
  חזותית:** `panZoomRef.current` כבר מעודכן לערך הסופי (הלוגיקה סינכרונית),
  כך שאין חשיבות אם ה-CSS transition עדיין "בדרך" חזותית — ה-pinch שמתחיל
  קורא ל-`panZoomRef.current` הנוכחי ומקבל את הערך הנכון בכל מקרה.
- **מגע חדש (pointerdown) שמתחיל בזמן שהאנימציה של *חזרה* ממגע קודם עדיין
  רצה חזותית:** לא בעיה — `panZoomRef.current` כבר שווה לערך הסופי (הקודם),
  אז ה-snapshot של `preHoldTransform` למגע החדש (אם הוא בעצמו יפעיל hold-zoom)
  יהיה נכון, לא "תפוס באמצע אנימציה".

### Edge Cases חדשים — סבב ו׳ (כפתור ההגדרות)
- **בחירה בדיאלוג מפעילה render של `App` — והדיאלוג צריך להישאר פתוח:**
  ראו Data / State Changes, "נקודה שחייבת להחזיק". מחזיק בזכות state מקומי
  ומקום יציב בעץ; נשבר רק אם יוסיפו `key` משתנה ל-`<TopicPicker>`.
- **מעבר תלמיד/ה בזמן שהדיאלוג פתוח:** לא אפשרי. הדרך היחידה להחליף
  תלמיד/ה מהמסך הזה היא "← חזרה", שיושב מתחת לרקע החוסם — לחיצה עליו
  תיפול על הרקע ותסגור את הדיאלוג במקום להחליף מסך. לכן **אין** `useEffect`
  שמאפס את `settingsOpen` על שינוי תלמיד/ה: אין מסלול שמגיע לשם.
- **מסך שמתחלף מסיבה אחרת (בחירת נושא, "ההתקדמות שלי") בזמן שהדיאלוג
  פתוח:** חסום מאותה סיבה, אבל אם בכל זאת יקרה — `TopicPicker` יוסר מהעץ
  וה-state המקומי שלו איתו, כך שבחזרה למסך הנושאים הדיאלוג סגור. זו
  ההתנהגות הרצויה, והיא מתקבלת בחינם דווקא בגלל שה-state מקומי.
- **`showSettings === false`** (המסלול השני של `TopicPicker` ב-`App.tsx`,
  שורה 442, שלא מקבל את props ההגדרות): אין כפתור `⚙️` בכלל, ובלי הכפתור
  אין דרך להגיע לדיאלוג. זהה למה שקורה שם היום עם שורת ההקראה — כלומר לא
  רגרסיה שהסבב הזה מכניס. `settingsOpen && showSettings` בתנאי הרינדור הוא
  חגורה שנייה: גם אם משהו יפתח את המצב, לא ייווצר דיאלוג ריק.
- **אין קול במכשיר** (`speechSupported() === false`): `showReadAloud` שקרי,
  הדיאלוג מציג את הבורר בלבד, והכפתור עדיין מוצג — כי `showHoldZoom`
  מתקיים. אין מצב שבו הדיאלוג נפתח ריק.
- **לחיצה בתוך הכרטיס שלא על פקד** (למשל על ה-`padding` שלו):
  `stopPropagation` על הכרטיס תופס אותה — הדיאלוג לא נסגר.
- **הבדיקות מסבב ה׳ ניגשות לבורר ישירות** (`.hold-zoom-option`, ו-
  `backToTopics` שממתין ל-`.hold-zoom-setting` שיהיה נראה): אחרי הסבב הזה
  הבורר לא נראה עד שנפתח הדיאלוג, ולכן **שש הבדיקות האלה ידרשו שלב פתיחה
  נוסף** — שינוי ניווט בבדיקות, לא שינוי בטענות שלהן. נרשם כאן כדי
  ש-`developer`/`qa` לא יגלו את זה כ"כשל".

## Risks / Tradeoffs
- **סף התזוזה (4px) הוא הכרעה טכנית שלא מופיעה ב-design.md** — נחוץ כדי
  שהמחווה תהיה שמישה בפועל על מגע אנושי אמיתי, לא רק בתיאוריה של "אפס
  תזוזה". שווה לתעד ב-`tests.md`/QA כפרמטר שאולי יידרש כיוונון אחרי ניסוי
  אמיתי, בדיוק כמו `HOLD_ZOOM_DWELL_MS`/`HOLD_ZOOM_FACTOR` עצמם.
- **CSS transition גלובלי על `transform` בזמן שה-hold-zoom פעיל, ולא רק
  על שינוי הזום עצמו** — אם קוד עתידי יקרא ל-`applyTransform()` ישירות
  בלי לעבור דרך `clearTransition()`/`animateTransformTo()` בזמן שה-transition
  עדיין דלוק, התזוזה הזו תיאנם בטעות (feel "עם lag"). הסיכון מנוהל כרגע
  ע"י כך שהמסלולים היחידים שקוראים ל-`applyTransform()` תוך כדי מגע בודד
  (ציור, פאן) כבר עוברים דרך הלוגיקה שמנקה `transition` לפני קריאה —
  אבל זה חוזה לא-אכיפ-קומפיילר (רק קונבנציה), שווה הערה בקוד למי שיוסיף
  קריאת `applyTransform()` חדשה בעתיד.
- **לא נבדק על מכשיר אמיתי כחלק מהארכיטקטורה** — כל הערכים (180ms, 30%,
  120ms, 4px) הם החלטות סבירות על הנייר; `developer`/`qa` לא יכולים
  "להרגיש" אם זה נכון בלי בדיקה אנושית בפועל (מחוץ לסקופ של בדיקות e2e
  אוטומטיות, שיכולות רק לאמת את מכונת המצבים עצמה — ראו הערה מקבילה
  שתידרש מ-`qa`). **סבב ב׳:** זה נכון שבעתיים כעת — כיוון ההתקרבות תלוי
  יותר בתחושה אנושית (האם `30%` מספיק/יותר מדי קרוב) מכיוון ההתרחקות,
  כי "כמה מקרוב זה נכון לכתיבה" הוא שיפוט אנושי מובהק.

### Risks / Tradeoffs — סבב ה׳
- **הכיתובים בעברית יושבים ב-`src/data/notebook.ts`, קובץ שעד היום היה
  מתמטיקה טהורה בלי מחרוזות.** החלופה — לשמור את הסדר והפקטורים שם ואת
  הכיתובים ב-`TopicPicker.tsx` — מפזרת דבר אחד לשני קבצים שחייבים להישאר
  מסונכרנים בסדר שלהם. העדפתי מקור-אמת אחד; התקדים בפרויקט (`curriculum.ts`
  מלא עברית) אומר שמחרוזות בקובץ נתונים הן מקובלות כאן.
- **`Practice.tsx` מקבל prop שהוא רק מעביר הלאה.** זה prop-drilling של רמה
  אחת, בדיוק כמו `readAloud` שכבר עובר כך היום. לא הוספתי context בשביל ערך
  בודד — זה היה מנגנון חדש לבעיה שלא קיימת בקנה מידה הזה.
- **התקרה `70%` היא גם ברירת המחדל, כלומר ברירת המחדל היא הדרגה החזקה
  ביותר.** זה נשמע חריג, והוא מכוון (ראו design.md): זה הערך היחיד שאומת
  על מכשיר אמיתי. המשמעות המעשית: כל שינוי שהמשתמש יעשה בבורר יהיה כלפי
  מטה. אם אחרי ניסוי יתברר שרוצים גם חזק יותר — זו הוספת שורה אחת למערך.

### Risks / Tradeoffs — סבב ו׳
- **ההגדרות נעשות פחות נגישות, וזה בכוונה.** מבוגר שהתרגל לראות את שורת
  ההקראה על המסך לא ימצא אותה שם יותר. זו בדיוק הבקשה ("לא צריך את זה בכל
  פעם לבחור"), והמחיר — הקשה אחת נוספת — נרשם כמודע. הכפתור בשורת הכותרת,
  נראה בלי גלילה, הוא מה שמצמצם אותו.
- **`z-index: 31` נבחר להתאמה לדיאלוג הקיים, אף שאין כאן שכבות שמתחרות.**
  במסך הנושאים אין מחברת במסך-מלא, ולכן `31` גבוה מהנדרש — העדפתי שכבת
  מודאל אחת בפרויקט על מספר "מדויק" שני שאף אחד לא יזכור למה הוא שונה.
- **שכפול ערכי CSS בין `.settings-dialog` ל-`.notebook-confirm-dialog`
  במקום מחלקת בסיס משותפת.** מחלקת בסיס (`.modal-card`) הייתה מקטינה
  שכפול, אבל גם הייתה משנה את הדיאלוג ההרסני שכבר באתר החי, בסבב שעוסק
  בהגדרות — שינוי לא-מבוקש בקוד עובד. השכפול הוא כ-8 שורות CSS, והוא
  הבחירה הזולה מהשתיים כאן.
- **מקלדת ומיקוד:** ראו Technical Approach, סעיף 5 — פער מתועד במכוון, לא
  השמטה.

## Open Questions
None.

## Implementation Notes

**סבב א׳ (2026-09-12, כיוון שהתברר כשגוי — הקוד הזה שונה בסבב ב׳, ראו
למטה):**

נבנה בדיוק לפי התכנון לעיל, בלי סטיות — `src/components/PracticeNotebook.tsx` הוא
הקובץ היחיד שהשתנה, `src/data/notebook.ts` נשאר כמו שהוא.

- הקבועים (`HOLD_ZOOM_DWELL_MS=180`, `HOLD_ZOOM_TRANSITION_MS=120`,
  `HOLD_ZOOM_FACTOR=0.7`, `HOLD_ZOOM_MOVE_TOLERANCE_PX=4`) והרפרנסים החדשים
  (`holdZoomTimer`, `holdZoomPointerId`, `holdZoomDownPos`, `preHoldTransform`,
  `transitionClearTimer`) נוספו בדיוק כמו שמתואר.
- `clearTransition()`, `animateTransformTo()` ו-`triggerHoldZoom()` נוספו כפי
  שתוארו, ליד `redrawFromPage`.
- `handlePointerDown`: ההפעלה (arm) נוספה בסוף ענף `size === 1`, אחרי הלוגיקה
  הקיימת של עט/הזזה — רצה בלי תלות בענף שרץ (גם אם `locked` ומצב "עט" לא
  מסמן, הטיימר עדיין נערך, כנדרש ב"לא תלוי בכלי/בנעילה"). ההשלכה (discard)
  נוספה בתחילת ענף `size === 2`, כולל קריאה ל-`clearTransition()` (תוספת קטנה
  שלא הייתה מפורשת בקוד-הדוגמה של הארכיטקטורה אבל מוזכרת ב"Risks" כחוזה
  שצריך לשמור עליו).
- `handlePointerMove`: בדיקת הביטול-על-תזוזה נוספה בתחילת הפונקציה (רצה בלי
  תלות ב-`size`, כי היא בודקת פר-`pointerId` ולא פר-מספר מגעים). נוסף גם
  `clearTransition()` לפני עדכוני `panZoomRef`/`applyTransform()` הקיימים
  בענפי הפאן והפינץ' — כדי שתזוזה רגילה שממשיכה מגע מוזם-אאוט (או ממגע
  שהצטרף כ-pinch) לא "תירש" transition שנשאר דלוק ותרגיש עם lag.
- `endPointer`: לוגיקת השחזור נוספה בתחילת הפונקציה, לפני הקוד הקיים — רצה
  גם ב-`pointerup` וגם ב-`pointercancel` (שני האירועים כבר קוראים ל-`endPointer`
  הזו בדיוק, בלי צורך בשינוי ב-JSX).
- נוסף `useEffect` קטן לניקוי טיימרים ב-unmount, כמתואר.

**נבדק:** `npm run build` ו-`npm run lint` ירוקים. `npm run bump:feature`
הועלה מ-`1.30.0` ל-`1.31.0`. **לא נבדק על מכשיר מגע אמיתי** (הסביבה כאן
אינה דפדפן) — הערכים המספריים (180ms/30%/120ms/4px) הם כפי שנקבעו בעיצוב
ובארכיטקטורה, לא כווננו מול תחושה בפועל; ראו "Risks / Tradeoffs" למעלה.

**סבב ב׳ (בוצע, 2026-09-13):** `HOLD_ZOOM_FACTOR` שונה בפועל מ-`0.7` ל-`1.3`
ב-`src/components/PracticeNotebook.tsx`. שלושה הערות-קוד (doc comments) שתיארו
"zoom-out"/"zoomed-out" תוקנו ל-"zoom-in"/"zoomed-in" (ליד הגדרת הקבועים, ליד
`preHoldTransform`, וב-`endPointer`) — כולל הערה אחת שלישית ליד ענף ה-pinch
ב-`handlePointerDown` שתיארה "even if already zoomed out". **לא** נגעתי
בשתי הערות לא-קשורות שמזכירות "zoomed out" (`viewingWholePage`,
`savedTransform`) — אלה שייכות לכפתור הקיים "הצג את כל הדף", פיצ'ר נפרד
לגמרי שלא השתנה. שום דבר אחר בקובץ לא שונה — בדיוק כמו שארכיטקטורה סבב ב׳
ציפתה.

**נבדק:** `npm run build` ו-`npm run lint` ירוקים. **לא הועלתה גרסה נוספת** —
ה-PR הזה כבר הועלה מ-`1.30.0` ל-`1.31.0` בסבב א׳ (יחסית ל-`main`), וזה עדיין
נכון גם אחרי סבב ב׳ (סקריפט הבדיקה משווה את כל ה-PR מול `main`, לא קומיט
בודד) — אין צורך בהעלאה נוספת על אותו PR. בדיקות ה-e2e (`tests/e2e/notebook-hold-to-zoom.spec.ts`)
עדיין מניחות זום-אאוט (`toBeLessThan`) ויכשלו עד שסבב ב׳ של QA יעדכן אותן —
זה בכוונה לא תוקן כאן, זה תפקיד השלב הבא.

**סבב ג׳ (בוצע, 2026-09-13) — תיקון באג ממכשיר מגע:** שני שינויים בדיוק כפי
שתוארו בארכיטקטורה, בלי סטייה:

- `src/App.css`: `.notebook-stage` ו-`.notebook-canvas` קיבלו שלוש שורות
  זהות (`-webkit-touch-callout: none; -webkit-user-select: none; user-select: none;`)
  לצד ה-`touch-action: none` הקיים בכל אחד מהם — לא הוחלף, נוסף. אומת ב-build
  שהערכים בפועל מגיעים ל-CSS המקומפל (`grep` על `dist/assets/*.css` אחרי
  build, לפני ה-commit) ולא נבלעים ע"י המינימיזציה.
- `src/components/PracticeNotebook.tsx`: נוסף `onContextMenu={(e) => e.preventDefault()}`
  ל-`<canvas>`, לצד `onPointerUp`/`onPointerCancel` הקיימים. שום שינוי אחר
  בקובץ — לא בלוגיקת `handlePointerDown`/`handlePointerMove`/`endPointer`/
  `triggerHoldZoom`/`animateTransformTo`, כפי שהארכיטקטורה דרשה במפורש.

**נבדק:** `npm run build` ו-`npm run lint` ירוקים. **לא הועלתה גרסה נוספת**
(אותה סיבה כמו בסבב ב׳ — ה-PR כבר הועלה יחסית ל-`main`). **לא נבדק, ולא
ניתן לבדוק, בבדיקות e2e** — התיקון תלוי בזיהוי-מחוות אמיתי של מערכת
ההפעלה/הדפדפן (callout/הדגשת-טקסט/תפריט-הקשר) ש-Playwright לא מדמה בכלל
(אין לו שכבת "מגע ממושך של OS אמיתי" להפעיל). המסמך הזה, לא בדיקה, הוא
התיעוד של מה שתוקן ולמה — אימות בפועל דורש ניסוי חוזר על אותו מכשיר מגע
שהמשתמש דיווח ממנו.

**סבב ד׳ (בוצע, 2026-09-25) — כיוונון עוצמה:** שינוי שורה אחת —
`HOLD_ZOOM_FACTOR` מ-`1.3` ל-`1.7` ב-`src/components/PracticeNotebook.tsx`.
שום שינוי אחר בקובץ. `npm run test:e2e -- tests/e2e/notebook-hold-to-zoom.spec.ts`
(ריצה מבודדת) — `7/7` עוברות בלי שום שינוי בקובץ הבדיקות עצמו, בדיוק כמו
שצפוי: כל שבע הבדיקות משוות יחסית (`toBeGreaterThan(before)`, לא ערך קבוע),
כך שכיוונון המספר לא דרש עדכון בדיקות.

**נבדק:** `npm run build` ו-`npm run lint` ירוקים. **לא הועלתה גרסה
נוספת** (אותה סיבה כמו בסבב ב׳/ג׳). זו כיוונון-הרגשה טהור — אין דרך
אוטומטית לאמת שה-`120%` החדש "מרגיש נכון" יותר מ-`91%` הקודם; זה בדיוק
מה שביקש המשתמש אחרי ניסוי אמיתי, ורק ניסוי אמיתי נוסף (בתצוגה המקדימה)
יכול לאשר את זה.

**סבב ה׳ (בוצע, 2026-09-25) — בורר העוצמה:** נבנה לפי התכנון, שבעה קבצים:

- `src/data/notebook.ts`: `HoldZoomLevel`, `HOLD_ZOOM_LEVELS` (שש רשומות
  כפי שנקבע), `DEFAULT_HOLD_ZOOM_LEVEL = "veryMuch"`, ופונקציה קטנה
  `holdZoomFactorFor(levelId)` שממירה מזהה לפקטור. **התוספת היחידה מעבר
  לתכנון:** הפונקציה הזו לא הופיעה במסמך במפורש — בלעדיה כל קורא היה חוזר
  על אותו `find(...)?.factor ?? null` (גם `App.tsx` וגם כל בדיקה עתידית),
  וזה בדיוק המקום שבו "לא מוכר" ו"כבוי" צריכים להתמפות לאותה תוצאה
  (`null`) במקום אחד.
- `src/data/preferences.ts`: `holdZoomLevel?: Record<string, string>` לצד
  `readAloud`; הקורא מאמת מול `HOLD_ZOOM_LEVELS` ומחזיר את ברירת המחדל
  כשהערך חסר או לא מוכר; הכותב באותו דפוס `try/catch` של הקובץ.
- `src/components/PracticeNotebook.tsx`: הקבוע `HOLD_ZOOM_FACTOR` נמחק;
  נוסף prop `holdZoomFactor: number | null`, ו-`holdZoomFactorRef` שמתעדכן
  ב-`useEffect` (כמו `lockedRef`); ההפעלה ב-`handlePointerDown` עטופה
  ב-`if (holdZoomFactorRef.current !== null)` כך שב"כבוי" לא נזרע טיימר
  ולא נכתבים `holdZoomPointerId`/`holdZoomDownPos`; `triggerHoldZoom`
  קורא את ה-ref, מחזיר מיד אם הוא `null` (הגנה על החלפה בין זריעה לירייה),
  ומעביר את הפקטור ל-`zoomAroundPoint`.
- `src/components/Practice.tsx`: prop שעובר הלאה בלבד, בלי לוגיקה.
- `src/App.tsx`: `holdZoomLevelFor(student.id)` + `holdZoomFactorFor(...)`
  ליד `readAloudFor` הקיים; ה-tick שונה שם ל-`setPreferencesTick` (ההערה
  מעליו עודכנה) ומקודם משתי ההגדרות; מסלול ה-`home` מקבל מזהה + callback,
  ו-`Practice` מקבל את הפקטור. שתי הערות על מה שלא נגעתי בו: קריאת
  ה-`TopicPicker` השנייה (הפול-ת׳רו בסוף הקומפוננטה) לא מקבלת את ה-props
  החדשים — בדיוק כמו שהיא לא מקבלת את `readAloud` היום, וההגדרות יושבות
  במסך ה-`home`.
- `src/components/TopicPicker.tsx`: שורת ההגדרה השנייה עם ששת הכפתורים
  והכיתובים מ-design.md מילה במילה, `aria-pressed` על הנבחר,
  `role="group"` עם `aria-label` על השורה, ומוסתרת כשה-props חסרים (בלי
  תנאי ה-`speechSupported()`). ה-JSX משתמש מחדש ב-`.read-aloud-text`/
  `-title`/`-note` לגוש הטקסט — אותה אנטומיה, בלי שכפול CSS.
- `src/App.css`: `.hold-zoom-setting` (אותו ארגז, בפריסת עמודה),
  `.hold-zoom-header`, `.hold-zoom-icon`, `.hold-zoom-options`
  (`flex-wrap: wrap`, לא `overflow-x`), `.hold-zoom-option` +
  `[aria-pressed="true"]`.

**גרסה — כאן התגלה משהו שהיה נכשל ב-CI:** שלושת הסבבים הקודמים תיעדו
ש"אין צורך בהעלאת גרסה כי ה-PR כבר ב-`1.31.0` מול `main` ב-`1.30.0`".
בדקתי בפועל במקום להניח, ו**זה כבר לא נכון**: מאז מוזג `PR #69`, ש-`main`
העלה בו את הגרסה עצמאית ל-`1.31.0` — כלומר ה-PR והבסיס היו שווים, ובלי
העלאה `scripts/check-version-bump.mjs` היה מפיל את ה-PR. הרצתי אותו ידנית
כדי לאמת ("expected: 1.32.0"), ואז `npm run bump:feature` → **`1.31.0` →
`1.32.0`**.

**נבדק:** `npm run build` ו-`npm run lint` ירוקים אחרי ההעלאה. בדיקות
ה-e2e הן תפקיד שלב ה-QA שבא אחרי זה — שימו לב שיש בסוויטה בדיקה שמשווה את
המספר במסך הראשון ל-`package.json`, כך שההעלאה נוגעת גם בה.
