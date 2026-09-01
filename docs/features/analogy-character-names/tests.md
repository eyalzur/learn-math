# שמות קבועים לדמויות בדימויים — Tests

## Coverage
כל הבדיקות ב-`tests/e2e/analogy-character-names.spec.ts`, קוראות ישירות מ-`src/data`
(אין UI חדש לבדוק דרך הדפדפן):

- קריטריון "דמות בודדת → שם מאושר" → `single-character analogies now name one of the
  three approved characters` — מוודאת את הטקסט המדויק בכל אחת מ-16 השאלות.
- קריטריון "שתי דמויות → שני שמות שונים" → `two-character analogies name two different
  approved characters` — מוודאת טקסט מדויק וגם שיש בדיוק שני שמות שונים בכל דימוי, לא
  אותו שם פעמיים.
- קריטריון "קבוצה/כמות → לא מקבלת שם" → `a group or quantity analogy is never given a
  character's name` — כולל את שני ה-false positives (`g6-ratio-m8` "מחברות" =
  notebooks, `g8-equations-h5` "חברות סלולר" = companies) שנשארים בדיוק כמו שהיו.
- כלל ג׳ (מספר מיקום בתור) → `a queue-position analogy keeps its numbers` — מוודאת
  ש-4 שאלות ה"בתור לגלישה" לא נגעו בהן.
- הגנת רגרסיה על כל 590+ שדות ה-`analogy` בבנקי השאלות הסטטיים (לא רק 26 ששונו) →
  `no static-curriculum analogy regresses to a generic character placeholder` ו-
  `no static-curriculum analogy names the same character twice`. שני אלה עברו כפי
  שהוסבר ב-`architecture.md` **לא** לתוך `content.spec.ts`'s `RULES` הגלובלי, כי הוא
  רץ גם על 12 המחוללים האדפטיביים — ו-`adaptiveSub100.ts` עדיין מכיל את אותו placeholder
  ("...לאח שלך") בכוונה, כי הוא מחוץ ל-scope של הפיצ'ר הזה. רשימת ה-`RULES` הגלובלית
  לא נגעה בה.
- דקדוק מגדר (AC): לא נדרשה בדיקת runtime ייעודית — אף אחד מ-26 השינויים לא הוסיף פועל
  חדש שתלוי במגדר (רק שם עצם הוחלף), כך שהתאמת המגדר מובטחת מבנייה. מתועד ב-
  `architecture.md`'s Implementation Notes.

## How to run
`npm run test:e2e`

## Status
✅ עובר — `305/305` בדיקות ב-e2e הריצו וירוקות בריצה בודדת ונקייה (2026-08-30): 299
הבדיקות הקיימות + 6 הבדיקות החדשות של הפיצ'ר הזה. `npm run build` ו-`npm run lint`
נקיים.
