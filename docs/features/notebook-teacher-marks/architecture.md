# המורה כותבת על הדף באדום/ירוק — Architecture

## Overview
`Practice.tsx` מוסיף מערך-מקביל חדש, `pageTeacherMarks`, שמחזיק — לכל דף, לפי
אינדקס — את הערת-המורה (צבע+טקסט) שניתנה לו, אם ניתנה, **בדיוק** באותו דפוס
של `pageQuestionIndex` הקיים (`notebook-question-on-page`). ה-JSX של ההערה
מתווסף כ-ילד-אח נוסף בתוך `questionHeader` הקיים (לא prop חדש
ל-`PracticeNotebook` — הוא ממשיך לא לדעת כלום על זה), מיד מתחת לטקסט השאלה,
באותה קופסה פיזית-מעוגנת. אין שינוי בקריאה לשרת, בטיפוסים שהיא מחזירה, או
במנגנון bidi — הכל reuse של קיים.

## Affected Files / Components

- **`src/components/Practice.tsx`**:
  - מצב חדש: `pageTeacherMarks: (TeacherMark | null)[]` (טיפוס `TeacherMark`
    חדש, מקומי לקובץ הזה — ראו Data/State Changes).
  - `handleTeacherReading()` מתעדכן: בענף `reading.certain` (השורה שכבר קובעת
    `teacherNote`/`feedback`), מחשב גם `TeacherMark` ומעדכן את
    `pageTeacherMarks[currentPageIndex]`. בענף `!reading.certain`, מאפס את
    `pageTeacherMarks[currentPageIndex]` ל-`null` (סימטרי לאיפוס
    `teacherNote`/`feedback` הקיים שם).
  - `next()` מתעדכן: אותם שני הענפים שכבר מעדכנים `pageQuestionIndex` (הוספת-
    דף רגילה, ושימוש-חוזר בדף אחרון ב-`MAX_PAGES`) מעדכנים גם את
    `pageTeacherMarks` באותה צורה בדיוק (דף חדש → `null` חדש בסוף המערך; דף
    משומש-מחדש → `null` באותו אינדקס, לא השארת ההערה הישנה).
  - `questionHeader` (ה-JSX הקיים) מקבל ילד נוסף: `<p>` עם הערת-המורה של
    `pageTeacherMarks[currentPageIndex] ?? null`, מרונדר רק כש-יש ערך.
    `PracticeNotebook` ממשיך לקבל רק `questionHeader` כפי שהוא כבר מקבל היום —
    אין prop חדש.
  - **לא נוגעים** ב-`teacherNote`/`feedback`/`uncertain`/`isCorrectedReading`
    הקיימים, ולא בפאנל "מה המורה הבינה" שמשתמש בהם — אלה ממשיכים להתנהג בדיוק
    כמו היום, כולל אותה "live, לא per-page" סמנטיקה (design.md: הפאנל לא
    השתנה בכוונה).
- **`src/App.css`**: שלושה כללי CSS חדשים (`.notebook-teacher-mark`
  + שלושה מצבי-צבע), ליד כללי `.notebook-question-header` הקיימים.
- **אין שינוי** ב-`src/components/PracticeNotebook.tsx`, `src/lib/notebookServer.ts`,
  `server/` — כל התשתית הקיימת (הקריאה, הטיפוסים, ה-bidi) נשארת בדיוק כמו
  שהיא.

## Data / State Changes

```ts
/** What the teacher wrote on the page itself after reading it — a page-space, page-owned
 *  companion to teacherNote, not a replacement for it (the panel keeps using teacherNote/
 *  feedback exactly as today). Derived once, at the same moment teacherNote/feedback are
 *  set, from the same reading. */
interface TeacherMark {
  color: "green" | "amber" | "red";
  /** Hebrew sentence, arithmetic marked in backticks exactly like errorPointer/
   *  processReflection already are — rendered through the existing segmented(), not a new
   *  parser. */
  text: string;
}

const [pageTeacherMarks, setPageTeacherMarks] = useState<(TeacherMark | null)[]>(() => [null]);
```

