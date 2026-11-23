# ויזואליזציית-כדורים — חיבור, חיסור — Tests

## Coverage

מ-`docs/features/ball-manipulatives/product-spec.md`'s Acceptance Criteria ו-`design.md`'s
Screens/States — לא מהקוד. היקף הבדיקות: חיבור (`חיבור עד 10`) וחיסור (`חיסור עד 10`)
בלבד, כמו היקף הפיצ'ר עצמו (השוואת-גודל נדחתה).

| קריטריון | בדיקה |
|---|---|
| הציור מופיע רק בהסבר-אחרי-תשובה-שגויה, לא לפני ולא אחרי תשובה נכונה | `no ball diagram before answering, or after a correct answer` (שתי הפעולות) |
| מספרי-הכדורים תואמים בדיוק את האופרנדים | `a wrong answer draws a ball-pile whose counts match the operands exactly` (שתי הפעולות) |
| הציור נשאר LTR בתוך הדף ה-RTL | `the picture stays left-to-right inside the right-to-left page` (שתי הפעולות) |
| תומך בהקראה-בקול (caption נגיש לקורא-מסך) | `the picture's caption is exactly what a screen reader is told` (שתי הפעולות) |
| ה-caption תואם לאופרנדים/לתוצאה האמיתיים, לא placeholder | `the caption states the real operands and the real result, not placeholders` (שתי הפעולות) |
| `prefers-reduced-motion` מציג זוג סטטי לפני/אחרי, כל אחד ספיר בנפרד | `prefers-reduced-motion shows a static לפני/אחרי pair instead of animating` (שתי הפעולות) |
| הציור לא "דולף" לנושא שלא בהיקף הפיצ'ר | `no ball diagram on a topic this feature doesn't cover` (שתי הפעולות, בדיקה אחת משותפת) |

**לא נבדק בכוונה** (ולא Open Question — הכרעה מודעת, לא פער): האם ballDiagram נכשל
בעדינות (`null`, בלי ציור) כש-`חיסור עד 10`'s האחרון (`a === 10`, המינואנד דו-ספרתי)
יוצא — זו עובדה אמיתית על הגבול שתועדה ב-`architecture.md`'s Edge Cases, אבל לא
קריטריון-קבלה מפורש ב-`product-spec.md`/`design.md`, ולהגיע לזה בפועל דורש להטיס קודם
רצף תשובות-נכונות לרמה הקשה ואז להמר על `50%` סיכוי אקראי לאותה שאלה — בדיוק סוג
התלות-ב-`Math.random()` שה-CLAUDE.md מזהיר ממנה. עלות הבדיקה (flakiness פוטנציאלי)
גבוהה מהתועלת כש-זה לא קריטריון מפורש.

## How to run
```bash
npm run test:e2e -- --workers=1 tests/e2e/ball-manipulatives.spec.ts
```
(הסוויטה המלאה: `npm run test:e2e -- --workers=1`, בלי ציון קובץ.)

## Status
ירוק, נכון ל-2026-11-23. `14/14` בקובץ הזה עצמו.

הסוויטה המלאה: `375/379` (`2` דולגו). שני כשלים, שניהם **לא קשורים** לפיצ'ר הזה:
- `grade8-angles-congruence.spec.ts`'s "covers angle questions..." — ה-flake
  הקיים-מראש והמתועד ב-CLAUDE.md ("תמיד בטוח להתעלם ממנו"). חזר שלוש פעמים בריצות
  נפרדות בסשן הזה, כולל ריצה מבודדת (רק הקובץ הזה) — זהה למנגנון התיעוד הקיים.
- `adaptive-difficulty.spec.ts`'s "history records the topic without a level
  suffix" — נכשל פעם אחת בריצה-מלאה אחת, אבל עבר `5/5` נקי בריצה מבודדת חוזרת של
  הקובץ הזה בלבד. קובץ שלא נוגע בו שום קוד של הפיצ'ר הזה (אין קשר ל-`ballDiagram.ts`/
  `BallDiagram.tsx`/`questionExplanation.ts`/`QuestionExplanation.tsx`/`App.css`'s
  שינויים) — flake סביבתי חד-פעמי, לא רגרסיה.

שני באגים אמיתיים נמצאו ותוקנו **בתוך** סבב ה-QA הזה, לפני הריצה הסופית:
1. בדיקת-ה-e2e של התכונה הזו (`ball-manipulatives.spec.ts`'s `parseOperands`) לא
   חשבה על ה-`"="` הסופי ב-`.problem-text` (למשל `"2 + 1 ="`) — תוקן (אותו idiom
   כמו `mika-adaptive-difficulty.spec.ts`'s `operands()`). באג בבדיקה עצמה, לא
   באפליקציה.
2. `npm run bump:feature` העלה את `package.json` ל-`1.54.0` (שלב ה-developer) בלי
   רשומת-`CHANGELOG` מתאימה ב-`src/data/changelog.ts` — `version-log.spec.ts`'s
   "marks the version currently open on this device as today's" תפס את זה בפועל
   (ללא אף `<li>` עם `"1.54.0"`, אין `"(היום)"` להציג). תוקן: רשומת-`CHANGELOG`
   חדשה נוספה בראש המערך, כמו שהתיעוד הקיים ב-`changelog.ts` כבר דורש מכל bump.
