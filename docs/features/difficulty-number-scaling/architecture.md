# חוקי בחירת מספרים לפי קושי — 12 המחוללים האדפטיביים — Architecture

## Overview
שני סוגי שינוי, שניהם רק בתוך `src/data/adaptive*.ts` (בלי טיפוסים חדשים, בלי
שינוי ל-`Question`, בלי נגיעה ב-`App.tsx`/`Practice.tsx`): (1) כיווץ טווחי
`randInt` בחמש פונקציות ברמת הקושי הראשונה (ואחת גם ברמה השנייה), ו-(2) מנגנון
"הזרעת עשרוני" — מוסיפים שארית `.5`/ספרת-עשיריות לערך *מקור* אחד בכל דפוס, ונותנים
לשאר המספרים להיגזר ממנו קדימה (כפל/חיבור בלבד, לעולם לא חילוק), כך שהדיוק העשרוני
מובטח מבנית ולא תלוי בעיגול בדיעבד.

## Affected Files / Components

| קובץ | מה משתנה |
|---|---|
| `src/data/adaptiveHelpers.ts` | שתי פונקציות עזר חדשות: `wantsDecimal(rng, probability=0.3)` ו-`round2(n)`. |
| `src/data/adaptivePercent.ts` | `tenPercent` (רמה `1`): טווח `base` מכווץ. `fiftyPercent` (רמה `2`): טווח `base` מכווץ. `tensViaTenPercent` (רמה `4`) ו-`wordProblem`'s `discount`/`increase` (רמה `5`): מקבלים הזרעת עשרוני. |
| `src/data/adaptiveFractions.ts` | `unitFraction` (רמה `1`): טווח `answer` מכווץ. **אין** הזרעת עשרוני בקובץ הזה — ראו Risks. |
| `src/data/adaptiveAreaPerimeter.ts` | `rectangleArea` (רמה `1`): טווחי `length`/`width` מכווצים. `triangleArea` (רמה `4`) ו-`hardShape`'s `circlePerimeter`/`circleArea` (רמה `5`): מקבלים הזרעת עשרוני. |
| `src/data/adaptivePowers.ts` | `square` (רמה `1`): טווח `base` מכווץ. **אין** הזרעת עשרוני בקובץ הזה — ראו Risks. |
| `src/data/adaptiveWordProblems.ts` | `averageSpeed` (רמה `1`): טווחי `hours`/`speed` מכווצים. `reverseDiscount` (רמה `5`): מקבל הזרעת עשרוני. |
| `src/data/adaptivePythagoras.ts` | `findHypotenuse` (רמה `1`): מוגבל לארבע השלשות הקטנות, ללא הכפלת קנה-מידה. **אין** הזרעת עשרוני בקובץ הזה — ראו Risks. |
| `src/data/adaptiveAverage.ts` | `sumFromAverage` (רמה `4`) ו-`missingValue` (רמה `5`): מקבלים הזרעת עשרוני. אין שינוי טווחים. |
| `src/data/adaptiveEquations.ts` | `bracketsEquation` (רמה `5`, **לא** `multiplicativeEquation` כפי שכתוב ב-design.md — ראו Edge Cases): מקבל הזרעת עשרוני. אין שינוי טווחים. |
| `src/data/adaptiveExpressions.ts` | `squareSubstitution` (רמה `4`, **לא** `linearSubstitution` כפי שכתוב ב-design.md): מקבל הזרעת עשרוני. אין שינוי טווחים. |
| `src/data/adaptiveLinearFunction.ts` | `solveForX` (רמה `5`, **לא** `evaluateAdd`): מקבל הזרעת עשרוני. אין שינוי טווחים. |
| `src/data/adaptiveRatio.ts` | `scaledRecipe` (רמה `3`, **לא** רמה `5`): מקבל הזרעת עשרוני. אין שינוי טווחים. |
| `src/data/adaptiveDecimals.ts` | ללא שינוי — כבר עשרוני בכל רמה. |

