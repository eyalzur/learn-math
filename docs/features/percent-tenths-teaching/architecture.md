# רצועת האחוזים מתחלקת לפי האחוז שבשאלה, וההסבר אומר למה — Architecture

## Overview
`percentStrip.ts`'s existing "`כמה זה X% מ-Y?`" branch מחשב, בנוסף למה שהוא כבר מחשב
היום, את השבר המצומצם של `X/100` (`numerator`/`denominator`), ו-`PercentStrip.tsx`
מצייר `denominator` חלקים במקום `3` קווי-רבע קבועים כשהשדות האלה קיימים. זה משנה קובץ
נתונים (`percentStrip.ts`) ורכיב תצוגה (`PercentStrip.tsx`) בלבד — שניהם כבר גנריים על
`Question.prompt`, אז השינוי חל אוטומטית על **כל** שאלה שתואמת את התבנית, מכל מקור.
`20` השאלות הכתובות שבתבנית הזו (`grade6.ts`, נושא אחוזים, רמות קל+בינוני) מקבלות רמזים
ו-`steps` מעודכנים בהתאם לניסוח שב-design.md.

## Affected Files / Components

| קובץ | מה משתנה |
|---|---|
| `src/data/percentStrip.ts` | הענף הראשון של `readShape()` (`^כמה זה (\d+)% מ-(\d+)\?$`) מחשב גם `numerator`/`denominator` דרך `gcd`. `PercentStrip` (הטיפוס) מקבל שני שדות אופציונליים חדשים. שאר הענפים (הנחה/העלאה/"כמה אחוזים") **לא משתנים** — לא מגדירים את השדות החדשים, בהתאם ל-Out of Scope. |
| `src/components/PercentStrip.tsx` | קווי החלוקה (`.ps-tick`) מחושבים מ-`denominator` כש-`strip.denominator` קיים (`(1..denominator-1).map(i => i/denominator)`), במקום המערך הקבוע `[0.25, 0.5, 0.75]`. כש-`denominator` לא קיים (שאר סוגי השאלות) — ההתנהגות הקיימת נשארת בדיוק כמו שהיא. |
| `src/data/grade6.ts` | `20` השאלות בתבנית "`כמה זה X% מ-Y?`" (רמת `easy`: `e1`–`e10`, כולן `10%`/`50%`; רמת `medium`: `m1`–`m10`, `20%`/`25%`/`30%`/`75%`) מקבלות `hints[0]` חדש ושני שלבים חדשים בתחילת `steps`, לפי הטבלה ב-design.md. `hints[1]`, ה-`analogy`, וכל שאר שדות השאלה **לא משתנים**. רמת `hard` (בעיות מילוליות) **לא נוגעת בכלל** — מחוץ להיקף. |
| `tests/e2e/content.spec.ts` | ה-RULE הקיים "a written step's own arithmetic checks out" כבר רץ על כל `steps` חדש — לא נדרש שינוי בקובץ הזה, רק ודאות ש-`20` השאלות המעודכנות עדיין עוברות אותו (ראו Edge Cases). |
| `tests/e2e/more-diagrams-wave2.spec.ts` | בדיקה קיימת אחת (`the strip carries guide lines at every quarter`, בודקת `.ps-tick` בשאלת `10%`) מניחה `3` קווים קבועים — עכשיו אמורים להיות `9` (`10` חלקים). זו בדיקה שצריך `qa` לעדכן, לא `developer` — מתועד כאן כדי ש-`qa` ידע לחפש אותה. |

**`src/data/adaptivePercent.ts` אינו קיים על הבראנץ' הזה** — הוא נוצר ב-`PR #48`
(`feature/levels-as-practice`), שעדיין לא מוזג. ראו Risks/Tradeoffs.

## Data / State Changes

### `PercentStrip` — שני שדות אופציונליים חדשים (`src/data/percentStrip.ts`)
```ts
export interface PercentStrip {
  base: number;
  filled: number;
  extra?: number;
  /** רק לתבנית "כמה זה X% מ-Y?" — השבר המצומצם של X/100. קובע כמה חלקים מציירת
   *  הרצועה, במקום קווי-רבע קבועים. undefined בכל שאר סוגי השאלה (הנחה/העלאה/
   *  "כמה אחוזים"), ששם ההתנהגות הקיימת (קווי רבע) נשארת. */
  numerator?: number;
  denominator?: number;
  caption: string;
}
```
תוסף בלבד — `extra` כבר אופציונלי היום, אותו דפוס בדיוק.

