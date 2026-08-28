# קושי מסתגל למיקה — שלב א׳ — Architecture

## Overview
שלושה קבצי generator חדשים (מבנה זהה ל-`adaptiveAdd100.ts` הקיים), שכל אחד מחובר
כ-`adaptive` על ה-`Topic` המתאים ב-`grade1.ts`/`grade2.ts`. שום קוד ניווט/UI לא
משתנה — `App.tsx`, `Practice.tsx`, `TopicLesson.tsx` כבר מטפלים ב-`topic.adaptive`
גנרית (ראה `insideTopic`, `enterTopic`, `freshAdaptiveSession`, `lessonQuestions`,
`handleAdaptiveAnswered` ב-`App.tsx`). זו למעשה עבודת נתונים בלבד.

## Affected Files / Components
- **`src/data/adaptiveAdd10.ts`** (חדש) — `generateAdd10Question(difficulty, rng)`,
  `nextAdd10Difficulty`, `ADD10_MIN_DIFFICULTY = 1`, `ADD10_MAX_DIFFICULTY = 3`,
  `ADD10_INITIAL_DIFFICULTY = 1`, `ADD10_QUESTION_COUNT = 20`.
- **`src/data/adaptiveSub10.ts`** (חדש) — אותו מבנה, `generateSub10Question`,
  `nextSub10Difficulty`, `SUB10_*` (`MIN=1`, `MAX=3`, `INITIAL=1`, `QUESTION_COUNT=20`).
- **`src/data/adaptiveSub100.ts`** (חדש) — אותו מבנה, `generateSub100Question`,
  `nextSub100Difficulty`, `SUB100_*` (`MIN=1`, `MAX=5`, `INITIAL=1`,
  `QUESTION_COUNT=20`) — ראי מדויק של `adaptiveAdd100.ts`.
- **`src/data/grade1.ts`** — מתווסף `adaptive: {...}` לאובייקטי ה-`Topic` של `add10`
  ו-`sub10`, מייבא משני הקבצים החדשים. ה-`levels` הקיימים (`30` שאלות כתובות בכל
  נושא) **נשארים במקום, ללא שינוי** — בדיוק כמו `add100` ב-`grade2.ts` היום.
- **`src/data/grade2.ts`** — מתווסף `adaptive: {...}` לאובייקט ה-`Topic` של `sub100`,
  מייבא מ-`adaptiveSub100.ts`. ה-`levels` הקיימים נשארים במקום, ללא שינוי.
- אין שינוי ב: `src/App.tsx`, `src/components/Practice.tsx`, `src/components/TopicLesson.tsx`,
  `src/data/style.ts`, `src/data/curriculum.ts`, `src/data/progress.ts` — כל אלה כבר
  מטפלים ב-`topic.adaptive` גנרית מאז PR #43/#48.

## Data / State Changes
אין שינוי טיפוסים — `AdaptiveConfig` וה-`adaptive?` האופציונלי על `Topic` כבר קיימים
(`src/data/curriculum.ts`). שלושת ה-`Topic` הקיימים רק מקבלים ערך לשדה שכבר קיים
בטיפוס.

## Technical Approach

### מבנה משותף לשלושת הקבצים החדשים (זהה ל-`adaptiveAdd100.ts`)
כל קובץ מכיל: `Rng` type, `randInt`, `pick`, `freshId` (עם prefix ייחודי, למשל
`g1-add10-adaptive-`), `makeQuestion` (עוטף `id`/`topic`/`style`/`prompt`/`answer`/
`hints`/`steps`/`analogy`), מאגרי משפטי-דימוי קבועים לפי `design.md`, פונקציית תבנית
אחת לכל קבוצת קושי, ופונקציית `generateXQuestion(difficulty, rng)` שממפה
`difficulty` (מעוגל, clamped) לפונקציית התבנית המתאימה.

### `adaptiveAdd10.ts` / `adaptiveSub10.ts` — שלוש תבניות, בלי `steps`
לפי `design.md`: קבוצה 1 (סכום/מחוסר `2`–`5`), קבוצה 2 (`6`–`8`), קבוצה 3 (`9`–`10`,
כולל הענף המיוחד לזוגות שמשלימים בדיוק ל-`10`). `makeQuestion` בשני הקבצים האלה
**לא מעביר `steps`** — משאיר את זה `undefined` כמו שהשאלות הכתובות הקיימות כבר עושות,
כדי ש-`explain.ts` ימשיך לחשב הסבר תואם-רמז אוטומטית (בדיוק כפי שכבר עובד בפועל
ב-`30` השאלות הכתובות היום). `style` נשאר `"add10"`/`"sub10"` בכל שאלה שנוצרת, לעקביות
עם ה-`STYLE_META` הקיים (גם אם לא מוצג כבורר, כי הנושא הוא "סגנון יחיד").

