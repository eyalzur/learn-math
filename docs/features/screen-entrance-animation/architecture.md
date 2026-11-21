# אנימציית-כניסה למסך — Architecture

## Overview
CSS-בלבד, אין שינוי TSX: `@keyframes` משותף (opacity 0→1, 0.3s) מוחל על חמישה
selectors — ה-root `<div>` של כל אחד משישה מסכי-התפריטים (שניים מהם חולקים
class אחד). שום `transform` על ה-container, לפי design.md.

## Affected Files / Components
- **`src/App.css`** — הקובץ היחיד שמשתנה. מוסיפים:
  - `@keyframes screen-fade-in { from { opacity: 0; } to { opacity: 1; } }`.
  - selector יחיד: `.student-picker, .grade-picker, .topic-picker, .grade-home,
    .history { animation: screen-fade-in 0.3s ease-out; }`.
  - `prefers-reduced-motion: reduce` — מוסיפים את חמשת ה-selectors האלה לבלוק
    הקיים (כבר יש כזה מ-playful-redesign/idle-spotlight, `animation: none
    !important`).
- אין שינוי בשום קובץ `.tsx` — ה-root class-ים כבר קיימים בדיוק כמו שצריך,
  נבדק בפועל:
  - `StudentPicker.tsx` → `.student-picker`
  - `GradePicker.tsx` → `.grade-picker`
  - `TopicPicker.tsx` → `.topic-picker`
  - `LevelPicker.tsx` **וגם** `StylePicker.tsx` → שניהם `.grade-home` (class
    משותף קיים כבר, לא המצאה חדשה) — selector אחד מכסה את שניהם.
  - `History.tsx` → `.history`

## Data / State Changes
None — אין שינוי ב-state/props/types בשום מקום.

## Technical Approach
אנימציית CSS `@keyframes` רגילה על ה-root-container, בלי שום JS. זה עובד נכון
בלי שום `key` מיוחד או טריק-remount, כי מבנה-הניווט הקיים כבר **תמיד** ממיר
(unmount+mount) את קומפוננטת-המסך בכל מעבר-מסך אמיתי:

- `App.tsx` מרנדר כל מסך לפי `if (screen.name === ...) return <X .../>` רצוף,
  שנופל בסוף ל-`<TopicPicker>`. כל ענף הוא **סוג-קומפוננטה שונה** באותה נקודה
  בעץ — כשה-state עובר מ-`"levels"` ל-`"home"` (או כל מעבר אחר בין ענפים),
  React מפרק את הקודם ומרכיב את החדש מאפס, זו התנהגות-reconciliation
  סטנדרטית, לא טריק. לכן אנימציית-`animation` רגילה (שרצה אוטומטית ב-mount)
  **כן** רצה מחדש בכל מעבר-מסך אמיתי, כולל חזרה לאותו סוג-מסך אחרי ביקור
  במסך אחר ביניים (A→B→A זה שני mounts נפרדים של A, לא אחד שנמשך).
- **מה שלא גורם ל-remount, ונכון שלא:** שינוי-state אחר שלא נוגע ב-`screen`
  עצמו (למשל `settingsOpen` נפתח/נסגר, `adaptiveSession` מתעדכן) גורם
  ל-re-render של **אותה** קומפוננטה — לא remount — ולכן האנימציה **לא** חוזרת
  לרוץ רק כי State לא-קשור השתנה. זו ההתנהגות הרצויה: "כניסה למסך" אמורה
  להתרחש פעם אחת כשבאמת נכנסים, לא בכל רינדור-משני.
- אין שום מקרה בקוד הקיים שבו אותה קומפוננטה (למשל `LevelPicker`) ממשיכה
  "לחיות" כשעוברים לנושא אחר בלי לעבור דרך `"home"` (TopicPicker) באמצע —
  `enterTopic()` הוא הדרך היחידה להגיע ל-`"levels"`/`"styles"`, ותמיד קורא
  מ-TopicPicker (כלומר מ-`"home"`), ולכן תמיד יש remount אמיתי. נבדק בקוד,
  לא הונח.

## Edge Cases
- **idle-spotlight's `reindexIdleSpotlight()`** (רץ אחרי כל render, סורק
  אלמנטים עם `offsetParent !== null`) — אלמנט ב-`opacity: 0` עדיין יש לו
  `offsetParent` (opacity לא משפיע על layout, רק על ציור), ולכן הכרטיסים
  *בתוך* המסך-הדוהה נספרים כ"גלויים" ומתחילים לקבל `--spot-i`/לנשום מיד, גם
  תוך-כדי שהמסך-כולו עדיין בהדהייה. זה **לא** נחשב לבאג — זה בדיוק מה
  ש-design.md מתאר כ"רגע-כניסה מאוחד" (כמה שכבות-תנועה בו-זמנית), לא קונפליקט
  שצריך לפתור.
- **כפל עם pop-in-לכרטיס** — נבדק ב-design.md ואושר שם: שתי האנימציות (opacity
  על ה-container, scale+opacity על כל כרטיס) רצות בו-זמנית בכוונה, לא ברצף.
- **מעבר מהיר בין מסכים (לפני שהדהייה הקודמת הספיקה להסתיים)** — כל remount
  מתחיל אנימציה חדשה מ-`opacity: 0` על המסך החדש; אין "מצב-ביניים" שבור, כי
  המסך הקודם כבר לא קיים ב-DOM ברגע שה-state השתנה (remount אמיתי, לא
  cross-fade בין שני מסכים חיים בו-זמנית — לא נדרש ב-design.md).

## Risks / Tradeoffs
None מעבר למה שכבר מתועד ב-`playful-redesign`/`idle-spotlight` (ההחלטה
המודעת להישאר opacity-בלבד, לא transform, בדיוק בגלל הסיכון התיעודי שלהם
ליציבות-בדיקות).

## Open Questions
None.

## Implementation Notes

Built exactly per plan — one CSS rule, one keyframe, one reduced-motion addition, zero
.tsx changes. Verified live (dev server, direct opacity sampling, not just eyeballing):

- A genuine screen entry (creating and selecting a fresh student → GradePicker) shows a
  smooth 0 → 1 opacity ramp over ~0.3s (sampled at 40ms intervals: `0.10, 0.27, 0.49,
  0.62, 0.80, 0.89, 0.98, 1`).
- An unrelated re-render of the same screen instance (opening/closing the ⚙️ settings
  dialog) leaves opacity at `1` — the fade does not replay, confirming the
  remount-vs-rerender reasoning in Technical Approach holds in practice, not just in
  theory.
- A genuine return visit to the same screen type (back to the student picker, then
  selecting a student again) replays the fade from `0` again, as expected for a fresh
  mount.
- No console errors; the back-link-redesign and idle-spotlight features (already merged)
  render correctly alongside this change with no visual conflict.

`npm run build`/`npm run lint` clean. Version 1.49.0 → 1.50.0.
