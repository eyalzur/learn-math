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
