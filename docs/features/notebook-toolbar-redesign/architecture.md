# מחברת: עמודת כפתורים ממוקדת + הצעת הפעולה הבאה — Architecture

## Overview
שני בוררי הגדרה חדשים (גודל כפתורים, רגישות הצעה) נבנים בדיוק כמו שלושת
הקיימים — טבלת דרגות ב-`notebook.ts`, lookup, אחסון ב-`preferences.ts`,
חיווט ב-`App.tsx`. ה-JSX של `.notebook-zoom-controls`/`.notebook-toolbar`
מתארגן מחדש לשתי עמודות עגולות חדשות. מנגנון ההצעה הוא state קטן
(`suggestedTool`) שנקבע/מתאפס מנקודות שכבר קיימות בקוד (`endPointer`,
תחילת גרירה, לחיצת פאד-ניווט) — לא מנגנון מעקב חדש, רק עוד ענפים בלוגיקה
שכבר שם.

## Affected Files / Components

- **`src/data/notebook.ts`** —
  - `interface ButtonSizeLevel { id: string; label: string; diameterPx: number }`,
    `export const BUTTON_SIZE_LEVELS: ButtonSizeLevel[]` (שלוש רשומות, בלי "off"),
    `export const DEFAULT_BUTTON_SIZE_LEVEL = "medium"`,
    `export function buttonSizeFor(levelId: string): number` (מחזיר `diameterPx`,
    עם fallback לברירת המחדל — אותו דפוס כמו `holdZoomFactorFor`).
  - `interface SuggestionSensitivityLevel { id: string; label: string; delayMs: number | null }`,
    `export const SUGGESTION_SENSITIVITY_LEVELS: SuggestionSensitivityLevel[]`
    (שש רשומות, `off` עם `delayMs: null`), `export const
    DEFAULT_SUGGESTION_SENSITIVITY_LEVEL = "medium"`, `export function
    suggestionDelayFor(levelId: string): number | null`.

- **`src/data/preferences.ts`** — שני זוגות get/set חדשים, מראה מדויק של
  הקיימים: `buttonSizeLevel`/`setButtonSizeLevel`,
  `suggestionSensitivityLevel`/`setSuggestionSensitivityLevel`. שני שדות
  חדשים ב-`Preferences` (`buttonSizeLevel?`, `suggestionSensitivityLevel?`).

- **`src/App.tsx`** — import הפונקציות החדשות; שתי שורות `const
  buttonSizeLevel = ...; const buttonDiameterPx = buttonSizeFor(buttonSizeLevel);`
  ו-`const suggestionSensitivityLevel = ...; const suggestionDelayMs =
  suggestionDelayFor(suggestionSensitivityLevel);`; שני זוגות props
  חדשים ל-`<TopicPicker>` (level + onChange, אותו דפוס); שני props חדשים
  ל-`<Practice>` (`buttonDiameterPx`, `suggestionDelayMs` — כבר-מחושבים,
  לא ה-level עצמו, בדיוק כמו ש-`holdZoomFactor`/`panStepPx` כבר עובדים).

- **`src/components/TopicPicker.tsx`** — שני props זוג חדשים + שני בלוקים
  חדשים ב-JSX תחת `.pan-speed-setting` הקיים, מראה מדויק (`.button-size-setting`
  עם שלושה כפתורים, `.suggestion-sensitivity-setting` עם שישה).
  `showSettings` מתעדכן לכלול את שניהם.

- **`src/components/Practice.tsx`** — שני props חדשים (`buttonDiameterPx: number`,
  `suggestionDelayMs: number | null`) מועברים ללא שינוי ל-`<PracticeNotebook>`.

