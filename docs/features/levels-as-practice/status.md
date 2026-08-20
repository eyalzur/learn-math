# רמות הופכות לתרגול מסתגל — כל נושאי רותם ועומר

הרחבת הקושי המסתגל (טמפלייט + קושי בזמן אמת, שכבר עובד בנושא אחד — חיבור עד 100) לכל
`12` הנושאים של רותם ועומר; בורר הרמות מתבטל, ואורך תרגול עולה מ-`10` ל-`20` שאלות.

## Progress
- [x] Product spec — product-manager — 2026-08-19
- [x] Design — designer — 2026-08-19
- [x] Architecture — tech-lead — 2026-08-19
- [x] Implementation — developer — 2026-08-19
- [x] Tests — qa — 2026-08-19

**Current phase:** done — ממתין לריוויו נוסף אחרי תיקון משוב
**Branch:** `feature/levels-as-practice`
**PR:** [#48](https://github.com/eyalzur/learn-math/pull/48)

## Open questions / blockers
None. `235/235` בדיקות e2e עוברות בריצה אחת ונקייה, `npm run build`/`npm run lint`
נקיים בגרסה `1.20.0`. ראו tests.md לפירוט מלא — כולל שינויי רגרסיה בקבצי בדיקה של
פיצ'רים אחרים ששימשו את רותם/עומר כאמצעי (לא כמטרה), שלושה באגי תוכן אמיתיים שנתפסו
בזמן הכתיבה המקורית, וסבב תיקונים נוסף אחרי משוב תוכן אמיתי מהמשתמש על ה-PR (ראו
tests.md § "תיקון אחרי משוב (2026-08-20)"): איסור עשרוני בנתוני שאלה (רק בתשובה),
שני "דלפי תשובה" נוספים ב-analogies, ניסוח רמזים וסיום כל analogy בשאלה.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
