# סילבוס מלא לכיתה ב׳ — Tests

## Coverage

| קריטריון קבלה (product-spec.md) | בדיקה |
|---|---|
| כיתה ב׳ מציגה ארבעה נושאים, כולל שני החדשים | `tests/e2e/grade2-syllabus.spec.ts` › `grade ב׳ shows four topics, including כפל וחילוק and צורות וגופים` |
| כל נושא (גם החדשים) שומר על כפתור 📖 לצד התרגול | › `both new topics still offer a lesson (📖) alongside practice, like every other topic` |
| כפל וחילוק וצורות וגופים הם שלוש רמות רגילות, לא אדפטיביים | › `כפל וחילוק is level-based, not adaptive` · › `צורות וגופים is level-based, not adaptive` |
| שאלת כפל וחילוק היא ביטוי חשבוני טהור, מוצגת משמאל-לימין | › `a כפל וחילוק question is a bare expression, shown left-to-right` |
| שאלת צורות וגופים היא משפט עברי רגיל, בלי ביטוי חשבוני לבודד | › `a צורות וגופים question is a plain Hebrew sentence, with no arithmetic to isolate` |
| שני רמזים ומנגנון ההסבר אחרי טעות ממשיכים לעבוד בנושא החדש | › `a wrong answer in כפל וחילוק still shows two hints and a real explanation` |
| מנגנון התשובה במחברת עובד גם לשאלת "צורות וגופים" (תשובה מספרית, לא ביטוי) | › `a numeric answer to a צורות וגופים question still runs through the usual feedback path` |
| רמה מלאה בנושא חדש מסתיימת במסך סיכום ציון | › `a full level of כפל וחילוק ends on a score summary` |
| חיבור עד 1000 מגיע בפועל למספרים תלת-ספרתיים לאחר רצף תשובות נכונות | › `a streak of correct answers on חיבור עד 1000 eventually reaches a three-digit problem` |
| חיסור עד 1000 מגיע בפועל למספרים תלת-ספרתיים לאחר רצף תשובות נכונות | › `a streak of correct answers on חיסור עד 1000 eventually reaches a three-digit problem` |

תוכן השאלות עצמו (שדה `analogy` חובה, שני רמזים, כיווניות, וכל שאר כללי התוכן) כבר מכוסה
במלואו על ידי `tests/e2e/content.spec.ts` הקיים — הבדיקות החדשות כאן לא כופלות אותו, הן
בודקות רק את זרימת המסך שלא הייתה קיימת לפני הפיצ'ר הזה.

## עדכונים לבדיקות קיימות

שלושה קבצי בדיקה קודמים התייחסו למחרוזת הכותרת המדויקת של הנושאים הקיימים
("חיבור עד 100"/"חיסור עד 100") או למספר הנושאים בכיתה ב׳ (שניים) — עודכנו כחלק משלב
ה-developer (לא כאן) כדי לשקף את שני השינויים שהוחלטו במפורש (הרחבת כותרת ל"עד 1000",
הוספת שני נושאים): `tests/e2e/adaptive-difficulty.spec.ts`,
`tests/e2e/mika-adaptive-difficulty.spec.ts`, `tests/e2e/mika-grade2-content.spec.ts`,
ו-`tests/e2e/content.spec.ts` (טווח קושי וטווח מספרים בבדיקות התוכן המחוללות). שתי הערות
תיעוד שהיו כבר שגויות באותם קבצים (טענו ש"לכיתה ב׳ אין יותר נושא מבוסס-רמה", מה שהפיצ'ר
הזה סותר) תוקנו גם הן.

## How to run

```bash
npm run build && npm run lint && npm run test:e2e
```

## Status

עובר במלואו נכון ל-2026-09-01: `build` ו-`lint` נקיים, `323/323` בדיקות e2e עוברות בריצה
בודדת ונקייה (עלה מ-`312/312` שהיה אחרי שלב ה-developer — 11 הבדיקות החדשות של הפיצ'ר
הזה, בלי רגרסיה באף בדיקה קיימת).
