# שעון וזמן — כיתה ב׳ — Tests

## Coverage

Acceptance criteria (product-spec.md / design.md) → test:

- נושא אדפטיבי, בלי מסך רמות → `tests/e2e/grade2-clock.spec.ts` › `שעון וזמן skips the
  level picker and lands straight on a 20-question practice`
- כל שאלה מציגה ציור שעון אנלוגי ליד השאלה עצמה, לא רק בהסבר → `grade2-clock.spec.ts` ›
  `every question shows a clock face next to the question itself, with an aria-label`,
  `the clock face is not duplicated after a wrong answer reveals the explanation`
- דרגה קלה (שעה עגולה) → `grade2-clock.spec.ts` › `the first question of a fresh session
  is the easy tier, and reading its face correctly is marked right`
- דרגה קשה (שני שעונים, "התחלה"/"סיום") ← קושי מגיב לרצף תשובות נכונות →
  `grade2-clock.spec.ts` › `a streak of correct answers reaches the hardest tier`
- "התחלה" מימין, "סיום" משמאל (הכרעת כיווניות ב-design.md) → `grade2-clock.spec.ts` ›
  `in the hardest tier, התחלה sits visually to the right of סיום` (בדיקת
  `getBoundingClientRect().x` בפועל, לא רק סדר ה-DOM)
- כל `<svg>` הוא `direction: ltr` בתוך העמוד ה-RTL → `grade2-clock.spec.ts` › `every
  clock's svg renders left-to-right, inside the RTL page`
- מסך "שיעור" (📖) מציג את הציור לכל דרגת קושי → `grade2-clock.spec.ts` › `the lesson
  screen shows the clock face too, for every difficulty tier`
- אילוץ קריטי (תשובה היא תמיד מספר) ו-`clockFace()` לעולם לא מחזיר `null` לשאלה בנושא
  הזה → `tests/e2e/content.spec.ts` › `every generated שעון וזמן question passes every
  content rule, and clockFace() always draws it` (200 דגימות × 3 דרגות קושי, כולל בדיקת
  צורת ה-prompt והטווח של התשובה לכל דרגה)
- שני רמזים, `analogy`, שלבי הסבר לכל שאלה → נאכף גם על 30 השאלות הכתובות וגם על
  הגנרטור האדפטיבי דרך `RULES` הקיים ב-`content.spec.ts` (לא רשימה נפרדת)

## How to run
`npm run test:e2e`

## Status
327/327 (מלא: 335/335 כולל כל שאר הפיצ'רים) עוברות, נכון ל-2026-09-04, בריצה בודדת
ונקייה. אין בדיקות כושלות.

שני באגים אמיתיים נתפסו בריצה הראשונה של `content.spec.ts` (לא ב-`grade2-clock.spec.ts`
עצמו) ותוקנו לפני הריצה השנייה — ראו `architecture.md`, "Implementation Notes": ספרה
`6` לא מסומנת ברמז/שלב שהופכת גם לדליפת-תשובה (כשהשעה שנוצרה היא `6`) וגם לחשבון
בפרוזה (`"6 -"` נקרא כחיסור) — תוקן בהחלפת הספרה במילה הכתובה "שש".