### `adaptiveSub100.ts` — חמש תבניות, עם `steps`, ראי חיסור מדויק של `add100`
מיישם את חמשת התבניות מ-`design.md` (`wholeTens`, `singleDigitSub`, `twoDigitNoBorrow`,
`borrowing` בשני טווחי `tensCap`) — אותה חלוקה מדויקת ל-5 רמות קושי כמו
`generateAdd100Question`. `makeQuestion` **כן מעביר `steps`** מפורש בכל תבנית (הפירוק
לפי ערך מקום, עם "שאילה" מפורשת בתבניות 4–5), מאותה סיבה בדיוק שתועדה בהערת הכותרת של
`grade2.ts`: השיטה הכתובה שונה מזו שההסבר הגנרי היה מחשב.

חשוב ב-`borrowing`: כמו ב-`add100`, יש לוודא שהמינואנד לא יורד מתחת ל-`0` וש-`unitsA
< unitsB` (כדי שבאמת יהיה צורך בשאילה) — הבחירה האקראית של `unitsA`/`unitsB` צריכה
להבטיח את זה, בדיוק כמו ש-`carrying()` ב-`add100` מבטיחה `unitSum >= 10` על ידי
`unitsB = randInt(10 - unitsA, 9, rng)`. כאן ההופכי: `unitsB = randInt(unitsA + 1, 9, rng)`
מבטיח שאילה.

### `nextXDifficulty` — אותו כלל בשלושת הנושאים, זהה ל-`add100`
```
if (!wasCorrect) return Math.max(MIN, current - 1);
return streak >= 2 ? Math.min(MAX, current + 1) : current;
```
נשמר זהה לתקדים הקיים בכל שלושת הנושאים, לעקביות — אין סיבת תוכן לסטות ממנו כאן, וזו
בדיוק ההערה הפתוחה (לא חוסמת) שכבר רשומה ב-`docs/features/adaptive-difficulty/status.md`
("מהירות ההתקדמות ניתנת לכיוון") — לא נפתרת בפיצ'ר הזה.

### חיבור ל-`Topic`
ב-`grade1.ts`/`grade2.ts`, בדיוק כמו ש-`add100` כבר עושה:
```ts
adaptive: {
  generate: generateAdd10Question,
  minDifficulty: ADD10_MIN_DIFFICULTY,
  maxDifficulty: ADD10_MAX_DIFFICULTY,
  initialDifficulty: ADD10_INITIAL_DIFFICULTY,
  nextDifficulty: nextAdd10Difficulty,
  questionCount: ADD10_QUESTION_COUNT,
},
```

## Edge Cases
- **`add10`/`sub10` בלי `steps`**: אם מישהו יוסיף בעתיד תבנית קושי רביעית עם שיטה
  שלא תואמת את מה שההסבר הגנרי מחשב, יהיה צריך להוסיף `steps` מפורש אז — לא רלוונטי
  לשלוש התבניות הנוכחיות (נבדק מול הרמזים הכתובים הקיימים, שכבר עברו ריוויו תוכן ללא
  `steps`).
- **`sub10` קבוצה 3, מחוסר `10`**: המקרה `10 − b` צריך `b` בין `4` ל-`8` (המקבילה
  לשאלות הכתובות `10−4` עד `10−8`) — לא `10−0`/`10−1`/`10−2`/`10−3`/`10−9`/`10−10`,
  כדי להישאר בטווח הקושי הזה ולא לחפוף לקבוצות אחרות.
- **`sub100` שאילה**: לוודא `tensA - tensB >= 1` אחרי החיוב (כמו ב-`add100` הקיים)
  כדי שהתוצאה תישאר חיובית ובטווח `עד 100`.
- **`lessonQuestions`** (`App.tsx`) יוצר שאלה אחת לכל רמת קושי, `minDifficulty` עד
  `maxDifficulty` — עבור `add10`/`sub10` זה `3` שאלות דוגמה במסך "שיעור" (היה `1`
  קודם, כשהנושא לא היה אדפטיבי) ועבור `sub100` זה `5` (במקום `1`) — עקבי עם איך
  `add100` כבר מציג `5` דוגמאות במסך השיעור שלו היום. אין כאן שינוי קוד, רק תוצאה
  טבעית של המנגנון הקיים.
