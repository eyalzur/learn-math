# כפתורי ניווט במחברת — פאד כיוונים — Architecture

## Overview
ארבעה כפתורים חדשים ב-`PracticeNotebook.tsx`, לצד `.notebook-zoom-controls`
הקיים, שכל אחד מהם קורא לפונקציה חדשה (`panButton(dx, dy)`, בהשראת
`zoomButton` הקיים) שמזיזה את `panZoomRef.current` בצעד קבוע ומפעילה
`applyTransform()` — אותה תבנית בדיוק שכפתורי הזום כבר משתמשים בה. מצב
ה-disabled של כל כפתור מחושב מ-`panZoomRef.current` בכל רינדור.

**עדכון (2026-10-09):** שאלת החסימה הוכרעה — המשתמש ביקש להמשיך עם
כפתורי הניווט ("צריך כפתורי ניווט") בלי לבחור במפורש בין שלוש האפשרויות
שהוצעו, אז ההכרעה כאן היא שלי: **אפשרות (ב)** — מוסיפים הגבלת-גבולות
אמיתית גם לגרירה החופשית, לא רק לכפתורים. הנימוק: זו האפשרות היחידה
שבאמת פותרת את הבעיה המקורית (ילד/ה נתקע/ת עם דף שגרר/ה הרחק מחוץ
לתצוגה) ועומדת בקריטריון הקבלה כפי שהוא כתוב, בלי ליצור חוסר-עקביות בין
שתי דרכי הניווט. ההיקף עדיין קטן וממוקד — פונקציית clamp אחת, מופעלת
בכל מקום שכבר כותב ל-`panZoomRef`. ראו Technical Approach למימוש
המדויק.

## Affected Files / Components
- `src/data/notebook.ts` — קבוע חדש לצעד ההזזה (`PAN_STEP_PX`, ליד
  `CELL`/`PEN_CELLS` וכו׳ — "ערך אחד, קל לשנות" כמו שהספק דרש), ופונקציה
  חדשה `clampPan(panZoom, stageWidth, stageHeight): PanZoom`.
- `src/components/PracticeNotebook.tsx` —
  - פונקציה חדשה `panButton(dx: number, dy: number)`, מבנה זהה ל-
    `zoomButton` (שורה 579).
  - `clampPan(...)` נקרא בכל אחת מנקודות הקריאה הקיימות שכותבות ל-
    `panZoomRef.current` מתוך תנועה (גרירה חד-אצבעית, פינץ', גלגלת,
    `zoomButton`, `panButton` החדש) — ראו Technical Approach לרשימה
    המדויקת.
  - JSX: ארבעה `<button>` חדשים באשכול נפרד תחת `.notebook-zoom-controls`
    הקיים (שורות 671-699) — ראו design.md לצורת הצלב ול-`aria-label`.
  - פונקציית עזר לחישוב מצב `disabled` של כל כיוון (ראו Technical
    Approach) — נקראת מתוך הרינדור, לא נשמרת ב-state נפרד.
- `src/App.css` — מחלקה חדשה לאשכול (`.notebook-pan-controls` או דומה),
  ממוקמת `position: absolute; bottom: 10px; inset-inline-start: 10px`
  (הפינה הנגדית ל-`.notebook-zoom-controls`), ומחלקת-עזר לפריסת הצלב
  (CSS grid 3×3, שלושה מהתאים ריקים). כפתורי ה-disabled עצמם — לא מחלקה
  חדשה, reuse של הסגנון הקיים ל-`button:disabled` (ראו "דף קודם/הבא").

## Data / State Changes
אין state חדש ב-React. `panZoomRef` (כבר קיים) ממשיך להיות מקור האמת
היחיד למיקום/זום, בדיוק כמו היום — כפתורי הכיוון רק קוראים לו וכותבים
אליו, לא מוסיפים ייצוג מקביל. ה-disabled state של כל כפתור הוא פונקציה
טהורה של `panZoomRef.current` + גודל ה-stage הנוכחי (`stageRef`), לא
state שמור — נגזר בכל רינדור, כמו שה-minimap כבר נגזר מאותם נתונים.

