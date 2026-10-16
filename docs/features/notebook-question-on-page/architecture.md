# השאלה כתובה על דף המחברת עצמו — Architecture

## Overview
`Practice.tsx` ממשיך לבנות את ה-JSX של השאלה (כמו היום עם `questionBox`),
אבל מעביר אותו ל-`PracticeNotebook` כ-`ReactNode` חדש (`questionHeader`) —
אותו דפוס בדיוק שכבר קיים עבור `topSlot`/`statusSlot`/`primaryAction`
(הקורא מרכיב, הרכיב מרנדר בלי לדעת מה זה). `PracticeNotebook` מרנדר אותו
כ"אח" של ה-`<canvas>` בתוך `.notebook-stack`, כך שהוא עובר בדיוק את אותו
CSS transform (פאן/זום) שהרשת והקנבס כבר עוברים — בלי שום מתמטיקת-טרנספורם
חדשה. כפתור ההקראה עובר באותו מנגנון בדיוק (`speakButton: ReactNode`) אל
`.notebook-topbar`.

## Affected Files / Components

- **`src/components/PracticeNotebook.tsx`** — שני props חדשים
  (`questionHeader`, `speakButton`, שניהם `ReactNode`). `questionHeader`
  מרונדר בתוך `.notebook-stack`, אחרי ה-`<canvas>` במארקאפ (כדי לצבוע
  מעליו — ראו Technical Approach). `speakButton` מרונדר בתוך
  `.notebook-topbar`, בקבוצה אחת עם `.notebook-page-indicator`.
- **`src/components/Practice.tsx`** — `questionBox` מפסיק להיות מוצג
  ישירות; השאלה נבנית כ-`questionHeader` חדש (אותה לוגיקת
  `isWordProblem`/`promptSegments`/`promptWithEquals` בדיוק, רק קלאסים
  חדשים) ומועברת ל-`<PracticeNotebook>`. `topSlot` מאבד את `questionBox`
  ואת `questionSpeakButton` — נשאר עם ✕ היציאה, `clockSlot`, `angleSlot`
  בלבד. ה-`practice-header` הרגיל (לא-מסך-מלא) מאבד גם הוא את `questionBox`
  ואת ה-`<div className="question-speech">` שעטף את כפתור ההקראה — נשאר
  עם הכותרת, `clockSlot`, `angleSlot`. `questionSpeakButton` (ה-JSX הקיים)
  מועבר כמות שהוא ל-`<PracticeNotebook speakButton={questionSpeakButton}>`.
- **`src/App.css`** — כלל CSS חדש לכותרת הכתובה-על-הדף (סעיף Technical
  Approach למטה), התאמה ל-`.notebook-topbar` כדי לקלוט את כפתור ההקראה
  בלי לשבור את ה-`justify-content: space-between` הקיים בינה לבין
  `.notebook-zoom-readout`, והסרת שלושה כללים שהופכים ללא-בשימוש (ראו
  Edge Cases).
- **`src/index.css`** — טוקן צבע חדש, `--notebook-question-ink`, באותו
  מקום ובאותו פורמט שכבר קיימים ל-`--notebook-grid` (שורה 13 ב-`:root`,
  שורה 47 במדיה-קוורי `prefers-color-scheme: dark`).

לא נוגעים ב-`src/data/notebook.ts` (אין שינוי בסוג `NotebookPage` או
בקבועי העמוד) ולא ב-`TopicLesson.tsx` (עדיין משתמש ב-`.problem-box` כמו
היום — Out of Scope לפי product-spec.md).

## Data / State Changes
- `PracticeNotebookProps` (ב-`PracticeNotebook.tsx`): שני שדות חדשים —
  ```ts
  questionHeader: ReactNode;
  speakButton: ReactNode;
  ```
  שניהם מתווספים ליד `topSlot`/`statusSlot` הקיימים, באותו style (caller
  מרכיב, הרכיב מרנדר בלי לדעת). **לא** נוספת שום ידיעה חדשה על "מה
  השאלה" בתוך `PracticeNotebook` עצמו — הוא נשאר "טיפש" לגבי תוכן, בדיוק
  כמו שהערה קיימת בקובץ כבר אומרת על `PrimaryAction`.
