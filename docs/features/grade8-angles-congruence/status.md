# זוויות וחפיפת משולשים — נושא חדש לכיתה ח׳

נושא תרגול חדש לעומר: זוויות (השלמה, זווית חיצונית, ישרים מקבילים) וחפיפת משולשים
(כולל משולש שווה-שוקיים) — סוגר פער שהתגלה מהשוואה מול עבודת סיכום אמיתית של כיתה ח׳.

## Progress
- [x] Product spec — product-manager — 2026-09-01
- [x] Design — designer — 2026-09-01
- [x] Architecture — tech-lead — 2026-09-01
- [x] Implementation — developer — 2026-09-01
- [ ] Tests — qa — not started

**Current phase:** qa
**Branch:** `feature/grade8-angles-congruence`
**PR:** not opened yet

## Open questions / blockers
None. **החלטת סדר-עבודה מוצהרת (Architecture, ראו Risks/Tradeoffs):** הנושא יוצא
בשלב זה עם `levels` סטטיים בלבד, בלי מחולל אדפטיבי — כלומר לחיצה על הכרטיס תציג
את מסך שלוש הרמות (`LevelPicker`), לא תיכנס ישר לתרגול. זו חזרה על הסדר ההיסטורי
המדויק של שאר ששת נושאי כיתה ח׳ (תוכן קודם, מחולל אדפטיבי כפיצ'ר נפרד אחר כך —
כמו `#48` שבא אחרי `#43`-ו). מחולל אדפטיבי לזוויות/חפיפה הוא follow-up מוצע, לא
משהו שנשכח.

- **Developer, ל-QA:** `tests/e2e/topics-all-grades.spec.ts` מחזיק רשימת נושאי כיתה
  ח׳ כפולה וקבועה בקוד, ובודק את מספר כרטיסי הנושא מולה. הוספת הנושא הזה **תפיל**
  את הבדיקה עד שהרשימה שם תתעדכן גם היא. ראו architecture.md, Implementation Notes.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
