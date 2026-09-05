# משוב לתלמיד/ה על מה שהמורה קראה — Tests

## Coverage

מיפוי קריטריוני קבלה (`product-spec.md`) → בדיקה ב-`tests/e2e/notebook-teacher-feedback.spec.ts`:

- "אחרי כל קריאה... יש דרך גלויה לתת תיקון" (קריאה לא-ודאית) →
  `after an uncertain reading, a correction link appears alongside the existing rewrite-on-page option`
- "...זה חל בין אם הקריאה הודאית סימנה את התשובה כנכונה ובין אם כטועה" →
  `after a confident wrong reading, a correction link appears next to the teacher's note`,
  `a correction link appears even when the confident reading was already marked correct — the reading itself can still be wrong`
- "הצעת המשוב אינה מסתירה או מחליפה את הדרך הקיימת" → נבדק כחלק מהבדיקה הראשונה
  (`sendButton` נשאר זמין לצד הקישור)
- "משוב טקסטואלי הוא תמיד פעולה יזומה במפורש" →
  `opening the correction link shows a free-text field whose send button stays disabled until something is typed`,
  `cancelling the correction form sends nothing and returns to the link, unchanged`
- "המשוב נשלח בחזרה למורה יחד עם אותו דף" →
  `the free-text correction is sent back to the teacher along with the page`
- "קריאה מעודכנת עוברת באותה זרימה כמו קריאה רגילה... מוזן לאותה בדיקה מקומית" →
  `correcting an uncertain reading sends the page again and shows the confident result that comes back`,
  `correcting a confident wrong reading can flip it to correct — feedback, the wrong-answer explanation, and the countdown all follow the new verdict`,
  `correcting a confident correct reading can flip it to wrong — the countdown stops and the explanation flow takes over`
- "אם התיקון עצמו לא ברור מספיק... אין מגבלה קבועה על מספר סבבי התיקון" →
  `a correction that comes back still uncertain returns to the uncertain state, with no limit on how many times this can happen`
  (שלושה סבבים: uncertain → uncertain → certain)
- "קריאה חוזרת (עם משוב) כפופה לאותם כללים... הודעת שגיאה ברורה... המחברת ממשיכה לעבוד" →
  `a failed call while sending a correction shows a distinct error and keeps the typed text, without closing the form`
- נגישות בתוך מסך מלא (design.md, מצב C) →
  `the correction link stays reachable in fullscreen for an uncertain reading, and opening it exits fullscreen for the form`

### לא מכוסה בכוונה (כמו בכל שלב קודם של הפיצ'ר)
- **"התיאור נאמן למה שבאמת נכתב בדף" אחרי תיקון** — הבטחה על מה ש-Claude האמיתי
  עושה בפועל; בדיקת e2e מול שרת ממוקק לא יכולה להוכיח את זה, רק שהלקוח מציג נאמנה
  את מה שהשרת (המדומה) אמר.
- **עדכון `correctCount` המדויק במסך התוצאה הסופי** — לא נבדק ישירות (מסך התוצאה
  אינו נבדק בשום מקום אחר בסוויט הזו גם היום); הבדיקות מסתמכות על האותות הישירים
  והנראים על מסך התרגול עצמו (`.feedback`, `.explanation`, `.countdown`) כהוכחה
  שהפסיקה המתוקנת אכן השתלטה על הזרימה.
- **תוכן הפרומפט שנשלח בפועל ל-Claude** (הגנת ה-prompt-injection) — עניין
  שרת-פנימי; `readPage.spec` אין, זו התנהגות שנבדקת ידנית/בקוד השרת, לא ב-e2e.

## How to run
`npm run test:e2e`

## Status
12 הבדיקות החדשות של הפיצ'ר הזה עוברות (`npx playwright test
tests/e2e/notebook-teacher-feedback.spec.ts`, 2026-09-05). הרצת הסוויט המלאה,
בריצה בודדת ונקייה כנדרש ב-CLAUDE.md, ממתינה לסיום — תעודכן כאן עם המספר
המדויק ברגע שהיא מסתיימת.
