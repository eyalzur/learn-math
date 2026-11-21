# שתי שאלות זהות לא יוצאות ברצף

בנושא אדפטיבי, השאלה הבאה אף פעם לא זהה (אותו ניסוח, אותם מספרים) לשאלה
שקדמה לה ישירות.

## Progress
- [x] Product spec — product-manager — 2026-11-18
- [x] Design — designer — 2026-11-18
- [x] Architecture — tech-lead — 2026-11-18
- [x] Implementation — developer — 2026-11-18
- [x] Tests — qa — 2026-11-18

**Current phase:** done — מוזג ל-`main`
**Branch:** `fix/no-repeat-consecutive-questions`
**PR:** https://github.com/eyalzur/learn-math/pull/91 — מוזג 2026-11-21

**מיזוג `main` פנימה (2026-11-21):** קונפליקטים קלים ב-`App.tsx` (ייבוא
בלבד — main כבר ייבא `loadAdaptiveTier`/`saveAdaptiveTier` ממקור אחר, רק
`withoutRepeatingPrompt` היה חדש). `tests/e2e/no-repeat-consecutive-questions.spec.ts`
נכתב מחדש: `answerViaNotebook`→`answerQuestion` (המחברת הוחלפה ב-
`scored-answer-practice`), והנחת-סטודנטים-קבועים הוחלפה ב-`createAndSelectStudent`
(`manage-students`). **ממצא חדש, תועד ב-CLAUDE.md:** הבדיקה העצמית נכשלה
כ-20% מהריצות תחת `npm run dev` (`StrictMode` פעיל) אבל `8/8` נגד
`vite build`+`preview` — React 18's `StrictMode` מכפיל-הפעלה של
updater-functions ב-dev, ומתנגש לפעמים עם `Math.random()`-יים בנושאים
אדפטיביים. **לא רגרסיה באתר החי** — אומת A/B. ריצת הסוויטה המלאה
(`--workers=1`) נתנה `345/347` — שני הכשלים: `grade8-angles-congruence`
(flake ידוע) ו-`grade2-syllabus` "...basic division..." (אותה משפחת-flake
חדשה, אומת `3/3` נקי בריצה חוזרת מבודדת). גרסה `1.50.1` → `1.50.2`.

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
