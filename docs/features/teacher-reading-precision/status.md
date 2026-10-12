# דיוק בתיאור טעות התהליך + גיוון דימוי במשוואות חיבוריות

שני דיוקים: `errorPointer` יבחין בין טעות-חישוב ניתנת-לאימות לבין חוסר-עקביות
מבני (במקום ניסוח גורף אחיד), ודימוי המשוואות החיבוריות/חיסוריות מתגוון במקום
משפט קבוע יחיד.

## Progress
- [x] Product spec — product-manager — 2026-10-12 (שני ממצאים מהחקירה: (1)
  `errorPointer` שייך בפועל ל-`notebook-default-practice` (לא ל-
  `notebook-teacher-understanding`, ששם שיפוט/הבחנת-סוג-טעות היא Out of Scope
  במפורש) — הארכיטקטורה שם כבר סימנה מראש "errorPointer הוא היכולת הכי
  חדשה/לא-מוכחת", בדיוק הסיכון שהתממש כאן; (2) הדימוי ("חסכת...") הוא תבנית
  קבועה יחידה ב-`adaptiveEquations.ts`, לא בעיה של שאלה בודדת — לכן תיקון
  ישיר (גיוון), לא כלל-תוכן חדש (per `content-rules.md`'s "the analogy in m3
  doesn't land" → לא הופך לכלל). ההבחנה המרכזית בקריטריון הראשון: לא ניחוש
  מצב-נפשי (לא אמין), אלא הבחנה עובדתית-חישובית (חישוב מפורש ניתן-לאימות מול
  חוסר-עקביות מבני), עם נפילה-חזרה לניסוח הכללי כשלא בטוח)

**Current phase:** designer
**Branch:** `feature/teacher-reading-precision`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