### חישוב השבר המצומצם
```ts
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
// בענף "כמה זה X% מ-Y?" של readShape():
const g = gcd(rate, 100);
const numerator = rate / g;
const denominator = 100 / g;
```
`rate` הוא `X` מהפרומפט (כבר מחולץ שם ב-`readShape` הקיים). לא נדרש שינוי בחתימת
הפונקציה — רק תוספת חישוב ושני שדות בתוצאה שכבר מוחזרת.

## Technical Approach

### `percentStrip.ts`
רק הענף הראשון של `readShape()` (התבנית `^כמה זה (\d+)% מ-(\d+)\?$`) משתנה — מוסיף את
`numerator`/`denominator` המחושבים כמו למעלה לאובייקט שהוא כבר בונה. שאר `readShape()`
(הנחה/העלאה/"כמה אחוזים") לא נוגע. `percentStrip()` עצמו (הבדיקה "עם השיניים" מול
`question.answer`) לא צריך שינוי — היא כבר בודקת `filled`/`extra` נגד התשובה; `numerator`/
`denominator` הם מידע נוסף לציור, לא חלק מהבדיקה.

### `PercentStrip.tsx`
```ts
const ticks = strip.denominator
  ? Array.from({ length: strip.denominator - 1 }, (_, i) => (i + 1) / strip.denominator)
  : [0.25, 0.5, 0.75];
```
מחליף את המערך הקבוע `[0.25, 0.5, 0.75]` בשורה הזו; שאר הרכיב (הצבעה, תוויות, `extra`)
לא משתנה. לא נדרש קומפוננט חדש.

