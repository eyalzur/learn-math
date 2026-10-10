# גלילה אוטומטית במחברת לפי כיוון הכתיבה — Architecture

**עדכון סבב ב׳ (2026-09-26) — הסעיפים למטה (עד "Open Questions") נכתבו מחדש
במלואם ומחליפים את סבב א׳.** "Implementation Notes" בתחתית המסמך נשאר כמו
שהוא — זה תיעוד היסטורי של מה שבאמת נבנה בסבב א׳ (ומוסר עכשיו כמעט לגמרי מהקוד);
`developer` יוסיף מתחתיו רישום נפרד למה שנבנה בסבב ב׳, לא ידרוס אותו.

## Overview
מסיר לגמרי את המנגנון הרציף של סבב א׳ (`applyAutoScrollFollow`, שרץ בכל
`pointermove` תוך כדי משיכת קו) ומחליף אותו בבדיקה חד-פעמית ב-`endPointer`: כל
קו שמצטייר צובר בזמן אמת תיבה תוחמת (bounding box, ביחידות תא/`CELL`) של כל
התאים שנצבעו בו. כשהקו מסתיים, משווים את התיבה הזו מול התיבה של הקו הקודם
שהסתיים — אם יש מרווח (gap) ברור בציר X ו/או Y ביניהן, מבצעים קפיצה חד-פעמית
של `panX`/`panY` (דרך `animateTransformTo` הקיים — אותו מנגנון טרנזישן ש-
זום-ההחזקה כבר משתמש בו) בגודל שתלוי בעוצמה שנבחרה. ההגדרה עצמה עוברת ממתג
בינארי לרשימת שש דרגות (`AUTO_SCROLL_JUMP_LEVELS`), מבנה-תאום-במדויק ל-
`HOLD_ZOOM_LEVELS` הקיים.

## Affected Files / Components
- **`src/data/notebook.ts`**
  - **מוסר:** `AUTO_SCROLL_FOLLOW_MARGIN_FRACTION`, `AUTO_SCROLL_FOLLOW_GAIN`,
    `AUTO_SCROLL_FOLLOW_MAX_STEP_PX` — קבועי סבב א׳, לא בשימוש יותר בשום מקום.
  - **נשאר, אך מרופקטר:** `clampFollowPanX` — הלוגיקה הפנימית שלה (מרווח
    לגיטימי ל-`panX` בזום נתון) מופקת לפונקציה גנרית משותפת (ראו Data/State
    Changes), כדי לא לשכפל אותה עבור `panY`.
  - **חדש:** `clampFollowPanY` (המקבילה האנכית, לפי `PAGE_HEIGHT`),
    `AUTO_SCROLL_JUMP_GAP_THRESHOLD` (כמה תאים צריך להיות המרווח כדי להיחשב
    "תו חדש", לא המשך של אותו תו), `AUTO_SCROLL_JUMP_LEVELS` (מבנה זהה
    ל-`HOLD_ZOOM_LEVELS`, שדה `jumpFraction: number | null` במקום `factor`),
    `DEFAULT_AUTO_SCROLL_JUMP_LEVEL`, `autoScrollJumpFractionFor(levelId)`
    (מקבילה ל-`holdZoomFactorFor`).
- **`src/data/preferences.ts`**
  - **מוסר:** שדה `autoScrollFollow?: Record<string, boolean>` והפונקציות
    `autoScrollFollow`/`setAutoScrollFollow`.
  - **חדש:** שדה `autoScrollJumpLevel?: Record<string, string>` והפונקציות
    `autoScrollJumpLevel(studentId): string` / `setAutoScrollJumpLevel(studentId,
    levelId): void` — **מילה במילה** אותו מבנה כמו `holdZoomLevel`/
    `setHoldZoomLevel` הקיימים (כולל האימות מול הרשימה הסגורה, עם נפילה
    לברירת המחדל אם הערך השמור לא תואם אף דרגה קיימת).
