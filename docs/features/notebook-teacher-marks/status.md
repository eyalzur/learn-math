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
- [ ] Design — designer — not started
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** designer
**Branch:** `feature/notebook-teacher-marks`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