### `grade6.ts` — עדכון תוכן
לכל אחת מ-`20` השאלות (`e1`–`e10`, `m1`–`m10`): `hints[0]` מוחלף בניסוח מטבלת ה-Copy
ב-design.md (למשל `` `10%` זה כמו `1` מתוך `10` `` במקום `` `10%` הם עשירית: מחלקים
ב-`10` ``), ו-`steps` מקבל שני שלבים חדשים **בתחילת** המערך (למשל `` { label: "`10%`
זה `10` מתוך `100`" } `` ואז `` { label: "מצמצמים: `10` מתוך `100` שווה ל-`1` מתוך
`10` (מחלקים את שני המספרים ב-`10`)" } ``), לפני שלב החישוב הקיים. `hints[1]` ו-
`analogy` נשארים כפי שהם. הערך המספרי (`X`, ה-gcd) בכל שאלה תלוי ב-`X` ו-`Y` שלה —
משתנה משאלה לשאלה בדיוק כמו היום, לפי הטבלה ב-design.md (`X%` → `D`/`gcd`).

## Edge Cases
- **`content.spec.ts`'s "keeps its hints to exactly two, without giving the answer
  away"** — הרמז החדש (`` `X%` זה כמו `N` מתוך `D` ``) לא כולל את `Y` או את התשובה,
  רק מספרים שכבר קבועים בשאלה עצמה (`X`, `N`, `D`) — אין סיכון דליפה חדש, אבל
  `developer` צריך לוודא בפועל (הרצת `npm run test:e2e`) ולא להניח.
- **"a written step's own arithmetic checks out"** — שני השלבים החדשים הם משפטי
  מילים (`label` בלבד, בלי `math`), לא שורות "`X = Y`" — הכלל שבודק חשבון בשלבים לא
  אמור לגעת בהם כלל (הוא רק בודק שלבים עם `math` שמכיל `=`). לוודא בהרצה בפועל.
- **`30%`/`75%` (המחלק המשותף שונה מ-`X` עצמו)** — הכי קל לטעות כאן: המחלק שנאמר
  בהסבר הוא `gcd(X,100)`, לא `X`. הטבלה ב-design.md כבר נותנת את הערך הנכון לכל שער
  קיים — להעתיק משם, לא לחשב מחדש.

## Risks / Tradeoffs
- **`adaptivePercent.ts` (המחולל, מ-`PR #48`) לא קיים על הבראנץ' הזה ולא נוגע כאן.**
  חלק מהשינוי חל עליו **אוטומטית וללא קוד נוסף**: `percentStrip.ts`/`PercentStrip.tsx`
  גנריים על `question.prompt`, אז ברגע ש-`PR #48` ימוזג, כל שאלת "`X%` מ-`Y`?" שהוא
  מייצר (גם ברותם, tier 1–4 של `adaptivePercent.ts`) תצייר את הרצועה המחולקת נכון,
  בחינם. **מה שלא יקרה אוטומטית: ניסוח הרמזים/ה-`steps`** — אלה בנויים בקוד
  ב-`adaptivePercent.ts` (תבניות טקסט, לא קובץ סטטי), ואי אפשר לערוך קובץ שלא קיים.
  **המשמעות**: לאחר מיזוג `PR #48`, שאלות שנוצרות ב-runtime יציגו את הציור החדש (נכון)
  עם הניסוח הישן (לא מעודכן) — פער זמני, לא שבור, אבל לא שלם. יש לפתוח משימת המשך
  קטנה שמעדכנת את `tenPercent`/`fiftyPercent`/`quarterOrThreeQuarters`/
  `tensViaTenPercent` ב-`adaptivePercent.ts` לאותו ניסוח, ברגע ש-`PR #48` נמצא ב-`main`.
  לא חוסם את ה-PR הזה — זה שיפור מצטבר, לא רגרסיה.
- **עריכת `20` שאלות היא עבודת תוכן מכנית אך לא זניחה.** הטבלה ב-design.md נותנת
  נוסחה ברורה לכל שער (`10/20/25/30/50/75`), אז זו לא עבודת ניסוח מקורי לכל שאלה —
  אבל `developer` עדיין צריך לגעת בכל `20` בנפרד (מספרים שונים בכל שאלה).

## Open Questions
None.

## Implementation Notes
נבנה בדיוק לפי התכנון, ללא סטיות.

- `src/data/percentStrip.ts`: נוספה `gcd()`, והענף הראשון של `readShape()` (`^כמה זה
  (\d+)% מ-(\d+)\?$`) מחשב ומחזיר `numerator`/`denominator` נוספים. שני השדות נוספו
  כאופציונליים לטיפוס `PercentStrip`. שאר הענפים (הנחה/העלאה/"כמה אחוזים")
  לא נגעתי בהם — כפי שתוכנן.
- `src/components/PercentStrip.tsx`: `[0.25, 0.5, 0.75]` הוחלף בחישוב `ticks` מ-
  `strip.denominator` כשהוא קיים, עם נפילה חזרה למערך הקבוע כשלא (שאר סוגי השאלות).
  שאר הרכיב (צביעה, תוויות, `extra`) לא השתנה.
- `src/data/grade6.ts`: כל `20` השאלות (`e1`–`e10`, `m1`–`m10`) בנושא אחוזים עודכנו —
  `hints[0]` הוחלף ושני שלבים חדשים נוספו בתחילת `steps`, בדיוק לפי טבלת ה-Copy
  ב-design.md. וידאתי ידנית שהמחלק הנאמר בשלב הצמצום הוא תמיד ה-gcd האמיתי (`10` ל-
  `30%`, `25` ל-`75%`, לא `X` עצמו). `hints[1]`, `analogy`, ורמת `hard` לא נגעתי בהם.
- `npm run build` ו-`npm run lint` נקיים. `npm run bump:fix` הועלה (`1.17.1` →
  `1.17.2` — הבראנץ' יצא מ-`main` לפני מיזוג `PR #48`, אז המספר הזה עצמאי מה-
  `1.18.0` שם).
- לא הרצתי את סוויטת ה-e2e המלאה — זו עבודת `qa`, כולל עדכון הבדיקה שכבר תועדה
  בארכיטקטורה (`more-diagrams-wave2.spec.ts`, "the strip carries guide lines at every
  quarter", `3`→`9` קווים לשאלת `10%`).
- כפי שתועד ב-Risks: `src/data/adaptivePercent.ts` (מ-`PR #48`, טרם מוזג) לא קיים
  על הבראנץ' הזה ולא נגעתי בו — משימת המשך מתועדת, לא חוסמת.
