# המורה כותבת על הדף באדום/ירוק

כש"שלח למורה" חוזר, המורה כותבת הערה קצרה וצבעונית (ירוק/אדום) ישירות על הדף
עצמו — לא רק בפאנל הטקסט הקיים מתחת למחברת — ומזכירה את `errorPointer` הקיים
כשיש פירוט קונקרטי על מה השתבש.

## Progress
- [x] Product spec — product-manager — 2026-10-17 (נחקרו `notebook-teacher-understanding`,
  `notebook-teacher-feedback`, `teacher-reading-precision` מהדיסק. ממצא מרכזי:
  `errorPointer`/`processReflection` הם משפטי-טקסט חופשיים — למודל שקורא את
  הדף **אין נתוני-מיקום/קואורדינטות** על איפה בדף כל חלק נכתב, רק תיאור
  טקסטואלי. לכן "לסמן בעיות" הוגדר ב-Out of Scope כהערת-טקסט-קצרה-באדום שמזכירה
  את ה-`errorPointer` הקיים כשיש כזה, לא עיגול/חץ מדויק בכתיבה — הרחבה עתידית
  אפשרית, לא כאן. החלטת מוצר מפורשת נוספת: הצבע נגזר מהבדיקה המקומית הקיימת
  (`question.answer`) ולא משיפוט AI חדש — שומר על ההפרדה הקיימת "המורה קוראת,
  הבדיקה המקומית שופטת". הפאנל "מה המורה הבינה" הקיים **נשאר כפי שהוא**, ההערה
  על הדף היא תוספת (אותו עיקרון שכל שלב קודם של תכונת-המורה כבר אימץ — תוספת,
  לא תחליף). אין שאלות פתוחות חוסמות.)
- [x] Design — designer — 2026-10-17 (ההערה נוספת **מתחת** לשאלה הכתובה-על-הדף
  הקיימת, באותו בלוק ואותו עיגון-פיזי (שמאל/ימין לפי כיוון השאלה) — לא מיקום
  עצמאי, כדי לרשת את הבטחת-הנראות שכבר קיימת, בלי לפתור מחדש "איפה בדיוק
  התלמיד/ה כתב/ה" (שאין לו פתרון — המודל לא מחזיר קואורדינטות). **תיקון
  לעומת ה-spec**: לא שני מצבי-צבע אלא שלושה — ירוק (נכון, בלי `errorPointer`),
  ענבר (נכון **עם** `errorPointer` — מצב שכבר קיים בקוד כ-`.feedback.correct-flagged`,
  `#b45309`, ולא נדון ב-spec), אדום (שגוי). סימני `✓`/`✗` בתחילת כל הערה.
  RTL: `segmented()` הקיים בדיוק, אותו מנגנון כבר-מוכח ל-`.teacher-reading-line`
  — אין מנגנון bidi חדש. אין שאלות פתוחות חוסמות.)
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** tech-lead
**Branch:** `feature/notebook-teacher-marks`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