- אין שינוי ב-`NotebookPage`/`createBlankPage()` — המיפוי "דף = תרגיל אחד"
  כבר קיים (`Practice.tsx`'s `next()`), ומכיוון ש-`questionHeader` נגזר
  מ-`question` הנוכחי בכל רינדור (לא נשמר על הדף עצמו), דף שמוחזר-בשימוש
  כש-`pages.length >= MAX_PAGES` (אותו ענף קוד קיים ב-`next()`) מקבל
  אוטומטית את הכותרת הנכונה לשאלה החדשה — בלי צורך בשום שדה נוסף על
  `NotebookPage`.

## Technical Approach

### מיקום בתוך `.notebook-stack`
ב-JSX של `PracticeNotebook.tsx`, בתוך `<div className="notebook-stack" ref={stackRef}>`,
מוסיפים את `questionHeader` **אחרי** ה-`<canvas className="notebook-canvas">`
(לא לפניו) — שני האלמנטים `position: absolute` בתוך אותו הקשר-מיקום
(`.notebook-stack` עצמו `position: absolute`, בלי `z-index` מוגדר על
אף אחד מילדיו היום), כך שסדר הצביעה נקבע לפי סדר המארקאפ: מה שמופיע
אחרון בקוד נצבע מעל. זה בדיוק מה שצריך — הכותרת חייבת להופיע **מעל**
הדיו, אף פעם לא מתחתיו. ליתר ביטחון וקריאוּת (ולא להישען בשקט על סדר
מארקאפ), האלמנט מקבל `z-index: 1` מפורש בעצמו.

### `pointer-events: none`
הכותרת מקבלת `pointer-events: none` ב-CSS — כל אירוע מצביע/מגע שמתחיל
בשטח שלה ממשיך "דרכה" ומגיע ל-`<canvas>` שמתחתיה (ה-handlers הקיימים
ב-`PracticeNotebook.tsx` — `handlePointerDown`/`handlePointerMove`/
`endPointer` — לא משתנים כלל; הם כבר מחוברים ל-`<canvas>` עצמו, לא
לאלמנט-אב משותף).

### ה-JSX עצמו (ב-`Practice.tsx`)
```tsx
const questionHeader = (
  <div className={`notebook-question-header ${isWordProblem ? "qh-rtl" : "qh-ltr"}`}>
    <span className={isWordProblem ? "qh-text-rtl" : "qh-text-ltr"}>
      {isWordProblem ? (
        promptSegments(question.prompt).map((segment, i) =>
          segment.kind === "math" ? (
            <span key={i} className="prompt-math">{segment.value}</span>
          ) : (
            <span key={i}>{segment.value}</span>
          ),
        )
      ) : (
        <>{promptWithEquals(question.prompt)}</>
      )}
    </span>
  </div>
);
```
זו **בדיוק** אותה לוגיקה שכבר קיימת ב-`questionBox` היום (כולל השימוש
החוזר ב-`.prompt-math` הקיים ל-`unicode-bidi: isolate` + `direction: ltr`
על קטעי חשבון בתוך משפט עברי — לא ממציאים מנגנון בידי חדש, רק קלאס-אב
חדש). `qh-rtl`/`qh-ltr` הם הקלאסים החדשים (לא `box-rtl`/`box-ltr` — אלה
נשארים שמורים ל-`.problem-box` הישן ב-`TopicLesson.tsx`, כדי לא לערבב
שני הקשרי-CSS שונים תחת אותו שם).

### CSS חדש (`src/App.css`, ליד כללי ה-`.notebook-stack`/`.notebook-canvas` הקיימים)
```css
.notebook-question-header {
  position: absolute;
  z-index: 1;
  top: 24px;
  inset-inline: 56px;
  pointer-events: none;
  padding-bottom: 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--notebook-grid) 70%, transparent);
}

.notebook-question-header.qh-ltr {
  direction: ltr;
  text-align: center;
}

.notebook-question-header.qh-rtl {
  direction: rtl;
  text-align: right;
}

.qh-text-ltr {
  font-size: 44px;
  font-weight: 600;
  color: var(--notebook-question-ink);
}

.qh-text-rtl {
  display: inline-block;
  max-width: 760px;
  font-size: 26px;
  line-height: 150%;
  font-weight: 600;
  color: var(--notebook-question-ink);
}
```
שימו לב: ה-`24px` גובה פתיחה וה-`56px` שוליים-צד הם ערכי ה-page-space
המדויקים מ-design.md; `padding-bottom`+`border-bottom` יחד נותנים את
"קו ההפרדה 16px מתחת לטקסט" — וה-"24px ריק אחריו לפני הרשת" לא דורש CSS
נפרד: זה פשוט המרחק שנשאר עד שהתלמיד/ה מתחיל/ה לצייר, לא קו שצריך
לאכוף.

`inset-inline` (לא `left`/`right`) כדי שהשוליים יישארו נכונים בלי תלות
בכיוון המסמך — תרגול קיים כבר ב-App.css לאלמנטים אחרים במחברת (ראו
ה-`inset-inline-start`/`inset-inline-end` שה-RTL-redesign הקודם כבר
השתמש בו ל-`.notebook-pan-controls`/`.notebook-tool-controls`).

### טוקן הצבע (`src/index.css`)
```css
:root {
  /* ... */
  --notebook-grid: #b8d4f0;
  /* השאלה הכתובה-על-הדף: כחול "דיו מודפס" ברור, שונה בכוונה גם מ---text-h
     (הדיו של התלמיד/ה עצמו/ה) וגם מ---notebook-grid (בהיר מדי לטקסט) —
     ראו docs/features/notebook-question-on-page/design.md. */
  --notebook-question-ink: #2c5282;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* ... */
    --notebook-grid: #3a5578;
    --notebook-question-ink: #8fb8e8;
  }
}
```

### `.notebook-topbar` — קליטת כפתור ההקראה
`.notebook-topbar` היום: `justify-content: space-between` בין
`.notebook-page-indicator` ל-`.notebook-zoom-readout` — שני ילדים בלבד.
הוספת `speakButton` כילד שלישי ישירות הייתה מפזרת שלושה פריטים באופן
אחיד (`space-between` עם 3 ילדים שם את האמצעי... באמצע) — לא הפריסה
הרצויה. במקום זה, עוטפים את `.notebook-page-indicator` ואת `speakButton`
יחד בקבוצה אחת:
```tsx
<div className="notebook-topbar">
  <div className="notebook-topbar-start">
    <span className="notebook-page-indicator">דף {currentPageIndex + 1} מתוך {pages.length}</span>
    {speakButton}
  </div>
  <span className="notebook-zoom-readout">{zoomPercent}%</span>
</div>
```
```css
.notebook-topbar-start {
  display: flex;
  align-items: center;
  gap: 8px;
}
```
כך ה-`space-between` הקיים ממשיך לפעול בדיוק כמו היום (קבוצה אחת בכל קצה),
בלי לשנות את מיקום/גודל `.notebook-zoom-readout`.

## Edge Cases
- **שאלה מילולית ארוכה שגולשת לכמה שורות**: פס הכותרת גבוה יותר (גובה
  דינמי לפי design.md), ולכן "שטח הכתיבה" הנגיש מיד בתצוגה הראשונית
  (`INITIAL_ZOOM=0.7`, `panY=0` — עוגן בפינה השמאלית-עליונה) קטן יותר
  בפועל לשאלה הזו. לא באג — הדף ניתן לפאן/זום, בדיוק כמו שדף אמיתי עם
  שאלה ארוכה פשוט תופס יותר מקום בראשו. אין צורך בטיפול מיוחד, אבל שווה
  לבדוק ידנית עם שאלה מילולית ארוכה אמיתית (כיתה ו׳/ח׳ יש כאלה) שהתחושה
  עדיין סבירה.
- **דף שמשתמשים-מחדש בו** (`pages.length >= MAX_PAGES`, הענף הקיים
  ב-`next()` שמחליף את הדף האחרון): מכיוון ש-`questionHeader` נגזר
  מ-`question` הנוכחי בכל רינדור ולא נשמר במבנה `NotebookPage` עצמו, זה
  עובד נכון אוטומטית — אין "זיכרון" ישן של שאלה קודמת שצריך לנקות.
- **RTL בתוך `transform: scale()`** — design.md כבר מסמן את זה כסיכון
  חדש: הכותרת חיה בתוך `.notebook-stack`, שה-transform שלו (`translate()
  scale()`) מוחל דרך JS (`applyTransform()`), לא רק CSS `direction`
  סטטי כמו ב-`.problem-box` הישן. `unicode-bidi: isolate` הוא תכונת-טקסט,
  לא גאומטרית, ואמור להיות בלתי-מושפע מ-`transform` — אבל **זו חובת
  בדיקה ידנית מפורשת לפני שמדווחים "גמור"**: צלמו מסך של שאלה מילולית
  (לא רק חשבון טהור) בשני זומים שונים — ברירת המחדל (`70%`) **וגם** אחרי
  לחיצה על `+` כמה פעמים (זום `>100%`) — ואמתו שהחשבון בתוך המשפט עדיין
  נקרא משמאל-לימין בשניהם. זה בדיוק סוג הבדיקה ש-CLAUDE.md דורש ("לא
  לסמוך על אלגוריתם ה-bidi... בדיקה חזותית"), ואין בדיקת e2e אוטומטית
  קיימת שמכסה bidi בתוך אלמנט מועבר-טרנספורם — זו מגבלה ידועה, לא פספוס.
- **ניגודיות הצבע החדש** — `--notebook-question-ink` חדש בשני המצבים;
  developer מוודא/ת ידנית שהוא קריא על רקע `--bg`/הרשת המשובצת גם באור
  וגם בחושך (לא רק "שונה מ-`--text-h`", גם קריא בפני עצמו).

## Risks / Tradeoffs
- **`pointer-events: none` אומר שהכותרת אינה נגישה למגע כלל** — זה
  בכוונה (design.md): היא לא אינטראקטיבית, לא ניתנת ל"לחיצה כדי לשמוע"
  ישירות עליה. כפתור ההקראה יושב במקום נפרד (`.notebook-topbar`), לא
  צמוד לטקסט עצמו — פשרה מודעת לטובת "המגע תמיד מגיע לקנבס".
  - **בכוונה לא `aria-hidden`**: בניגוד ל-`.notebook-minimap` (שמסומן
    `aria-hidden="true"` כי הוא עיטור בלבד) — הכותרת הכתובה היא תוכן
    אמיתי ומשמעותי, וצריכה להישאר נגישה לקורא-מסך רגיל (טקסט DOM רגיל,
    בלי שום `aria-hidden`). developer לא יעתיק את דפוס ה-minimap לכאן.
- **שתי משפחות-קלאס דומות קיימות עכשיו** (`box-rtl`/`box-ltr` הישנות
  ב-`.problem-box`, ו-`qh-rtl`/`qh-ltr` החדשות) — נשמרות נפרדות בכוונה
  כי `TopicLesson.tsx` עדיין משתמש בראשונות (Out of Scope), ומיזוג השם
  היה יוצר תלות-מקרית בין שני הקשרים לא-קשורים.
- **שלושה כללי CSS הופכים ללא-בשימוש ומוסרים**, לא נשארים כ-dead code:
  - `.notebook-fullscreen-topbar .problem-box` ו-
    `.notebook-fullscreen-topbar .prompt-ltr` (App.css, ליד שורות
    1559–1570 בקוד הנוכחי) — היו קיימים רק כדי לכווץ את `.problem-box`
    בתוך `topSlot`, וזה כבר לא קורה שם.
  - `.question-speech` (App.css, שורות 1018–1023) — עטף רק את כפתור
    ההקראה בכותרת הרגילה הישנה; הכפתור כבר לא חי שם.

## Open Questions
None.

## Implementation Notes

מומש כמתוכנן, עם סטייה אחת אמיתית מהתכנון — נתפסה ותוקנה במהלך הבדיקה
הידנית החובה (לא השאירה אותה לדיווח-בלבד, תוקנה לפני שהסתיים השלב):

**הבאג שנתפס:** architecture.md תכנן `inset-inline: 56px` על
`.notebook-question-header` — ערך סימטרי בשני הצדדים הפיזיים, אומת אז
כנכון. אבל צילום מסך אמיתי (ראו למטה) גילה שזה גרם לבעיה אמיתית: טקסט
עברי מיושר-ימינה (`.qh-rtl`, `text-align: right`) בתוך קופסה שמשתרעת
כמעט על פני כל רוחב הדף (`1088px` מתוך `1200px`) מתחיל קרוב לקצה
ה**פיזי-ימני** של הדף — אבל הדף עצמו נפתח תמיד מעוגן לקצה
ה**פיזי-שמאלי** (`computeInitialTransform`'s `panX: 0`, בכוונה, ללא
קשר לכיווניות). בכל רוחב-תצוגה (`.notebook-stage`) שצר יותר מרוחב הדף
המלא בזום הפתיחה — המצב הרגיל, לא יוצא-דופן, כי בשביל זה בכלל קיימים
זום/פאן — תחילת המשפט העברי (שם שהטקסט "מתחיל" בכיוון RTL) נופלת מחוץ
לתצוגה הראשונית, לפני שמישהו גולל בכלל.

**התיקון:** `.qh-rtl` עוגן מחדש לקצה הפיזי-**שמאלי** (`left: 56px`
בלבד, בלי `right`) עם רוחב קבוע `760px` (בדיוק `max-width` של
`.qh-text-rtl` עצמו — אין "רווח" שהטקסט לא ממלא), במקום להשתרע כמעט על
כל רוחב הדף. `.qh-ltr` (המשוואה הטהורה, ממורכזת) נשאר כפי שתוכנן —
טקסט קצר וממורכז בתוך קופסה רחבה לא נתקל באותה בעיה, ואומת בנפרד
שעדיין תקין. `.notebook-question-header`'s הכלל המשותף עבר מ-`inset-inline`
(לוגי, תלוי-כיוון) ל-`left` פיזי מפורש — בכוונה, לא במקרה: ההערה החדשה
בקוד מסבירה למה "פיזי, לא לוגי" הוא הבחירה הנכונה כאן, בניגוד לכל מקום
אחר באפליקציה שבו `inset-inline-start/end` כבר משמש בצדק (שם זה *לא*
מתנגש עם עוגן-הזום-הפיזי, כי שום תוכן טרם ישב בתוך מרחב הדף עצמו).

**איך זה נתפס:** בדיוק הבדיקה הידנית המפורשת שה-architecture ביקש —
צילום מסך של שאלה מילולית אמיתית (עומר, כיתה ח׳, "זוויות וחפיפת
משולשים") בזום ברירת-המחדל (`70%`). לא תיאוריה — ראייה ישירה. **אחרי**
התיקון: אותה שאלה בדיוק מוצגת שלמה וקריאה, שתי השורות גולשות נכון,
`90°`/`56°` נקראים משמאל-לימין נכון בתוך המשפט העברי (לא הפוכים). זום
מעבר ל-`100%` (`250%`) נבדק גם הוא — הכותרת גוללת מחוץ לתצוגה (צפוי,
כי הזום-סביב-מרכז מרחיק את ראש הדף, בדיוק כמו שהיה קורה לדיו/לרשת) ולא
מתעוותת/הופכת כיוון. גם מצב חושך נבדק בנפרד (אותה שאלה) — `--notebook-question-ink`
הכחול-הבהיר קריא וברור מול הרקע הכהה, שונה בבירור מצבע-הטקסט הרגיל.
כל ארבעת הצילומים (RTL-לפני-התיקון, RTL-אחרי, LTR, חושך) לא נשמרו
בריפו — כלי-עזר זמניים נמחקו בתום הבדיקה.

ללא שינוי נוסף מהתוכנית: ה-props/ה-JSX/ה-CSS האחרים (`speakButton`
ב-`.notebook-topbar-start`, שלוש הסרות ה-CSS המתות, טוקן הצבע) מומשו
בדיוק כפי שתוכנן. `build`/`lint` נקיים. גרסה `1.38.0 → 1.39.0`.
`TopicLesson.tsx` לא נגע בו כלל — אומת ש-`.problem-box` עדיין קיים שם
ללא שינוי.

## Implementation Notes — סבב ב׳ (2026-10-16)

`qa` נעצר על שני באגים אמיתיים (ראו tests.md, "באג 1"/"באג 2") ובמקביל
המשתמש ביקש שינוי מיקום (שאלה חשבונית לפינה שמאלית-עליונה, שאלה מילולית
לפינה ימנית-עליונה, לפי היגיון כיוון-הכתיבה). סבב-תיקון חי בשיחה (לא
עבר דרך חמשת ה-skills מההתחלה — אותו תקדים כמו
[#77](https://github.com/eyalzur/learn-math/pull/77)), ששלושתם טופלו
יחד כי התיקון של באג 1 ושינוי המיקום חפפו קוד, ובדיקת-המיקום-מחדש היא
שחשפה את באג-RTL הנוסף למטה.

### תיקון באג 1 — `pageQuestionIndex`
נוסף מצב חדש, מערך-מקביל ל-`pages`: `pageQuestionIndex: number[]`
(אינדקס-השאלה שהיה "חי" כש**נוצר** כל דף). `next()` מעדכן את שניהם
יחד, באותה לוגיקה בדיוק (גם הענף הרגיל של הוספת-דף, גם ענף
`MAX_PAGES`-משתמש-מחדש). `questionHeader` עובר מלהתבסס על `question`
ה"חיה" (`lesson.questions[index]`) להתבסס על
`lesson.questions[pageQuestionIndex[currentPageIndex] ?? index]` —
"איזו שאלה מוצגת" (`displayedQuestion`) נפרד עכשיו במפורש מ"איזו שאלה
עונים עליה כרגע" (`question`/`index`, שממשיכים לשרת תשובה/אבחון/הסבר
ללא שינוי — לא נגעתי בהם). אומת: ניווט ל"דף קודם" מציג כעת נכון את
השאלה שהייתה כתובה שם.

### תיקון באג 2 — הרגרסיה של 119 הבדיקות
שתי תוספות, לא שינוי אחד: (א) ה-`span` הפנימי של `questionHeader` מקבל
גם `className="problem-text"` בנוסף למחלקה החדשה — אומת קודם שזה בטוח:
כלל ה-CSS של `.problem-text` (`font-weight`/`color` בלבד) וכללי
`.qh-text-ltr`/`.qh-text-rtl` החדשים הם כולם סלקטור-מחלקה-בודדת, אותה
ספציפיות; מכיוון שהכלל החדש מוגדר **אחרי** `.problem-text` ב-`App.css`,
הוא מנצח בקסקייד — אין התנגשות. זה תיקן את **רוב** ה-119 (הבדיקות
שחיפשו `.problem-text` כסלקטור על הטקסט עצמו). (ב) שש בדיקות נותרות
חיפשו `.problem-box` כ**קונטיינר** (לא `.problem-text` על הטקסט) —
ל-`.problem-box` יש כללי מיקום (`margin: 40px 0` וכו') שהיו מתנגשים
עם מיקום-ה-`absolute` של `.notebook-question-header`, כך שלא ניתן
להוסיף אותו בבטחה כמחלקה נוספת; הוחלט במפורש **לא** לאחד את שתי
משפחות-המחלקה. במקום זה שישה קבצי בדיקה עודכנו ישירות לסלקטור
`.notebook-question-header`: `notebook-toolbar-actions.spec.ts`,
`review-status.spec.ts`, `students-and-syllabus.spec.ts` (גם
`box-ltr`→`qh-ltr`), `notebook-default-practice.spec.ts` (כולל שחזור
הבדיקה שתיארה מסך-מלא כ"עותק נפרד" — ההנחה הזו כבר לא מתקיימת, נכתבה
מחדש כ"אותו אלמנט, גלוי בשני המצבים"), `question-hints.spec.ts`,
`grade2-syllabus.spec.ts` (שני שימושים, כולל `box-ltr`→`qh-ltr`).
`TopicLesson.tsx`/`topic-lesson.spec.ts` **לא** נגעו בהם — עדיין
משתמשים ב-`.problem-box` הישן, כמתוכנן.

### שינוי המיקום (ראו design.md, "עיגון פיזי, לא לוגי" לנימוק המלא)
`.notebook-question-header`'s הכלל המשותף איבד את `left`/`inset-inline`
— כל וריאנט מגדיר `left` פיזי משלו:
- `.qh-ltr`: `text-align: left; left: 96px; width: fit-content` —
  נמדד השטח האמיתי של `.notebook-zoom-controls` (עמודת-מסך קבועה,
  לא חלק מ-`.notebook-stack`) כדי לא להתנגש איתה; `56px` (הניסיון
  הראשון) עדיין נכנס לתוכה.
- `.qh-rtl`: `text-align: right; left: 56px; width: 300px` (צומצם
  מ-`760px`) — ראו design.md לנימוק המלא: עיגון-פתיחה-לשמאל
  (`panX:0`) מונע מיקום פיזי-ימני אמיתי בלי להסתיר את הטקסט, אז
  זו פשרה מודעת, לא "למעלה-ימין" מלא. `.qh-text-rtl`'s `max-width`
  צומצם בהתאם ל-`300px`.

תוך כדי אימות המיקום-מחדש בצילומי-מסך ברוחב-נייד **אמיתי** (`320px`,
`375px`, לא `{width:1000}` כמו בבדיקה הקודמת שהתבררה שגויה) נתפסו עוד
שני דברים: (1) ההתנגשות עם עמודת הזום עבור ה-LTR (תוקן, ראו למעלה);
(2) שה-RTL `760px` הקודם **מעולם לא נבדק באמת ברוחב-נייד אמיתי** והטקסט
אכן נחתך בתחילתו.

## Implementation Notes — סבב ג׳ (2026-10-16, המשך)

המשתמש ביקש פתרון יצירתי יותר מהפשרה שסבב ב׳ הציע: "אם יש כיתוב אז
שהדף יפתח בצד ימין אם צריך." במקום להשאיר את השאלה המילולית קרועה בין
מיקום-גלוי לבין מיקום-ימני-אמיתי, **הדף עצמו עכשיו פותח מעוגן לפינה
הפיזית-ימנית שלו כשהשאלה הנוכחית היא משפט עברי** — לא רק הפינה
השמאלית תמיד.

**המימוש:** `anchorPanX()` חדש ב-`notebook.ts` — מחשב `panX` לפי צד
(ימין/שמאל) וזום נוכחי. `PracticeNotebook` מקבל prop חדש, `anchorRight`
(=`displayedQuestionIsWordProblem` מ-`Practice.tsx`, אותו משתנה שכבר
קובע `qh-rtl`/`qh-ltr`). ה-effect שרץ בכל שינוי דף (ניווט/דף חדש, גם
בפתיחה) מחשב מחדש את `panX` לפי `anchorRight`, **אבל שומר על הזום
הנוכחי** (לא מאפס אותו ל-`INITIAL_ZOOM`) — זום שהתלמיד/ה בחר/ה בעצמו/ה
לא נמחק סתם כי הדף הבא קורא בכיוון אחר.

**המשמעות:** שאלה חשבונית פותחת כמו קודם (פינה שמאלית-עליונה). שאלה
מילולית פותחת כשה**דף עצמו** מראה את צדו הימני — `.qh-rtl` עכשיו
עוגן אמיתי ל-`right` (לא `left` כפשרה), כי מה שבתצוגה הוא כבר האזור
הנכון. זה מחליף את הפשרה של סבב ב׳ (קופסה צרה בצד שמאל) בפתרון
שמקיים את מה שהתלמיד/ה ביקש/ה בפועל, בלי לסכן את הבאג שכבר קרה שלוש
פעמים (טקסט לא-גלוי) — כי הדף עכשיו *מראה* את הצד שבו הטקסט חי,
במקום לדחוס טקסט לצד שגוי כדי שיישאר גלוי.

**מה נתפס בדרך (ותוקן, לא דווח-בלבד):** ניסיון ראשון עם `right:80px`
ו-`width:420px` נכשל בבדיקה אמיתית — ב-`320px` הקופסה הייתה **רחבה
מדי מהבמה עצמה**, כך שקצה שמאל שלה גלש מחוץ למסך (`visibleFraction
0.73`) — בדיוק מהכיוון ההפוך מהבאג שתוקן בסבב ב׳. נמדד מחדש: המינימאפ
(עיגון-מסך קבוע) יושב קבוע `72px` (מסך) מהקצה הימני של הבמה בכל רוחב
מכשיר שנבדק; תוקן ל-`right:110px; width:260px` — אומת ב-`320px`,
`375px`, `414px`: **`visibleFraction=1.00` בכולם**, אין חפיפה עם
המינימאפ, אין שגיאות קונסול. גם אומת מעבר בין דפים בכיוונים שונים
(4 שאלות עוקבות, `visibleFraction=1.00` בכל אחת).

**רגרסיה שנתפסה ותוקנה בריצת-הבדיקות המלאה:** שינוי ברירת-המחדל (דף
לא תמיד נפתח עם `panX:0`) שבר 7 בדיקות בארבעה קבצים (`notebook-auto-scroll`,
`notebook-usability-fixes`, `notebook-nav-buttons-visibility`,
`notebook-toolbar-redesign`) שהניחו `panX:0`/`translate` קבוע בפתיחה —
השאלה הראשונה של מיקה (נושא 0, "מספרים עד 20") היא מילולית, ולכן
עכשיו פותחת מעוגנת-ימין. תוקן: ארבעת הקבצים עברו לפתוח נושא 3
("חיבור וחיסור עד 20" — חשבון טהור, LTR, רמה כתובה לא מסתגלת, תואם
את מנגנון ה"נסו שוב" שחלק מהבדיקות נשען עליו). ניסיון ראשון עם נושא 1
("חיבור עד 10") נכשל — הוא מסתגל, בלי רשימת-שאלות קבועה, ושבר 5 בדיקות
אחרות שמניחות שאלות קבועות דרך "נסו שוב"; נושא 3 תיקן את שתיהן יחד.

**אימות:** `npm run build && npm run lint` נקיים. ריצה מלאה בודדת
ונקייה: **468/468 עברו**, פעמיים (לפני ואחרי העלאת הגרסה). גרסה
`1.40.0 → 1.41.0`.

### אימות
`npm run build && npm run lint` נקיים. ריצה מלאה בודדת ונקייה של
`npm run test:e2e`: **468/468 עברו** — כולל שתי הבדיקות שחסמו את qa
בסבב הקודם (ניווט-דף, הרגרסיה). לא רץ שום דבר במקביל (הכלל ב-CLAUDE.md
על ריצות-מקבילות-סותרות). גרסה הועלתה כנדרש (שינוי ב-`src/`):
`npm run bump:feature`, `1.39.0 → 1.40.0`.
