# קושי מסתגל — תרגילים מטמפלייט — Tests

## Coverage

| קריטריון קבלה (product-spec.md) | בדיקה |
|---|---|
| `חיבור עד 100` בנוי מטמפלייט — מדלג על מסך הרמות | `tests/e2e/adaptive-difficulty.spec.ts` › `חיבור עד 100 skips the level picker and lands straight on practice` |
| רמת הקושי מגיבה להצלחה בזמן אמת (רצף נכונות → מעברי עשרה שכיחים יותר, רצף טעויות → לא) | `tests/e2e/adaptive-difficulty.spec.ts` › `a streak of correct answers climbs to needing carrying, a streak of wrong answers never does` |
| כל תרגיל שנוצר עומד בכללי התוכן הקיימים (שני רמזים, הסבר אמיתי אחרי טעות) | `tests/e2e/adaptive-difficulty.spec.ts` › `a generated question still has two hints and shows a real explanation after a wrong answer` |
| כל תרגיל שנוצר עומד בכללי התוכן הקיימים — הכללים המלאים (`RULES`), על פני כל טווח הקושי | `tests/e2e/content.spec.ts` › `every generated חיבור עד 100 question passes every content rule, across the whole difficulty range` |
| דקדוק יחיד/רבים ("`1` יחידה" מול "`X` יחידות") נשאר נכון ב-runtime | `tests/e2e/content.spec.ts` › `a generated question's 'X זה Y עשרות ו-Z יחידה/יחידות' hint stays singular/plural-correct` וגם `... 'X עשרה/עשרות ועוד Y עשרה/עשרות' ...` |
| תרגילים משתנים בין סשנים | `tests/e2e/adaptive-difficulty.spec.ts` › `questions vary between sessions, even at the same starting difficulty` |
| היסטוריה ממשיכה לתעד תרגול, בלי סיומת רמה | `tests/e2e/adaptive-difficulty.spec.ts` › `history records the topic without a level suffix` |
| נושא שלא הפך לטמפלייט (`חיסור עד 100`) ממשיך לעבוד בדיוק כמו היום | `tests/e2e/adaptive-difficulty.spec.ts` › `חיסור עד 100, the topic not in the pilot, still shows three levels exactly like before` |
| נושא שלא הפך לטמפלייט — גם `content.spec.ts` הקיים ממשיך לעבור בלי שינוי | `tests/e2e/content.spec.ts` (ריצה מלאה, ללא נגיעה בקבצים הקיימים מלבד תוספת בסוף) |

שתי בדיקות קיימות ב-`tests/e2e/mika-grade2-content.spec.ts` שנכנסו ל-`חיבור עד 100` כדי
לבדוק תכונה כללית (שלוש רמות, כיווניות LTR) הועברו ל-`חיסור עד 100` — ראו
`architecture.md`, Implementation Notes.

## How to run

```bash
npm run test:e2e
```

לבדיקות של הפיצ'ר הזה בלבד:

```bash
npx playwright test tests/e2e/adaptive-difficulty.spec.ts
npx playwright test tests/e2e/content.spec.ts -g "generated"
```

## Status

עבר במלואו ב-2026-08-18: `222/222` בדיקות ה-e2e (`213` קיימות + `9` חדשות: `6` ב-
`adaptive-difficulty.spec.ts`, `3` ב-`content.spec.ts`), `npm run build` ו-`npm run lint`
נקיים בגרסה `1.17.0`. שני התיקונים שנמצאו בבדיקת ה-property בשלב הפיתוח (`carriedTens`,
חריגה מ-`100`) תוארו כבר ב-`architecture.md` ואינם חוזרים כאן.

תיקון שלישי נמצא בשלב ה-review-ready עצמו, בזמן בניית תצוגה מקדימה: דפוס "עשרות
שלמות" (`30 + 40`) כתב תמיד "עשרות" (רבים), כולל "`1` עשרות" כשספרת העשרות יצאה `1` —
טעות שהדוגמאות הכתובות (`e6`, `e7`) מעולם לא חשפו כי אף אחת מהן לא נחתה על `1`. תוקן
ל-"עשרה"/"עשרות" בהתאם לספרה בפועל, ונוספה בדיקת property תואמת.

בדיקת "streak of correct answers climbs to needing carrying" רצה `3` פעמים נוספות ברצף
ללא כשל, כדי לוודא שהיא לא תלויה במקרה ב-RNG של הרצה בודדת.
