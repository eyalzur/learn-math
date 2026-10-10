# הגדרת מהירות כפתורי הניווט במחברת — Architecture

## Overview
בדיוק כמו ש-`holdZoomLevel` (מזהה) נשמר per-student ומתורגם ב-`App.tsx` למספר
בודד (`holdZoomFactor`) שיורד כ-prop עד ל-`PracticeNotebook`, כך גם
`panSpeedLevel` (מזהה) יתורגם ב-`App.tsx`, דרך טבלת חיפוש חדשה ב-
`src/data/notebook.ts`, לשני מספרים — `panStepPx` ו-`panHoldIntervalMs` —
שיורדים כ-props דרך `Practice` עד ל-`PracticeNotebook`, ומחליפים שם את שני
הקבועים הקשיחים הקיימים. `PAN_HOLD_DELAY_MS` (350ms, ההמתנה לפני שההחזקה
מתחילה לחזור על עצמה) **נשאר קבוע בקוד** — הדיזיין לא הציע לכוונן אותו, ורק
"כמה רחוק" ו"כמה מהר חוזר" הם הדבר שהמשתמש מרגיש.

## Affected Files / Components

- **`src/data/notebook.ts`** — הוספה:
  - `interface PanSpeedLevel { id: string; label: string; stepPx: number; holdIntervalMs: number | null }`
  - `export const PAN_SPEED_LEVELS: PanSpeedLevel[]` — שש הדרגות, "כבוי" ראשון.
  - `export const DEFAULT_PAN_SPEED_LEVEL = "medium"`.
  - `export function panSpeedFor(levelId: string): { stepPx: number; holdIntervalMs: number | null }` —
    מחפש ב-`PAN_SPEED_LEVELS`, עם fallback לדרגת ה-default אם ה-id לא נמצא
    (בדיוק כמו `holdZoomFactorFor`, אבל זה מחזיר אובייקט במקום `number | null`
    כי יש שני ערכים, לא אחד).
  - הסרה: `export const PAN_STEP_PX = 120;` נמחק — הערך הופך תלוי-דרגה, לא
    קבוע גלובלי. (לא היה מיובא משום מקום מלבד `PracticeNotebook.tsx`, שעובר
    ל-prop.)

- **`src/data/preferences.ts`** — הוספה, מראה מדויק של `holdZoomLevel`/
  `setHoldZoomLevel`:
  - שדה `panSpeedLevel?: Record<string, string>` בטיפוס הפנימי של ה-storage.
  - `export function panSpeedLevel(studentId: string): string` — מחזיר את
    הערך השמור או `DEFAULT_PAN_SPEED_LEVEL`.
  - `export function setPanSpeedLevel(studentId: string, levelId: string): void`.

- **`src/App.tsx`** —
  - import: `panSpeedLevel as panSpeedLevelFor`, `setPanSpeedLevel` מ-
    `./data/preferences`; `panSpeedFor` מ-`./data/notebook` (לצד
    `holdZoomFactorFor` הקיים).
  - אחרי שורה 301 (`holdZoomFactor`): `const panSpeedLevel =
    panSpeedLevelFor(student.id); const { stepPx: panStepPx, holdIntervalMs:
    panHoldIntervalMs } = panSpeedFor(panSpeedLevel);`
  - ל-`<TopicPicker>` (לצד `holdZoomLevel`/`onHoldZoomLevelChange` בשורות
    340–344): `panSpeedLevel={panSpeedLevel}` ו-
    `onPanSpeedLevelChange={(levelId) => { setPanSpeedLevel(student.id,
    levelId); setPreferencesTick((n) => n + 1); }}`.
  - ל-`<Practice>` (לצד `holdZoomFactor` בשורה 424): `panStepPx={panStepPx}`
    ו-`panHoldIntervalMs={panHoldIntervalMs}`.

