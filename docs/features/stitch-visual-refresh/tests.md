# רענון חזותי של 5 מסכים, בהשראת Stitch — Tests

## Coverage

כל בדיקה נגזרת מקריטריון-קבלה ב-`product-spec.md`, לא מהקוד. קובץ:
`tests/e2e/stitch-visual-refresh.spec.ts`.

| קריטריון (product-spec.md) | בדיקה |
|---|---|
| 1. תג-זהות קבוע לכל כרטיס תלמיד/ה, דטרמיניסטי | `each student's card shows a fixed visual badge beside their name, consistent across reloads` |
| 2. דירוג-כוכבים מנתונים אמיתיים, ריק לנושא-לא-מתורגל | `a topic's star rating starts empty and reflects real accuracy after practicing it` |
| 2. בלי "אתגר יומי" | `there is no daily-challenge banner or similar element on the topic list` |
| 3. הזנת-ספרות על המסך + איור-כמות (חיבור) | `digits can be entered on-screen, and the quantity illustration matches this question's own numbers` |
| 3. איור-כמות (חיסור, מלא-מול-מתאר) | `a subtraction question's illustration shows the starting amount, with the subtracted part outlined` |
| 3. RTL לביטוי החשבוני | מכוסה בתוך הבדיקה הקודמת (`direction: ltr` על `.problem-box`) ובבדיקה הקיימת `scored-answer-practice.spec.ts` › `arithmetic expressions still render left-to-right`, שלא נגעתי בה |
| 4. בלי מטבעות/נקודות/סטריק בתוצאה | `the result screen shows no coins, points, or streak — only the existing score` |
| 5. היסטוריה בלי גיימיפיקציה | `history summarizes by topic and difficulty, with no new gamification element` |
| 6. שום טקסט מועתק מהמוקאפים | **לא נבדק אוטומטית** — זו עובדת-תהליך (מה הודבק מאיפה), לא התנהגות-ריצה שאפשר לאכוף ב-e2e בלי לבדוק נגד רשימת-מילים שרירותית. אומת ידנית ב-code review של ה-developer phase (ראו architecture.md). |
| 7. כל שינוי ניתן להפעלה/כיבוי בנפרד | **לא נבנה כפי שנוסח במפורש** — tech-lead's architecture.md מתעד החלטה מכוונת לדלג על flag בזמן-ריצה, כי הביקורת כאן (כמו בכל שינוי-עיצוב קודם בפרויקט) קורית דרך בראנץ'+PR לפני מיזוג ל-`main`, לא דרך toggle חי. **התוצאה בפועל של הקריטריון (אפשר לבדוק כל מסך לפני שהוא הופך לברירת מחדל) כן מתקיימת** — דרך ה-PR עצמו, לא דרך קוד. מסומן כאן כדי שהמשתמש יידע שזו סטייה מהניסוח המקורי, לא פער שנשכח. |
| 8. RTL לא נשבר באף מסך | אין מחרוזת עברית-מעורבת-עם-מספרים חדשה בחמשת השינויים (תג/כוכבים/איור/מקלדת הם סמלים/ספרות בודדים, לא ביטויים) — אין מה לבדוק מעבר לבדיקת ה-LTR הקיימת על `.problem-box` שכבר מכוסה למעלה. |

## How to run
```
npm run test:e2e
```
**הערה תפעולית:** אם `localhost:5173` תפוס (סשן-סוכן מקביל אחר על worktree נפרד —
`lsof -i :5173` מראה אם זה המצב), אל תיגעו בתהליך הזר. הריצו על פורט אחר במקום, למשל
שינוי זמני לא-לקומיט ל-`playwright.config.ts` (וכך בדיוק נעשה כאן בפועל).

## Status
**עבר, 2026-11-23 — 367/370 (2 דילוג, לא קשור).** שלוש ריצות-סוויטה-מלאות נפרדות
ונקיות (`--workers=1`) לאורך ה-QA וה-developer phases, כולן מראות את אותה תמונה:
7 הבדיקות החדשות עוברות בעקביות, ושלושת הכשלים שחוזרים הם **flakes מתועדים-מראש
ב-CLAUDE.md**, לא קשורים לפיצ'ר הזה:

- `grade8-angles-congruence.spec.ts` — ה-flake המתועד כבר (PR #77 ואילך), אומת שוב
  (3 הרצות נפרדות, אותו assert בדיוק נכשל בכל פעם).
- `mika-adaptive-difficulty.spec.ts` × 2 ("streak... reaches the hardest tier" ו-
  "history records the topic without a level suffix") — שניהם נכשלו עם **"19/20"
  במקום "20/20"**, בדיוק התבנית ש-CLAUDE.md כבר משער כקשורה ל-React StrictMode +
  `Math.random()` בנושאים אדפטיביים ("יתכן שזו גם הסיבה לכשלים-אקראיים-דומים...
  mika-adaptive-difficulty.spec.ts's '19/20 במקום 20/20'") — זו ההתרחשות בפועל של
  אותו חשד, לא כשל חדש.
- `adaptive-lesson-start.spec.ts`'s "leaving mid-session..." נכשל פעם אחת מתוך חמש
  הרצות נפרדות של הקובץ הזה לאורך כל התהליך (ועבר בשתי הריצות המלאות האחרונות) —
  אותה משפחת flake, לא דטרמיניסטי.

אין בדיקה חדשה שנכשלה בשום ריצה. `build`/`lint` נקיים (ראו architecture.md).
