# מחברת תרגול — Architecture

## Overview
מסך המחברת נבנה כתצוגה מותנית **בתוך `Practice.tsx` עצמו**, לא כ-`Screen`
נפרד ב-`App.tsx` — כך שהוא לעולם לא גורם ל-`Practice` להתמונטג (unmount),
ומצב השאלה/קלט/משוב נשמר אוטומטית בלי שום קוד מיוחד. לוגיקת הציור/העמודים
(טהורה, בלי React) יושבת ב-`src/data/notebook.ts`; הרכיב `PracticeNotebook.tsx`
מטפל בקנבס, במחוות המגע/עכבר, ובתפריטים — ניתוב ישיר של מה שכבר אומת
באב-טיפוס החיצוני (`docs/features/notebook-planning/`), לא עיצוב מחדש.

## Affected Files / Components

- **`src/data/notebook.ts`** (חדש) — טיפוסים ולוגיקה טהורה, בלי תלות ב-React:
  - `NotebookPage` — `{ id: string; filledCells: Set<string> }` (מפתח כל תא:
    `"col,row"`, זהה לאב-טיפוס).
  - קבועי גיאומטריה: `CELL = 4.665`, `PAGE_WIDTH = 1200`, `PAGE_HEIGHT = 1600`,
    `PEN_CELLS = 1`, `ERASER_CELLS = 5`, `MAX_PAGES = 20` — מועתקים מהערכים
    שכבר אומתו באב-טיפוס, לא ממוצאים מחדש.
  - `createBlankPage(): NotebookPage`
  - `fillCellBlock(filledCells, x, y, sizeInCells, mode: "pen" | "eraser"): void`
    — מוטציה ישירה על ה-Set, זהה ללוגיקה שנבדקה.
  - `pageHasContent(page): boolean` — `page.filledCells.size > 0`, לשימוש
    בהחלטת אישור-מחיקה.
  - `clampZoom`, `zoomAroundPoint`, `computeFitTransform` — פונקציות טהורות
    לחשבון ה-pan/zoom (ראו Technical Approach).
- **`src/components/PracticeNotebook.tsx`** (חדש) — הרכיב המלא: קנבס, שכבת
  ה-transform, סרגל כלים, ניווט עמודים, מיני-מפה, בקרות זום, דיאלוג אישור
  מחיקה. Props: `pages`, `currentPageIndex`, `onPagesChange`,
  `onCurrentPageIndexChange`, `onClose`.
