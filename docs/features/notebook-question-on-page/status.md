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
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** tech-lead
**Branch:** `feature/notebook-question-on-page`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
