# תיקוני שימושיות במחברת התרגול — Architecture

## Overview
חמישה תיקונים עצמאיים, כולם בתוך שני קבצי קומפוננטה קיימים
(`src/components/Practice.tsx`, `src/components/PracticeNotebook.tsx`) ועזר
אחד (`src/data/notebook.ts`), פלוס CSS. אין קומפוננטה חדשה, אין שדה שרת חדש
(`errorPointer` כבר קיים). התיקון המשמעותי מבחינת קוד הוא הסרה (כל מנגנון
הספירה האוטומטית ב-Practice.tsx) ולא הוספה.

## Affected Files / Components

- **`src/components/PracticeNotebook.tsx`** — כפתור "נקה דף" (🧹): מיקום מחדש
  בתוך ה-JSX, אישור לפני מחיקה (state חדש, מוחלף עם ה-state הקיים של אישור
  "הסר דף"), ודילוג על האישור כשהדף כבר ריק (כמו ב"הסר דף" היום).
- **`src/data/notebook.ts`** — קבוע חדש `INITIAL_ZOOM = 0.7`. `computeFitTransform`
  עצמו **לא משתנה** (ראו Technical Approach — משמש גם למסך מלא, שם הוא נשאר
  דינמי).
- **`src/components/Practice.tsx`** — הסרת מנגנון הספירה לאחור לגמרי: הקבוע
  `COUNTDOWN_SECONDS`, ה-state `secondsLeft`/`countdownStopped`, שני ה-effects
  שמריצים אותה, הקריאה `setSecondsLeft(COUNTDOWN_SECONDS)` בתוך
  `handleTeacherReading`, הפונקציה `stopCountdown`, והרינדור של כפתור הספירה.
  גם: לוגיקת רינדור חדשה (לא state חדש) ב"מה המורה הבינה" ובשורת הפסוק, לפי
  `feedback === "correct" && teacherNote?.errorPointer`.
- **`src/App.css`** — מחיקת בלוק ה-`countdown`/`countdown-digit`/`countdown-text`
  (מת לגמרי). הקטנת `.notebook-fullscreen-topbar .prompt-ltr`. מחלקות CSS
  חדשות לשורת ה-`errorPointer`/פסוק "התשובה נכונה" בענברי. שכפול קל של
  `.notebook-confirm-dialog p` הקיים לטקסט השני (ראו Technical Approach).
- **`tests/e2e/countdown-next.spec.ts`** — **נמחק במלואו** ב-QA (לא ב-developer,
  ראו Edge Cases): הפיצ'ר שהוא בודק כבר לא קיים.
- **`docs/features/countdown-next/status.md`** — developer מעדכן לשקף שההתנהגות
  הוחלפה/בוטלה לגמרי על ידי `notebook-usability-fixes` (לא משאיר את זה כ"done"
  סתמי כשהקוד שהוא מתעד כבר לא קיים).

## Data / State Changes

- **`PracticeNotebook.tsx`:** ה-state `confirmDelete: boolean` הופך ל-
  `pendingConfirm: "remove" | "clear" | null`. שני handlers חדשים/מתוקנים:
  - `requestClearPage()` — אם `!currentPage || !pageHasContent(currentPage)`,
    קורא ל-`clearCurrentPage()` ישירות (דף כבר ריק, אין מה לאשר — בדיוק העיקרון
    שכבר קיים ב-`requestRemovePage`); אחרת `setPendingConfirm("clear")`.
  - `requestRemovePage()` — זהה להיום, רק `setConfirmDelete(true)` הופך ל-
    `setPendingConfirm("remove")`.
  - `clearCurrentPage()` — הלוגיקה הפנימית לא משתנה; רק נקרא גם מהדיאלוג (כפתור
    "מחיקה") כשהיה תוכן, לא רק מהנתיב המהיר.
  - `removeCurrentPageNow()` — זהה להיום, `setConfirmDelete(false)` →
    `setPendingConfirm(null)`.
  - דיאלוג האישור ברינדור הופך מ-`{confirmDelete && (...)}` יחיד ל-
    `{pendingConfirm && (...)}` עם טקסט/handler-של-אישור שנבחרים לפי
    `pendingConfirm === "remove" ? ... : ...` (ראו Copy ב-design.md).