- **`src/components/PracticeNotebook.tsx`**
  - **מוסר:** prop `autoScrollFollow: boolean`, ref `autoScrollFollowRef`,
    פונקציית `applyAutoScrollFollow`, והקריאה לה מתוך `handlePointerMove`.
  - **חדש:** prop `autoScrollJumpFraction: number | null` (הערך שכבר נפתר —
    בדיוק כמו `holdZoomFactor` — לא ה-id של הדרגה), ref מקביל
    `autoScrollJumpFractionRef` + `useEffect`. שני refs חדשים למעקב אחר קו
    נוכחי/קודם (`strokeBoundsRef`, `lastStrokeBoundsRef`), פונקציה חדשה
    `extendStrokeBounds` (נקראת מתוך `paintTo`), ופונקציה חדשה
    `maybeJumpForNewStroke` (נקראת מתוך `endPointer`). קבוע חדש
    `AUTO_SCROLL_JUMP_TRANSITION_MS` (ליד `HOLD_ZOOM_TRANSITION_MS` הקיים).
- **`src/components/Practice.tsx`** — prop `autoScrollFollow: boolean` מוחלף
  ב-`autoScrollJumpFraction: number | null`, מועבר הלאה כמו `holdZoomFactor`.
- **`src/components/TopicPicker.tsx`** — שורת ⚙️ השלישית מוחלפת מ-JSX של
  מתג (`role="switch"`) ל-JSX של בורר-כפתורים, **מבנה זהה** לשורת זום-ההחזקה
  שממש מעליה (`role="group"`, כפתור לכל דרגה עם `aria-pressed`). Props
  `autoScrollFollow?: boolean` / `onAutoScrollFollowChange?` מוחלפים ב-
  `autoScrollJumpLevel?: string` / `onAutoScrollJumpLevelChange?: (levelId:
  string) => void` — מבנה זהה ל-`holdZoomLevel`/`onHoldZoomLevelChange`.
- **`src/App.tsx`** — ייבוא/כתיבה של ההעדפה מוחלפים (`autoScrollJumpLevel`
  במקום `autoScrollFollow`), `autoScrollJumpFraction =
  autoScrollJumpFractionFor(autoScrollJumpLevel)` מחושב כמו `holdZoomFactor`,
  מועבר ל-`TopicPicker` (ה-id) ול-`Practice` (הערך הפתור).
- **`src/App.css`** — **שינוי אמיתי הפעם** (בניגוד לסבב א׳): השורה החדשה
  היא בורר-כפתורים, לא מתג — צריכה את אותה CSS שכבר יש ל-`.hold-zoom-setting`/
  `.hold-zoom-header`/`.hold-zoom-icon`/`.hold-zoom-options`/`.hold-zoom-option`
  (כולל `[aria-pressed="true"]`). **לא** להשתמש מחדש באותן מחלקות ממש — ראו
  "לקח מסבב א׳" ב-Risks למטה — אלא להוסיף מחלקות מקבילות
  (`.auto-scroll-setting` וכו') **לאותם selectors** (למשל
  `.hold-zoom-setting, .auto-scroll-setting { ... }`), כך שה-CSS משותף
  אבל שמות המחלקות ב-DOM נשארים ייחודיים לכל בורר.

## Data / State Changes
```ts
// notebook.ts
function clampPanAxis(pan: number, zoom: number, viewportSize: number, pageSize: number): number {
  const pageSpan = pageSize * zoom;
  const lo = Math.min(0, viewportSize - pageSpan);
  const hi = Math.max(0, viewportSize - pageSpan);
  return Math.min(hi, Math.max(lo, pan));
}
export function clampFollowPanX(panX: number, zoom: number, viewportWidth: number): number {
  return clampPanAxis(panX, zoom, viewportWidth, PAGE_WIDTH);
}
export function clampFollowPanY(panY: number, zoom: number, viewportHeight: number): number {
  return clampPanAxis(panY, zoom, viewportHeight, PAGE_HEIGHT);
}

// כמה תאים של מרווח בין תיבות תוחמות של שני קווים נחשב "תו חדש" ולא המשך של
// אותו תו (חלק שני של ספרה, נקודה, קו חוצה) — ערך התחלתי, לא מאומת על מכשיר
// מגע אמיתי, בדיוק כמו קבועי סבב א׳ בזמנו.
export const AUTO_SCROLL_JUMP_GAP_THRESHOLD_CELLS = 10; // ~10 * CELL ≈ 47 יחידות-דף

export interface AutoScrollJumpLevel {
  id: string;
  label: string;
  /** שבר מרוחב/גובה ה-stage הנוכחי שהקפיצה מזיזה בציר הרלוונטי, או `null` ל"כבוי". */
  jumpFraction: number | null;
}
export const AUTO_SCROLL_JUMP_LEVELS: AutoScrollJumpLevel[] = [
  { id: "off", label: "כבוי", jumpFraction: null },
  { id: "veryLittle", label: "מעט מאוד", jumpFraction: 0.08 },
  { id: "little", label: "מעט", jumpFraction: 0.14 },
  { id: "medium", label: "בינוני", jumpFraction: 0.22 },
  { id: "much", label: "הרבה", jumpFraction: 0.32 },
  { id: "veryMuch", label: "הרבה מאוד", jumpFraction: 0.45 },
];
export const DEFAULT_AUTO_SCROLL_JUMP_LEVEL = "medium"; // לא "הרבה מאוד" — ראו design.md
export function autoScrollJumpFractionFor(levelId: string): number | null {
  return AUTO_SCROLL_JUMP_LEVELS.find((l) => l.id === levelId)?.jumpFraction ?? null;
}
```