- **`src/components/PracticeNotebook.tsx`** — השינוי הגדול:
  - שני props חדשים כנ"ל.
  - `.notebook-clear-btn` (🧹, כרגע בתוך `.notebook-toolbar`) **עובר**
    ל-JSX בתוך `.notebook-zoom-controls`, אחרי ארבעת כפתורי הזום הקיימים.
  - `tool-group` (עט/מחק/הזזה, כרגע בתוך `.notebook-toolbar`) **נמחק**
    משם ונבנה מחדש כ-`.notebook-tool-controls` (אלמנט `<div>` חדש,
    ממוקם בפינה הימנית-תחתונה של `.notebook-stage`, אותו דפוס מיקום כמו
    `.notebook-pan-controls` הקיים — `position:absolute` על ההורה
    הממוקם, לא מתהפך ב-RTL).
  - `.notebook-toolbar` נשאר עם page-nav (◀▶), דף-חדש (+), הסר-דף (🗑)
    בלבד — שלושת האלה ממשיכים לעבוד בדיוק כמו היום, רק בלי קבוצת הכלים
    שהייתה לפניהם.
  - משתנה CSS inline (`style={{ '--notebook-btn-size': `${buttonDiameterPx}px` }}`)
    על כל אחד משני אלמנטי ה-container (`.notebook-zoom-controls`,
    `.notebook-tool-controls`) — כל הכפתורים בפנים קוראים את המשתנה
    (ראו App.css למטה), כך שההגדרה חלה על כל הכפתורים בעמודה בלי
    להעביר prop לכל כפתור בנפרד.
  - state חדש: `const [suggestedTool, setSuggestedTool] = useState<"pan" | "pen" | null>(null)`.
  - ref חדש: `const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null)`.
  - שתי פונקציות עזר חדשות:
    ```ts
    function armSuggestion(target: "pan" | "pen") {
      if (suggestTimer.current) clearTimeout(suggestTimer.current);
      if (suggestionDelayMs === null) return; // "כבוי" — אף פעם לא מציע
      suggestTimer.current = setTimeout(() => setSuggestedTool(target), suggestionDelayMs);
    }
    function clearSuggestion() {
      if (suggestTimer.current) {
        clearTimeout(suggestTimer.current);
        suggestTimer.current = null;
      }
      setSuggestedTool(null);
    }
    ```
  - `endPointer()`: לפני שה-`singlePanStart.current = null` הקיים מאפס
    אותו, שומרים `const wasPanning = singlePanStart.current !== null;`.
    אחרי בלוק ה-`if (wasDrawing) { ... }` הקיים, בלוק חדש:
    ```ts
    if (wasPanning) {
      armSuggestion("pen");
    } else if (wasDrawing && toolRef.current === "pen") {
      armSuggestion("pan");
    }
    ```
    (רק `"pen"`, לא `"eraser"` — מוחק לעולם לא מפעיל הצעה, כנדרש).
  - `handlePointerDown()`: בענף `if (toolRef.current === "pan") { singlePanStart.current = {...} }`
    מוסיפים `clearSuggestion();` — תזוזה אמיתית התחילה, ההצעה (אם הייתה)
    כבר לא רלוונטית. **וגם** בענף ה-`else` (עט/מחק מתחילים קו חדש)
    מוסיפים `clearSuggestion();` — החלטת ארכיטקטורה מעבר למה שה-design
    פירט במפורש: אם ההצעה הייתה "אפשר להזיז", אבל התלמיד/ה ממשיכ/ה
    לכתוב קו נוסף, ההצעה כבר לא נכונה ולא אמורה להישאר תקועה על המסך.
  - `panButtonClick()` ו-`startPanHold()` (פאד הניווט הקיים): גם שתיהן
    מוסיפות `clearSuggestion();` בתחילתן — נתיב שני, נפרד מהגרירה,
    שחייב לנקות הצעה בדיוק כמו גרירה (ראו Implementation Notes).
  - `stopPanHold()` (משוחרר גם בלחיצה בודדת וגם בסיום החזקה־רציפה):
    מוסיפה `armSuggestion("pen");` בסופה — פעולת ניווט כלשהי הסתיימה,
    אותה לוגיקה בדיוק כמו סיום גרירה.
  - שלושת כפתורי `.notebook-tool-controls` (ולא רק `setTool`) קוראים גם
    ל-`clearSuggestion()` ב-`onClick` שלהם (לפני/אחרי `setTool` כבר
    שם) — "לחיצה על כלי כלשהו מפסיקה את הפעימה מיד", כולל לחיצה על
    הכלי שדווקא *כן* הוצע.
  - JSX של כל כפתור בשתי העמודות החדשות מקבל
    `data-suggested={suggestedTool === "pan"}` (לכפתור היד) /
    `data-suggested={suggestedTool === "pen"}` (לכפתור העט) — תכונה
    נפרדת מ-`aria-pressed` הקיים, לא מחליפה אותה, כדי שהמקרה "נבחר *וגם*
    מוצע" יהיה שני attributes נפרדים על אותו אלמנט (ראו Technical Approach).