## Technical Approach
**פונקציית ה-clamp (`notebook.ts`, חדשה — `clampPan(panZoom, stageWidth,
stageHeight): PanZoom`):** לכל ציר בנפרד, החישוב הוא הגבול הסטנדרטי
ל"אל תיתן לתוכן לצאת לגמרי מהתצוגה": תוכן הדף על המסך תופס מ-`panX` עד
`panX + PAGE_WIDTH * zoom` (ואותו דבר ל-Y עם `PAGE_HEIGHT`). כש-הדף גדול
מהתצוגה (המצב הרגיל בזום-אין), `panX` חייב להישאר בין
`stageWidth - PAGE_WIDTH * zoom` (הקצה הימני/תחתון של הדף מגיע בדיוק
לקצה התצוגה) לבין `0` (הקצה השמאלי/עליון של הדף מגיע בדיוק לקצה
התצוגה). כש-הדף קטן מהתצוגה (זום-אאוט רחוק, או "הצג את כל הדף") שני
הגבולות האלה מתהפכים ביחס זה לזה — אז `clampPan` לוקח min/max בין שני
הערכים ולא מניח סדר קבוע:
```
panX = clamp(panX, min(0, stageW - PAGE_WIDTH*zoom), max(0, stageW - PAGE_WIDTH*zoom))
```
(ואותו דבר ל-`panY`/`PAGE_HEIGHT`/`stageH`). זה בדיוק מבטיח: בזום-אין
הדף לא יכול לצאת לגמרי מהתצוגה; בזום-אאוט הדף נשאר בתוך התצוגה (לא
"צף" חופשי במרכז ריק) — שתי התנהגויות שכבר באות בחינם מאותה נוסחה אחת.

**נקודות הקריאה ל-`clampPan`:** אחרי כל עדכון של `panZoomRef.current`
שמקורו בתנועה אמיתית — גרירה חד-אצבעית (`handlePointerMove`, הענף של
`singlePanStart`), פינץ' (אותה פונקציה, הענף של `pinch.current`), גלגלת
עכבר (`handleWheel`), כפתורי הזום הקיימים (`zoomButton`), וכפתורי הכיוון
החדשים (`panButton`) — כל מקום שכבר כותב ל-`panZoomRef.current` עוטף את
הערך החדש ב-`clampPan(..., stageRect.width, stageRect.height)` לפני
השמירה. **לא** מופעל על זום-החזקה (`animateTransformTo`/
`computeFitTransform`/`computeInitialTransform`) — אלה כבר מחושבים
להישאר בתוך גבולות הדף מעצם ההגדרה שלהם (ממורכזים/מותאמים-לדף), ואין
טעם לכפות עליהם חישוב כפול.

**התזוזה עצמה:** `panButton(dx, dy)` מעדכן `panZoomRef.current.panX/panY`
ב- ±`PAN_STEP_PX` (לא מוכפל ב-zoom — תנועה קבועה על המסך, לא על הדף,
עקבי עם איך `zoomButton` כבר מתייחס ל-factor כקבוע-על-המסך סביב מרכז
ה-stage), מעביר דרך `clampPan`, ואז `applyTransform()`. סימטרי לחלוטין
לדפוס של `zoomButton`.

**חישוב disabled:** לכל כיוון, להריץ `clampPan` על "מה panX/panY היו
אם היינו זזים צעד שלם לאותו כיוון" ולהשוות לתוצאה המקוצצת בפועל — אם
`clampPan` קיצץ את התזוזה (התוצאה שונה מהערך הלא-מוגבל), הכיוון הזה
מושתק. זו אותה פונקציית clamp בדיוק, לא לוגיקה מקבילה — כך שאי אפשר
שהכפתור "יחשוב" שיש עוד לאן לזוז כש-clampPan בפועל יעצור את זה, או
להפך.

## Edge Cases
- **מסך-מלא מול מצב רגיל:** `stageRef`/`stackRef` הם אותם refs בשני
  המצבים (`.notebook-screen.fullscreen` רק משנה גודל/מיקום ב-CSS, לא
  מחליף אלמנטים) — אז `panButton` וחישוב ה-disabled לא צריכים הבדל
  קוד בין המצבים, רק הבדל מיקום CSS לאשכול החדש (שכבר ב-design.md).
