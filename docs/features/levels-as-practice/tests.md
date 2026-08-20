# רמות הופכות לתרגול מסתגל — כל נושאי רותם ועומר — Tests

## Coverage

| קריטריון קבלה (product-spec.md) | בדיקה |
|---|---|
| כל 12 הנושאים בנויים מטמפלייט, בורר הרמות לא מוצג | `tests/e2e/adaptive-difficulty.spec.ts` וכל בדיקת "no diagram before answered" ב-`content.spec.ts` וב-`more-diagrams-wave2.spec.ts`/`fraction-diagram.spec.ts`/`clearer-explanations.spec.ts` — כל אחת נכנסת לנושא ומאמתת כניסה ישירה לתרגול |
| כל תרגול הוא `20` שאלות (כולל `חיבור עד 100` הקיים) | `tests/e2e/adaptive-difficulty.spec.ts` › `חיבור עד 100 skips the level picker and lands straight on practice` (`"מתוך 20"`) ושתי הבדיקות שמריצות סשן מלא (`20` איטרציות) |
| רמת הקושי מגיבה להצלחה בזמן אמת | `tests/e2e/adaptive-difficulty.spec.ts` › `a streak of correct answers climbs to needing carrying...` (הפיילוט; המנגנון הגנרי משותף לכל 12 הנושאים, לא נבדק שוב לכל אחד בנפרד) |
| כל תרגיל שנוצר עומד בכללי התוכן הקיימים (RULES) | `tests/e2e/content.spec.ts` › `every generated question, across all twelve levels-as-practice topics, passes every content rule` — `100` דגימות × `5` רמות קושי × `12` נושאים = `6000` שאלות שנבדקות מול כל כללי `RULES` הקיימים |
| תרגילים משתנים בין סשנים | `tests/e2e/fraction-diagram.spec.ts` › `the slices match the denominator...` (לולאה של `8` כניסות טריות, בודקת מכנים שונים) — אותו עיקרון שכבר קיים ב-`adaptive-difficulty.spec.ts` לפיילוט |
| היסטוריה ממשיכה לתעד תרגול, בלי סיומת רמה | מכוסה ע"י המנגנון הגנרי המשותף לכל הנושאים האדפטיביים (נבדק בפיילוט, `adaptive-difficulty.spec.ts`) |
| רשומות היסטוריה ישנות (עם שם רמה) ממשיכות להיראות | לא נוסף מבחן ייעודי — ההתנהגות (רשומה קיימת לא נכתבת מחדש) היא תוצאה ישירה של `progress.ts` לא נוגע ברשומות עבר, ללא שינוי קוד ב-feature זה |
| נגישות/כיווניות (LTR בתוך ביטויים, aria-label==caption) | `tests/e2e/fraction-diagram.spec.ts`, `tests/e2e/more-diagrams-wave2.spec.ts`, `tests/e2e/clearer-explanations.spec.ts` — כל אחת עם בדיקת `direction: ltr` ו/או התאמת caption/aria-label |

### בדיקות רגרסיה שעודכנו (פיצ'רים אחרים שהשתמשו בבורר הרמות של רותם/עומר כאמצעי)

| קובץ | מה השתנה ולמה |
|---|---|
| `adaptive-difficulty.spec.ts` | `"מתוך 10"` → `"מתוך 20"`; שני לולאות סשן הוארכו מ-`10` ל-`20` שלמות |
| `review-status.spec.ts` | הרחבת בורר ה-selector לכלול `.problem-text` (נושא אדפטיבי הוא גם "נפתח בהצלחה") |
| `heading-wrap-balance.spec.ts` | שתי בדיקות שהשתמשו ברותם למסך הרמות הועברו למיקה/"חיבור עד 10" — עדיין מדגימות בורר רמות, בלי אובדן כיסוי |
| `fraction-diagram.spec.ts` | נכתב מחדש נגד תוכן שנוצר — קורא את השאלה שהופיעה בפועל ומחשב את הציפייה ממנה, במקום שאלה כתובה קבועה |
| `clearer-explanations.spec.ts` | מסלול העשרוניים של רותם (`7` בדיקות) נכתב מחדש; מסלולי מיקה (חיסור, שאילה, ספרה בודדת) ללא שינוי |
| `mistake-diagnosis.spec.ts` | בדיקת "near-miss" נכתבה מחדש נגד תוכן שנוצר; שתי בדיקות "נקודה עשרונית שנשמטה" (צורה נדירה, `~1` ל-`40`) הועברו לבדיקה ישירה על `diagnose()`/`generateDecimalsQuestion()` ב-`describe("without the browser")` הקיים |
| `style-lessons.spec.ts` | בדיקת "כיתה לא מסווגת מתרגלת ברמות" תוקנה — הכיתה הלא-מסווגת (רותם) עכשיו הופכת לאדפטיבית, לא לרמות; הבדיקה נשארת עם הכוונה שעדיין רלוונטית (מסך הסגנון לא דולף) |
| `more-diagrams-wave2.spec.ts` | כל `17` הבדיקות נכתבו מחדש — רובן נגד השכבה הראשונה שנוצרת (זהה לצורה הכתובה המקורית), חלקן נגד קריאה ישירה לגנרטור+פונקציית הציור (ללא דפדפן) לצורות נדירות (`~25%`, `~33%` הסתברות) |