- **היסטוריה קיימת**: רשומות ישנות של `add10`/`sub10`/`sub100` נושאות `levelTitle`
  (קל/בינוני/קשה) ונשארות בדיוק כפי שהן — `progress.ts` לא משתנה, ותצוגת ההיסטוריה
  כבר יודעת להציג גם רשומות עם `levelTitle` ריק (מאז `add100`).

## Risks / Tradeoffs
- **`3` רמות קושי במקום `5`** ל-`add10`/`sub10`: חריגה מהתקדים המספרי של `add100`/
  `sub100` (`5`), אבל תואמת את design.md — הטווח `1`–`10` פשוט לא מכיל מספיק הבדל
  אמיתי כדי להצדיק `5` דרגות נפרדות בלי לכפול קבוצת קושי (מה ש-design.md כבר ציין).
  לא נחשב סטייה מהספק — הספק השאיר את המספר המדויק לתת-כלל טכני.
- שלוש קבוצות "טבעיות" בכל נושא, לא פונקציה רציפה של קושי — נאמן לאיך ש-`add100` כבר
  בנוי (תבניות בדידות, לא נוסחה רציפה), לא ניסיון להמציא כאן מנגנון חדש.
- ה-`30` שאלות הכתובות שנשארות ב-`levels` הופכות למתות בפועל (לא מוצגות יותר, בדיוק
  כמו ב-`add100`) — נשמרות לא כי מישהו יקרא אותן, אלא כי מחיקתן היא decision נפרד
  שלא התבקש (ראה התקדים וההערה שלו ב-`grade2.ts`).

## Open Questions
None.

## Implementation Notes

נבנה בדיוק לפי התוכנית — שלושה קבצים חדשים (`src/data/adaptiveAdd10.ts`,
`src/data/adaptiveSub10.ts`, `src/data/adaptiveSub100.ts`), כל אחד עם `Rng`/`randInt`/
`pick`/`freshId`/`makeQuestion` משלו (לא שיתוף קוד בין הקבצים — אותו סגנון בדיוק
כמו ש-`adaptiveAdd100.ts` הקיים לא משתף עם שאר `adaptive*.ts`), ושלוש פונקציות
`generateXQuestion` המחוברות ל-`Topic.adaptive` של `add10`/`sub10` (`grade1.ts`)
ו-`sub100` (`grade2.ts`). ה-`levels` הכתובים בשלושת הנושאים נשארו במקום ללא שינוי.

**אימות תוכן לפני מסירה ל-QA:** מעבר ל-`build`+`lint`, הרצתי סקריפט בדיקה זמני (לא
נשמר בריפו) שקורא לכל אחת משלוש הפונקציות `1500` פעם (`500` seeds × כל רמת קושי),
בודק `a+b===answer`/`a-b===answer`, גבולות (`sub10`≤`10`, `sub100`≤`99`, שום תוצאה
שלילית), נוכחות `hints`/`analogy`, ושבשאלות `sub100` יש `steps` בלי `NaN`. עבר נקי —
`1500` דגימות לכל נושא, `4500` סה"כ.

**סטייה אחת קטנה מ-design.md:** בתבנית "יחידה בודדת" של `sub100` (מקבילת
`singleDigitAdd`), design.md כתב `units` בטווח לא-מוגדר מפורש; קבעתי `units = randInt(1,9)`
(לא `0`) כדי ש-`b = randInt(1, units)` תמיד יהיה תקין (חיסור מ-`0` לא מייצר שאלת
"מורידים מהיחידות" משמעותית). לא משנה את התוכן/הניסוח שתואר — רק את טווח הדגימה.

**לתשומת לב QA:** `tests/e2e/content.spec.ts` בודק היום את `generateAdd100Question`
וברשימת `ADAPTIVE_GENERATORS` (`12` נושאי רותם/עומר) ישירות מול `RULES` הגנריים
ובדיקות ספציפיות (יחיד/רבים בעברית וכו׳). שלוש הפונקציות החדשות **לא נוספו** לאותה
תשתית בדיקה — זו בדיוק העבודה שמצופה מ-`qa` להוסיף עכשיו, באותו דפוס בדיוק (import
+ לולאת seed + בדיקת `RULES`), כולל בדיקת יחיד/רבים ל-`"עשרה/עשרות"` וב-`sub100`
ל-`"יחידה/יחידות"` (מקביל לבדיקות הקיימות על `generateAdd100Question` בשורות
1201–1242 של `content.spec.ts`).
