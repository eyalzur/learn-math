# קושי מסתגל — תרגילים מטמפלייט

תרגילים נבנים מטמפלייט עם מספרים שנבחרים ב-runtime לפי קושי, במקום שלוש רמות קבועות
— כדי שהקושי יגיב להצלחת התלמיד/ה בזמן אמת, כמו מורה אמיתית, במקום שלוש חבילות שנקבעו
פעם אחת בכתיבה.

## Progress
- [x] Product spec — product-manager — 2026-08-18
- [ ] Design — designer — not started
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** product-manager — blocked, see Open questions below
**Branch:** `feature/adaptive-difficulty`
**PR:** not opened yet

## Open questions / blockers
- **Product:** על מה זה חל תחילה — נושא בודד אחד (הוכחת היתכנות), כל התוכן של תלמיד/ה
  אחד/ת, או כל שלושת התלמידים? היקף שונה לגמרי בכל מקרה.
- **Product:** מה קורה לרמזים/הסברים/דימויים הקיימים — נשארים טמפלייט של אותו טקסט עם
  placeholder למספרים, או מחושבים גנרית מהמספרים (הסיכון: בדיוק התקלה שתוקנה השבוע
  בכיתה ב׳ של מיקה, שבה חישוב גנרי סתר את הרמז הכתוב)?
- **Tech-lead (לא חוסם את הספק, אבל צריך תשובה לפני עיצוב/ארכיטקטורה):** איך בדיוק
  "קושי שהולך ונהיה קשה" מתורגם למספרים בפועל; מה קורה להיסטוריה הקיימת שמבוססת על
  `topic` + `level` קבועים.
- **Designer (לא חוסם):** איך נראה מסך התרגול בלי שלוש רמות גלויות לבחירה.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