### באגי תוכן אמיתיים שנתפסו תוך כדי כתיבת הבדיקות

לא היו רק בעיות ניתוב — כתיבת הבדיקות מול תוכן שנוצר חשפה שלושה באגים אמיתיים בגנרטורים
עצמם, שתוקנו כחלק מהעבודה הזו (לא רק עקיפה בבדיקה):

1. **`adaptiveFractions.ts`** — שברים לא-יחידה נבנו בהרכבה שגויה דקדוקית ("שני חמישיות"
   במקום "שתי חמישיות"), מה שגם גרם ל-`fractionDiagram.ts` לא לזהות את השאלה בכלל.
   תוקן לפי ששת הביטויים המלאים כפי שכבר מופיעים בשאלות הכתובות.
2. **`adaptivePercent.ts`** — שאלת ה"הנחה" במילוליות לא כללה שם פריט ("מחיר X הוא...")
   כמו בשאלה הכתובה, ולכן `percentStrip.ts` מעולם לא זיהה אותה. תוקן.
3. **חמישה מחוללים (fractions, percent, ratio, average, powers, word-problems)** —
   רמזים יכלו "לבגוד" בתשובה במקרה (מספר מבני כמו מכנה/מספר-חלקים/מעריך שיצא זהה
   לתשובה בפועל באותה הגרלה ספציפית). נוסף `withoutLeakingHints()` (`adaptiveHelpers.ts`)
   שמנסה שוב עם הגרלה חדשה כשזה קורה — אותו עיקרון "בדיקה עם שיניים" שכבר קיים
   ב-`verticalSum.ts`. תיקון אחד נוסף היה וודאי (לא הסתברותי): רמז ההנחה באחוזים אמר
   את התשובה במפורש בכל פעם, לא רק במקרה — תוקן בניסוח, לא רק בניסיון חוזר.

## How to run

```bash
npm run build && npm run lint && npm run test:e2e
```

לבדיקות של הפיצ'ר הזה בלבד:

```bash
npx playwright test tests/e2e/content.spec.ts -g "levels-as-practice"
npx playwright test tests/e2e/more-diagrams-wave2.spec.ts tests/e2e/fraction-diagram.spec.ts tests/e2e/clearer-explanations.spec.ts tests/e2e/mistake-diagnosis.spec.ts tests/e2e/style-lessons.spec.ts tests/e2e/heading-wrap-balance.spec.ts tests/e2e/adaptive-difficulty.spec.ts tests/e2e/review-status.spec.ts
```

## Status

עבר במלואו: `231/231` בדיקות ה-e2e בריצה אחת ונקייה, `npm run build` ו-`npm run lint`
נקיים בגרסה `1.18.0`.

בדיקות שמסתמכות על אקראיות (`fraction-diagram.spec.ts` › `the slices match the
denominator...`, `more-diagrams-wave2.spec.ts` › `the two strips are distinguished by
fill...`) הורצו `4`–`5` פעמים נוספות ברצף כדי לוודא שאינן תלויות במקרה בזרע ה-RNG של
ריצה בודדת — כולל תיקון אחד שנמצא כך (רצועת היחס הניחה תמיד בלוק אחד מלא, נכון רק
כש-`ratioA` יוצא `1` במקרה, לא תמיד).

