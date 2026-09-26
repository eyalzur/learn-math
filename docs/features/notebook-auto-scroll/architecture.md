# גלילה אוטומטית במחברת לפי כיוון הכתיבה — Architecture

## Overview
תוספת קטנה ל-`handlePointerMove` הקיים ב-`PracticeNotebook.tsx`: כשמגע יחיד פעיל בציור
(עט/מחק, לא הזזה/פינץ'), וקצה מקום הכתיבה נכנס לרצועה צרה סמוך לקצה `notebook-stage`,
`panX` ב-`panZoomRef` הקיים מוזז בהדרגה לכיוון המתאים ומוגבל לגבולות הדף — אותו מנגנון
transform ישיר שכבר קיים לכל הזום/פאן במחברת, בלי לולאת אנימציה נפרדת ובלי state חדש
ב-React. ההגדרה החדשה עוברת per-student דרך אותו מסלול props שכבר קיים ל-readAloud
ול-holdZoomLevel (preferences.ts → App.tsx → TopicPicker.tsx/Practice.tsx → PracticeNotebook.tsx).

## Affected Files / Components
- **`src/data/notebook.ts`** — שלושה קבועים חדשים ופונקציה טהורה חדשה `clampFollowPanX`
  (גבול הדף, ראו Technical Approach). שום שינוי בפונקציות הקיימות (`zoomAroundPoint`,
  `clampZoom`, `computeFitTransform` וכו') — לא נוגעים בזום/פאן הידניים הקיימים.
- **`src/data/preferences.ts`** — שדה חדש ב-`Preferences` (`autoScrollFollow?:
  Record<string, boolean>`) ושתי פונקציות חדשות (`autoScrollFollow`, `setAutoScrollFollow`),
  באותו מבנה בדיוק כמו `readAloud`/`setReadAloud`.
- **`src/components/PracticeNotebook.tsx`** — prop חדש (`autoScrollFollow: boolean`), ref
  מקביל (`autoScrollFollowRef`, מתעדכן ב-`useEffect` כמו `holdZoomFactorRef`), פונקציה
  חדשה `applyAutoScrollFollow(clientX)`, וקריאה לה מתוך הענף הקיים `else if
  (drawing.current)` בתוך `handlePointerMove` — לפני `paintTo`.
- **`src/components/Practice.tsx`** — prop חדש `autoScrollFollow: boolean`, מועבר הלאה
  ל-`PracticeNotebook` בדיוק כמו `holdZoomFactor` היום.
- **`src/components/TopicPicker.tsx`** — שני props חדשים (`autoScrollFollow?: boolean`,
  `onAutoScrollFollowChange?: (value: boolean) => void`), `showAutoScrollFollow` באותה
  צורה כמו `showHoldZoom`, `showSettings` מתעדכן לכלול אותו, ושורה שלישית בגוף הדיאלוג
  (`settings-body`) אחרי שורת זום-ההחזקה, באותה אנטומיה בדיוק כמו שורת ההקראה — ראו
  Technical Approach לגבי שימוש חוזר במחלקות ה-CSS הקיימות.
- **`src/App.tsx`** — קריאה/כתיבה של ההעדפה (`autoScrollFollow`/`setAutoScrollFollow`
  מיובאים בכינוי `autoScrollFollowFor`, כמו `readAloudFor`), ומעבר ה-prop גם ל-`TopicPicker`
  (עם `onAutoScrollFollowChange`) וגם ל-`Practice`.
- **`src/App.css`** — לא צפוי שינוי: השורה החדשה משתמשת מחדש במחלקות הקיימות
  `read-aloud-setting`/`read-aloud-icon`/`read-aloud-text`/`read-aloud-title`/
  `read-aloud-note`/`read-aloud-switch`/`read-aloud-knob` (ראו Technical Approach). אם
  בפועל מתגלה שהערימה של שלוש שורות לא נראית טוב, זה תיקון CSS קטן ב-developer, לא
  שינוי ארכיטקטורה.

## Data / State Changes
```ts
// preferences.ts
interface Preferences {
  readAloud?: Record<string, boolean>;
  holdZoomLevel?: Record<string, string>;
  autoScrollFollow?: Record<string, boolean>; // חדש
}
export function autoScrollFollow(studentId: string): boolean {
  // ברירת מחדל מופעל — ההפך מ-readAloud (ברירת מחדל כבוי). ערך חסר, או שלא נשמר
  // ל-false במפורש, נחשב "מופעל".
  return readAll().autoScrollFollow?.[studentId] !== false;
}
export function setAutoScrollFollow(studentId: string, value: boolean): void { ... }
```

```ts
// notebook.ts — קבועים חדשים, לא בשימוש בשום מקום קיים
export const AUTO_SCROLL_FOLLOW_MARGIN_FRACTION = 0.2; // "בערך חמישית" מהספק/design
export const AUTO_SCROLL_FOLLOW_GAIN = 0.4;
export const AUTO_SCROLL_FOLLOW_MAX_STEP_PX = 32;

/** panX שנשאר בגבולות הדף בזום הנוכחי, בדיוק כמו minimapViewRect כבר מחשב "מה גלוי" —
 *  אבל בשביל להזיז את panX עצמו, לא רק לצייר מלבן. משמש רק ע"י applyAutoScrollFollow;
 *  לא נוגע בזום-שתי-אצבעות/פאן ידני/זום-החזקה, שנשארים ללא הגבלה בדיוק כמו היום. */
export function clampFollowPanX(panX: number, zoom: number, viewportWidth: number): number {
  const pageSpan = PAGE_WIDTH * zoom;
  const lo = Math.min(0, viewportWidth - pageSpan);
  const hi = Math.max(0, viewportWidth - pageSpan);
  return Math.min(hi, Math.max(lo, panX));
}
```

Props (חדש, בכל שכבה — `boolean` רגיל, לא `| null` כמו `holdZoomFactor`, כי אין כאן "עוצמה"
— רק מופעל/כבוי):
`TopicPickerProps.autoScrollFollow?: boolean` + `onAutoScrollFollowChange?`,
`PracticeProps.autoScrollFollow: boolean`, `PracticeNotebookProps.autoScrollFollow: boolean`.

## Technical Approach

### מנגנון המעקב — בקר פרופורציונלי לפי מיקום, לא לפי מהירות
בכל `pointermove` שבו `drawing.current === true` (כלומר עט/מחק פעילים על מגע יחיד —
בדיוק הענף הקיים, לא ענף הזזה/פינץ'), לפני `paintTo`:

1. אם `autoScrollFollowRef.current === false` — יציאה מיידית, אין שום חישוב (אותו דפוס
   כמו `holdZoomFactorRef.current === null`, כדי שכיבוי לא יוסיף שום עלות).
2. `stageRect = stageRef.current.getBoundingClientRect()` (נקרא כבר בכל מקום אחר בקובץ
   הזה על כל אירוע — לא תוספת דפוס חדשה).
3. `localX = clientX - stageRect.left`, `margin = stageRect.width *
   AUTO_SCROLL_FOLLOW_MARGIN_FRACTION`.
4. אם `localX < margin`: `penetration = margin - localX`, כיוון = ימינה (`panX` גדל —
   חושף עוד דף שמשמאל לתצוגה הנוכחית, ראו הנוסחה למטה). אם `localX > stageRect.width -
   margin`: `penetration = localX - (stageRect.width - margin)`, כיוון = שמאלה (`panX`
   קטן — חושף עוד דף שמימין). אחרת: שום דבר לא קורה.
5. `step = Math.min(AUTO_SCROLL_FOLLOW_MAX_STEP_PX, penetration * AUTO_SCROLL_FOLLOW_GAIN)`.
6. `nextPanX = clampFollowPanX(panZoomRef.current.panX + direction * step, zoom,
   stageRect.width)`. אם זה שווה לערך הנוכחי (הגענו לקצה הדף) — יציאה, בלי שום שינוי.
7. אחרת: `clearTransition()`, `panZoomRef.current = {...panZoomRef.current, panX:
   nextPanX}`, `applyTransform()` — **לפני** קריאת `localPoint`/`paintTo` של אותו אירוע,
   כך שהנקודה שמצוירת בפועל מחושבת ביחס למצלמה שכבר זזה. `lastPoint.current` הוא
   בקואורדינטות **הדף** (לא המסך), ולכן הוא בלתי תלוי לגמרי בהזזת `panX` — רציפות הקו
   לא נפגעת.

**כיוון הנוסחה (מוודא נגד היפוך שגוי):** `panX` גדול יותר ← `visLeft = -panX/zoom` קטן
יותר ← נחשף יותר מהדף שנמצא **משמאל** לתצוגה הנוכחית. לכן קרבה לקצה **השמאלי** של
`stage` (`localX < margin`) מגדילה את `panX`, וקרבה לקצה **הימני** מקטינה אותו. זה
עקבי עם `minimapViewRect` (`visLeft = -panZoom.panX / panZoom.zoom`) שכבר קיים בקובץ.

### למה בקר-מיקום ולא מעקב-מגמה/מהירות מפורש
ה-design מתאר את התחושה הרצויה כ"ממשיכה לפי המגמה הכללית, לא לפי התזוזה הרגעית" —
אבל אין צורך במעקב מהירות/היסטוריה בשביל זה. `step` תלוי רק ב**מיקום** הנוכחי ביחס
לרצועת השוליים, לא בכיוון התזוזה הרגעי: כל עוד `localX` נשאר בתוך הרצועה (אפילו אם
הוא זז קצת קדימה ואז קצת אחורה בתוך אות בודדת), הכיוון של `direction` לא מתהפך —
רק העוצמה (`penetration`) משתנה מעט. הכיוון מתאפס (מפסיק לזוז) רק כשהמצביע יוצא
מהרצועה לגמרי — בדיוק "חוזר למצב בטוח, בלי קפיצה" כמו שה-design מתאר. זו הפשטה
אמיתית של המנגנון (בלי ref נוסף להיסטוריית מהירות, בלי חלון זמן), לא סטייה מהתחושה
המתוארת — ראו Risks למטה.

### שילוב עם זום-ההחזקה הזמני והזום הידני
שום שינוי בקוד הקיים של `triggerHoldZoom`/`animateTransformTo`/`handleWheel`/הפינץ' —
`applyAutoScrollFollow` נקרא אך ורק מהענף `drawing.current` הקיים, שממילא לא פעיל
בזמן פינץ' (ענף אחר לגמרי, `activePointers.current.size === 2`) ולא בזמן `tool ===
"pan"` (ענף `singlePanStart` הנפרד). זו בדיוק הדרך שבה "עדיפות לגלילה/זום ידניים"
מתקיימת — לא צריך דגל "האם מגע ידני פעיל", כי מבנית אי אפשר להגיע לקוד החדש מאותם
מגעים. זום-ההחזקה הזמני עצמו (החלון-בלי-תזוזה, האנימציה) לא נוגע בכלל: המעקב פועל
רק בתוך `handlePointerMove`, ודווקא בזמן החלון-בלי-תזוזה אין תזוזה (בהגדרה) — כך
שאין קריאה ל-`applyAutoScrollFollow` באותו חלון, ולכן שום קונפליקט אפשרי מולו.

### אחסון ההגדרה
זהה למילה למבנה הקיים של `holdZoomLevel`: שדה חדש ב-`Preferences`, שתי פונקציות
(get/set), מוגן ב-try/catch כמו כל השאר בקובץ. ברירת המחדל **מופעל** ממומשת כ-`stored
!== false` (לא `stored === true`) — כדי שתלמיד/ה חדש/ה, שמעולם לא פתח/ה את הדיאלוג,
תקבל התנהגות "מופעל" בלי צורך לכתוב ערך התחלתי ל-storage.

## Edge Cases
- **הדף כולו כבר גלוי (זום מוקטן/"הצג את כל הדף"):** אין קצה סמוך שהמצביע יכול
  להיכנס לרצועה שלו בכלל (הדף על המסך קטן מרוחב ה-stage), כך שהתנאי בשלב 4 פשוט
  אף פעם לא מתקיים — אין צורך במקרה פרטי.
- **הגעה לקצה הדף עצמו:** `clampFollowPanX` מחזיר את אותו `panX` שכבר קיים ברגע
  שאין לאן להמשיך — הקוד מזהה את זה (`nextPanX === panZoomRef.current.panX`) ויוצא
  בלי `applyTransform`, כך שאין קריאת רינדור מיותרת ואין "רעד" בקצה.
- **דף נעול (`locked`):** `drawing.current` אף פעם לא הופך ל-`true` בענף הזה כשהדף
  נעול (ראו `handlePointerDown` הקיים), כך שהמעקב האוטומטי לא פועל על דף נעול —
  תוצאה חינמית של שימוש חוזר בדגל הקיים, לא קוד נוסף.
- **קפיצת מצביע גדולה (עט מהיר/לג, coalesced pointermove):** `AUTO_SCROLL_FOLLOW_MAX_STEP_PX`
  חוסם קפיצה בודדת גדולה מדי; `clampFollowPanX` חוסם גם חריגה מעבר לגבול הדף בכל מקרה.
- **מעבר בין דפים במחברת (◀/▶/דף חדש/הסר דף) תוך כדי שהמעקב פעיל:** לא רלוונטי —
  ניווט בין דפים קורה רק דרך כפתורים, לא תוך כדי `pointermove` על הקנבס; `panZoomRef`
  ממשיך להתקיים כרגיל בין דפים (התנהגות קיימת, לא משתנה).
- **מעבר בין תלמידים / כניסה מחדש לתרגול:** ה-prop `autoScrollFollow` מגיע כל פעם
  מחדש מ-`App.tsx` (נגזר מ-`student.id` הנוכחי, בדיוק כמו `holdZoomFactor`) — אין
  state פנימי ב-`PracticeNotebook` שיכול "לדלוף" בין תלמידים.
- **שינוי גודל חלון/סיבוב מכשיר תוך כדי כתיבה:** `stageRect` נקרא מחדש בכל אירוע
  (לא נשמר במשתנה בין קריאות), כך שהמרווח והגבולות תמיד מחושבים לפי המידות הנוכחיות.

## Risks / Tradeoffs
- **שימוש חוזר במחלקות CSS ששמן "read-aloud" עבור שורה שאין לה קשר להקראה** —
  `read-aloud-switch`/`read-aloud-knob`/`read-aloud-text`/וכו'. זה כבר התקדים
  שנקבע ב-`notebook-hold-to-zoom` (שגם הוא השתמש מחדש ב-`read-aloud-text/title/note`
  לשורה שלו) — לא הכרעה חדשה, רק מרחיב אותה למתג עצמו. שינוי שם המחלקות לגנרי יותר
  (`settings-switch`) היה דורש לגעת גם בשורה הקיימת של ההקראה בלי צורך אמיתי בשביל
  הפיצ'ר הזה, ולכן לא נעשה.
- **בקר-מיקום במקום מעקב-מגמה מפורש** (ראו Technical Approach) — הפשטה שנבחרה כי
  היא מספקת בדיוק את אותה התנהגות נצפית בלי state/היסטוריה נוספת. אם בפועל (אחרי
  ניסוי אמיתי) יתברר שזה לא מספיק "חלק", השדרוג הטבעי הוא הוספת ref יחיד להחלקת
  `step` על פני כמה אירועים אחרונים (EMA) — שינוי מקומי, לא מבנה מחדש.
  **הערכים ההתחלתיים (`0.2`/`0.4`/`32px`) לא אומתו על מכשיר מגע אמיתי** — בדיוק
  כמו ש-`notebook-hold-to-zoom` התחיל מ-`30%`/`180ms` ועבר כמה סבבי כיוונון אחרי
  ניסיון בפועל. סביר שיידרש כיוונון דומה כאן.
- **קלאמפ חדש (`clampFollowPanX`) חל רק על המעקב האוטומטי, לא על פאן/פינץ' ידניים
  הקיימים** — נשארים ללא הגבלה בדיוק כמו היום. זו החלטה מכוונת (Out of Scope
  בספק המוצרי: "בלי שינוי להתנהגות הזום עצמו"), לא פער שנשמט.

## Open Questions
None.