- **`Practice.tsx`:** `secondsLeft`, `countdownStopped`, `COUNTDOWN_SECONDS`
  נמחקים — **לא מוחלפים בשום state חדש**. שום state חדש לא נוסף לתיקון 5:
  `feedback` ו-`teacherNote` כבר מתעדכנים יחד ב-`handleTeacherReading` ומתאפסים
  יחד ב-`next()` (`setFeedback(null)`, `setTeacherNote(null)`), כך שהביטוי
  `feedback === "correct" && teacherNote?.errorPointer` בזמן הרינדור מספיק ולא
  יכול "לדלוף" בין שאלות.
- **`src/data/notebook.ts`:** קבוע חדש מיוצא, `INITIAL_ZOOM = 0.7` (או שם דומה),
  ליד `MIN_ZOOM`/`MAX_ZOOM`. אין שינוי בטיפוסים (`PanZoom` וכו').

## Technical Approach

### 1 — "נקה דף": אישור + מיקום
מיקום: ה-`<button className="notebook-clear-btn">` עובר ב-JSX מהמקום הנוכחי
(מיד אחרי `.tool-group`) להיות **הילד האחרון** של `.notebook-toolbar`, אחרי שני
ה-`.notebook-page-nav` (כולל אחרי קבוצת ◀▶ ואחרי קבוצת +/🗑). זו הזזה בקוד
בלבד — `.notebook-page-nav:last-of-type { margin-inline-start: auto }` כבר דוחפת
את קבוצת +/🗑 לקצה הרחוק (שם ה-🗑 כבר יושב היום, כפי שהמשתמש ציין), וכל מה
שמגיע **אחריה** ב-DOM נשאר צמוד לאותו קצה — אין צורך לגעת בכלל ה-CSS הזה או
להוסיף עטיפה חדשה. שינוי JSX טהור.

אישור: `pendingConfirm` (ראו למעלה) מחליף את `confirmDelete`. בלוק הדיאלוג
ברינדור (סביב שורה 586 היום) הופך לבלוק אחד עם טקסט מותנה:
```
pendingConfirm === "remove"
  ? "למחוק את הדף? מה שכתוב עליו יימחק ולא ניתן יהיה לשחזר אותו."
  : "למחוק את מה שכתוב בדף? לא ניתן יהיה לשחזר."
```
וכפתור "מחיקה" קורא ל-`removeCurrentPageNow` או ל-`clearCurrentPage` (+
`setPendingConfirm(null)`) בהתאם. אותו `notebook-confirm-backdrop`/
`notebook-confirm-dialog`/`notebook-confirm-actions` בדיוק — אין CSS חדש לדיאלוג
עצמו.

### 2 — זום פתיחה קבוע: **לא** לגעת ב-`computeFitTransform`
נקודה טכנית חשובה שה-design לא הבחין בה: `computeFitTransform` משמש **שלוש**
פעמים ב-`PracticeNotebook.tsx` — בטעינה הראשונית (mount), בכל resize כשנמצאים
במסך מלא, ובכל טוגל של מסך מלא (כניסה/יציאה). שני השימושים האחרונים הם ההתאמה
הדינמית שמצב F (`notebook-default-practice/design.md`) **תלוי בה במפורש** —
"מרחיבה את תיבת המחברת עצמה לכסות כמעט את כל המסך". אם `computeFitTransform`
עצמו היה הופך להחזיר `0.7` קבוע, מסך מלא היה נשבר (זום קבוע במקום התאמה לגודל
המסך שהשתנה).

**הכרעה:** רק קריאת ה-mount הראשונית (סביב שורה 200 היום) מוחלפת בזום קבוע —
לא בקריאה ל-`computeFitTransform` בכלל, אלא בערך `INITIAL_ZOOM` (`0.7`) ישירות,
עם אותו מיקום ממורכז (`panX`/`panY` מחושבים כמו ב-`computeFitTransform`, רק עם
`zoom = INITIAL_ZOOM` קבוע במקום החישוב הדינמי — הכי פשוט כתוספת קטנה שמייצרת
`PanZoom` ידנית, לא שינוי בחתימה של `computeFitTransform`). קריאות ה-resize
וה-fullscreen-toggle **ממשיכות לקרוא ל-`computeFitTransform` הדינמי בדיוק כמו
היום** — לא נוגעים בהן.

**הבהרה לגבי "כל שאלה" מול "פתיחת המחברת":** `PracticeNotebook` לא נטען מחדש
בין שאלות (`Practice.tsx` לא מעביר לו `key`, וה-`useEffect` שמפעיל את ה-fit
הראשוני רץ פעם אחת בלבד ל-`[]`) — כלומר גם היום, זום שהתלמיד/ה שינה/תה ידנית
נשמר בין שאלות באותו תרגול, לא מתאפס בכל שאלה. `design.md` ניסח את הדרישה
כאילו הזום מתאפס "בכל פעם שנטענת שאלה חדשה" — זו לא ההתנהגות בפועל היום, וגם
לא מה שהמשתמש ביקש בפועל (הוא דיווח על זום פתיחה גרוע **פעם אחת**, לא על זום
שמתאפס לו). **ההכרעה כאן: משאירים את התנהגות "הזום נשמר בין שאלות באותו
תרגול" בדיוק כפי שהיא היום — רק ה-fit ה*ראשוני* (פתיחת המחברת, שאלה 1) עובר
מדינמי לקבוע `70%`.** זו לא סטייה שחוזרת ל-designer: זו תיקון של תיאור לא
מדויק בתוך design.md, לא שינוי בכוונת המוצר.

### 3 — הסרת המעבר האוטומטי
מחיקה נטו, בלי תחליף:
- מחוק: `COUNTDOWN_SECONDS`, `secondsLeft`/`setSecondsLeft`,
  `countdownStopped`/`setCountdownStopped`, שני ה-`useEffect` של הטיימר
  (השעון והבדיקה `if (secondsLeft === 0) next()`), `stopCountdown()`, ובלוק
  הרינדור של `<button className="countdown">`.
- ב-`next()`: מוחקים את השורות `setSecondsLeft(null)` ו-`setCountdownStopped(false)`
  (אין להן עוד משמעות).
- ב-`handleTeacherReading()`: מוחקים את `if (!isLast) setSecondsLeft(COUNTDOWN_SECONDS)`
  לגמרי — אין שום קריאה חלופית. `primaryAction` (שורות 340-345) כבר לא תלוי
  ב-`secondsLeft` ולא צריך שינוי: הוא כבר הופך ל-`{ label: isLast ? "סיום" :
  "הבא", onClick: next }` בכל פעם ש-`feedback !== null`, ללא תנאי על
  correct/wrong.

### 4 — פונט תרגיל במסך מלא
**תיקון להנחיה לא מדויקת ב-design.md:** design.md ביקש "קרוב לגודל התרגיל
הרגיל מחוץ למסך מלא" — אבל הגודל הרגיל (`.prompt-ltr`, שורה 286) הוא `40px`,
**גדול יותר** מה-`26px` הנוכחי במסך מלא, לא קטן ממנו. הפס המצומצם של מסך מלא
הוא בכוונה קומפקטי יותר מהכותרת הרגילה (ראו `notebook-default-practice/design.md`,
מצב F) — הכוונה בפועל (`product-spec.md`: "התרגיל למעלה צריך להיות כתוב קטן
יותר") היא להקטין את ה-`26px` עצמו, לא להגדיל אותו ל-`40px`. פותרים את
`.notebook-fullscreen-topbar .prompt-ltr` ל-`18px` (ירידה מתונה, עדיין קריא,
משאירה את משטח הכתיבה עם יותר גובה בפועל). אין שינוי ב-`.notebook-fullscreen-topbar
.prompt-rtl` (בעיות מילוליות לא נדונו על ידי המשתמש, ואין להן override היום
בכלל — משאירים כך).

### 5 — עיצוב ענברי לתשובה נכונה עם `errorPointer`
בלי state חדש. שני שינויי רינדור בלבד ב-`Practice.tsx`:
- בבלוק `.teacher-reading` (סביב שורה 451-469): השורה שמציגה
  `teacherNote.errorPointer` מקבלת class נוסף כשמדובר בתשובה נכונה:
  `className={feedback === "correct" ? "teacher-reading-line teacher-reading-flag" : "teacher-reading-line"}`.
  (בתשובה שגויה עם `errorPointer`, השורה נשארת בדיוק כמו היום — `design.md` לא
  ביקש שינוי שם, רק בצירוף "נכון + `errorPointer`".)
- בשורת הפסוק (סביב שורה 526-529): התנאי `feedback === "correct"` מתפצל לשני
  מקרים —
  ```
  feedback === "correct" && teacherNote?.errorPointer
    ? <p className="feedback correct-flagged">התשובה נכונה</p>
    : feedback === "correct"
      ? <p className="feedback correct">נכון מאוד! 🎉</p>
      : revealed && <p className="feedback wrong">{`לא נכון. התשובה היא ${question.answer}`}</p>
  ```
  (מבנה לוגי, לא קוד סופי — developer יתאים לצורת ה-JSX הקיימת בפועל, שהיא כבר
  תנאי אחד עם `feedback && (feedback === "correct" || revealed)`.)
- CSS חדש ב-`App.css`: `.teacher-reading-flag` ו-`.feedback.correct-flagged`
  משתמשים ב**אותו** `color: #b45309; font-weight: 600` שכבר מוגדר ל-`.diagnosis`
  — לא צבע/גוון חדש. `.teacher-reading-flag` בנוסף עם `font-weight` מודגש יחסית
  ל-`.teacher-reading-line` הרגילה (שאין לה `font-weight` מוצהר, יורשת רגיל).

## Edge Cases

- **דף כבר ריק, לוחצים "נקה דף":** כמו ב-"הסר דף" היום — מדלגים על האישור
  ומנקים ישירות (`requestClearPage`, ראו Data/State Changes). אין דיאלוג על
  "כלום למחוק".
- **`errorPointer` קיים אבל התשובה שגויה:** אין שינוי מהיום — הזרימה הרגילה
  של אבחון+הסבר, ושורת ה-`errorPointer` נשארת `.teacher-reading-line` רגילה
  (לא ענברית). הענברי מוגבל במפורש לצירוף "נכון + יש errorPointer".
  **חשוב:** זה שונה מ-`.diagnosis` (שמופיע רק בתשובה שגויה) — שני המצבים לא
  יכולים לקרות יחד, אין התנגשות ויזואלית.
- **שאלה אחרונה בתרגול, תשובה נכונה עם `errorPointer`:** כפתור "הבא" הופך
  ל"סיום" כרגיל (`isLast`) — לא שונה מהיום, לא קשור לספירה שהוסרה.
- **`tests/e2e/countdown-next.spec.ts` אחרי המחיקה בקוד:** יכשל מיידית (הכפתור
  `.countdown` פשוט לא קיים יותר) אם מישהו מריץ `test:e2e` בין שלב ה-developer
  לשלב ה-qa. זה צפוי ומתועד כאן מראש — לא רגרסיה שצריך "לתקן", אלא קובץ שה-QA
  מוחק כחלק מהעבודה שלו (ראו Affected Files).
- **`docs/features/countdown-next/`:** לא מוחקים את התיקייה/התיעוד ההיסטורי
  שלה — פיצ'ר שהוחלף נשאר מתועד (בדיוק כמו `mistake-explanation`, שגם "הוחלף"
  ולא נמחק). מעדכנים רק את `status.md` שלה לציין שההתנהגות הוסרה על ידי
  `notebook-usability-fixes`, לא הופכים אותה ל-retroactively "לא קרה".

## Risks / Tradeoffs

- **הסרת הספירה מקטינה משוב חיובי מיידי בתשובה נכונה** (אין יותר "משהו קורה
  מעצמו" ברגע ההצלחה) — זו בדיוק ההחלטה של product-spec.md, לא תופעת לוואי:
  הערך הלימודי של פסקת המורה נחשב חשוב יותר מהתחושה של תגובתיות אוטומטית.
- **זום פתיחה קבוע (`70%`) לא מתאים באותה מידה לכל גודל מסך** — במסך גדול
  מאוד (טאבלט/דסקטופ) ייתכן ש-`70%` יראה קטן יחסית לחלל הפנוי בהשוואה להתאמה
  דינמית; זה תיקון ספציפית לבעיה שדווחה בטלפון, ולא בדיקה שהתבצעה על כל גודל
  מסך. משתמש/ת בכל מסך עדיין יכול/ה לשנות זום מיידית.
- **`pendingConfirm` כ-union מחליף `boolean`** — שינוי טיפוס קטן שמשפיע על כל
  מקום שקורא ל-`confirmDelete` היום; קל לפספס reference ישן אם לא מחפשים
  גלובלית. developer צריך לוודא (`grep confirmDelete`) שלא נשאר שימוש ישן.

## Open Questions
None.

## Implementation Notes

בוצע בדיוק לפי התוכנית למעלה, כולל שני התיקונים ל-design.md (זום פתיחה נשאר
"נשמר בין שאלות", פונט מסך מלא יורד ל-`18px` ולא עולה ל-`40px`).

- **`src/data/notebook.ts`:** נוסף `INITIAL_ZOOM = 0.7` ופונקציה חדשה
  `computeInitialTransform(viewportWidth, viewportHeight)` — אותו מיקוד/מירכוז
  כמו `computeFitTransform`, רק עם זום קבוע. `computeFitTransform` עצמו לא נגעו
  בו כלל (עדיין משמש את מסך מלא, דינמי כמו היום).
- **`src/components/PracticeNotebook.tsx`:**
  - ה-import מוסיף `computeInitialTransform` לצד `computeFitTransform` הקיים.
  - ה-`useEffect` של ה-mount הראשוני (טעינת ה-canvas) קורא עכשיו ל-
    `computeInitialTransform` במקום `computeFitTransform`; שני מקומות ה-resize/
    fullscreen-toggle ממשיכים לקרוא ל-`computeFitTransform` בלי שינוי.
  - `confirmDelete: boolean` הוחלף ב-`pendingConfirm: "remove" | "clear" |
    null`. `clearCurrentPage` שונה שם ל-`clearCurrentPageNow` (סימטרי ל-
    `removeCurrentPageNow`) ומוסיף `setPendingConfirm(null)` בסופו. נוספה
    `requestClearPage()` שמדלגת על האישור כשהדף כבר ריק, בדיוק כמו
    `requestRemovePage()` הקיימת.
  - כפתור "נקה דף" (🧹) עבר ב-JSX להיות הילד האחרון של `.notebook-toolbar`
    (אחרי שתי קבוצות `.notebook-page-nav`) — שינוי מיקום טהור, אין שינוי CSS
    (ה-`:last-of-type` הקיים ממשיך לדחוף רק את קבוצת ◀▶/+/🗑 שלפניו, וכל מה
    שאחריה נשאר צמוד לאותו קצה).
  - בלוק דיאלוג האישור הפך לבלוק אחד עם טקסט וכפתור-פעולה מותנים לפי
    `pendingConfirm`.
- **`src/components/Practice.tsx`:**
  - `COUNTDOWN_SECONDS`, `secondsLeft`/`setSecondsLeft`,
    `countdownStopped`/`setCountdownStopped`, שני ה-`useEffect` של הטיימר,
    `stopCountdown()`, והרינדור של כפתור הספירה — כולם נמחקו. `next()` איבד
    את שתי השורות `setSecondsLeft(null)`/`setCountdownStopped(false)`.
    `handleTeacherReading` איבד את `if (!isLast) setSecondsLeft(COUNTDOWN_SECONDS)`
    בלי שום תחליף.
  - שורת ה-`errorPointer` בפסקת "מה המורה הבינה" מקבלת class נוסף
    `teacher-reading-flag` כש-`feedback === "correct"`.
  - שורת הפסוק: כש-`feedback === "correct" && teacherNote?.errorPointer` —
    class הופך ל-`feedback correct-flagged` והטקסט ל-"התשובה נכונה"; אחרת
    (נכון בלי errorPointer, או שגוי) בדיוק כמו היום.
  - שני תיקוני תיעוד פנימיים (docstrings שהתייחסו ל"countdown") עודכנו כדי
    לא להשאיר הפניה למנגנון שנמחק.
- **`src/App.css`:** בלוק `.countdown`/`.countdown-digit`/`.countdown-text`
  נמחק במלואו. `.notebook-fullscreen-topbar .prompt-ltr` ירד מ-`26px` ל-`18px`,
  עם הערה שמסבירה למה זה לא `40px`. נוספו `.feedback.correct-flagged` ו-
  `.teacher-reading-flag`, שניהם `#b45309` — אותו צבע בדיוק כמו `.diagnosis`,
  לא צבע חדש.
- **`docs/features/countdown-next/status.md`:** נוספה פסקת "הוסר (2026-09-04)"
  שמפנה לתיעוד הזה.

**בדיקות ידניות שבוצעו (build+lint בלבד, כנדרש משלב זה — לא `test:e2e`):**
`npm run build` ו-`npm run lint` נקיים. גרסה עלתה ל-`1.27.1` (`npm run
bump:fix`, כי זה בראנץ' `fix/`).

**מה נשאר ל-QA:** מחיקת `tests/e2e/countdown-next.spec.ts` (הפיצ'ר שהוא בודק
הוסר), ובדיקות e2e חדשות לחמשת התיקונים — ראו architecture.md, Affected
Files/Edge Cases למעלה.
