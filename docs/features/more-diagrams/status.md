# ציורים לשאר הנושאים

הרחבת הציור בהסבר משברים לעוד שישה נושאים, בסדר שנקבע לפי כמה הציור משנה ולמי.

## Progress
- [x] Product spec — product-manager — 2026-08-14
- [x] Design — designer — 2026-08-14
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** tech-lead — **עוצר לדיון עם המשתמש לפני שממשיכים**
**Branch:** `feature/more-diagrams` — **מסתעף מ-`feature/fraction-diagram`, לא מ-`main`**
**PR:** not opened yet

> **לפני שממשיכים כאן:** הבראנץ' הזה יושב על `feature/fraction-diagram` (PR #22), שטרם
> מוזג. אחרי שיימוזג צריך
> `git rebase --onto origin/main feature/fraction-diagram feature/more-diagrams`,
> אחרת ה-PR של הפיצ'ר הזה יכלול גם את הדיף של #22 ובדיקת הגרסה תיפול.

## Open questions / blockers
אין שאלה שחוסמת את התכנון, אבל **המשתמש ביקש שנעצור אחרי העיצוב ונדבר** — ולכן
`tech-lead` לא רץ. שלוש הכרעות שראוי שיאושרו בדיון:

- **Design:** ציר המספרים מראה חלון סביב השאלה ולא `0`–`20` מלא — `21` סימונים לא
  נכנסים ל-`280` פיקסלים.
- **Design:** פונקציה קווית היא הצורה הקשה ביותר והפחות הכרחית; מוצע שתהיה אחרונה
  ושתהיה זו שנוותר עליה אם מוותרים על משהו.
- **Design:** שטח והיקף הן שתי צורות ולא אחת — מילוי מול קו מקיף.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
