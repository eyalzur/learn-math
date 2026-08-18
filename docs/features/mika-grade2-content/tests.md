# תוכן כיתה ב׳ למיקה — Tests

## Coverage
| קריטריון מהספק | בדיקה |
|---|---|
| בחירת מיקה מציגה בחירה בין כיתה א׳ לכיתה ב׳, לא מעבר סופי | `mika-grade2-content.spec.ts` › `picking Mika offers a choice between grade א׳ and grade ב׳, not an automatic switch` |
| שתי הכיתות נשארות נגישות באותו ביקור | `mika-grade2-content.spec.ts` › `both grades stay reachable in the same visit — picking one does not lose the other` |
| כיתה א׳ ממשיכה לעבוד בדיוק כמו היום (5 נושאים) | `mika-grade2-content.spec.ts` › `grade א׳ keeps its original five topics, unchanged by the new grade` |
| כיתה ב׳ כוללת "חיבור עד 100" ו"חיסור עד 100", כל אחד ב-3 רמות של 10 שאלות | `mika-grade2-content.spec.ts` › `grade ב׳'s two topics each run three levels of ten questions, same shape as grade א׳` |
| שאלות עד 100 כוללות מעבר עשרה, לא רק טווח גדול יותר | `mika-grade2-content.spec.ts` › `every hard חיבור עד 100 question requires carrying past a ten...` ו-`every hard חיסור עד 100 question requires borrowing...` — נקראות ישירות מהנתונים (בלי לסמוך על הטקסט של הרמז), אותה גישה כמו `content.spec.ts` |
| כל שאלה חדשה עומדת בכללי התוכן (analogy, שני רמזים) | כבר נאכף גנרית: `content.spec.ts` עובר על `everyQuestion()` מכל הכיתות, כולל כיתה ב׳ החדשה, בלי צורך בבדיקה נפרדת |
| ביטויי חשבון מוצגים LTR בתוך העמוד ה-RTL | `mika-grade2-content.spec.ts` › `a grade ב׳ arithmetic problem still renders left-to-right inside the RTL page` |
| ניווט: חזרה מנושאים לבחירת כיתה, ומבחירת כיתה לבחירת תלמיד/ה | `mika-grade2-content.spec.ts` › `you can walk back from the topics screen to the grade choice, and from there to the student picker` |

## How to run
`npm run test:e2e`

## Status
עוברות — הקובץ החדש `mika-grade2-content.spec.ts` (8/8) וכל הסוויטה המלאה
(**191/191**), ריצה בודדת ונקייה, 2026-08-18. `build` ו-`lint` נקיים.