- **`src/App.css`** — בלוקים חדשים:
  - `.notebook-zoom-controls` / `.notebook-tool-controls`: `display:flex;
    flex-direction:column; gap:` קטן; כל כפתור `width/height:
    var(--notebook-btn-size, 40px); border-radius:50%;` (עיגול אמיתי,
    לא `border-radius:8px` הריבועי-מעוגל הקיים).
  - **תיקון מול הארכיטקטורה המקורית שנרשמה כאן** (התגלה בפיתוח): הטיוטה
    הראשונה של המסמך הזה שמה את `.notebook-tool-controls` ב-
    `inset-inline-end` (שמאל-תחתונה, הפינה *הנגדית* מ-`.notebook-pan-controls`)
    — זה סותר ישירות את `design.md` ("עמודת כלים — פינה **ימנית**-תחתונה")
    ואת בקשת המשתמש המפורשת ("בצד ימין למטה"). התיקון: `.notebook-tool-controls`
    יושב ב-**אותו** צד כמו `.notebook-pan-controls` (`inset-inline-start`,
    ימין-תחתונה) — לא בפינה הנגדית. **ניסיון ראשון** הערים אותו מעל
    הפאד (`bottom:120px`) — זה נראה טוב במסך-מלא (stage גבוה), אבל
    בתצוגה המוטמעת (לא מסך-מלא) ה-stage יכול להיות נמוך מספיק שהטור
    המוערם מתנגש עם ה-minimap למעלה (נבדק בפועל בתצוגה מקדימה — ראו
    `docs/features/notebook-toolbar-redesign/status.md`). **התיקון הסופי:**
    `.notebook-tool-controls` יושב **לצד** הפאד (אותו `bottom:10px`),
    עם `inset-inline-start:120px` (= `10px` offset הפאד + `100px` רוחבו
    + `10px` רווח) — זה לא תלוי כלל בגובה ה-stage. גם
    `.notebook-zoom-controls` עבר מ-`bottom:10px` ל-`top:10px` (נשאר
    `inset-inline-end`, שמאל-עליונה) — וה-minimap הקיים (שהיה גם הוא
    שמאל-עליונה, `top:10px; inset-inline-end:10px`) הועבר ל-
    `inset-inline-start` (ימין-עליונה, פינה שהייתה ריקה) כדי לא לחפוף
    עם טור הזום החדש. ראו ה-CSS בפועל להסבר המלא.
  - `.notebook-clear-btn` בתוך `.notebook-zoom-controls` מקבל `margin-top:
    8px` (הרווח-לא-קו מה-design) במקום המיקום הנפרד שהיה לו.
  - `[data-suggested="true"]`: `animation: notebook-suggest-pulse 1.6s
    ease-in-out infinite;` — `@keyframes notebook-suggest-pulse` עובר
    `transform: scale(1) → scale(1.18) → scale(1)` יחד עם `box-shadow`
    שמתרחב ודועך (glow), **בלי** לגעת ב-`background`. `aria-pressed="true"`
    ממשיך לקבוע רק `background: var(--accent-bg)` כמו היום — שני ה-
    attributes עצמאיים, יכולים לחול יחד על אותו כפתור בלי להתנגש (אחד
    קובע רקע, השני קובע transform+shadow מונפשים).

## Data / State Changes

