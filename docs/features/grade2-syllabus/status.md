# סילבוס מלא לכיתה ב׳

מוסיפים לכיתה ב׳ של מיקה שני נושאים חדשים (כפל וחילוק — מבוא, וצורות וגופים) ומרחיבים
את חיבור/חיסור מטווח 100 לטווח 1000, בעקבות מחקר בתוכנית הלימודים הרשמית של משרד
החינוך.

## Progress
- [x] Product spec — product-manager — 2026-09-01 (תוקן שוב 2026-09-01)
- [x] Design — designer — 2026-09-01 (תוקן שוב 2026-09-01)
- [x] Architecture — tech-lead — 2026-09-01 (תוקן שוב 2026-09-01)
- [x] Implementation — developer — 2026-09-01 (תוקן שוב 2026-09-01)
- [x] Tests — qa — 2026-09-01 (תוקן שוב 2026-09-01)

**Current phase:** done — מוזג ל-`main`
**Branch:** `feature/grade2-syllabus`
**PR:** [#64](https://github.com/eyalzur/learn-math/pull/64) — מוזג 2026-09-01

## Open questions / blockers
None. התיקון (2026-09-01) הושלם בכל חמשת השלבים: "כפל וחילוק" ו"צורות וגופים" הם
עכשיו אדפטיביים (שני גנרטורים חדשים - `adaptiveMulDiv.ts`, `adaptiveShapes.ts`),
בדיוק כמו "חיבור עד 1000"/"חיסור עד 1000". נוספה גם בדיקה שהייתה חסרה (רצף תשובות
נכונות בכפל וחילוק מגיע לשאלת חילוק). `npm run build && npm run lint && npm run
test:e2e` כולם ירוקים, **`326/326`** (עלה מ-`305/305` לפני הפיצ'ר כולו). פרטי
התיקון המלאים ב-`architecture.md`, "Implementation Notes — סבב 2"; מפת הבדיקות
המעודכנת ב-`tests.md`.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
