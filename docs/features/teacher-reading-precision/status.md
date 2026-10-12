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
- [x] Design — designer — 2026-10-12 (שני רגיסטרים ל-`errorPointer`: כללי
  (קיים, נשאר ברירת-מחדל-בטוחה) וספציפי (חדש — מצטט את החישוב המפורש ומה
  שהוא שווה באמת, למשל "`30 - 12` שווה `18`, לא `28`"). דוגמת הסוגריים
  הקיימת מ-`notebook-usability-fixes` נשארת ברגיסטר הכללי במפורש — היא
  חוסר-עקביות מבני, לא חישוב ניתן-לאימות במנותק. ארבעה דימויים לכל כיוון
  משוואה (כולל המקורי), באותו מבנה "עבודה אחורה" ואותו pattern `pick()`
  שכבר קיים ב-`adaptiveAdd100.ts`. ללא שינוי מסך/UI — תוכן בלבד)
- [x] Architecture — tech-lead — 2026-10-12 (אומת מול הקוד בפועל: הפרומפט
  יושב ב-`server/src/readPage.ts` (`teacherSystemPrompt()`, שורה 44 — תוספת
  ניסוח לסעיף 2 הקיים, לא סעיף נפרד), ו-`errorPointer` כבר
  `z.string().optional()` ב-`pageReading.ts` — **אין שינוי סכימה נדרש**, זה
  ניסוח-פרומפט בלבד. `pick()` כבר מיובא ב-`adaptiveEquations.ts` (שורה 2) —
  שני מאגרי-דימוי חדשים (`ADDITIVE_PLUS_ANALOGIES`/`ADDITIVE_MINUS_ANALOGIES`)
  מעל `additiveEquation`, מחליפים את שתי המחרוזות הבודדות בשורות 47-48. דגש
  מפורש ל-developer בפרומפט: "אל תסבירו למה זה קרה" ו"לעולם אל תנחשו סיווג
  שאינכם בטוחים בו" — אכיפת שני האילוצים מה-product-spec. Risk מתועד: איכות
  בחירת-הרגיסטר אינה ניתנת-לבדיקה אוטומטית (כמו ב-`notebook-default-practice`
  המקורי) — qa בודק/ת זרימת UI עם מוק, לא איכות הסקה; גיוון הדימויים כן
  דטרמיניסטי ובר-בדיקה ישירה)

**Current phase:** developer
**Branch:** `feature/teacher-reading-precision`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