| id | label | diameterPx |
|---|---|---|
| `small` | קטן | 32 |
| `medium` | בינוני | 40 |
| `large` | גדול | 48 |

`DEFAULT_BUTTON_SIZE_LEVEL = "medium"` (40px — קרוב לגודל `.tool-btn`
הקיים היום, 36px, כדי שברירת המחדל לא תשנה דרסטית את התחושה).

| id | label | delayMs |
|---|---|---|
| `off` | כבוי | `null` |
| `verySlow` | איטי מאוד | 3000 |
| `slow` | איטי | 2200 |
| `medium` | בינוני | 1500 |
| `fast` | מהיר | 900 |
| `veryFast` | מהיר מאוד | 500 |

`DEFAULT_SUGGESTION_SENSITIVITY_LEVEL = "medium"` (1500ms — אין עדיין
עדות שטח, כמו מהירות הניווט ועוצמת קפיצת הגלילה; האמצעית מתוך החמש).

`suggestedTool: "pan" | "pen" | null` — state חדש ב-`PracticeNotebook`,
לא prop (לוקאלי לרכיב, לא נשמר, מתאפס בכל טעינה מחדש של השאלה — בדיוק
כמו `tool`/`zoomPercent` הקיימים).

## Technical Approach
ההצעה נשענת לגמרי על נקודות שכבר קיימות בקוד שמסמנות "קו הסתיים" או
"תזוזה התחילה/הסתיימה" — אין פולינג, אין `requestAnimationFrame` חדש.
שני המקורות לתזוזה (גרירה עם כלי היד, ולחיצה על פאד-הניווט) הם שני
נתיבי קוד נפרדים לגמרי (`handlePointerMove`'s `singlePanStart` branch
מול `panButton`/`startPanHold`/`stopPanHold`), ולכן כל אחד מהם צריך את
הזוג `clearSuggestion()`/`armSuggestion("pen")` משלו — זו הסיבה
שה-Implementation Notes למטה מדגישות את שני הנתיבים בנפרד.

האנימציה עצמה היא CSS טהור (`@keyframes` עם `animation: ... infinite`),
לא state שמתעדכן על כל פריים — React רק מוסיף/מסיר את ה-attribute
`data-suggested`, הדפדפן עושה את שאר העבודה. זה עקבי עם האופן שבו
`applyTransform()` כבר כותב ל-DOM ישירות בלי דרך state עבור עדכונים
בתדירות גבוהה — אבל כאן זה עוד יותר פשוט כי זה בכלל לא תדיר (state
משתנה פעם אחת לכל הצעה, לא per-frame).

## Edge Cases
- **מסך מלא (fullscreen) מול embedded** — שתי העמודות קיימות בשני
  המצבים (בדיוק כמו `.notebook-zoom-controls`/`.notebook-pan-controls`
  היום), באותו מיקום יחסי לאזור הכתיבה.
- **מעבר דף תוך כדי שההצעה פעילה** — מעבר לדף אחר (◀▶ בניווט-דפים)
  לא מוזכר ב-design כטריגר לניקוי הצעה; מכיוון שזו פעולה לא קשורה
  לכתיבה/תזוזה, `suggestedTool` נשאר כמו שהוא (לא מתאפס) — אם זה
  מרגיש מוזר בפועל, זה תיקון קטן לסבב הבא, לא חוסם עכשיו.
- **"כבוי" ברגישות ההצעה** — `armSuggestion` עצמה בודקת `suggestionDelayMs === null`
  ויוצאת מיד; `suggestedTool` פשוט אף פעם לא משתנה מ-`null`. שום כפתור
  לא מקבל `data-suggested`, שום אנימציה לא רצה.
- **שינוי הגדרת רגישות באמצע הצעה פעילה (תיאורטי — הדיאלוג חוסם את
  המחברת כשהוא פתוח)** — לא רלוונטי בפועל, אותו נימוק כמו בפיצ'רי
  ההגדרות הקודמים.
