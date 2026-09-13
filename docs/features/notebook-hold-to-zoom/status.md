# זום זמני בהחזקת מגע — התקרבות למחברת

מגע שנשאר במקום לרגע קצר בתחילת הכתיבה מתקרב זמנית לתצוגה ממוקדת יותר,
וחוזר בדיוק למה שהיה כשמרימים את האצבע — מחווה של התמקדות בכתיבה מקרוב.

## Progress — סבב ב׳ (2026-09-13): כיוון ההתקרבות התהפך
המשתמש הכריע שהמחווה צריכה להתקרב (זום-אין) בהחזקה, לא להתרחק (זום-אאוט) —
"כמו שתלמיד מוריד את הראש למחברת". זה שינוי כיוון אמיתי, לא רק מספרי, וגם
משנה את הבעיה שהפיצ'ר פותר (ראו product-spec.md, Problem/Motivation). ארבעת
השלבים שכבר נכתבו לכיוון ההפוך נפתחים מחדש.

- [x] Product spec — product-manager — 2026-09-13 (סבב ב׳: כיוון הפוך + מוטיבציה מחודשת)
- [ ] Design — designer — ממתין לעדכון
- [ ] Architecture — tech-lead — ממתין לעדכון
- [ ] Implementation — developer — ממתין לעדכון
- [ ] Tests — qa — ממתין לעדכון

### סבב א׳ — הושלם 2026-09-12, כיוון שהתברר כשגוי
- [x] Product spec — product-manager — 2026-09-12
- [x] Design — designer — 2026-09-12
- [x] Architecture — tech-lead — 2026-09-12
- [x] Implementation — developer — 2026-09-12
- [x] Tests — qa — 2026-09-12

**Current phase:** designer — סבב ב׳
**Branch:** `feature/notebook-hold-to-zoom`
**PR:** [#70](https://github.com/eyalzur/learn-math/pull/70) (עדיין פתוח — יתעדכן, לא ייפתח מחדש)

## Open questions / blockers
None שחוסם. שני דברים לא-חוסמים מסבב א׳ שעדיין רלוונטיים (יבדקו מחדש בסבב ב׳):
- **QA:** ההתנהגות מול זום-שתי-אצבעות (pinch) תוך כדי hold-zoom לא אוטומטית
  (דורש שני מגעים בו-זמנית — כמו כל הפיצ'ר הקיים של pinch, שגם לו אין
  בדיקת e2e) — צריך אימות ידני חד-פעמי לפני מיזוג.
- **QA:** בריצת הסוויטה המלאה נכשלת בדיקה אחת — `grade8-angles-congruence.spec.ts`
  "the triangle-angle-sum step..." — אומתה כ-flake קיים-מראש, לא קשור לפיצ'ר
  הזה (נכשלת גם על `origin/main` נקי, ללא השינוי הזה).

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