```ts
// preferences.ts — מחליף את autoScrollFollow/setAutoScrollFollow של סבב א׳
interface Preferences {
  readAloud?: Record<string, boolean>;
  holdZoomLevel?: Record<string, string>;
  autoScrollJumpLevel?: Record<string, string>; // היה autoScrollFollow?: Record<string, boolean>
}
export function autoScrollJumpLevel(studentId: string): string {
  const stored = readAll().autoScrollJumpLevel?.[studentId];
  return AUTO_SCROLL_JUMP_LEVELS.some((l) => l.id === stored) ? stored! : DEFAULT_AUTO_SCROLL_JUMP_LEVEL;
}
export function setAutoScrollJumpLevel(studentId: string, levelId: string): void { /* כמו setHoldZoomLevel */ }
```

Props: `TopicPickerProps.autoScrollJumpLevel?: string` + `onAutoScrollJumpLevelChange?:
(levelId: string) => void` (מחליפים את `autoScrollFollow?: boolean` +
`onAutoScrollFollowChange?`). `PracticeProps`/`PracticeNotebookProps.autoScrollJumpFraction:
number | null` (מחליף `autoScrollFollow: boolean`).

## Technical Approach

### מעקב אחר תיבה תוחמת של הקו הנוכחי, בתוך `paintTo`
`paintTo` כבר מחשב `col`/`row` לכל נקודה שהוא מצייר (בתוך ה-`if (ctx)` הקיים).
מעבירים את החישוב הזה החוצה מה-`if`, כך שהוא קורה תמיד, וקוראים לפונקציה
חדשה:
```ts
function extendStrokeBounds(col: number, row: number) {
  if (autoScrollJumpFractionRef.current === null) return; // כבוי — אין שום עלות
  const b = strokeBoundsRef.current;
  if (!b) strokeBoundsRef.current = { minCol: col, maxCol: col, minRow: row, maxRow: row };
  else {
    b.minCol = Math.min(b.minCol, col);
    b.maxCol = Math.max(b.maxCol, col);
    b.minRow = Math.min(b.minRow, row);
    b.maxRow = Math.max(b.maxRow, row);
  }
}
```
`strokeBoundsRef` מתאפס ל-`null` בדיוק במקום שבו `lastPoint.current` כבר
מתאפס ל-`null` כדי לסמן "קו חדש מתחיל" — ב-`handlePointerDown` (לפני הקריאה
הראשונה ל-`paintTo`), וגם בענף הפינץ' ב-`handlePointerDown` (יחד עם
`undoRecording()` — אם הדיו של הקו בוטל, אין טעם לזכור את התיבה שלו כ"קו
אחרון" לצורך השוואה עתידית).

### קביעת קפיצה ב-`endPointer`
בתוך `endPointer`, איפה שכבר קיים `if (wasDrawing) { notifyContentChanged(); }`:
```ts
if (wasDrawing) {
  notifyContentChanged();
  maybeJumpForNewStroke(strokeBoundsRef.current, lastStrokeBoundsRef.current);
  lastStrokeBoundsRef.current = strokeBoundsRef.current;
}
strokeBoundsRef.current = null;
```
`maybeJumpForNewStroke`:
1. אם `autoScrollJumpFractionRef.current === null`, או `finished`/`previous`
   חסרים (אין עם מה להשוות — כולל הקו הראשון בדף) — יציאה.