- **`src/components/TopicPicker.tsx`** —
  - import נוסף: `PAN_SPEED_LEVELS` מ-`../data/notebook` (לצד
    `HOLD_ZOOM_LEVELS` הקיים).
  - props חדשים: `panSpeedLevel?: string; onPanSpeedLevelChange?: (levelId:
    string) => void;` — אותה תבנית בדיוק כמו `holdZoomLevel`/
    `onHoldZoomLevelChange`.
  - `const showPanSpeed = panSpeedLevel !== undefined &&
    onPanSpeedLevelChange !== undefined;` ו-`showSettings` מתעדכן ל-
    `showReadAloud || showHoldZoom || showPanSpeed`.
  - בלוק JSX חדש `.pan-speed-setting`, מיד אחרי בלוק `.hold-zoom-setting`
    (שורה 207 ואילך בקובץ הנוכחי), מראה מדויק של המבנה הפנימי שלו (header עם
    אייקון+כותרת+תת-כותרת, ואז `role="group"` עם מיפוי `PAN_SPEED_LEVELS`
    לכפתורים עם `aria-pressed`).

- **`src/components/Practice.tsx`** — props חדשים `panStepPx: number;
  panHoldIntervalMs: number | null;` (לא אופציונליים — כפתורי הניווט עצמם
  כבר מוצגים תמיד מ-PR #78, אין "אין פיצ'ר" state כמו ב-hold-zoom), מועברים
  ללא שינוי ל-`<PracticeNotebook>` (לצד `holdZoomFactor` בשורה 711).

- **`src/components/PracticeNotebook.tsx`** —
  - הסרת ה-import של `PAN_STEP_PX` מ-`../data/notebook` (נשאר רק
    `clampPan`).
  - הסרת הקבוע המקומי `const PAN_HOLD_INTERVAL_MS = 80;` (שורה 92).
    `PAN_HOLD_DELAY_MS = 350` **נשאר** כקבוע מקומי, ללא שינוי.
  - props חדשים: `panStepPx: number; panHoldIntervalMs: number | null;`.
  - כל שימוש ב-`PAN_STEP_PX` (שורות 814/819/827/828/832/840/841/845/853/854/858)
    הופך ל-`panStepPx` מה-props.
  - `startPanHold(dx, dy)` (שורה 661 ואילך): אם `panHoldIntervalMs === null`
    (דרגת "כבוי") — לא מתזמן כלל את ה-`setTimeout`/`setInterval` הפנימי;
    `panButtonClick`'s single-step call (שכבר קורה ב-`onClick`/`pointerdown`
    הראשוני) ממשיך לעבוד בלי שינוי. אחרת מתזמן בדיוק כמו היום, עם
    `panHoldIntervalMs` במקום הקבוע.

- **`src/App.css`** — בלוק CSS חדש `.pan-speed-setting` /
  `.pan-speed-header` / `.pan-speed-icon` / `.pan-speed-options` /
  `.pan-speed-option` / `.pan-speed-option[aria-pressed="true"]` — העתק מדויק
  של `.hold-zoom-setting` וכל מה שתחתיו (שורות 803–847 הנוכחיות), בשם מחלקה
  מוחלף בלבד. אין class משותף קיים לשני הבוררים (גם `read-aloud-setting`
  ו-`hold-zoom-setting` לא חולקים class בסיס) — העתקה היא העקביות עם מה
  שקיים, לא חריגה ממנו.

## Data / State Changes
- `PAN_SPEED_LEVELS: PanSpeedLevel[]` — שש רשומות: `off` (`stepPx: 120,
  holdIntervalMs: null`), `verySlow`/`slow`/`medium`/`fast`/`veryFast` עם
  `stepPx` עולה ו-`holdIntervalMs` יורד. ערכי `medium` נשארים זהים לקבועים
  הישנים (`120`, `80`) כך שתלמיד/ה שלא פותח/ת הגדרות בכלל (ברירת מחדל =
  `medium`) לא חווה שום שינוי התנהגות:

  | id | label | stepPx | holdIntervalMs |
  |---|---|---|---|
  | `off` | כבוי | 120 | `null` |
  | `verySlow` | אטי מאוד | 70 | 160 |
  | `slow` | אטי | 95 | 120 |
  | `medium` | בינוני | 120 | 80 |
  | `fast` | מהיר | 150 | 55 |
  | `veryFast` | מהיר מאוד | 190 | 35 |

