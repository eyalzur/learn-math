# סילבוס מלא לכיתה ב׳

מוסיפים לכיתה ב׳ של מיקה שני נושאים חדשים (כפל וחילוק — מבוא, וצורות וגופים) ומרחיבים
את חיבור/חיסור מטווח 100 לטווח 1000, בעקבות מחקר בתוכנית הלימודים הרשמית של משרד
החינוך.

## Progress
- [x] Product spec — product-manager — 2026-09-01 (תוקן שוב 2026-09-01)
- [x] Design — designer — 2026-09-01 (תוקן שוב 2026-09-01)
- [x] Architecture — tech-lead — 2026-09-01 (תוקן שוב 2026-09-01)
- [x] Implementation — developer — 2026-09-01 (תוקן שוב 2026-09-01)
- [ ] Tests — qa — לבדוק אם צריך עדכון נוסף (הבדיקות כבר עודכנו כחלק מהתיקון)

**Current phase:** qa
**Branch:** `feature/grade2-syllabus`
**PR:** [#64](https://github.com/eyalzur/learn-math/pull/64) — פתוח, לא מוזג

## Open questions / blockers
None. התיקון (2026-09-01) הושלם: "כפל וחילוק" ו"צורות וגופים" הם עכשיו אדפטיביים
(שני גנרטורים חדשים - `adaptiveMulDiv.ts`, `adaptiveShapes.ts`), בדיוק כמו "חיבור עד
1000"/"חיסור עד 1000". `npm run build && npm run lint && npm run test:e2e` כולם
ירוקים, **`325/325`** (עלה מ-`323/323`). פרטי התיקון המלאים ב-`architecture.md`,
"Implementation Notes — סבב 2" - כולל שני באגים אמיתיים (רמז לא-מסומן, רמז שחושף
תשובה) שנתפסו על ידי הבדיקות החדשות עצמן לפני קומיט. `tests/e2e/grade2-syllabus.spec.ts`
כבר עודכן במסגרת התיקון (לא ממתין לשלב QA נפרד) - QA צריך רק לוודא שאין עוד קריטריון
מה-product-spec המתוקן שלא מכוסה.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
