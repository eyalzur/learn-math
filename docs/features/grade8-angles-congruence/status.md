# זוויות וחפיפת משולשים — נושא חדש לכיתה ח׳

נושא תרגול חדש לעומר: זוויות (השלמה, זווית חיצונית, ישרים מקבילים) וחפיפת משולשים
(כולל משולש שווה-שוקיים) — סוגר פער שהתגלה מהשוואה מול עבודת סיכום אמיתית של כיתה ח׳.

## Progress
- [x] Product spec — product-manager — 2026-09-01
- [x] Design — designer — 2026-09-01
- [x] Architecture — tech-lead — 2026-09-01
- [x] Implementation — developer — 2026-09-01
- [x] Tests — qa — 2026-09-01

**Current phase:** — all five done
**Branch:** `feature/grade8-angles-congruence`
**PR:** https://github.com/eyalzur/learn-math/pull/65

## Open questions / blockers
None. **החלטת סדר-עבודה מוצהרת (Architecture, ראו Risks/Tradeoffs):** הנושא יוצא
בשלב זה עם `levels` סטטיים בלבד, בלי מחולל אדפטיבי — כלומר לחיצה על הכרטיס תציג
את מסך שלוש הרמות (`LevelPicker`), לא תיכנס ישר לתרגול. זו חזרה על הסדר ההיסטורי
המדויק של שאר ששת נושאי כיתה ח׳ (תוכן קודם, מחולל אדפטיבי כפיצ'ר נפרד אחר כך —
כמו `#48` שבא אחרי `#43`-ו). מחולל אדפטיבי לזוויות/חפיפה הוא follow-up מוצע, לא
משהו שנשכח.

- **טופל (QA, 2026-09-01):** `tests/e2e/topics-all-grades.spec.ts` עודכן עם שבעת
  הנושאים. `319/319` בדיקות עוברות בריצה בודדת ונקייה, כולל שבע הבדיקות החדשות
  שנכתבו לפיצ'ר הזה. `npm run build` ו-`npm run lint` ירוקים. ראו tests.md.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