- **שתי אצבעות (pinch)** — `handlePointerDown`'s branch ל-pinch כבר
  מאפס `singlePanStart.current = null`; מכיוון שה-pinch לא עובר דרך
  אף אחד מהנתיבים שמפעילים `armSuggestion`, הצעה פעילה פשוט נשארת כמו
  שהיא (לא מתנקה, לא מתחדשת) — pinch הוא מחוץ למנגנון הזה לגמרי,
  עקבי עם זה ש-design.md גם לא הזכיר אותו.

## Implementation Notes (found during manual verification)
- **The embedded (non-fullscreen) stage can be too short for the 5-button zoom column.**
  Confirmed in a real preview: at a typical ~190px-tall embedded stage, the column (built
  for ~240px) ran past the stage's own bottom edge. `.notebook-stage` must keep its
  `overflow:hidden` (several e2e tests rely on it as the clipping pan/zoom viewport — see
  `tests/e2e/helpers/notebookAnswer.ts`), so the fix was a new non-clipping
  `.notebook-stage-frame` wrapper: it now owns the `flex:1;min-height:0` sizing, with
  `.notebook-stage` filling it via `position:absolute;inset:0` (same final box, so nothing
  that measured `.notebook-stage` changes) and the four floating groups
  (`.notebook-minimap`/`.notebook-zoom-controls`/`.notebook-pan-controls`/
  `.notebook-tool-controls`) moved to be the frame's children instead of the stage's.
- **That alone wasn't enough** — `.notebook-screen` is a flex column, and flex items paint
  in **document order** when `z-index` is `auto` (not "non-positioned before positioned"
  like normal block layout). Since `.notebook-toolbar` comes after the frame in the
  markup, it was winning every click in the overlap area. Fixed with `z-index:1` on
  `.notebook-stage-frame`, so the floating controls always win a click over the toolbar
  beneath them when the two visually overlap on a short stage.
- Even after both fixes, a genuinely short stage still has some *visual* crowding between
  the zoom column's last button and the toolbar below (not a functional bug — each button
  keeps a real, correctly-targeted hit area; verified with `elementsFromPoint`). Accepted
  as-is for this round; fullscreen mode (`⤢`, right above it) has ample room and is
  always one tap away.
- **For `qa`:** the suggestion pulse (`[data-suggested="true"] { animation: ... infinite }`)
  means Playwright's default `click()` actionability check can time out waiting for the
  element to be "stable" (it never stops moving while pulsing) — tests that click a
  possibly-pulsing button need `{ force: true }`, same as this phase's own manual
  verification needed. Confirmed working end-to-end with `force: true`: stroke → wait →
  hand suggested; clicking the suggested (or any) tool clears it immediately; drag-pan →
  release → wait → pen suggested; eraser strokes never suggest anything.

## Risks / Tradeoffs
- `clearSuggestion()` בתחילת כל קו כתיבה חדש (גם אם זה אותו כלי עט
  שכבר היה נבחר) היא תוספת שלי מעבר למה שה-design פירט במפורש — החלטה
  מכוונת: בלי זה, הצעת "אולי כדאי להזיז" הייתה יכולה להישאר פועמת על
  המסך גם כשברור שהתלמיד/ה בחר/ה להמשיך לכתוב, מה שהופך אותה מהצעה
  שימושית להסחת דעת. הסיכון היחיד: אם זה גורם להצעה "להבהב" (להיעלם
  ולחזור) בין קווים קצרים ומהירים — פתרון אם זה יתברר כבעיה: armSuggestion
  יכולה לבדוק אם ה-target כבר זהה ל-suggestedTool הנוכחי ולא לאפס/להתחיל
  טיימר חדש, אבל זה מעבר לסקופ הסבב הראשון.
- שני הערכים המדויקים (גדלי כפתורים, זמני השהיה) הם הערכה סבירה, לא
  מאומתת בשטח — בדיוק כמו מהירות הניווט ועוצמת קפיצת הגלילה לפני
  שאומתו. אם יתברר בפועל שההמתנה "בינוני" (1.5 שניות) ארוכה/קצרה מדי,
  זה תיקון לטבלה בלבד, לא לארכיטקטורה.

## Open Questions
None.
