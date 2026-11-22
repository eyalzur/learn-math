# אבחון קשיים לאורך זמן — Tests

## Coverage
- "שלושה תרגולים רצופים מתחת ל-70% מסמנים נושא" →
  `tests/e2e/struggle-diagnosis.spec.ts` › `a topic with three straight
  practices under 70% is flagged`
- "פחות משלושה תרגולים — הנושא לא מסומן" →
  `tests/e2e/struggle-diagnosis.spec.ts` › `fewer than three practices of
  the topic: not flagged`
- "תרגול אחד טוב שובר את הרצף" →
  `tests/e2e/struggle-diagnosis.spec.ts` › `one good practice among the
  last three breaks the streak`
- "אין נושא תואם — המסך נראה בדיוק כמו היום" →
  `tests/e2e/struggle-diagnosis.spec.ts` › `no stuck topic: the history
  screen looks exactly as it does today` (ו-`an empty history still shows
  the existing empty state, with no stuck-topic card`)
- "הודעה נפרדת לכל נושא, עם קישור שמתחיל תרגול" →
  `tests/e2e/struggle-diagnosis.spec.ts` › `'לתרגל עכשיו' starts practice
  on that exact topic, even with no grade chosen yet` — נבחר במכוון
  התרחיש שבו עוד לא נבחרה כיתה בכלל (לא רק "קליק רגיל"), כי זה בדיוק
  המקרה ש-architecture.md מתעד כסיבה ל-`startStuckTopic`/`enterTopicInGrade`.
- "ההודעה נעלמת אחרי שיפור (בפעם הבאה שהמסך נטען)" →
  `tests/e2e/struggle-diagnosis.spec.ts` › `the card disappears once a
  recent practice brings the topic back above 70%`

## How to run
`npm run test:e2e`

## Status
**497/498 (כל הסוויטה, ריצה בודדת ונקייה) — 2026-11-18.** הכשל היחיד הוא
flake קיים-מראש ולא קשור (`grade8-angles-congruence.spec.ts`). שבעת
הבדיקות החדשות עוברות.