2. לכל ציר בנפרד, מחשבים מרווח בין התיבות (`finished.minCol - previous.maxCol`
   אם התו החדש מימין, `previous.minCol - finished.maxCol` אם משמאל, וכן הלאה
   לציר Y) — `0` אם התיבות נוגעות/חופפות. אם המרווח (ב-`CELL`) עובר את
   `AUTO_SCROLL_JUMP_GAP_THRESHOLD_CELLS` — הציר הזה "רחוק", עם כיוון לפי איזה
   צד.
3. אם שני הצירים "קרובים" — יציאה, בלי קפיצה (זה בדיוק המקרה של חלק שני של
   אותה ספרה/אות).
4. אחרת: `jumpX = dirX ? stageRect.width * fraction : 0`, ומקביל ל-Y עם
   `stageRect.height`. `nextPanX = clampFollowPanX(panX + dirX * jumpX, zoom,
   stageRect.width)`, ומקביל `nextPanY` עם `clampFollowPanY`.
5. `animateTransformTo({ ...panZoomRef.current, panX: nextPanX, panY: nextPanY
   }, AUTO_SCROLL_JUMP_TRANSITION_MS)` — **משתמש ישירות בפונקציה הקיימת**
   שזום-ההחזקה כבר משתמש בה לאותה תחושה בדיוק ("צעד מוגדר, לא גלילה") — בלי
   קוד אנימציה חדש.

**כיוון (X ו-Y):** לפי אותה נוסחה שכבר קיימת מסבב א׳/`minimapViewRect` — `panX`
גדול יותר חושף עוד מהדף שמשמאל, `panX` קטן יותר חושף עוד מימין. אותו עיקרון
בדיוק ל-Y: `panY` גדול יותר חושף עוד מלמעלה, קטן יותר חושף עוד מלמטה. כשהתו
החדש למטה מהקודם (ממשיכים כלפי מטה בדף) → `panY` קטן (dirY שלילי); כשלמעלה →
`panY` גדול.

