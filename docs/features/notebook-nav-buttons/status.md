# כפתורי ניווט במחברת — פאד כיוונים

ארבעה כפתורי חץ (ימינה/שמאלה/למעלה/למטה) להזזת התצוגה בדף המחברת, לצד
כפתורי הזום הקיימים — דרך ניווט שלא תלויה בגרירה מדויקת.

## Progress
- [x] Product spec — product-manager — 2026-10-09
- [x] Design — designer — 2026-10-09 (פאד כיוונים בצורת צלב, בפינה הצפה
  הנגדית לכפתורי הזום; הכיוונים מרחביים ולא עוברים היפוך RTL — ראו
  Accessibility/RTL notes ב-design.md)
- [x] Architecture — tech-lead — 2026-10-09 (`panButton` סימטרי ל-
  `zoomButton` הקיים, קבוע `PAN_STEP_PX` חדש, ופונקציית `clampPan` חדשה
  שמיושמת גם על גרירה חופשית וגם על הכפתורים — ראו הכרעת החסימה למטה)

**הכרעה (2026-10-09):** שאלת "האם להגביל גם גרירה חופשית" (ראו גרסה
קודמת של הקובץ הזה) הוכרעה בלי אישור מפורש לאחת משלוש האפשרויות —
המשתמש ביקש להמשיך ("צריך כפתורי ניווט") ולכן ההכרעה (אפשרות ב, הגבלה
גם לגרירה) היא שלי. ראו architecture.md, Overview, לנימוק המלא.
- [x] Implementation — developer — 2026-10-09 (ראו Implementation Notes
  ב-architecture.md לשלושה דברים שהתגלו תוך כדי: clamp חסר בזום-החזקה,
  disabled שלא התעדכן אחרי גרירה טהורה, ובאג RTL אמיתי — האשכול נחת
  בפינה הלא-נכונה — שנתפס בתצוגה מקדימה אינטראקטיבית ותוקן לפני שהתפרסם)
- [x] Tests — qa — 2026-10-09 (עשר בדיקות חדשות ב-
  `tests/e2e/notebook-nav-buttons.spec.ts`; `404/404` בריצה מלאה ונקייה.
  **עדכון (2026-10-09):** אחרי שני סבבי ריוויו נוספים — כיווץ הכפתורים
  והוספת החזקה-לגלילה-רציפה — עוד שתי בדיקות; `406/406` בריצה מלאה
  ונקייה. ראו tests.md ו-architecture.md, Implementation Notes)

**Current phase:** done — ממתין לריוויו ולמיזוג
**Branch:** `feature/notebook-nav-buttons`
**PR:** [#78](https://github.com/eyalzur/learn-math/pull/78)

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
