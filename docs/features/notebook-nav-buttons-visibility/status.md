# פאד הניווט במחברת: לצד שמאל, כבוי כברירת מחדל, ונגיש מהדף עצמו

עדכון לפאד הניווט הקיים (#78): עובר לצד שמאל, כבוי כברירת מחדל עד שמדליקים
אותו, ואפשר להגיע להגדרות ישירות מתוך מסך התרגול.

## Progress
- [x] Product spec — product-manager — 2026-10-11 (שלוש הכרעות עיקריות:
  (1) הגדרת הדלקה/כיבוי נפרדת לגמרי מהגדרת מהירות הניווט הקיימת (#79)
  — "כבוי" הקיים כבר אומר משהו אחר (בלי החזקה-לגלילה-רציפה, אבל גלוי
  ועובד), שימוש חוזר בו היה מבלבל; (2) ברירת מחדל: לא מופיע כלל, לא
  "שקוף"; (3) נקודת כניסה חדשה ל-⚙️ מתוך מסך התרגול עצמו — אותו דיאלוג
  בדיוק, לא גרסה נפרדת. ראו Open Questions לתלות סדר-מיזוג מול PR #80
  שעדיין פתוח)
- [ ] Design — designer — not started
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** designer
**Branch:** `feature/notebook-nav-buttons-visibility`
**PR:** not opened yet

## Open questions / blockers
- **Product:** תלות סדר מיזוג מול PR #80 (עדיין פתוח) — הספק מניח ש-#80
  ממוזג קודם (כך שצד ימין-למטה נשאר לטור הכלים של #80, וצד שמאל פנוי
  לפאד). לא חוסם את כתיבת הספק/עיצוב/ארכיטקטורה, אבל אם סדר המיזוג
  בפועל יתהפך, יהיה צריך ליישב בין שתי הפריסות בשלב הפיתוח/מיזוג.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