- **זום-החזקה (hold-to-zoom) פעיל בו-זמנית:** לא רלוונטי ישירות — זום-
  החזקה תלוי בהחזקת אצבע בלי תזוזה; לחיצה על כפתור כיוון היא תזוזה
  אמיתית, כך שלא יכולים לקרות באותו רגע (אותו עיקרון שכבר חל על קפיצת
  הגלילה האוטומטית הקיימת, PR #77).
- **גודל ה-stage משתנה (resize/סיבוב מכשיר):** חישוב ה-disabled צריך
  לקרוא את `stageRef.current.getBoundingClientRect()` בכל פעם, לא לשמור
  גודל ישן — עקבי עם `handleResize`/`applyTransform` הקיימים.

## Risks / Tradeoffs
- הוספת קבוע חדש (`PAN_STEP_PX`) ל-`notebook.ts` היא שינוי קטן וממוקד —
  לא נוגעת ב-`CELL`/`PEN_CELLS`/`ERASER_CELLS` הקיימים (אלה קשורים
  לציור, לא לפאנינג — אין קשר מספרי ביניהם, בניגוד למה שקרה ברשת הרקע
  שתוקנה ב-PR #77).
- המבנה (`panButton` symmetric ל-`zoomButton`) מכוון לעקביות קוד, לא רק
  UX — מי שקורא את הקובץ מוצא שני כפתורי-פעולה-על-תצוגה באותה צורה.

## Open Questions
None. (הוכרע 2026-10-09 — אפשרות (ב), ראו הערה ב-Overview ו-Technical
Approach.)

## Implementation Notes
נבנה כמתוכנן, עם שלושה דברים שהתגלו תוך כדי מימוש ולא היו באדריכלות
המקורית:

1. **זום-החזקה (hold-to-zoom) כן היה צריך clamp.** Overview הניח ש
   `animateTransformTo`/זום-החזקה "כבר מחושבים להישאר בגבולות" — נכון
   ל-`computeFitTransform`/`computeInitialTransform`, אבל **לא** ליעד
   של זום-החזקה עצמו (`triggerHoldZoom`), שמחושב דרך `zoomAroundPoint` —
   אותה פונקציה בדיוק שכבר ידוע שצריכה clamp ב-`handleWheel`/
   `zoomButton`. תוקן: `clampPan` מופעל גם שם.
2. **ה-disabled לא היה מתעדכן אחרי גרירה טהורה.** `panZoomRef` הוא ref
   (לא state, בכוונה — ראו ההערה הקיימת מעל הגדרתו), ו-`applyTransform`
   היה קורא ל-`setZoomPercent` עם אותו ערך מעוגל כש-רק הפאן השתנה (לא
   הזום) — React לא מרנדר מחדש במקרה הזה, אז הכפתורים היו נשארים עם
   מצב disabled ישן. תוקן: `useState` חדש (`panVersion`, ערכו לא
   נקרא בכלל — רק קיים כדי לכפות רינדור) נבדק ב-`applyTransform`.
3. **באג RTL אמיתי, נתפס בבדיקה חזותית לפני שהתפרסם.** הניסיון הראשון
   שם `direction: ltr` ישירות על `.notebook-pan-controls` — האלמנט
   הממוקם (עם `inset-inline-start`). זה תיקן את סדר העמודות בתוך
   ה-grid, אבל **גם** הפך את `inset-inline-start` של האלמנט עצמו
   להתפרש כ"שמאל" (LTR) במקום "ימין" (RTL) — כך שהאשכול כולו נחת באותו
   צד כמו כפתורי הזום, לא בפינה הנגדית. תצוגה מקדימה אינטראקטיבית
   (מדידת `boundingClientRect` בפועל, לא רק קריאת הקוד) תפסה את זה.
   תוקן: `direction: ltr` עבר לאלמנט-פנימי חדש (`.notebook-pan-grid`),
   כך שהמיקום (`.notebook-pan-controls`) ממשיך לרשת RTL רגיל ונוחת
   בפינה הנכונה, ורק סדר העמודות בתוך ה-grid מכוון.

אומת בתצוגה מקדימה אינטראקטיבית (הרכיב האמיתי, מחוץ לאפליקציה): שני
האשכולות בפינות נגדיות, הצלב בכיוון הפיזי הנכון, מצב ה-disabled מתעדכן
נכון אחרי לחיצות חוזרות וחוזר ל-enabled כשמתרחקים מהקצה, אפס שגיאות
קונסול. גרסה הועלתה `1.33.0` → `1.34.0` (`npm run bump:feature`).
`build`/`lint`/`tsc` ירוקים.