## תיקון אחרי משוב (2026-08-20, `PR #48`)

המשתמש עשה ריוויו תוכן אמיתי על דף התצוגה (לא רק ניווט באפליקציה) ומצא כלל שהפר את
העיצוב: **מספר עשרוני לא אמור להופיע בין נתוני השאלה (prompt) — רק בתשובה מותר.** כמה
דוגמאות קונקרטיות ("שטח משולש שבסיסו `14.5`", "הממוצע של `9` מספרים הוא `24.5`",
"`x` שווה `8.5`") חשפו שהמימוש המקורי של הקנה-מידה של הקושי (`difficulty-number-scaling`,
שקדם לפיצ'ר הזה) זרע עשרוניים בכמה `given`-ים בטעות.

**תיקון שיטתי בכל שמונת המחוללים שהיה להם מנגנון עשרוני (`wantsDecimal`):**
- **הוסר לגמרי** (המקום היחיד שיכול היה לשאת עשרוני היה given, ואין דרך להעביר את זה
  לתשובה): `adaptiveAverage.ts` (`sumFromAverage`, `missingValue`), `adaptiveExpressions.ts`
  (`squareSubstitution`), `adaptiveRatio.ts` (`scaledRecipe`), חלק מ-`adaptiveAreaPerimeter.ts`
  (המעגלים ב-`hardShape`), חלק מ-`adaptivePercent.ts` (`tensViaTenPercent`).
- **תוכנן מחדש כך שהעשרוני נשאר בתשובה בלבד**: `adaptivePercent.ts` ו-`adaptiveWordProblems.ts`
  (`price`/`paid` תמיד שלם, ההנחה/העלייה או המחיר המקורי — התשובה — יכולים לצאת עשרוניים,
  בעזרת "מחלק+שארית" על given שלם); `adaptiveAreaPerimeter.ts`'s `triangleArea` (בסיס וגובה
  תמיד שלמים, זוגיים־יחד כדי שהשטח יצא חצי בדיוק); `adaptiveLinearFunction.ts`'s `solveForX`
  (`y` הנתון תמיד שלם, `x`-התשובה יכול לצאת שבר נקי); `adaptiveEquations.ts`'s
  `bracketsEquation` (`c` הנתון תמיד שלם — `a` הוגבל לזוגי כש-`x` יוצא חצי, כדי ש-`a×(x+b)`
  יישאר שלם).

**בדיקת רגרסיה חדשה** ב-`content.spec.ts`: *"a question never shows a decimal among its
own given numbers — only the answer may land on one"* — רצה על כל `12` הנושאים (חוץ
מ"שברים עשרוניים", ששם עשרוני בנתון הוא בדיוק הנושא), כל `5` רמות הקושי, `150` דגימות
כל אחת. הבדיקה הישנה *"the nine decimal-eligible generators..."* עודכנה לחמישה נושאים
בלבד (`אחוזים`, `שטח והיקף`, `משוואות`, `פונקציה קווית`, `בעיות מילוליות`) — התאמה למה
שבאמת נשאר עשרוני-כשיר אחרי התיקון.

**שני באגי "דלף תשובה" נוספים שנמצאו תוך כדי (לא קשורים לעשרוניים) ותוקנו**:
`adaptiveEquations.ts`'s `additiveEquation` (המקרה של מינוס) ו-`bothSidesEquation` אמרו
את ערך התשובה במפורש בתוך ה-analogy; `adaptiveLinearFunction.ts`'s `readSlope` אמר את
גודל השיפוע (≈ התשובה) במפורש. שלושתם נוסחו מחדש בלי לחשוף את המספר.

**ניסוח**: כל ה-analogies שחסרה להן שאלה מסיימת קיבלו אחת (המשתמש: "חסרה השאלה בסוף"),
בכל `9` הקבצים; שני רמזי המשוואות שהמשתמש ציין כלא ברורים ("מה שעושים לאגף אחד עושים גם
לשני", "אפשר לחלק לפני שפותחים סוגריים") נוסחו מחדש בעברית ברורה יותר.

**`235/235`** בדיקות e2e עוברות בריצה אחת ונקייה, `npm run build`/`npm run lint` נקיים,
גרסה `1.20.0`.
