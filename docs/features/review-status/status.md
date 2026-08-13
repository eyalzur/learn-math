# סטטוס ריוויו

לכל נושא סימון האם נבדק. נושא שלא נבדק מעומעם ולא לחיץ באפליקציה, ומסומן גם
בדף הסקירה.

## Progress
- [x] Product spec — product-manager — 2026-08-13
- [x] Design — designer — 2026-08-13
- [x] Architecture — tech-lead — 2026-08-13
- [x] Implementation — developer — 2026-08-13
- [x] Tests — qa — 2026-08-13 (7 בדיקות חדשות עוברות, אבל 15 קיימות נפלו — ראו blocker)

**Current phase:** qa — blocked, tests failing
**Branch:** `feature/review-status`
**PR:** not opened yet

## Open questions / blockers
- **QA: חסימת התוכן מעוורת את מערך הבדיקות מהתוכן שהיא נועדה להגן עליו.**
  7 הבדיקות החדשות עוברות, אבל **15 בדיקות קיימות נפלו** - כולן ניגשות
  לכיתות ו׳ וח׳ דרך המסך, ועכשיו אי אפשר להיכנס אליהן:

  | קובץ | נפלו | מה הן בודקות |
  |---|---|---|
  | `topics-all-grades.spec.ts` | 8 | מבנה הנושאים, 5 שאלות לרמה, ניווט |
  | `teaching-explanations.spec.ts` | 5 | שלכל 330 השאלות יש הסבר ודימוי ייחודי |
  | `students-and-syllabus.spec.ts` | 2 | כיווניות של ביטויים אלגבריים |

  זו לא תקלת בדיקות אלא **אירוניה אמיתית בעיצוב**: הפיצ'ר נבנה כדי שתוכן לא
  בדוק לא יגיע לילדים, והתוצאה היא שגם **הבדיקות** לא מגיעות אליו. 180 השאלות
  של רותם ועומר מפסיקות להיבדק אוטומטית בדיוק כשהן הכי צריכות בדיקה.

  **דורש הכרעה של המשתמש** - שלוש אפשרויות ב-tests.md.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
