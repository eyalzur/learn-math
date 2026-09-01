# זוויות וחפיפת משולשים — נושא חדש לכיתה ח׳

נושא תרגול חדש לעומר: זוויות (השלמה, זווית חיצונית, ישרים מקבילים) וחפיפת משולשים
(כולל משולש שווה-שוקיים) — סוגר פער שהתגלה מהשוואה מול עבודת סיכום אמיתית של כיתה ח׳.

## Progress

**סבב ב׳ — מחולל אדפטיבי, בעקבות תצוגה מקדימה (2026-09-01):** המשתמש ראה את עמוד
הריוויו של הסבב הראשון (`30` שאלות כתובות, מסך שלוש רמות) וביקש: "אני רוצה מחולל
עכשיו. אין יותר רמות לבחירה." ארבעת השלבים הבאים חוזרים כדי לממש את זה, על אותו
בראנץ׳/PR (לא נפתח PR חדש).

- [x] Product spec — product-manager — 2026-09-01 (סבב ב׳: קריטריון ההסתגלות עודכן)
- [x] Design — designer — 2026-09-01 (סבב ב׳: אין LevelPicker, אין מחוון קושי, 20 שאלות)
- [x] Architecture — tech-lead — 2026-09-01 (סבב ב׳: adaptiveAngles.ts, 6 tiers, טווחי מספרים מובטחים)
- [x] Implementation — developer — 2026-09-01 (סבב ב׳: 1,800 שאלות שנוצרו אומתו, אפס כשלים)
- [ ] Tests — qa — not started (סבב ב׳)

**Current phase:** qa
**Branch:** `feature/grade8-angles-congruence`
**PR:** https://github.com/eyalzur/learn-math/pull/65

### סבב א׳ — הושלם 2026-09-01, לפני הבקשה למחולל
- [x] Product spec — product-manager — 2026-09-01
- [x] Design — designer — 2026-09-01
- [x] Architecture — tech-lead — 2026-09-01
- [x] Implementation — developer — 2026-09-01
- [x] Tests — qa — 2026-09-01

## Open questions / blockers
None.

- **הוחלף (סבב ב׳, 2026-09-01):** ההחלטה המקורית ("levels סטטיים בלבד, בלי מחולל
  אדפטיבי בסבב הזה") בוטלה על ידי המשתמש אחרי שראה את התצוגה המקדימה. ראו
  product-spec.md, Open Questions, לניסוח המדויק.
- **טופל (QA, סבב א׳, 2026-09-01):** `tests/e2e/topics-all-grades.spec.ts` עודכן
  עם שבעת הנושאים. `319/319` בדיקות עברו בריצה בודדת ונקייה באותו סבב. ראו tests.md
  — יתעדכן שוב בסוף סבב ב׳.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