### עדיפות לגלילה/זום ידניים — לא דורש קוד הגנה נוסף
בניגוד לסבב א׳ (שם המעקב היה רציף וממש "התנגש" בזמן עם גרירה/פינץ' פעילים),
כאן הקפיצה מחושבת **פעם אחת, סינכרונית**, בתוך `endPointer` של קו שכבר הסתיים.
מבנית אי אפשר שקו יסתיים דרך `endPointer` בזמן שיש עוד מגע פעיל שמבצע
הזזה/פינץ': `handlePointerDown` כבר מבטל ציור (`drawing.current = false`)
ברגע שמגע שני נוגע (ענף הפינץ'), ותזוזה ידנית (`tool === "pan"`) נקבעת
ב-`pointerdown` ולא מתערבבת עם ציור על אותו מגע. אין תרחיש שבו הקפיצה "נאבקת"
נגד גרירה בו-זמנית — היא פשוט לא יכולה לקרות אז.

### אחסון ההגדרה
זהה מילה במילה למבנה `holdZoomLevel`/`setHoldZoomLevel`/`HOLD_ZOOM_LEVELS`
הקיימים — כולל האימות מול רשימה סגורה בקריאה (ערך לא-מוכר נופל לברירת המחדל),
ו-id ולא מספר גולמי (כדי ששינוי עתידי בסקאלה לא "יתום" ערכים שמורים — אותו
נימוק בדיוק שכבר מתועד ב-`preferences.ts` עבור `holdZoomLevel`).

## Edge Cases
- **הקו הראשון על דף (חדש/אחרי ניקוי):** `lastStrokeBoundsRef.current` הוא
  `null` → `maybeJumpForNewStroke` יוצא מיד, אין עם מה להשוות. יש לאפס את
  ה-ref הזה גם ב-`useEffect` הקיים שרץ על שינוי `currentPage` וגם ב-
  `clearCurrentPageNow` — אחרת תו ראשון בדף חדש/מנוקה עלול "לקפוץ" ביחס לתו
  אחרון מהדף/המצב הקודם, שכבר לא רלוונטי.
- **הגעה לגבול הדף:** `clampFollowPanX`/`Y` מחזירים את הערך שכבר קיים אם אין
  לאן לזוז — הקפיצה בפועל יוצאת קטנה יותר (או לא קורית בכלל אם שני הצירים
  כבר בגבול), בלי הודעה. עקבי עם ההתנהגות שכבר הייתה בסבב א׳.
  - **הערה:** בניגוד ל-`panX` (שכבר היה מוגבל בסבב א׳), `panY` **מעולם לא**
    היה מוגבל קודם — לא בקפיצה (חדשה) ולא בפאן/פינץ' ידניים (שנשארים בלי
    הגבלה, בדיוק כמו `panX` הידני). `clampFollowPanY` חל **רק** על הקפיצה
    האוטומטית, לא על שום דבר אחר — אותה הבחנה שכבר קיימת ומתועדת לגבי
    `clampFollowPanX`.
- **דף נעול (`locked`):** `drawing.current` לא הופך `true`, ולכן
  `strokeBoundsRef` אף פעם לא נבנה על דף נעול — אין קפיצה, בלי קוד נוסף
  (אותו לקח מסבב א׳).
- **מחיקה/ביטול (`undoRecording`, נגרם ע"י התחלת פינץ'):** התאים שנצבעו
  בוטלו, ולכן התיבה התוחמת שלהם (`strokeBoundsRef.current`) מאופסת ל-`null`
  יחד עם הביטול — היא לעולם לא הופכת ל-`lastStrokeBoundsRef`, כי הקו ההוא
  בפועל לא נכתב.
- **מחק (🧽) ולא רק עט:** נספר כמו כל קו אחר — התיבה התוחמת נבנית מתאים
  שנמחקו בדיוק כמו מתאים שנצבעו (מבחינת המנגנון זה סתם "תזוזה עם תוכן
  משתנה"), עקבי עם איך שסבב א׳ כבר טיפל בשני הכלים באותו אופן.
- **קו שהוא נקודה בודדת (הקשה בלי גרירה):** `minCol === maxCol`,
  `minRow === maxRow` — תיבה תקפה בגודל תא אחד, מטופלת בדיוק כמו כל תיבה
  אחרת.
- **שינוי גודל חלון/סיבוב תוך כדי כתיבה:** `stageRect` נקרא מחדש בכל קפיצה
  (בתוך `endPointer`, לא נשמר בין אירועים), כך שהגודל תמיד עדכני.

## Risks / Tradeoffs
- **לקח מסבב א׳ — אין שימוש חוזר במחלקות CSS בין שני בוררים שונים באותו
  דיאלוג.** סבב א׳ השתמש מחדש ב-`read-aloud-switch`/`role="switch"` לשורה
  שלא קשורה להקראה, וזה שבר בפועל שלוש בדיקות e2e קיימות שהניחו "יש רק
  switch אחד/`.read-aloud-switch` אחד בדיאלוג" (`getByRole("switch")` בלי
  `name`) — תועד ב-tests.md של סבב א׳. כאן, שני בוררי-כפתורים (זום-החזקה
  והחדש) חייבים שמות מחלקה **נפרדים** ב-DOM
  (`.hold-zoom-option` מול `.auto-scroll-option` וכו'), גם אם ה-CSS שלהם
  משותף באותם selectors — אחרת `.hold-zoom-option`/`[aria-pressed="true"]`
  הקיימים (שכבר בשימוש בבדיקות של `notebook-hold-to-zoom.spec.ts`, מצפים
  ל-`toHaveCount(6)` בדיוק) יתפסו גם את הכפתורים של הבורר החדש.
- **סף המרווח (`AUTO_SCROLL_JUMP_GAP_THRESHOLD_CELLS = 10`) הוא ניחוש
  התחלתי, לא מאומת על כתב יד אמיתי** — בדיוק כמו קבועי סבב א׳ וכמו הקבועים
  שכבר עברו כמה סבבי כיוונון ב-`notebook-hold-to-zoom`. סביר שיידרש כיוונון
  אחרי ניסיון בפועל — ואם יתברר לא מספיק חד (יגרום לקפיצות תוך כדי אותו תו,
  או ידלג על תווים שכן התרחקו), זה שינוי של מספר יחיד, לא מבנה מחדש.
- **תיבה תוחמת (bounding box) ולא נקודת-סיום בלבד** — נבחר במקום להשוות רק
  את הנקודה האחרונה של כל קו, כדי לא להיכשל על תו שדורש כמה קווים (כמו הספרה
  `4`), שבו הקו השני עשוי להתחיל/להסתיים במקום שונה מאיפה שהראשון נגמר, אבל
  התיבות התוחמות שלהם עדיין חופפות/סמוכות. זו החלטה טכנית שה-design השאיר
  פתוחה במפורש ("הסף המדויק... החלטה טכנית, לא נעולה כאן").
- **ברירת מחדל "בינוני", לא "הרבה מאוד" כמו זום-ההחזקה** — כי אין כאן עדיין
  אף ערך שנוסה בפועל על מכשיר מגע (בניגוד ל-`70%` של זום-ההחזקה, שהיה תוצאה
  ישירה של ניסוי אמיתי). ברירת מחדל שמרנית עד שיהיה ניסיון אמיתי לכוון לפיו.

## Open Questions
None.

## Implementation Notes (סבב א׳ — היסטוריה; רוב זה הוסר בסבב ב׳, ראו הסעיפים למעלה)
מומש בדיוק לפי התכנון למעלה, בלי סטיות — כל שינוי בקוד הוא באחד משבעת הקבצים
שנמנו ב-Affected Files, בדיוק בשמות הפונקציות/הקבועים שתוכננו.

**מה בדיוק השתנה:**
- `src/data/notebook.ts` — שלושת הקבועים ו-`clampFollowPanX`, בדיוק כמו בארכיטקטורה.
- `src/data/preferences.ts` — שדה `autoScrollFollow` וזוג הפונקציות; ברירת המחדל
  ממומשת כ-`stored !== false` כמתוכנן.
- `src/components/PracticeNotebook.tsx` — prop, ref מקביל (`autoScrollFollowRef`
  + `useEffect`), ופונקציית `applyAutoScrollFollow` הממוקמת אחרי `mid()` ולפני
  `handlePointerDown`. נקראת מהענף הקיים `else if (drawing.current)` ב-`handlePointerMove`,
  **לפני** `paintTo` — בדיוק כמו שתוכנן, כדי שהנקודה המצוירת תחושב ביחס למצלמה
  שכבר זזה באותו אירוע.
- `src/components/Practice.tsx`, `src/components/TopicPicker.tsx`, `src/App.tsx` —
  חיווט ה-prop לאורך כל השרשרת, ושורת ⚙️ שלישית ב-`TopicPicker` שמשתמשת מחדש
  במחלקות `read-aloud-*` הקיימות (`role="switch"`, `aria-checked`), בדיוק כמו
  שורת ההקראה.
- **`src/App.css` — לא שונה בכלל**, כמו שהארכיטקטורה חזתה: `.settings-body` כבר
  `flex-direction: column; gap: 12px`, כך ששורה שלישית מאותה מחלקה (`read-aloud-setting`)
  נערמת נכון בלי שום תוספת.

**גרסה:** `npm run bump:feature` הועלה מ-`1.32.0` ל-`1.33.0` (הבראנץ' הוא
`feature/notebook-auto-scroll`).

**`npm run build` ו-`npm run lint` ירוקים** אחרי כל השינויים, כולל אחרי העלאת
הגרסה.

**אימות ידני בדפדפן (לא רק build/lint):** הורצה סוכנת Playwright (כרום המובנה,
`/opt/pw-browsers/chromium`) מול `npm run dev`, על תלמיד/ה רותם, כיתה ו׳, נושא
"שברים פשוטים":
- שורת ⚙️ החדשה מוצגת שלישית בדיאלוג, עם האייקון/כותרת/הערת-משנה המדויקים
  מה-design, והמתג דלוק כברירת מחדל (צילום מסך).
- **סימולציית כתיבה אמיתית** (גרירת עכבר תוך החזקה, לא רק קליק): גרירה לכיוון
  קצה ה-`stage` הימני הזיזה את `panX` (נקרא מ-`transform` בפועל) מ-`0` בהדרגה
  עד `-470px` — בדיוק הגבול שמחשב `clampFollowPanX` לזום `0.7`
  (`min(0, 370-1200*0.7) = -470`) — ונעצר שם בלי לחרוג. גרירה לכיוון הקצה
  השמאלי הזיזה את `panX` בכיוון ההפוך, ונעצרה בדיוק ב-`0` (הגבול השני). ריצוד
  קטן (jitter) של המצביע צמוד לקצה, בלי לצאת מהרצועה, לא הפך כיוון — רק המשיך
  להתקדם לאט, כמתוכנן.
- **עצירה בלי המשך תנועה:** החזרת המצביע למרכז (מחוץ לרצועת השוליים) עצרה את
  התזוזה מיד; החזקת המצביע במרכז בלי תזוזה נוספת לא המשיכה לזוז (אין אינרציה).
- **הגדרה כבויה:** כיבוי המתג ואז אותה גרירה בדיוק לכיוון הקצה — `panX` נשאר
  `0` לגמרי, כלומר הכיבוי מבטל את ההתנהגות לחלוטין.
- **שמירה per-student:** אחרי כיבוי עבור "רותם", `localStorage["learn-math:preferences"]`
  הכיל `{"autoScrollFollow":{"rotem":false}}` — מפתח נכון, מבנה נכון, עקבי עם
  `readAloud`/`holdZoomLevel`.

אין סטיות מהתכנון שדורשות פתיחת שאלה חוזרת לשלב קודם.

## Implementation Notes (סבב ב׳ — 2026-09-26)
מומש בדיוק לפי הארכיטקטורה למעלה. סבב א׳ הוסר לגמרי מהקוד (לא רק מהתיעוד):
שום `applyAutoScrollFollow`, שום `AUTO_SCROLL_FOLLOW_*`, שום `autoScrollFollow`
בשום קובץ.

**מה בדיוק השתנה, לפי קובץ:**
- `src/data/notebook.ts` — `clampFollowPanX` רופקטר להשתמש בעזר משותף
  (`clampPanAxis`, לא מיוצא) יחד עם `clampFollowPanY` החדשה. `AUTO_SCROLL_JUMP_GAP_THRESHOLD_CELLS`
  (`10`), `AUTO_SCROLL_JUMP_LEVELS` (שש דרגות, מבנה זהה ל-`HOLD_ZOOM_LEVELS`),
  `DEFAULT_AUTO_SCROLL_JUMP_LEVEL = "medium"`, `autoScrollJumpFractionFor`.
- `src/data/preferences.ts` — `autoScrollFollow`/`setAutoScrollFollow` הוחלפו
  ב-`autoScrollJumpLevel`/`setAutoScrollJumpLevel`, מילה במילה כמו `holdZoomLevel`.
- `src/components/PracticeNotebook.tsx`:
  - prop/ref הוחלפו ל-`autoScrollJumpFraction`/`autoScrollJumpFractionRef`.
  - שני refs חדשים: `strokeBoundsRef` (הקו הנוכחי), `lastStrokeBoundsRef` (הקו
    האחרון שהושלם).
  - `paintTo` — חישוב `col`/`row` הוצא מחוץ ל-`if (ctx)` (עכשיו תמיד רץ), וקורא
    ל-`extendStrokeBounds(col, row)` החדשה.
  - `handlePointerDown` — `strokeBoundsRef.current = null` בתחילת קו חדש (ליד
    `lastPoint.current = null` הקיים), וגם בענף הפינץ' (ליד `undoRecording()`,
    כדי שקו שבוטל לא יזוהם כ"קו אחרון").
  - `endPointer` — נלכד `finishedStrokeBounds` **לפני** האיפוסים, ואז בתוך
    `if (wasDrawing)`: `maybeJumpForNewStroke(finishedStrokeBounds,
    lastStrokeBoundsRef.current)` ואז `lastStrokeBoundsRef.current =
    finishedStrokeBounds`.
  - `useEffect([currentPage])` הקיים ו-`clearCurrentPageNow` — שניהם מאפסים
    `lastStrokeBoundsRef.current = null`, בדיוק כמו שתוכנן ב-Edge Cases.
  - קבוע חדש `AUTO_SCROLL_JUMP_TRANSITION_MS = 150`.
- `src/components/Practice.tsx`, `src/components/TopicPicker.tsx`, `src/App.tsx` —
  חיווט מלא של `autoScrollJumpLevel`/`autoScrollJumpFraction` לאורך השרשרת.
  ב-`TopicPicker.tsx`: השורה השלישית בדיאלוג עברה מ-JSX של מתג ל-JSX של
  בורר-כפתורים (`role="group"`, `.auto-scroll-*` — מחלקות **נפרדות** מ-
  `.hold-zoom-*`, בדיוק כמו שה-Risks דרש).
- `src/App.css` — המחלקות `.auto-scroll-setting`/`.auto-scroll-header`/
  `.auto-scroll-icon`/`.auto-scroll-options`/`.auto-scroll-option` (כולל
  `[aria-pressed="true"]`) נוספו **לאותם selectors** של `.hold-zoom-*`
  המקבילות — לא בלוק CSS נפרד.

**גרסה: לא הועלתה שוב.** `package.json` כבר עומד על `1.33.0` מסבב א׳ (על אותו
בראנץ', אותו PR עדיין לא מוזג) — בדיוק אותו לקח שכבר מתועד ב-
`notebook-hold-to-zoom/architecture.md` (סבב ו׳): "הבדיקה דורשת בדיוק
middle+1... העלאה נוספת הייתה מפילה אותה." העלאה נוספת כאן הייתה עושה
`1.34.0`, לא `middle+1` ביחס ל-`main`.

**`npm run build` ו-`npm run lint` ירוקים.**

**אימות ידני בדפדפן (Playwright, `/opt/pw-browsers/chromium`, מול `npm run dev`),
תלמיד/ה רותם, כיתה ו׳, "שברים פשוטים":**
- דיאלוג ⚙️: שש אפשרויות (`כבוי`/`מעט מאוד`/`מעט`/`בינוני`/`הרבה`/`הרבה מאוד`),
  ברירת המחדל המסומנת היא `בינוני` כמתוכנן (לא `הרבה מאוד`).
- **קו ראשון על דף חדש:** לא גורם לשום תזוזה (אין קו קודם להשוות).
- **קו שני, רחוק מהראשון (ימינה):** בזמן משיכת הקו עצמו — `transform` **קפוא
  לגמרי** (נבדק תוך כדי, לא רק אחרי). ברגע ההרמה — קפיצה חד-פעמית, `panX` זז
  מ-`0` ל-`-81.4px` (בדיוק `-stageWidth*0.22` בזום `0.7`, כלומר `stageWidth *
  fraction` — הנוסחה עובדת כמתוכנן, "בינוני" = `0.22`).
- **קו שלישי, קרוב לקו השני בקואורדינטות-דף בפועל** (מתוקן בבדיקה כדי לפצות על
  ההזזה של המצלמה מהקפיצה הקודמת — נקודה חשובה: "קרוב על המסך" ו"קרוב בדף"
  הם לא אותו דבר ברגע שהמצלמה כבר קפצה פעם אחת): **לא** גרם לקפיצה נוספת —
  `panX` נשאר `-81.4px`. הריצה הראשונה של הבדיקה (בלי הפיצוי הזה) הראתה קפיצה
  שנייה — לא באג בקוד, אלא כי המבחן עצמו חישב מיקום-מסך שגוי אחרי שהמצלמה כבר
  זזה; אחרי התיקון הראשוני, ההתנהגות תואמת בדיוק את המתוכנן.
- **קו רביעי, רחוק למטה:** קפיצה גם בציר Y (`panY` זז ל-`-76.35px`), בו-זמנית
  עם עדכון `panX` הנוסף מאותו קו — קפיצה דו-ממדית עובדת.
- **עוצמה "כבוי":** אחרי בחירתה, שני קווים רחוקים לגמרי לא הזיזו את
  `transform` בכלל (`translate(0px, 0px)` נשאר קבוע).
- **שמירה per-student:** אחרי בחירת "כבוי" עבור "רותם",
  `localStorage["learn-math:preferences"]` הכיל בדיוק
  `{"autoScrollJumpLevel":{"rotem":"off"}}`.

**הערה טכנית שאומתה תוך כדי הבדיקה, לא תוכננה מראש בפירוט:** קפיצה שקורית על
קו שנמשך בזמן שזום-ההחזקה הזמני היה פעיל — הקפיצה נקראת **אחרי** שחזרת
זום-ההחזקה (`animateTransformTo(preHoldTransform...)`) כבר קרתה באותו
`endPointer`, ולכן היא מחשבת ומזיזה יחסית לתצוגה **שכבר חזרה** למקומה
המקורי, לא לתצוגה המוגדלת זמנית — התוצאה היא קפיצה אחת נקייה, בלי "התנגשות"
או ריצוד בין שתי האנימציות, כי שתיהן משתמשות ב-`animateTransformTo` הסינכרוני
ואין ציור מסך בין שתי הקריאות.

אין סטיות מהתכנון שדורשות פתיחת שאלה חוזרת לשלב קודם.