## Data / State Changes
אין. שום שדה חדש ב-`Question`, שום טיפוס חדש. `answer: number` כבר תומך בעשרוני
(`adaptiveDecimals.ts` כבר עושה את זה היום) — הפיצ'ר הזה רק מרחיב *אילו* מחוללים
אחרים גם מפיקים ערך כזה, לפעמים.

## Technical Approach

### 1. כיווץ טווחים (חמש פונקציות)
שינוי ליטרלי בארגומנטים של `randInt` הקיים בכל פונקציה — לא נדרש מנגנון חדש:

| פונקציה | קובץ | היום | חדש |
|---|---|---|---|
| `tenPercent` | `adaptivePercent.ts` | `randInt(2,100,rng)*10` | `randInt(2,9,rng)*10` |
| `fiftyPercent` | `adaptivePercent.ts` | `randInt(2,100,rng)*2` | `randInt(2,45,rng)*2` |
| `unitFraction` | `adaptiveFractions.ts` | `answer=randInt(2,20,rng)` | `answer=randInt(2,15,rng)` |
| `rectangleArea` | `adaptiveAreaPerimeter.ts` | `length=randInt(3,12,rng)`, `width=randInt(2,9,rng)` | `length=randInt(3,9,rng)`, `width=randInt(2,7,rng)` |
| `square` | `adaptivePowers.ts` | `base=randInt(2,12,rng)` | `base=randInt(2,9,rng)` |
| `averageSpeed` | `adaptiveWordProblems.ts` | `hours=randInt(2,6,rng)`, `speed=randInt(20,90,rng)` | `hours=randInt(2,4,rng)`, `speed=randInt(5,20,rng)` |

### 2. שיפור עדין לפיתגורס (לא חובה, אבל כלול)
`findHypotenuse` (רמה `1` בלבד — `findLeg`/`rectangleDiagonal`/`ladder` ברמות `2`–`4`
לא נוגעים): מוסיפים קבוע `SMALL_TRIPLES = TRIPLES.slice(0, 4)` (`[3,4,5]` עד
`[8,15,17]`), ובתוך `findHypotenuse` משתמשים ב-`pick(SMALL_TRIPLES, rng)`
**ישירות, בלי `scaledTriple`** (כלומר בלי הכפלת קנה-מידה) — במקום
`scaledTriple(rng, 2)` שמושך מכל שמונה השלשות.

### 3. הזרעת עשרוני — הכלל האחיד
שתי פונקציות עזר חדשות ב-`adaptiveHelpers.ts`:
```ts
export function wantsDecimal(rng: Rng, probability = 0.3): boolean {
  return rng() < probability;
}
export function round2(n: number): number {
  return Number(n.toFixed(2));
}
```

