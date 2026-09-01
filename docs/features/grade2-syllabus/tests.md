# סילבוס מלא לכיתה ב׳ — Tests

## Coverage

| קריטריון קבלה (product-spec.md, אחרי תיקון 2026-09-01) | בדיקה |
|---|---|
| כיתה ב׳ מציגה ארבעה נושאים, כולל שני החדשים | `tests/e2e/grade2-syllabus.spec.ts` › `grade ב׳ shows four topics, including כפל וחילוק and צורות וגופים` |
| כל נושא (גם החדשים) שומר על כפתור 📖 לצד התרגול | › `both new topics still offer a lesson (📖) alongside practice, like every other topic` |
| כפל וחילוק וצורות וגופים **אדפטיביים** - בלי מסך רמות, נכנסים ישר לתרגול | › `כפל וחילוק is adaptive, entered directly with no level to pick` · › `צורות וגופים is adaptive, entered directly with no level to pick` |
| שאלת כפל וחילוק היא ביטוי חשבוני טהור, מוצגת משמאל-לימין | › `a כפל וחילוק question is a bare expression, shown left-to-right` |
| שאלת צורות וגופים היא משפט עברי רגיל, בלי ביטוי חשבוני לבודד | › `a צורות וגופים question is a plain Hebrew sentence, with no arithmetic to isolate` |
| שני רמזים ומנגנון ההסבר אחרי טעות ממשיכים לעבוד בנושא החדש | › `a wrong answer in כפל וחילוק still shows two hints and a real explanation` |
| מנגנון התשובה במחברת עובד גם לשאלת "צורות וגופים" (תשובה מספרית, לא ביטוי) | › `a numeric answer to a צורות וגופים question still runs through the usual feedback path` |
| סשן תרגול מלא (20 שאלות) בנושא חדש מסתיים במסך סיכום ציון | › `a full practice session of כפל וחילוק ends on a score summary` |
| חיבור עד 1000 מגיע בפועל למספרים תלת-ספרתיים לאחר רצף תשובות נכונות | › `a streak of correct answers on חיבור עד 1000 eventually reaches a three-digit problem` |
| חיסור עד 1000 מגיע בפועל למספרים תלת-ספרתיים לאחר רצף תשובות נכונות | › `a streak of correct answers on חיסור עד 1000 eventually reaches a three-digit problem` |
| כפל וחילוק מגיע בפועל לשאלת חילוק בסיסית בדרגת הקושי הגבוהה, לאחר רצף תשובות נכונות | › `a streak of correct answers on כפל וחילוק eventually reaches a basic division question` |

תוכן השאלות עצמו (שדה `analogy` חובה, שני רמזים, כיווניות, וכל שאר כללי התוכן - גם עבור
השאלות שנוצרות בזמן ריצה על ידי שני הגנרטורים האדפטיביים החדשים) מכוסה במלואו על ידי
`tests/e2e/content.spec.ts` הקיים (כולל שני מבחני "every generated X question passes
every content rule" ייעודיים) - הבדיקות כאן לא כופלות אותו, הן בודקות רק את זרימת
המסך.

## היסטוריה: מה השתנה מהסבב הראשון

הסבב הראשון של הפיצ'ר בנה את "כפל וחילוק" ו"צורות וגופים" כנושאים **סטטיים** (שלוש
רמות קבועות), וה-tests.md הקודם תיאר בדיקות בהתאם (`.level-card` לכל נושא). המשתמש
תיקן (2026-09-01): שני הנושאים האלה אמורים להיות **אדפטיביים** מהתחלה, כמו "חיבור עד
1000"/"חיסור עד 1000" - קושי משתנה בזמן אמת, בלי מסך רמות. כל הבדיקות שהניחו
`.level-card` עבור שני הנושאים החדשים הוסרו/הוחלפו בבדיקות "is adaptive, entered
directly with no level to pick", ונוספה בדיקת "streak of correct answers... reaches a
basic division question" שלא הייתה רלוונטית במבנה הקודם.

## How to run

```bash
npm run build && npm run lint && npm run test:e2e
```

## Status

עובר במלואו נכון ל-2026-09-01 (אחרי התיקון): `build` ו-`lint` נקיים, **`326/326`**
בדיקות e2e עוברות בריצה בודדת ונקייה (עלה מ-`325/325` שהיה לפני הוספת בדיקת החילוק -
בלי רגרסיה באף בדיקה קיימת).
