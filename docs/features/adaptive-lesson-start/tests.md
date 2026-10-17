# תרגול אדפטיבי מתחיל לפי היסטוריה, לא מאפס בכל פעם — Tests

## Coverage
- "ביקור ראשון בנושא אדפטיבי מתחיל ברמה הקלה ביותר" (אין רגרסיה) →
  `tests/e2e/adaptive-lesson-start.spec.ts` › `a first-ever visit to an adaptive topic
  starts at the easiest tier`
- "כניסה חוזרת ממשיכה מהרמה האחרונה, לא מאפס — יציאה מוקדמת (חזרה)" →
  `tests/e2e/adaptive-lesson-start.spec.ts` › `leaving mid-session through the back
  button still resumes from the reached tier next time`
- "כניסה חוזרת ממשיכה מהרמה האחרונה, לא מאפס — סיום מלא של התרגול" →
  `tests/e2e/adaptive-lesson-start.spec.ts` › `finishing a full session also resumes
  from the reached tier next time`
- "נושא אדפטיבי אחר של אותה תלמידה עצמאי — לא יורש רמה מנושא אחר" →
  `tests/e2e/adaptive-lesson-start.spec.ts` › `a different adaptive topic for the same
  student is unaffected by another topic's saved tier`
- "היסטוריה מלפני הפיצ'ר (בלי רמה שמורה) מתנהגת כמו ביקור ראשון" →
  `tests/e2e/adaptive-lesson-start.spec.ts` › `history from before this feature (no
  saved tier) behaves like a first-ever visit`

## How to run
`npm run test:e2e` (או ממוקד: `npx playwright test tests/e2e/adaptive-lesson-start.spec.ts`)

## Status
ריצה מלאה בודדת ונקייה, 2026-10-17: **490/491 עברו**. חמשת הבדיקות החדשות של הפיצ'ר
הזה עברו כולן. הכשל היחיד — `grade8-angles-congruence.spec.ts` › "covers angle
questions..." — **לא קשור לפיצ'ר הזה** (לא נוגע בכיתה ח׳/זוויות בכלל): אומת כ-flake
קיים-מראש ומתועד (ראו `docs/features/grade8-angles-congruence/status.md` ו-CLAUDE.md,
"מוזג ב-2026-10-10" — אותו flake ששוב הופיע ב-PR #77). ריצה חוזרת ומבודדת של אותה
בדיקה עצמה נכשלה **שוב, אבל על שורת-assert אחרת** (`"נצבים"` במקום `"קו ישר"`) —
תואם בדיוק את הסיבה השורשית המתועדת: הבדיקה מחפשת דפוסים ספציפיים שהקושי-המסתגל
המדגם-אקראי לא בהכרח מגיע אליהם באותו מספר-סשנים קבוע, כך ש**איזה** דפוס "חסר"
משתנה בין ריצות, לא רק "עובר/נכשל" קבוע.