**הכלל שחל בכל תשעת המחוללים שמקבלים הזרעת עשרוני**: בפונקציה של הרמה הרלוונטית,
קוראים `const decimal = wantsDecimal(rng);` בתחילת הפונקציה, ואז — כש-`decimal`
אמת — מוסיפים שארית (`+0.5`, או ספרת-עשיריות אקראית `1-9` במקרה של `אחוזים`, ראו
למטה) ל**ערך מקור אחד בלבד**, זה שכל שאר המספרים בפונקציה נגזרים ממנו דרך **כפל
או חיבור** (לעולם לא חילוק). זו הערובה לדיוק: מכפלה/סכום של מספר עם ספרת-עשירית
אחת (או שתיים) במספר שלם לא יכולה להפיק יותר עשרוניות משהיו במקור. **כל תוצאה
מחושבת (`answer`, וכל ערך `math` בשלב) עוברת `round2()`** לפני שהיא נכנסת ל-`Question`
— בדיוק כמו שהתבנית `${...toFixed(1)}` כבר עושה ב-`adaptiveDecimals.ts` היום, כדי
לנקות רעש בינארי (`0.1 + 0.2` וכו').

**טבלת יישום, מחולל-מחולל** (הערך המוזרע, ולמה זה בטוח):

| מחולל · פונקציה (רמה) | מוזרע | נגזר קדימה | הוכחת ≤2 עשרוניות |
|---|---|---|---|
| אחוזים · `tenPercent`→ לא, זה `tensViaTenPercent` (רמה `4`) | `base` מקבל ספרת-עשיריות: `base = randInt(2,50,rng)*10 + (decimal ? randInt(1,9,rng) : 0)` | `tenPct=base/10` (חילוק ב-`10` בלבד מותר — הזזת נקודה, לא חילוק אמיתי), `answer=tenPct×factor` | ספרה אחת בקלט × מכפלה שלמה = ספרה אחת בתוצאה |
| אחוזים · `wordProblem` (`discount`/`increase`, רמה `5`) | `price` מקבל ספרת-עשיריות, **רק כש-`rate∈{10,20,50}`** (לא `25`! `÷4` על ספרת-עשירית מפיק `3` עשרוניות — `23.7÷4=5.925`) | `discount=price×rate÷100` | `rate=10/20/50` בטוחים ב-`≤2` עשרוניות; `25` מוצא בכוונה |
| שטח והיקף · `triangleArea` (רמה `4`) | `base` מקבל `+0.5` | `area=base×height÷2`, אך `height` תמיד זוגי אז `height÷2` שלם — בפועל `area=base×(height/2)` | `int.5 × int` = `≤1` עשרונית |
| שטח והיקף · `hardShape`, `circlePerimeter`/`circleArea` בלבד (רמה `5`) | `radius` מקבל `+0.5` | `2×3×radius` / `3×radius×radius` | `radius` בעל `1` עשרונית → תוצאה `≤2` |
| ממוצע · `sumFromAverage` (רמה `4`) | `avg` מקבל `+0.5` | `answer=avg×count` | `≤1` עשרונית |
| ממוצע · `missingValue` (רמה `5`) | `a` מקבל `+0.5` (**לא** `avg` — כדי ש-`avg×2` יישאר שלם) | `answer=avg×2−a` | `≤1` עשרונית |
| משוואות · `bracketsEquation` (רמה `5`) | `x` מקבל `+0.5` | `c=a×(x+b)` | `a×(int+0.5)=a×int+a×0.5` → `≤1` עשרונית |
| ביטויים אלגבריים · `squareSubstitution` (רמה `4`) | `x` מקבל `+0.5` | `answer=a×x²+b`, `a∈{1,2,3,4}` | `x²` נותן `.25` בדיוק; `a×0.25` ל-`a≤4` נשאר `≤2` עשרוניות |
| פונקציה קווית · `solveForX` (רמה `5`) | `x` מקבל `+0.5` | `y=a×x±b` (בנייה קדימה, לא פותרים לאחור) | `a×0.5` ל-`a≤6` → `≤1` עשרונית |
| יחס ופרופורציה · `scaledRecipe` (רמה `3`) | `amount` מקבל `+0.5` | `answer=amount×k` | `≤1` עשרונית |
| בעיות מילוליות · `reverseDiscount` (רמה `5`) | `original` מקבל `+0.5`, **רק כש-`percent∈{20,50}`** (לא `25`, אותה סיבה כמו באחוזים) | `paid=original×remaining÷100` | בטוח ל-`20`/`50`; `25` מוצא בכוונה |

## Edge Cases
- **design.md קרא לשלוש פונקציות לא-נכונות** ("`Ax=B`" למשוואות, `linearSubstitution`
  לביטויים, `evaluateAdd` לפונקציה קווית, `scaledRecipe` "ברמה `5`" ליחס) — אלה כולן
  פונקציות ברמה נמוכה מדי (`1`–`2`) או ברמה לא נכונה, כפי שנבדק בפועל מול הקוד. תיקנתי
  את היישום להתאים לכוונה האמיתית של design.md (עשרוני **רק ברמות גבוהות**, איפה
  שזה מתמטית הגיוני) ולא לניסוח המילולי השגוי שלו. הטבלה למעלה משקפת את הפונקציות
  *הנכונות*. זו לא סטייה מהכוונה — זו תיקון של טעות ציון-רמה במסמך הקודם.
- **`25%`/`÷4` תמיד מוצא מהזרעת עשרוני**, בשני מקומות נפרדים (`adaptivePercent.ts`'s
  `wordProblem`, `adaptiveWordProblems.ts`'s `reverseDiscount`) — לא מקרי: `÷4` על
  מספר עם ספרת-עשירית אחת מפיק `3` ספרות אחרי הנקודה, מעל התקרה שהמשתמש ביקש.
  `developer` צריך לשים לב שזה מכוון, לא לנסות "לתקן" את זה בטעות בכיוון ההפוך.
- **`withoutLeakingHints` לא צריך שינוי** — `numbersIn()` שבתוכו כבר תומך בעשרוניים
  (`/\d+(?:\.\d+)?/g`), אז רמז שמקרית חוזר על תשובה עשרונית עדיין ייתפס ויתוקן
  באותו מנגנון retry קיים.
- **`content.spec.ts` כבר בודק את המחוללים האלה** (נוסף ב-`levels-as-practice`
  הקיים על הבראנץ' הזה) — כולל הכלל `"a written step's own arithmetic checks out"`
  שכבר תומך בעשרוניים במפורש ("`0.4 + 0.2` hits binary rounding"). לא נדרש שינוי
  בקובץ הבדיקות עצמו כדי שהוא יתפוס תקלה — `qa` רק צריך להריץ את הסוויטה ולוודא
  שהמדגם (שכולל את `9` המחוללים המעודכנים) עובר.
- **טווח `randInt` המקורי חייב להישאר זהה כש-`decimal` הוא `false`** — כלומר
  ה-`randInt(...)` הקיים בכל פונקציה לא זז, רק מתווספת שארית מעליו כשמתקבל
  `decimal===true`. כך שהמקרה השכיח (`70%` מהזמן ברמות אלה) ממשיך להתנהג בדיוק כמו
  היום.

## Risks / Tradeoffs
- **שלושה מחוללים לא מקבלים הזרעת עשרוני בכלל בפיצ'ר הזה: `שברים פשוטים`,
  `חזקות ושורשים`, `משפט פיתגורס`.**
  - **`חזקות ושורשים`** ו-**`משפט פיתגורס`** כבר מתועדים כחריגים ב-design.md — שורש
    לא-מדויק ושלשות לא-שלמות הן שינוי תוכן אחר לגמרי, לא הרחבת טווח.
  - **`שברים פשוטים` הוא חריג שלישי שהתגלה רק כאן, בשלב הארכיטקטורה**: שתי הפונקציות
    היחידות שמחלקות "`whole`" במכנה (`unitFraction`, `nonUnitFraction`) יושבות
    ברמות `1`–`2` — בדיוק הרמות שהפיצ'ר הזה **מכווץ** למספרים קטנים ופשוטים, לא
    מרחיב לעשרוניים. שתי הפונקציות ברמות `4`–`5` (`sumOfTwoFractions`,
    `partsInWholeAndHalf`) הן דפוסי **ספירה** ("כמה רבעים יש ב-`3` שלמים") שאין
    להן תשובה עשרונית הגיונית מבחינה מושגית (אי אפשר "`3.5` רבעים שנכנסים בשלם").
    לכן — בניגוד לתשעת האחרים — אין כאן דפוס בטוח ברמה גבוהה להשתמש בו בלי לשנות
    גם את הניסוח (מעבר להיקף הארכיטקטורה הזו). מתועד כמשימת המשך, לא כפער נשכח.
- **ה-`30%` הסתברות (`wantsDecimal`'s ברירת המחדל) היא החלטה מספרית של design.md,
  לא נגזרת ממנה — אם `qa`/המשתמש ירצו שיעור שונה בפועל (יותר/פחות עשרוניים), זה
  פרמטר יחיד (`probability`) בכל קריאה, קל לכוונן בלי לגעת בשאר המנגנון.

## Open Questions
None.
