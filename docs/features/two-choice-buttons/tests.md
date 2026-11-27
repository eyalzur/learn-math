# שתי תשובות — שני כפתורים — Tests

## Coverage
קובץ: `tests/e2e/two-choice-buttons.spec.ts` (9 בדיקות), ועוד שתי בדיקות נתונים ב-`tests/e2e/content.spec.ts`.

| קריטריון קבלה | בדיקה |
|---|---|
| בדיוק שני כפתורים עם המספרים, בסדר השאלה, בלי מקלדת/שדה/"בדיקה" | `a two-answer question shows exactly two buttons…` |
| כל 11 השאלות (7 "גדול", 4 "קטן") הן שאלות שני-כפתורים | `every question of 'מה גדול יותר' and 'מה קטן יותר' (all 11)…` |
| לחיצה = תשובה; נכון ← משוב, נעילה והמשך אוטומטי | `tapping the right button is the answer…` |
| לחיצה על שגוי ← הנכון מסומן (✓/✗, לא רק צבע), נעילה, "הבא" | `tapping the wrong button shows which one was right…` |
| כפתור הרמז זמין והכפתורים נשארים לחיצים | `the hint button is still there…` |
| שאלה אחרת (עם יותר משתי תשובות) ממשיכה עם מקלדת | `a question with more than two possible answers keeps the number pad…` |
| גודל מגע, רווח, זה לצד זה, בלי גלילה ב-390×664 | `on a phone screen the buttons are big…` |
| סדר לפי הניסוח (הראשון מימין) ומספרים שמאל-ימין | `the first number named is on the right…` |
| תרגול שנקטע חוזר עם שני כפתורים | `leaving mid-practice and coming back resumes…` |
| נתונים: `choices` = המספרים בניסוח לפי הסדר; `answer` אחד מהם; כל "bigger"/"smaller" בכיתה א׳ מסומן | `content.spec.ts` › שתי בדיקות חדשות |

## How to run
`npx playwright test tests/e2e/two-choice-buttons.spec.ts --workers=1`
והסוויטה המלאה: `npm run build && npm run lint && npx playwright test --workers=1`.

## Status
2026-11-27: `two-choice-buttons.spec.ts` 9/9, `content.spec.ts` 44/44. בדיקה אחת נכשלה בהרצה הראשונה בגלל באג **בבדיקה** (חיפשה כפתור לפי הטקסט "7" אחרי שנוסף לו הסימן ✓), תוקן בבדיקה; לא היה באג במימוש. תת-קבוצה של הסוויטה הקיימת סביב `Practice` (תרגול, אבחון טעויות, תרגול שנקטע, סגנונות, הקראה, רמזים, ללא גלילה) הורצה אחרי הפיצול של `checkAnswer` — ראו הערה בסיכום ה-PR. הסוויטה המלאה רצה ב-CI.
