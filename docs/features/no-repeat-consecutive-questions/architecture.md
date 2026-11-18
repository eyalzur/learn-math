# שתי שאלות זהות לא יוצאות ברצף — Architecture

## Overview
בנקודה היחידה שבה שאלת-ההמשך של נושא אדפטיבי נוצרת בפועל (`App.tsx`,
`handleAdaptiveAnswered`), עוטפים את הקריאה ל-`adaptive.generate(difficulty)`
בעוזר retry חדש (`withoutRepeatingPrompt`, `adaptiveHelpers.ts`) שמנסה שוב אם
הניסוח יצא זהה לשאלה הקודמת — אותו דפוס "check with teeth, retry" ש-
`withoutLeakingHints` כבר משתמש בו באותו קובץ בדיוק.

## Affected Files / Components
- **`src/data/adaptiveHelpers.ts`** — פונקציה חדשה, `withoutRepeatingPrompt`,
  לצד `withoutLeakingHints` הקיימת. שני הקבצים קוראים לה: אין צורך לגעת
  ב-19 קבצי `adaptive*.ts` עצמם — הם לא יודעים (וגם לא צריכים לדעת) שהשאלה
  הקודמת קיימת, כי ה-retry קורה בנקודת הקריאה ל-`generate`, לא בתוך
  `generate` עצמו.
- **`src/App.tsx`** — `handleAdaptiveAnswered` (סביב שורה 300): השורה היחידה
  ש-`.map`-ת את `prev.questions` ומפעילה `adaptive.generate(difficulty)` על
  כל אינדקס `i >= answeredCount`.

## Data / State Changes
אין — אין שדה חדש ב-state, רק *איך* שאלה אחת בודקת (זו שתוצג הבאה) נוצרת.

## Technical Approach
1. `src/data/adaptiveHelpers.ts` מקבל:
   ```ts
   export function withoutRepeatingPrompt(build: () => Question, previousPrompt: string | null): Question {
     if (previousPrompt === null) return build();
     let question = build();
     for (let i = 0; i < 20 && question.prompt === previousPrompt; i++) {
       question = build();
     }
     return question;
   }
   ```
   אותו גבול-ניסיונות (20) ואותה נפילה-חזרה-לניסיון-האחרון כמו
   `withoutLeakingHints` — "עדיף חזרה נדירה על תקיעה" (product-spec.md).
2. ב-`handleAdaptiveAnswered`, השורה היחידה שצריכה לדעת על השאלה הקודמת היא
   זו שיוצרת את **השאלה הבאה שתוצג בפועל** — אינדקס `answeredCount` בדיוק
   (לא כל אינדקס `i >= answeredCount`, ראו Edge Cases למטה על למה). היא
   הופכת מ:
   ```ts
   const questions = prev.questions.map((q, i) =>
     i >= answeredCount ? adaptive.generate(difficulty) : q,
   );
   ```
   ל:
   ```ts
   const questions = prev.questions.map((q, i) => {
     if (i < answeredCount) return q;
     if (i === answeredCount) {
       return withoutRepeatingPrompt(() => adaptive.generate(difficulty), prev.questions[answeredCount - 1].prompt);
     }
     return adaptive.generate(difficulty);
   });
   ```
   `prev.questions[answeredCount - 1]` תמיד קיים בנקודה הזו — `answeredCount`
   מתעדכן רק אחרי תשובה, כך שתמיד יש שאלה קודמת שזה עתה נענתה.

## Edge Cases
- **למה רק אינדקס `answeredCount` בדיוק, לא כל הזנב שמחדש מתחדש**: כל אינדקס
  `i > answeredCount` נוצר כאן באופן ספקולטיבי אבל **נזרק ונוצר מחדש שוב**
  ברגע שהתלמיד/ה עונה על השאלה הבאה (אותו קוד רץ שוב, עם `answeredCount`
  גבוה ב-1, ומחדש את כל מה שמ-`answeredCount` החדש ומעלה — כולל מה שהיה
  שם). האינדקס היחיד שבאמת מוצג אי-פעם *כפי שנוצר* הוא זה שבדיוק שווה
  ל-`answeredCount` ברגע היצירה. בדיקת-כפילות על אינדקסים שממילא יוחלפו
  היא עבודה מבוזבזת בלי שום תועלת נצפית למשתמש — product-spec.md גם מגביל
  את ההיקף לזוג הצמוד בלבד, לא לכל התרגול.
  **חריג יחיד:** השאלה הראשונה בתרגול (`freshAdaptiveSession`, אינדקס 0)
  אין לה שאלה-קודמת כלל — `withoutRepeatingPrompt` כבר מטפלת בזה
  (`previousPrompt === null` מדלג על ה-retry), אבל אין צורך לקרוא לה שם
  בכלל כי `freshAdaptiveSession` לא נוגעים בו (אינדקס 0 הוא תמיד הראשון,
  אין לו "קודם" להיות זהה אליו).
- **דרגת קושי השתנתה בין שתי השאלות**: לא משנה דבר במנגנון —
  `withoutRepeatingPrompt` משווה מחרוזות `prompt` בלבד, לא דרגות קושי; אם
  הניסוח באמת שונה (רוב המקרים כשדרגת הקושי השתנתה) הלולאה פשוט לא
  מתבצעת בכלל (ההשוואה הראשונה כבר נכשלת).
- **טווח מצומצם מאוד**: אחרי 20 ניסיונות כושלים, מחזירים את השאלה האחרונה
  שנוצרה גם אם היא עדיין זהה — בדיוק ההתנהגות ש-product-spec.md דורש
  במפורש ("עדיף חזרה נדירה על תקיעה").

## Risks / Tradeoffs
- **לא נוגעים ב-`freshAdaptiveSession`**: הארכיטקטורה הזו תלויה בהנחה
  שאינדקסים `> 0` במערך ההתחלתי לעולם לא מוצגים כפי שנוצרו (הם נזרקים
  ונוצרים-מחדש דרך `handleAdaptiveAnswered` לפני שמגיעים אליהם). זו לא
  הנחה חדשה — זו ההתנהגות הקיימת היום, רק עכשיו היא גם הבסיס לנכונות
  התיקון. אם מישהו ישנה את זה בעתיד (שישאלה 1 תוצג *בלי* לעבור דרך
  `handleAdaptiveAnswered`), התיקון הזה יצטרך תוספת תואמת.
- **לא מיושם בנושאים לא-אדפטיביים**: בכוונה — ראו Out of Scope ב-
  product-spec.md.

## Open Questions
None.
