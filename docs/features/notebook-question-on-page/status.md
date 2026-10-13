# השאלה כתובה על דף המחברת עצמו

השאלה מוצגת כתובה בתוך דף המחברת עצמו (במרחב הפאן/זום שלו), במקום בתיבה
נפרדת מעליו — מחליפה את התיבה הקיימת, לא מכפילה אותה.

## Progress
- [x] Product spec — product-manager — 2026-10-13 (נחקרה הארכיטקטורה
  בפועל: `PracticeNotebook.tsx`'s `.notebook-canvas`/`.notebook-stack` הוא
  מרחב קואורדינטות של דף (`PAGE_WIDTH`/`PAGE_HEIGHT`) שרק דיו של תלמיד/ה
  מצויר בו היום (`stampCell`/`fillCellBlock`) — השאלה חיה היום רק מחוץ לו,
  ב-`.problem-box` (Practice.tsx) או בעותק שלה ב-`topSlot` של מסך מלא.
  `Practice.tsx`'s `next()` כבר יוצר/ת דף חדש per שאלה ("דף = תרגיל אחד") —
  כך שכל דף כבר ממופה 1:1 לשאלה שלו, בלי צורך במבנה נתונים חדש כדי לדעת
  איזו שאלה שייכת לאיזה דף. `TopicLesson.tsx` משתמש ב-`.problem-box` בלבד,
  בלי מחברת/משטח כתיבה כלל — Out of Scope בבירור. החלטת מוצר מפורשת:
  התיבה הנפרדת מוחלפת, לא מוכפלת — ראו product-spec.md לנימוק. קריטריון
  קבלה מפורש: הטקסט הכתוב-על-הדף אינו דיו אמיתי (לא נמחק ע"י מחק, לא
  מצטרף ל-`filledCells`). עיצוב מדויק (גופן/האם מחקה כתב-יד) הושאר
  ל-designer. אין שאלות פתוחות חוסמות.)
- [x] Design — designer — 2026-10-13 (הכותרת-הכתובה חיה בתוך
  `.notebook-stack` עצמו — אותו מרחב קואורדינטות `1200×1600` שהרשת והקנבס
  כבר חיים בו, כך שהיא נעה/משנה גודל עם הדף אוטומטית דרך אותו CSS
  transform, בלי מנגנון נפרד. מידות מדויקות: שוליים `24px`/`56px`,
  `44px` לשאלה חשבונית, `26px`/150% לשאלה מילולית (מיושרת ימינה, רוחב
  מקס' `760px`), קו הפרדה דק מתחתיה, גובה הפס דינמי לפי אורך השאלה,
  `pointer-events: none` כך שמגע/עט ממשיכים לקנבס שמתחת. החלטת-scope
  מפורשת: `clockSlot`/`angleSlot` (ציורי שעון/זווית) **נשארים** בכותרת
  הרגילה מחוץ לדף — ה-spec דיבר על "הטקסט", לא על כל דימוי נלווה.
  כפתור ההקראה עובר למיקום **אחד** משותף (`.notebook-topbar`, שכבר מוצג
  גם בתצוגה רגילה וגם במסך מלא) במקום שני מיקומים נפרדים שעלולים לסטות
  — אותו עיקרון "מקור אחד" שה-spec דרש לגבי השאלה עצמה. RTL: שתי הדוגמאות
  (חשבון טהור / מילולי-עברי) ממשיכות להישען על `promptSegments`/
  `unicode-bidi: isolate` הקיימים ללא שינוי במנגנון — רק הוזהר מפורשות
  שהאלמנט-אב עכשיו עובר `transform: scale()` מ-JS, לא רק `direction`
  CSS סטטי, ונדרשת בדיקה חזותית בזום שונה מ-100% ולא רק ב-100%. אין
  שאלות פתוחות.)
- [x] Architecture — tech-lead — 2026-10-13 (`PracticeNotebook.tsx` מקבל
  שני props חדשים — `questionHeader`/`speakButton`, שניהם `ReactNode` —
  אותו דפוס בדיוק שכבר קיים ל-`topSlot`/`statusSlot`: הקורא (`Practice.tsx`)
  מרכיב, הרכיב מרנדר בלי לדעת מה זה; שום ידיעה חדשה על תוכן השאלה לא
  נכנסת ל-`PracticeNotebook` עצמו. `questionHeader` מרונדר בתוך
  `.notebook-stack` **אחרי** ה-`<canvas>` במארקאפ (+`z-index:1` מפורש) כדי
  לצבוע מעליו, עם `pointer-events: none` כך שמגע/עט ממשיכים לקנבס.
  מכיוון שה-header נגזר מ-`question` הנוכחי בכל רינדור (לא נשמר על הדף),
  המקרה של דף-מְשומש-מחדש ב-`MAX_PAGES` עובד נכון אוטומטית, בלי שדה חדש
  על `NotebookPage`. CSS מדויק לפי ערכי ה-px מ-design.md, טוקן צבע חדש
  `--notebook-question-ink` (אור+חושך, אותו מקום/פורמט כמו `--notebook-grid`
  הקיים ב-`src/index.css`). כפתור ההקראה עובר למיקום **אחד** משותף
  (`.notebook-topbar`, עטוף יחד עם `.notebook-page-indicator` בקבוצה
  `.notebook-topbar-start` כדי לא לשבור את ה-`space-between` הקיים).
  שלושה כללי CSS הופכים ל-dead code ומוסרים במפורש (לא נשארים):
  `.notebook-fullscreen-topbar .problem-box`/`.prompt-ltr`, ו-
  `.question-speech`. סומנה חובת-בדיקה ידנית מפורשת (לא אוטומטית —
  אין e2e קיים שמכסה bidi בתוך `transform: scale()`): צילום מסך של שאלה
  מילולית בזום `70%` **וגם** בזום `>100%`. הודגש במפורש: הכותרת **לא**
  מקבלת `aria-hidden` (בניגוד למינימאפ) — היא תוכן אמיתי לקורא-מסך. אין
  שאלות פתוחות.)
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** developer
**Branch:** `feature/notebook-question-on-page`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
