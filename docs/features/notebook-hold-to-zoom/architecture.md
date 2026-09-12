# זום זמני בהחזקת מגע — כתיבה רציפה במחברת — Architecture

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
  המוצג, או בשום callback שההורה (`Practice.tsx`) מקבל.
- **`src/data/notebook.ts`** — לא משתנה. `zoomAroundPoint`, `clampZoom`,
  ו-`PanZoom` נשארים כמו שהם ומשמשים ישירות.
- **אין** שינוי ב-CSS (`src/App.css`) — `.notebook-stack` לא צריך כלל
  `transition` חדש בגיליון הסגנונות, כי ה-transition מוגדר ומוסר דינמית
  ב-inline style, בדיוק כמו ש-`transform` עצמו כבר מוגדר ב-inline style
  היום.

## Data / State Changes
אין שינוי טיפוסים, props, או מבנה נתונים חוצה-קבצים. כל התוספת היא refs
פנימיים חדשים ב-`PracticeNotebook.tsx` (לא `useState` — בדיוק כמו
`panZoomRef`/`toolRef` הקיימים, כדי לא לגרום ל-re-render על כל תזוזה/טיימר):

```ts
const holdZoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const holdZoomPointerId = useRef<number | null>(null);
const holdZoomDownPos = useRef<{ x: number; y: number } | null>(null);
/** null = לא במצב "מוזם-אאוט זמני". לא-null = הזום/מיקום שצריך לחזור אליו
 *  בהרמת האצבע — גם משמש כדגל "האם המגע הזה כרגע במצב מוזם-אאוט". */
const preHoldTransform = useRef<PanZoom | null>(null);
const transitionClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
```

קבועים חדשים, לצד `PINCH_UNDO_WINDOW_MS` הקיים:
```ts
const HOLD_ZOOM_DWELL_MS = 180;        // design.md: חלון "בלי תזוזה" לפני הפעלה
const HOLD_ZOOM_TRANSITION_MS = 120;   // design.md: משך התנועה המרוככת, בכניסה ובחזרה
const HOLD_ZOOM_FACTOR = 0.7;          // design.md: "~30% יותר מזום-אאוט"
const HOLD_ZOOM_MOVE_TOLERANCE_PX = 4; // לא בדיזיין — סף רעד/רעש חושי, ראו Risks
```

## Technical Approach

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
מחליף אותה. אם המגע הזה כבר במצב מוזם-אאוט (`preHoldTransform.current`
לא-null), הבדיקה הזו לא רלוונטית יותר (`holdZoomTimer.current` כבר `null`
כי הטיימר כבר *הופעל*, לא בוטל) — הזרימה הרגילה (ציור/פאן) ממשיכה על
התצוגה המוזמת-אאוט בלי שום קוד נוסף.

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
`zoomAroundPoint` מצפה לו.

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
מכיל את הערך המוזם-אאוט הסופי (עודכן סינכרונית ב-`triggerHoldZoom`) —
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
- **רעד/רעש חושי בהחזקה:** אצבע/עט לעולם לא נשארים ב-100% אותה נקודת פיקסל.
  `HOLD_ZOOM_MOVE_TOLERANCE_PX` (4px, לא הוזכר ב-design.md) קיים בדיוק בשביל
  זה — בלי סף כלשהו, כל רעד חושי היה מבטל את הטיימר תמיד ומונע מהמחווה
  להיפעל אף פעם. ניתן לכוונן.
- **`locked` משתנה תוך כדי מגע:** לא רלוונטי לזרימה הזו בכלל — הלוגיקה
  החדשה לא קוראת ל-`lockedRef` בשום מקום (בדיוק כמו שדרש design.md: "לא
  תלוי בנעילת הדף"). נעילה עדיין חוסמת ציור חדש בדיוק כמו היום, בנפרד
  לגמרי מהמחווה הזו.
- **שינוי דף (`currentPageIndex`) תוך כדי מגע מוזם-אאוט:** תיאורטי (מחייב
  שני מגעים נפרדים בו-זמנית — אחד מחזיק על הקנבס, אחד מקליק על ◀▶) ולא
  נפתר כאן — אבל זה זהה בדיוק להתנהגות הקיימת היום (זום/פאן לא מתאפסים
  ב-`useEffect` שרץ על שינוי `currentPage`, ראו השורות שמאתחלות רק
  `viewingWholePage`/`savedTransform`). לא סיכון חדש שהפיצ'ר הזה מכניס.
- **גבול הזום התחתון (`MIN_ZOOM = 0.15`):** אם המשתמש/ת כבר בזום נמוך
  מאוד לפני שמפעילים hold-zoom, `zoomAroundPoint` (שכבר עושה `clampZoom`)
  יכול להחזיר שינוי קטן מאוד או אפסי בפועל. זו התנהגות זהה לכפתור `−`
  ולזום-שתי-אצבעות הקיימים באותו מצב — לא בעיה חדשה, לא דורש טיפול מיוחד.
- **מגע שני שמגיע *אחרי* שהטיימר כבר נורה אבל *לפני* שהאנימציה הסתיימה
  חזותית:** `panZoomRef.current` כבר מעודכן לערך הסופי (הלוגיקה סינכרונית),
  כך שאין חשיבות אם ה-CSS transition עדיין "בדרך" חזותית — ה-pinch שמתחיל
  קורא ל-`panZoomRef.current` הנוכחי ומקבל את הערך הנכון בכל מקרה.
- **מגע חדש (pointerdown) שמתחיל בזמן שהאנימציה של *חזרה* ממגע קודם עדיין
  רצה חזותית:** לא בעיה — `panZoomRef.current` כבר שווה לערך הסופי (הקודם),
  אז ה-snapshot של `preHoldTransform` למגע החדש (אם הוא בעצמו יפעיל hold-zoom)
  יהיה נכון, לא "תפוס באמצע אנימציה".

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
  שתידרש מ-`qa`).

## Open Questions
None.

## Implementation Notes

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

