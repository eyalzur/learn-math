# כפתורי ניווט במחברת — פאד כיוונים

ארבעה כפתורי חץ (ימינה/שמאלה/למעלה/למטה) להזזת התצוגה בדף המחברת, לצד
כפתורי הזום הקיימים — דרך ניווט שלא תלויה בגרירה מדויקת.

## Progress
- [x] Product spec — product-manager — 2026-10-09
- [x] Design — designer — 2026-10-09 (פאד כיוונים בצורת צלב, בפינה הצפה
  הנגדית לכפתורי הזום; הכיוונים מרחביים ולא עוברים היפוך RTL — ראו
  Accessibility/RTL notes ב-design.md)
- [x] Architecture — tech-lead — 2026-10-09 (רוב הארכיטקטורה כתובה —
  `panButton` סימטרי ל-`zoomButton` הקיים, קבוע `PAN_STEP_PX` חדש — אבל
  חישוב ה-disabled חסום על שאלה אמיתית, ראו למטה)
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** tech-lead — blocked, see Open questions below
**Branch:** `feature/notebook-nav-buttons`
**PR:** not opened yet

## Open questions / blockers
- **Tech-lead:** גרירה חופשית (כלי "✋ הזזה") לא עוצרת בגבול הדף בקוד
  הקיים בכלל — קריטריון הקבלה בספק המוצר הניח בטעות שהיא כן עוצרת. צריך
  הכרעה בין: (א) כפתורי הכיוון מוגבלים וגרירה לא — חוסר עקביות, (ב)
  מוסיפים הגבלה גם לגרירה — שינוי התנהגות שלא התבקש, (ג) כפתורי הכיוון
  גם הם בלי הגבלה אמיתית, רק מושתקים כש"רואים את כל הדף". פרטים מלאים
  ב-architecture.md, Open Questions.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
