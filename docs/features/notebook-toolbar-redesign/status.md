# מחברת: עמודת כפתורים ממוקדת + הצעת הפעולה הבאה

שתי עמודות כפתורים עגולים (זום/ניקוי משמאל-למעלה, בחירת כלי מימין-למטה)
וכפתור שגדל כדי להציע לתלמיד/ה מתי לעבור בין כתיבה להזזת התצוגה.

## Progress
- [x] Product spec — product-manager — 2026-10-10
- [x] Design — designer — 2026-10-10 (שתי עמודות עגולות — זום/ניקוי
  5 כפתורים משמאל-למעלה, כלים 3 כפתורים מימין-למטה; הצעה = גדילה+ברק,
  לא צבע רקע, כדי להישאר נבדלת מ"נבחר"; בורר גודל-כפתורים חדש עם 3
  אפשרויות בלי "כבוי", לא 6 כמו שאר הבוררים — ראו design.md לנימוק)
- [x] Architecture — tech-lead — 2026-10-10 (טבלאות `BUTTON_SIZE_LEVELS`
  ו-`SUGGESTION_SENSITIVITY_LEVELS` חדשות ב-`notebook.ts`; מנגנון ההצעה
  נשען על נקודות קיימות בקוד — `endPointer`, תחילת גרירה, פאד-ניווט —
  בלי פולינג חדש; `data-suggested` נפרד מ-`aria-pressed` לתמיכה במקרה
  "נבחר וגם מוצע". ראו architecture.md, כולל שני נתיבי ה-clearSuggestion
  הנפרדים (גרירה + פאד-ניווט) ב-Implementation Notes)
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** developer
**Branch:** `feature/notebook-toolbar-redesign`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