- **`src/components/Practice.tsx`** (שינוי) — מוסיף:
  - `const [notebookOpen, setNotebookOpen] = useState(false);`
  - `const [pages, setPages] = useState<NotebookPage[]>(() => [createBlankPage()]);`
  - `const [currentPageIndex, setCurrentPageIndex] = useState(0);`
  - כפתור `📝 מחברת` בשורת הכותרת (ליד "← חזרה" והתקדמות), שקורא ל-
    `stopCountdown()` (קיים) ול-`stopSpeaking(); setSpeakingBox(null);` (אותו
    דפוס כמו `toggleSpeech`), ואז `setNotebookOpen(true)`.
  - כשה-`notebookOpen === true`, ה-JSX של Practice מוחלף ב-
    `<PracticeNotebook pages={pages} currentPageIndex={currentPageIndex}
    onPagesChange={setPages} onCurrentPageIndexChange={setCurrentPageIndex}
    onClose={() => setNotebookOpen(false)} />` — שאר ה-state (index, input,
    feedback וכו') ממשיך להתקיים בלי לגעת בו, כי `Practice` עצמו לא נטען
    מחדש.
- **`src/App.css`** (שינוי) — סגנונות חדשים למסך המחברת: שכבת מסך-מלא, רקע
  משבצות (זהה בערכים ל-CSS `repeating-linear-gradient` מהאב-טיפוס), סרגל
  כלים, מיני-מפה, בקרות זום, דיאלוג אישור. משתמש בטוקנים הקיימים
  (`--accent`, `--accent-bg`, `--border`, `--text`, `--text-h`, `--shadow`) —
  לא מוסיף פלטת צבעים חדשה.

## Data / State Changes
- טיפוס חדש `NotebookPage` (ב-`notebook.ts`), כמתואר למעלה.
- שלושה `useState` חדשים ב-`Practice`: `notebookOpen`, `pages`,
  `currentPageIndex`. שלושתם **חיים ב-`Practice` בלבד** — לא ב-`App.tsx`,
  לא ב-`localStorage`. הם מאותחלים פעם אחת כש-`Practice` נטען (דף ריק בודד),
  ונעלמים כש-`Practice` נטען מחדש/יוצא (בדיוק כמו `index`, `input` וכו' היום).
  זה מה שנותן "לא מתאפס בין שאלות, לא נשמר לצמיתות" בלי קוד מיוחד — זו
  התנהגות ברירת המחדל של `useState` בתוך רכיב שלא נטען מחדש.

## Technical Approach

**מודל הציור:** כל דף הוא `Set<string>` של מפתחות תא. ציור/מחיקה משנים את
ה-Set ישירות (`fillCellBlock`) ומצירים על קנבס `<canvas>` תואם (`fillRect`/
`clearRect` לכל תא) — הקנבס הוא ייצוג חזותי בלבד; המקור האמיתי הוא ה-Set,
בדיוק כמו באב-טיפוס. כשעוברים בין עמודים, הקנבס מצויר-מחדש מאפס מה-Set של
העמוד החדש (לולאה על `filledCells`, לא שמירת תמונה).

**זום/הזזה — CSS transform, לא גלילת דפדפן:** שכבת התוכן (`PAGE_WIDTH ×
PAGE_HEIGHT`, ערכים קבועים) מקבלת `transform: translate(panX, panY)
scale(zoom)`; חלון הצפייה מקבל `overflow: hidden` ו-`touch-action: none` —
**אין שום `overflow: auto`/`scrollLeft` בשום מקום**. כל הפאן/זום מחושב
ידנית מ-pointer events:
- אצבע אחת + כלי "עט"/"מחק" → ציור. אצבע אחת + כלי "הזזה" → גרירה משנה
  `panX`/`panY` ישירות (הפרש פיקסלים במסך, בלי המרה — זו רק תזוזה).
- שתי אצבעות בו-זמנית → תמיד פאן+זום (pinch), בלי קשר לכלי הנבחר. המרחק בין
  האצבעות קובע יחס-זום חדש (`zoomAroundPoint`), אמצע בין האצבעות נשאר קבוע
  על המסך תוך כדי התנועה (הנוסחה: `pan' = mid - (mid₀ - pan₀) * (zoomNew/
  zoomOld)`).
- קריאת קואורדינטת ציור מקומית: `stack.getBoundingClientRect()` בפועל (לא
  חישוב pan/zoom ידני כפול) — `localX = (clientX - rect.left) / (rect.width
  / PAGE_WIDTH)`. קריאה חוזרת מהדפדפן, לא שכפול נוסחת ה-transform, מונעת
  סטייה בין המצב הפנימי לרינדור בפועל.
- `+`/`-`/`⤢` (הצג הכל) מפעילים את אותה `zoomAroundPoint`/`computeFitTransform`
  סביב מרכז המסך.
- מיני-מפה: תיבה קבועה שמציגה קנה-מידה מוקטן של `PAGE_WIDTH × PAGE_HEIGHT`
  עם מלבן מודגש לפי `panX`/`panY`/`zoom` הנוכחיים — מחושב מחדש בכל שינוי.

**מניעת נקודת-דיו מפינצ' (חובה, לא אופציונלי):** כש-pointerdown ראשון קורה
(אצבע יחידה, כלי "עט"/"מחק"), התאים שמצטיירים נרשמים לזמן קצר (~220ms,
`setTimeout`). אם pointerdown שני מגיע בחלון הזה (המערכת מזהה שזה בעצם
פינצ'), התאים שנרשמו נמחקים (`clearRect` + הסרה מה-Set) לפני שממשיכים ללוגיקת
הפינצ'. בלי זה, כל תחילת-פינצ' משאירה נקודה מיותרת בדף.

**`setPointerCapture` בתוך try/catch** — יכול לזרוק במקרי-קצה; זריקה שם
אסור שתעצור את עדכון מעקב-האצבעות שאחריו.

**ניהול עמודים:** `pages: NotebookPage[]` + `currentPageIndex: number`.
- הוספה: `setPages([...pages.slice(0, currentPageIndex+1), createBlankPage(),
  ...pages.slice(currentPageIndex+1)])` ואז `setCurrentPageIndex(i+1)` —
  חסום כש-`pages.length >= MAX_PAGES`.
- הסרה: אם `pageHasContent(pages[currentPageIndex])` — מציגים דיאלוג אישור
  לפני שממשיכים; אחרת מוחקים מיד. חסום לגמרי כש-`pages.length === 1`.
- ניווט: `currentPageIndex ± 1`, כפתורים מושבתים בקצוות.

## Edge Cases
- **דף יחיד נותר:** כפתור "🗑 הסר דף" מושבת (`disabled`), לא רק מוסתר —
  כך אין בלבול לגבי למה אין תגובה.
- **מחיקת עמוד שאינו האחרון:** `currentPageIndex` חייב לזוז אם העמוד שנמחק
  היה העמוד הנוכחי או לפניו, כדי לא "לקפוץ" לעמוד אחר בטעות.
- **מעבר עמוד תוך כדי ציור:** לא אמור לקרות דרך ה-UI (כפתורי הניווט נפרדים
  מהקנבס), אבל בכל מקרה `drawing`/`lastPoint` מתאפסים בכל מעבר עמוד, ליתר
  ביטחון.
- **שינוי גודל חלון/סיבוב מסך בזמן שהמחברת פתוחה:** `resize` מפעיל recompute
  של ה-transform הנוכחי (לא איפוס לזום 100%) — זהה להתנהגות באב-טיפוס.
- **פתיחת המחברת תוך כדי ספירה-לאחור או הקראה:** שתיהן נעצרות במפורש בלחיצה
  על "📝 מחברת" (ראו Affected Files) — אחרת שאלה עלולה "לקפוץ" בזמן שהתלמיד/ה
  לא מסתכל/ת, או קול ימשיך לדבר מעל מסך אחר.
- **סגירת המחברת בזמן שדף ריק לגמרי קיים (חוץ מהראשון):** נשאר כמו שהוא —
  אין ניקוי אוטומטי של דפים ריקים, זה לא צוין כדרישה וסתם עלול להפתיע.

## Risks / Tradeoffs
- **בלי שמירה בין רענון/עזיבה — לפי החלטת מוצר מפורשת**, לא מגבלה טכנית.
  המשמעות בפועל: "מגישים למורה" אומר צפייה ישירה על אותו מסך, לא משהו
  שאפשר לשלוח אחר כך. אם זה יתברר כלא מספיק בפועל, השיפור הבא (localStorage)
  הוא תוסף עתידי נפרד, לא שינוי בארכיטקטורה הזו.
  **הדגמה קונקרטית:** בהשוואה למסך `TopicLesson` (שנטען דרך `App.tsx`'s
  `screen` state ונעלם לגמרי כשעוברים למסך אחר) — כאן ההבדל הוא רק *איפה*
  ה-state חי (בתוך `Practice` ולא ב-`App`), לא *אם* הוא נשמר; שתי הגישות
  שוות בעקרון "נעלם עם עזיבת המסך שמחזיק אותו".
- **קוד לא-טריוויאלי מועתק/מתורגם מפרוטוטייפ חיצוני (HTML/JS גולמי) ל-
  TypeScript/React** — לא העתק-הדבק פשוט; ה-developer צריך לתרגם ל-hooks/refs
  תוך שמירה על ההתנהגות (בעיקר: מניעת נקודת-הדיו בפינצ', וקריאת הקואורדינטה
  מ-`getBoundingClientRect`). זה הסיכון המרכזי בסבב הזה.
- **המכסה (20 דפים) והתנהגות אישור-המחיקה** נקבעו ב-design.md כברירות מחדל
  סבירות, לא כדרישת מוצר מפורשת — קלות לשינוי אם יתברר שצריך מספר אחר.

## Open Questions
None.

## Implementation Notes

נבנה בדיוק לפי התכנון — שני קבצים חדשים, שינויים ממוקדים בשני קבצים קיימים:

- `src/data/notebook.ts` — `NotebookPage`, קבועי הגיאומטריה, `fillCellBlock`,
  `clampZoom`/`zoomAroundPoint`/`computeFitTransform`/`minimapViewRect`. כל
  הפונקציות טהורות, בלי תלות ב-DOM/React — ניתנות לבדיקת יחידה ישירה.
- `src/components/PracticeNotebook.tsx` — הרכיב המלא. state עתיר-תדירות (pan/
  zoom, מעקב אצבעות, ציור) יושב ב-`useRef`, לא `useState`: `pointermove` יכול
  לירות עשרות פעמים בשנייה, ורינדור-מחדש של React על כל אחת מהן הוא בדיוק
  העלות שהאב-טיפוס החיצוני נמנע ממנה בעזרת מניפולציה ישירה של ה-DOM
  (`applyTransform`, עדכון המיני-מפה). זה נשמר כאן: שכבת ה-transform וקטע
  המיני-מפה מעודכנים ישירות דרך `ref.current.style`, לא נתיב state→JSX.
  `useState` נשאר רק למה שבאמת גורם לרינדור-UI (הכלי הנבחר, אחוז הזום המוצג,
  דיאלוג האישור).
- `src/components/Practice.tsx` — שלושה `useState` חדשים (`notebookOpen`,
  `pages`, `currentPageIndex`), כפתור "📝 מחברת" בשורת הכותרת (אחרי "שאלה X
  מתוך Y", לפני שום דבר אחר — סדר ה-DOM קובע את הסדר החזותי ב-RTL עם
  `justify-content: space-between`), ופונקציית `openNotebook` שקוראת
  ל-`stopCountdown()` ול-`stopSpeaking()`/`setSpeakingBox(null)` הקיימים
  לפני `setNotebookOpen(true)`. `if (notebookOpen) return <PracticeNotebook .../>`
  מוקדם ב-render, במקום ה-JSX הרגיל — לא עוטף אותו.
- `src/App.css` — סעיף `/* ---- practice notebook ---- */` חדש בסוף הקובץ,
  משתמש רק בטוקנים קיימים (`--accent`, `--accent-bg`, `--border`, `--text`,
  `--text-h`, `--code-bg`, `--bg`, `--shadow`) פרט לצבע האדום להסרה/מחיקה
  (`#dc2626`) — הועתק מ-`.feedback.wrong`/`.level-hard` הקיימים, לא הומצא.

**אומת בדפדפן בפועל (לא רק build+lint):** הורצה סביבת dev מקומית ונבדק עם
Playwright — פתיחת/סגירת המחברת שומרת את מצב התרגול (תשובה מוקלדת נשארת),
ציור, הוספת/הסרת דפים, ניווט, זום (+/−/⤢), פינצ' דו-אצבעי דרך CDP touch
אמיתי (לא PointerEvent מלאכותי) בלי שהוא משאיר דיו מיותר, ודיאלוג האישור —
גם מופיע לדף עם תוכן וגם מדלג עליו לדף ריק, וגם המסלול "אישור" וגם "ביטול".
בלי שגיאות קונסול בשום שלב.

**באג אמיתי שנתפס ותוקן תוך כדי הבדיקה הידנית (לא הגיע מהתכנון, התגלה רק
בבדיקה בדפדפן):** לא בקוד עצמו — בסקריפט הבדיקה הראשון: חישוב נקודת הלחיצה
לפי `getBoundingClientRect()` של `.notebook-canvas` עצמו (1200×1600, הגודל
המקומי הבלתי-חתוך) במקום `.notebook-stage` (חלון הצפייה החתוך בפועל) גרם
ללחיצה "לצייר" מחוץ לאזור הנראה/אינטראקטיבי בפועל, וכך הראה בטעות שהסרת דף
"עם תוכן" קרתה בלי אישור. תיקון הסקריפט (לא הקוד) אישר שההתנהגות בפועל
נכונה — תזכורת שבדיקת "זה עובד" חייבת למדוד את מה שהמשתמש/ת באמת רואה
ולוחצ/ת עליו, לא כל אלמנט DOM שנוח לתפוס.

`npm run build` ו-`npm run lint` נקיים.