נגזרת, לא state נפרד: `color`/`text` נקבעים **פעם אחת**, בתוך `handleTeacherReading`,
מאותם נתונים שכבר קובעים שם את `teacherNote`/`feedback` — לא שכפול-לוגיקה,
רק עוד תוצר-לוואי של אותו חישוב:

```ts
const mark: TeacherMark = reading.errorPointer
  ? { color: isCorrect ? "amber" : "red", text: `${isCorrect ? "✓" : "✗"} ${reading.errorPointer}` }
  : isCorrect
    ? { color: "green", text: "✓ יפה מאוד!" }
    : { color: "red", text: "✗ כדאי לבדוק שוב." };
```

(`isCorrect` כבר מחושב ב-`handleTeacherReading` היום — `reading.finalAnswer === question.answer`
— נעשה שימוש חוזר, לא חישוב כפול.)

## Technical Approach

### בעלות-דף, בדיוק כמו `pageQuestionIndex`
`pageTeacherMarks` ו-`pageQuestionIndex` מתעדכנים **יחד**, באותם שלושה מקומות
בדיוק (`handleTeacherReading`'s שני הענפים, ושני הענפי-עדכון ב-`next()`) —
לא שני מנגנונים נפרדים שעלולים להתבדר, אלא אותו דפוס מועתק. זה בכוונה מונע
בדיוק את "באג 1" שתקף את `notebook-question-on-page` בסבב הראשון שלו (שם
הכותרת המקורית הייתה תלויה ב-`question`/`index` ה"חיים" במקום ב-
`currentPageIndex`) — כאן `questionHeader`'s הילד-החדש תלוי מההתחלה ב-
`pageTeacherMarks[currentPageIndex]`, לא בשום state חי אחר, ולכן ניווט ל"דף
קודם" מציג נכון את ההערה ששייכת לאותו דף מהרגע הראשון.

### תיקון ("המורה טעתה?") — עדכון, לא הוספה
`sendCorrection()` כבר קורא ל-`handleTeacherReading(reading, true)` בדיוק כמו
`sendToTeacher()` — זו **אותה** פונקציה, אותו עדכון-state. `pageTeacherMarks[currentPageIndex] =
mark` **מחליף** את הערך הקודם (לא push/append) — אין צורך בלוגיקה נפרדת
ל"תיקון מחליף הערה ישנה"; זה כבר המתנהג-ברירת-מחדל של הקצאה-לאינדקס.

### מיקום ה-JSX — ילד בתוך `questionHeader` הקיים
```tsx
const teacherMark = pageTeacherMarks[currentPageIndex] ?? null;

const questionHeader = (
  <div className={`notebook-question-header ${displayedQuestionIsWordProblem ? "qh-rtl" : "qh-ltr"}`}>
    <span className={`problem-text ${displayedQuestionIsWordProblem ? "qh-text-rtl" : "qh-text-ltr"}`}>
      {/* ...existing question content, unchanged... */}
    </span>
    {teacherMark && (
      <p className={`notebook-teacher-mark notebook-teacher-mark-${teacherMark.color}`}>
        {segmented(teacherMark.text)}
      </p>
    )}
  </div>
);
```
`segmented()` (כבר קיים, `src/components/segmented.tsx`) מייצר את אותם
`.prompt-math`-spans שכבר משמשים את `.teacher-reading-line` — reuse ישיר,
לא מנגנון bidi חדש.

### CSS חדש (`src/App.css`, ליד `.qh-text-ltr`/`.qh-text-rtl`)
```css
.notebook-teacher-mark {
  /* Always a Hebrew sentence, regardless of which direction the question above it reads —
     an RTL block of its own even inside .qh-ltr's direction:ltr parent. */
  direction: rtl;
  text-align: right;
  margin-top: 8px;
  font-size: 20px;
  font-weight: 600;
  line-height: 140%;
}

/* .qh-ltr's own width is fit-content (hugs the short equation above it) — without a cap
   here, a long Hebrew sentence would stretch that box arbitrarily wide. 280px matches the
   safe width already established for RTL text at the narrowest verified phone (320px) in
   notebook-question-on-page/architecture.md. .qh-rtl already has a fixed 260px width from
   the same box the mark sits inside, so no separate cap is needed there — it wraps within
   the existing box. */
.qh-ltr .notebook-teacher-mark {
  max-width: 280px;
}

.notebook-teacher-mark-green {
  color: #16a34a;
}

.notebook-teacher-mark-amber {
  color: #b45309;
}

.notebook-teacher-mark-red {
  color: #dc2626;
}
```
שלושת הצבעים הם **אותם ליטרלים בדיוק** שכבר קיימים ב-`.feedback.correct`/
`.correct-flagged`/`.wrong` (`#16a34a`/`#b45309`/`#dc2626`) — לא טוקן-CSS
חדש. בכוונה: אף אחד משלושת הכללים הקיימים האלה כבר לא משתמש במשתנה-CSS
(לא `--notebook-question-ink`-style, אין להם גם גרסת-חושך נפרדת) — ליטרל
חוזר הוא העקביות עם איך שהצבעים האלה כבר כתובים בקובץ הזה, לא פשרה.

## Edge Cases
- **ניווט ל"דף קודם" אחרי ששלחו דף מאוחר יותר למורה**: `pageTeacherMarks[currentPageIndex]`
  קורא את הערך של הדף הנצפה, לא של הדף החי — נבדק/מתוכנן באותו אופן בדיוק
  שכבר הוכח עובד ל-`pageQuestionIndex`.
- **דף שעדיין לא נשלח בכלל**: `pageTeacherMarks[i]` הוא `null` עד שנשלח —
  ברירת המחדל של המערך (`[null]` בפתיחה, `null` חדש בכל דף-נוסף) כבר נותנת
  את זה בחינם, בלי `if` נוסף.
- **דף שהתקבלה עליו קריאה לא-ודאית**: `pageTeacherMarks[currentPageIndex]`
  מאופס ל-`null` (בדיוק כמו `teacherNote`) — אין הערה-צבעונית על הדף, רק
  הודעת "לא הצלחתי לקרוא" הקיימת בפאנל.
- **דף `MAX_PAGES` שמשתמשים-בו-מחדש**: `pageTeacherMarks` של הדף המשומש-מחדש
  מאופס ל-`null` באותו רגע ש-`pageQuestionIndex` שלו מתעדכן — לא נשארת הערה
  מהשאלה הקודמת שהייתה על אותו "דף פיזי" (אותה בעיה בדיוק שהתיקון
  ל-`pageQuestionIndex` כבר פתר לשאלה, נפתרת כאן יחד).
- **שאלה חשבונית (LTR) עם הערת-מורה ארוכה**: `.notebook-teacher-mark` כופה
  `direction: rtl; text-align: right` על עצמו למרות שההורה (`.qh-ltr`) הוא
  `direction: ltr` — חובה לאמת ידנית בצילום-מסך אמיתי (לא רק קריאת-CSS) שזה
  באמת נראה נכון ולא "נבלע" בתוך הקשר-ה-LTR של ההורה — זו בדיוק מלכודת-ה-RTL
  שה-CLAUDE.md מזהיר ממנה. גם `max-width: 280px` על המקרה הזה (`.qh-ltr`)
  צריך אימות אמיתי שלא גולש/נחתך ב-320px.
- **גובה-הדף הכולל גדל** (שאלה + הערה, ולפעמים גם שתיהן ארוכות) — זה כבר
  התנהגות-מתוכננת קיימת ("גובה פס הכותרת כולו דינמי", `notebook-question-on-page/design.md`),
  לא בעיה חדשה — פשוט פחות שטח-כתיבה נגיש מיד בתצוגה הראשונית לדף הזה.

## Risks / Tradeoffs
- **`✓`/`✗` כתחילית ל-`errorPointer` עלול להיראות כפול** אם `errorPointer`
  עצמו כבר מתחיל במשהו שנשמע כמו שיפוט (לא אמור לקרות — `teacher-reading-precision`
  קבע מפורשות ש-`errorPointer` הוא עובדה חישובית, לא שיפוט) — לא אומת ידנית
  בשלב הזה (אין קריאה אמיתית ל-Claude ב-CI), developer/QA צריכים לבדוק ידנית
  מול השרת האמיתי (כמו שכל פיצ'ר קודם בתחום הזה כבר עשה) שזה נקרא טבעי.
- **הצבע "ענבר" (amber) למקרה "נכון אבל מסומן"** הוא תיקון-scope לעומת
  product-spec.md (ששם רק "ירוק/אדום") — תועד כהחלטת designer, לא הוחלט כאן
  מחדש, רק ממומש כפי שתוכנן.
- **אין טיפול במקרה שבו הקריאה חוזרת אחרי שהתלמיד/ה כבר עבר/ה לדף אחר** —
  לא אמור לקרות (הבקשה ל-`/read-page`/`/read-page` עם תיקון ממתינה לתשובה
  לפני שהתלמיד/ה יכול/ה ללחוץ "הבא", אותו מצב-קיים כמו `teacherNote`/`feedback`
  היום) — לא התנהגות חדשה, לא נבדק מחדש כאן.

## Open Questions
None.

## Implementation Notes

מומש כמתוכנן, ללא סטיות אמיתיות. `TeacherMark` הועבר לרמת-המודול (ליד
`SpeakingBox` הקיים) במקום `interface` מקומי בתוך הקומפוננטה, כדי להתאים
למוסכמה הקיימת בקובץ — פרט-מימוש, לא שינוי בתכנון.

`pageTeacherMarks` מתעדכן באותם שלושה מקומות בדיוק שתוכננו
(`handleTeacherReading`'s שני ענפים, `next()`'s שני ענפי-עדכון-דף), תמיד
יחד עם `pageQuestionIndex`. ה-JSX מתווסף כילד שלישי בתוך `questionHeader`
(אחרי ה-`span.problem-text`), ללא prop חדש ל-`PracticeNotebook`.

**אימות ידני בוצע נגד שרת-dev אמיתי (לא תמונה סטטית)** — `npm run dev` עם
`VITE_NOTEBOOK_SERVER_URL` מוגדר (אותו ערך בדיוק כמו `playwright.config.ts`,
`https://notebook-server.invalid`) ומיקוק `/read-page` באמצעות Playwright
`page.route`, באותו דפוס שה-e2e tests הקיימים כבר משתמשים בו
(`mockTeacherReadingSequence`). **תקלה שנתפסה בדרך**: ריצה ראשונה בלי
`VITE_NOTEBOOK_SERVER_URL` גרמה ל-`readPageWithTeacher` לזרוק מיד
(`!SERVER_URL`) לפני שהבקשה בכלל יוצאת לרשת — המיקוק מעולם לא נבדק, והמסך
הציג שגיאת-שליחה גנרית. אותר ותוקן על ידי הגדרת המשתנה, לא על ידי שינוי קוד
האפליקציה (זו לא הייתה בעיה באפליקציה, רק בסביבת-האימות).

אומת בפועל, בצילומי-מסך אמיתיים ב-`320px` (הרוחב הצר ביותר שכבר נקבע
כסטנדרט-הבדיקה בפרויקט הזה):
- **ירוק, בלי `errorPointer`**: שאלה חשבונית (`12 + 5 =`) + "✓ יפה מאוד!"
  בירוק, RTL תקין, בתוך `.qh-ltr`'s הורה `direction: ltr` — לא "נבלע".
- **ענבר, עם `errorPointer`, תשובה נכונה**: `getComputedStyle` אימת
  `color: rgb(180, 83, 9)` (= `#b45309` בדיוק) ו-`direction: rtl` על
  `.notebook-teacher-mark` — לא רק קריאה חזותית, מדידה בפועל.
  משפט-ענבר ארוך (3 שורות) עטף נכון, חשבון מוטמע (`12 + 5`) מבודד-LTR נכון
  בתוך המשפט העברי.
  **לא ירוק** (אומת ש-`.feedback.correct-flagged`'s הסמנטיקה הקיימת מכבדת
  נכון, לא "דרסה" לירוק סתם כי התשובה נכונה).
- **אדום, עם `errorPointer` ארוך**: נמדד `boundingBox` בפועל (לא רק
  `max-width` ב-CSS) — ללא גלישה ימינה או שמאלה מחוץ ל-`.notebook-stage`
  (`markBox` בתוך `stageBox` לגמרי, שני הכיוונים). אומת גם חזותית בצילום-מסך
  ממוקד (`.notebook-screen` בלבד, לא כל הדף) — שלוש שורות, קריאות, בלי חיתוך.
- **אדום, שאלה מילולית (RTL) + מצב-חושך**: נבדק גם צילום-מסך בפועל ב-`colorScheme:
  'dark'` — ההערה האדומה קריאה וברורה על רקע כהה (אין טוקן-צבע ייעודי
  לחושך, כפי שתוכנן — הליטרל הקיים `#dc2626` קריא מספיק על הרקע הכהה בפועל,
  לא רק בהנחה).

`build`/`lint` נקיים. גרסה `1.40.0 → 1.41.0`. כל ארבעת הצילומים לא נשמרו
בריפו — כלי-עזר זמניים (סקריפטי Playwright מקומיים, שרת-dev זמני) נמחקו/
נעצרו בתום הבדיקה.

## Architecture — סבב ב׳ (כתב-יד + סימון מרחבי)

ראו product-spec.md/design.md, "עדכון סבב ב׳" לנימוקים המלאים. שני שינויים
עצמאיים — פונט (לקוח-בלבד) וסימון-מרחבי (שרת+לקוח) — יחד כי שניהם נגעו
לבקשה אחת מהמשתמש ולאותו קובץ (`Practice.tsx`/`App.css`).

### פונט כתב-יד (`Playpen Sans Hebrew`)
- **`index.html`**: `<link>` ל-Google Fonts (`preconnect` + `family=Playpen+Sans+Hebrew:wght@400;700`)
  — הפונט-החיצוני-הראשון בפרויקט הזה. `font-display: swap` (ברירת המחדל של
  ה-URL של Google Fonts) כדי שטקסט לא ייעלם בזמן טעינה.
- **`src/App.css`**: `.notebook-teacher-mark` מקבל `font-family: "Playpen Sans Hebrew", var(--sans)`
  (נופל חזרה לפונט הרגיל אם הטעינה נכשלת — לא "בלי טקסט"). שום כלל CSS אחר
  לא נוגע בפונט.

### סימון מרחבי — שינוי טיפוס + פרומפט (שרת)
- **`server/src/pageReading.ts`**: שדה אופציונלי חדש על `PageReadingSchema`:
  ```ts
  errorLocation: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).optional(),
  ```
  `x`/`y` הם **שברים** (0 = קצה עליון/שמאלי של הדף, 1 = קצה תחתון/ימני) —
  לא פיקסלים ולא קואורדינטת-תא — כדי לא לדרוש מהמודל דיוק-פיקסל שהוא לא
  יכול לספק (ראו design.md, "קירוב, לא דיוק"). מוסיפים את השדה ל-union-טיפוס
  `PageReading` (ב-`server/src/pageReading.ts` **וגם** ב-`src/lib/notebookServer.ts`
  הלקוח — שני המקומות שכבר מגדירים את אותו טיפוס במקביל, אותו דפוס שכבר קיים
  ל-`errorPointer`).
- **`server/src/readPage.ts`**: `teacherSystemPrompt()`'s סעיף 2 (`errorPointer`)
  מתרחב בפסקה נוספת: **רק כש-`errorPointer` כן מופיע**, לבקש גם הערכה גסה
  (שבר 0–1 לרוחב ולגובה) של **איפה בערך** בדף נכתב החלק הבעייתי — ומפורשות:
  "זו הערכה גסה, לא מדידה מדויקת — אם אינכם בטוחים איפה בערך, השמיטו את
  השדה הזה לגמרי, אל תנחשו". אותו עיקרון בדיוק שכבר מנחה את `errorPointer`
  עצמו ("אל תמציאו טעות") — לא מוסיפים דרישת-וודאות נמוכה יותר רק כי זה שדה
  חדש.
- **`server/src/index.ts`**: מיפוי-התשובה המוצלחת (שכבר מעביר `errorPointer`
  בתנאי) מעביר גם `errorLocation` באותו תנאי (`parsed.errorLocation ? {...} : {}`).

### סימון מרחבי — רינדור (לקוח)
- **`src/components/Practice.tsx`**:
  - `TeacherMark` מקבל שדה רביעי אופציונלי: `location?: { x: number; y: number }`,
    מועתק מ-`reading.errorLocation` ב-`handleTeacherReading` (אותו רגע
    שכבר בונה את שאר ה-`TeacherMark`) — רק כש-`errorPointer` קיים (אם השרת
    אי-פעם מחזיר `errorLocation` בלי `errorPointer` זה נחשב קלט-תקול, מתעלמים
    מהמיקום).
  - `questionHeader`'s עץ-ה-JSX מקבל ילד שלישי: אלמנט SVG חדש
    (`<svg className="notebook-teacher-pointer">`) שמצויר **רק** כש-
    `displayedTeacherMark?.location` קיים — עיגול (`<circle>`) במיקום
    `location.x * PAGE_WIDTH, location.y * PAGE_HEIGHT` (page-space px,
    `PAGE_WIDTH`/`PAGE_HEIGHT` כבר מיובאים מ-`notebook.ts`), וקו (`<line>`)
    מאותה נקודה לנקודת-היעד הקבועה (ראו design.md — `(96,60)` לעיגון-שמאל,
    `(PAGE_WIDTH-110, 60)` לעיגון-ימין, נגזר מ-`displayedQuestionIsWordProblem`
    הקיים, לא דגל חדש).
  - **לא** ילד בתוך `.notebook-question-header` עצמו (בניגוד להערת-הטקסט) —
    ה-SVG צריך לצייר בכל מקום על פני הדף (העיגול יכול להיות בתחתית הדף),
    לא רק באזור הכותרת. הוא אלמנט-אח **נפרד**, ישירות בתוך `.notebook-stack`,
    **אחרי** הקנבס וה-`questionHeader` (מעליהם בסדר-הציור) — דורש prop
    **חדש** ל-`PracticeNotebook` (`teacherPointer: ReactNode`, אופציונלי,
    `null` כברירת מחדל) — חריגה מכוונת מהעיקרון "הכל נכנס ל-`questionHeader`"
    שסבב א׳ קבע, כי כאן התוכן **באמת** שונה-בסוג (ציור-חופשי-על-כל-הדף, לא
    טקסט-בכותרת) ולא רק תוספת-באותו-מקום. מתועד כסטייה מכוונת, לא שכחה.
- **`src/App.css`**: `.notebook-teacher-pointer` — `position: absolute; inset: 0;
  pointer-events: none; z-index: 1` (אותה שכבה כמו `questionHeader`/הקנבס).
  `circle`/`line` בצבע `#dc2626` (אותו ליטרל-אדום כמו `.notebook-teacher-mark-red`),
  `fill: none` על העיגול (רק מתאר, לא מלא), `stroke-width` סביר (`3px`
  page-space).

## Edge Cases — סבב ב׳
- **`errorLocation` בלי `errorPointer`** — לא אמור לקרות (הפרומפט מבקש מיקום
  *רק* בתוך סעיף ה-`errorPointer`), אבל אם זה קורה בכל זאת (תגובת-מודל
  לא-צפויה), הלקוח מתעלם מ-`location` כש-`errorPointer` עצמו חסר — לא מצייר
  עיגול-בלי-הקשר.
- **`x`/`y` מחוץ לטווח `0–1`** (באג-מודל אפשרי) — `Zod`'s `.min(0).max(1)`
  כבר דוחה תגובה כזו בשלב ה-validation בשרת (כמו כל שדה אחר שנכשל
  ב-validation — התנהגות קיימת, `parsed_output` יוצא `null`, הלקוח מקבל
  `certain: false` דה-פקטו דרך אותה נפילה-בטוחה הקיימת).
- **זום/פאן** — העיגול/קו חיים בתוך `.notebook-stack`, אז הם עוברים את אותו
  transform כמו הכל שם; שום מתמטיקה חדשה.

## Risks / Tradeoffs — סבב ב׳
- **דיוק-המיקום מול Claude אמיתי לא אומת** — אין דרך לבדוק את זה בלי קריאה
  אמיתית (בתשלום) למודל; בדיקות e2e יכולות לאמת רק "כש-`errorLocation`
  נתון X מהשרת, העיגול מצויר בפיקסל Y" — לא "האם X שהמודל *באמת* מחזיר
  תואם את מה שבאמת נכתב". ראו product-spec.md, "עדכון סבב ב׳" — זה אותו
  סוג-סיכון בדיוק שכבר תועד ואומת בדיעבד ל-`notebook-teacher-understanding`.
- **`teacherPointer` כ-prop חדש ל-`PracticeNotebook`** — סטייה מהעיקרון
  שסבב א׳ קבע ("הכל נכנס ל-`questionHeader`"); מתועדת כהחלטה מודעת, לא
  שכחה (ראו למעלה).

## Implementation Notes — סבב ב׳

מומש כמתוכנן. פונט: נבדקה השוואה חזותית אמיתית (צילום-מסך, לא רק קריאת-שם)
בין `Playpen Sans Hebrew` ו-`Gveret Levin` לפני ההחלטה — `Gveret Levin` יותר
קורסיבי-מסוגנן אבל פחות קריא, סיכון אמיתי למיקה; `Playpen Sans Hebrew` נבחר.

**סימון מרחבי — אומת נגד שרת-dev אמיתי** (לא תמונה סטטית), עם מיקוק
`/read-page` באותו דפוס כמו סבב א׳:
- `getComputedStyle` אימת `font-family` כולל `"Playpen Sans Hebrew"` בפועל,
  לא רק הנחה שה-`<link>` ב-`index.html` נטען.
- עיגול+קו: נמדדו `cx`/`cy`/`x2`/`y2` בפועל מול הערכים הצפויים — לא רק
  קריאה חזותית. `errorLocation: {x:0.2, y:0.15}` → `circle` ב-`(240, 240)`
  page-space (`0.2*1200`, `0.15*1600`) — מדויק. אומת גם עוגן-היעד לשני
  הכיוונים: `qh-ltr` → `x2=96`, `qh-rtl` → `x2=1090` (`PAGE_WIDTH-110`) —
  שניהם נבדקו בפועל, לא רק האחד.
- אומת שהעיגול/קו **נעדרים** כש-`errorLocation` חסר (גם כש-`errorPointer`
  כן קיים) וגם כש-`errorPointer` עצמו חסר — שני המקרים שה-Edge Cases כבר
  צפו.
- `pointer`'s `boundingBox()` גדול מ-`stage`'s (840×1120 מול 340×190.8
  בצילום אחד) — **לא** באג: בדיוק כמו הקנבס, ה-SVG מרונדר במידותיו
  המלאות (`PAGE_WIDTH×PAGE_HEIGHT` כפול הזום) ו-`.notebook-stage`'s
  `overflow:hidden` **חותך** אותו חזותית — נבדק ישירות (צילום-מסך מראה
  רק את מה שבאמת גלוי, לא יותר).

`build`/`lint` נקיים (גם `npm run build` בלקוח וגם `npm run build` ב-
`server/`). גרסה `1.41.0 → 1.42.0`. 16 בדיקות e2e חדשות נוספו (ראו
tests.md). ריצה מלאה בודדת ונקייה: **486/486 עברו**.