- `DEFAULT_PAN_SPEED_LEVEL = "medium"` — האמצעית מבין חמש הדרגות הפעילות
  (לא כולל "כבוי", בדיוק כמו שקריטריון הקבלה מגדיר).
- storage: מפתח `panSpeedLevel` חדש, אותו shape בדיוק כמו `holdZoomLevel`
  הקיים (`Record<studentId, levelId>`), אותו קובץ (`src/data/preferences.ts`),
  אין migration נדרש (שדה חדש, לא שינוי לשדה קיים).

## Technical Approach
השכבה היחידה ש"יודעת" שיש דרגות היא `notebook.ts` (ה-levels table + lookup) —
`PracticeNotebook.tsx` לא יודע בכלל שקיימת הגדרה כזו, הוא מקבל שני מספרים
(אחד מהם אולי `null`) בדיוק כמו ש-`holdZoomFactor` כבר עובד היום. זה אומר
שה-off semantics ("מבטל רק את ההחזקה") ממומש בנקודה אחת בלבד:
`startPanHold` בודק `panHoldIntervalMs === null` ומחליט לא לתזמן. אין מקום
נוסף בקוד שצריך לדעת מה "כבוי" אומר.

`panButtonClick`/`panDisabled`/`panButton` (הקשה בודדת) לא בודקים שום דבר
ביחס ל-off — הם ממשיכים להשתמש ב-`panStepPx` בדיוק כמו היום, כי הקשה בודדת
תמיד עובדת בכל הדרגות כולל "כבוי".

## Edge Cases
- **מעבר דרגה בזמן החזקה פעילה** — לא אפשרי בפועל: הדיאלוג `settings-dialog`
  הוא מודאל שמסתיר את `PracticeNotebook` לגמרי (אין נגיעה בכפתורי כיוון
  כשהדיאלוג פתוח). לא נדרש טיפול.
- **`levelId` לא מוכר בעדים ישנים (storage corruption/future-id)** —
  `panSpeedFor` עם fallback ל-`DEFAULT_PAN_SPEED_LEVEL`, בדיוק כמו
  `holdZoomFactorFor` כבר עושה היום.
- **"כבוי" ועדיין צעד הקשה בודדת שונה מברירת המחדל** — לא בעיה: `off.stepPx
  = 120` זהה לברירת המחדל הקיימת, כך שמעבר ל"כבוי" לא משנה בטעות גם את גודל
  הצעד. זה תואם את ניסוח ה-design/"ממשיכים לעבוד בהקשה בודדת כרגיל".
- **`clampPan` עם צעדים גדולים יותר (`veryFast`, 190px)** — `clampPan` כבר
  מהדק לכל ערך פאן, לא משנה גודל הצעד; אין שינוי נדרש בו.

## Risks / Tradeoffs
- בחרנו שלב-אחד-לכל-דבר (`stepPx` ו-`holdIntervalMs` יחד בכל רשומת דרגה)
  ולא שתי טבלאות נפרדות — תואם את ההחלטה המוצרית ("בורר אחד"), אבל אומר
  שאי אפשר בעתיד לכוונן רק אחד מהשניים בלי להוסיף דרגה חדשה. זה out of
  scope מפורש ב-product-spec.md, לא נשקל כסיכון אמיתי.
- מספרי ה-`stepPx`/`holdIntervalMs` המדויקים (טבלה למעלה) הם הערכה סבירה
  ולא נתונים מאומתים בשטח (שונה מ-`HOLD_ZOOM_LEVELS`, שהדרגה המומלצת שם
  אומתה בפועל) — זה תואם במפורש את product-spec.md ("בלי עדות שטח קודמת").
  אם יתברר שדרגה מסוימת "לא מורגשת שונה", זה סבב תיקון נפרד על הטבלה
  בלבד, לא על הארכיטקטורה.

## Open Questions
None.
