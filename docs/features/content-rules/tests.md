# כללי תוכן שנאכפים — Tests

## Coverage

### שהבדיקות ירוצו
הקריטריונים האלה הם על ה-CI עצמו, ובדיקה שרצה ב-CI לא יכולה להעיד על עצמה שהיא
רצה. הראיה היא `.github/workflows/tests.yml` וההרצה שנראית על ה-PR:

| קריטריון | איפה |
|---|---|
| כל PR מריץ בנייה, lint וכל הבדיקות | `tests.yml` › `on: pull_request` |
| התוצאה מוצגת על ה-PR | בדיקת **test** ברשימת ה-checks |
| כישלון מסומן בבירור | ריצה אדומה + דוח Playwright כ-artifact |
| רץ גם על `main` אחרי מיזוג | `tests.yml` › `push: branches: [main]` |

### שהכללים יהיו במקום אחד וברור
- "לכל כללי התוכן יש מקום אחד" → `tests/e2e/content.spec.ts` › `RULES`
- "כל כלל תופס את כל השאלות בכל הכיתות" → `content.spec.ts` ›
  `every question passes every content rule` (עובר על `everyQuestion()` × `RULES`)
- "ההודעה אומרת איזו שאלה ומה בה" → אומת בפועל: דימוי תקין הוחלף בזמנית ב-
  `היו 5 בולים בצלחת ואכלתם 2 מהם`, והבדיקה נכשלה עם
  `g1-numbers-e1 — does not have anyone eating something inedible: …`, ואז הוחזר.

### שהכתיבה של כלל חדש תהיה זולה
- "הוספת כלל היא הוספה במקום אחד" → רשומת `{ name, check }`, בלי לולאה ובלי
  `test()` חדש
- "קיים תיעוד קצר" → `.claude/skills/_shared/references/content-rules.md`,
  מקושר מ-`git-workflow.md` ומ-`qa/SKILL.md`

## הכללים שרצים היום

| כלל | מה הוא תופס |
|---|---|
| has an explanation with steps and an analogy | שאלה בלי הסבר, בלי שלבים או בלי דימוי |
| keeps arithmetic out of the prose field | חשבון בשדה הטקסט — נכתב הפוך על המסך |
| does not have anyone eating something inedible | פועל אכילה על עצם לא אכיל |
| marks algebra sitting inside a Hebrew sentence | ביטוי לא מסומן שה-bidi יהפוך |
| keeps its hints to exactly two, without giving the answer away | רמז שמוסר את התשובה, או מספר לא מסומן |

ובנוסף, על **האוסף** ולא על שאלה בודדת: גודל רמה, שיוך לנושא שבסילבוס, ייחודיות
דימוי, קיום רמזים, והכרעת סטטוס ריוויו.

## How to run
`npm run test:e2e` — או פשוט לפתוח PR, וזו הנקודה כולה.

## Status
✅ עובר — 75 בדיקות, 55 שניות, נכון ל-2026-08-14. `npm run build` ו-`npm run lint`
נקיים (שתי אזהרות lint שהיו קיימות — קוד מת שנשאר אחרי שהכללים עברו קובץ — נוקו).

**מה לא נבדק כאן:** שהבדיקה חוסמת מיזוג. היא לא, וזה לא ניתן לתיקון מקובץ בריפו —
צריך להפעיל branch protection ולסמן שם גם **check** וגם **test**. עד אז ריצה אדומה
נראית על ה-PR אבל לא מונעת מיזוג.
