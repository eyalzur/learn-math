# זוויות וחפיפת משולשים — Architecture

## Overview
**עדכון סבב ב׳ (2026-09-01):** המשתמש ראה את התצוגה המקדימה של סבב א׳ וביקש מחולל
אדפטיבי, בלי מסך רמות — ראו "עדכון ארכיטקטורה — סבב ב׳" בהמשך המסמך לתכנון המלא.
הסעיפים הבאים מתעדים את סבב א׳ כפי שהוא, ונשארים נכונים ברובם (הדיאגרמה, החילוץ
מה-`prompt`, מיקום הנושא) — רק ה"בלי מחולל אדפטיבי" בטקסט הבא ובב-Risks/Tradeoffs
**בוטל**, לא בתוקף יותר.

נושא נוסף ב-`GRADE_8_TOPICS`/`grade8Topics`, בנוי מ-`levels` כתובים בלבד (בלי מחולל
אדפטיבי בסבב הזה — ראו Risks/Tradeoffs). חמש הצורות מה-design.md מתממשות כ**מודול
נתונים אחד** ו**רכיב SVG אחד**, לא חמישה זוגות קבצים — union מסוג מבחין, באותה תבנית
שכבר קיימת ב-`geometryShape.ts`/`GeometryShape.tsx` (ריבוע/מלבן/משולש/מעגל, קובץ
אחד). כל צורה נחלצת מ-`question.prompt` בביטוי רגולרי לפי תבנית משפט קבועה, ומאומתת
מול `question.answer` — בדיוק כמו `pythagorasTriangle.ts`.

## Affected Files / Components

| קובץ | מה משתנה |
|---|---|
| `src/data/curriculum.ts` | `GRADE_8_TOPICS`: מוסיפים `"זוויות וחפיפת משולשים"` (בין `"משפט פיתגורס"` ל-`"פונקציה קווית"`). |
| `src/data/grade8.ts` | טופיק חדש `{ id: "angles", title: "זוויות וחפיפת משולשים", reviewed: true, levels: [level("easy", […]), level("medium", […]), level("hard", […])] }` — בלי שדה `adaptive`. ~30 שאלות (developer). |
| `src/data/angleShape.ts` | **חדש.** `angleShape(question): AngleShape \| null` — union מסוג מבחין עם 5 `kind`, חילוץ/אימות מה-`prompt`, כיתוב. |
| `src/components/AngleShape.tsx` | **חדש.** SVG בלבד, `switch (shape.kind)` — קשתות זווית, ריבוע לזווית ישרה, קווי סימון להתאמת צלעות/חפיפה. |
| `src/data/questionExplanation.ts` | שורה נוספת ב-`ExplanationBundle` (`angle: ReturnType<typeof angleShape>`), קריאה ב-`buildExplanation`, ושורה ב-`explanationSpeechParts`. |
| `src/components/QuestionExplanation.tsx` | `<figure className="angle-figure">` נוסף, אותו דפוס כמו `geometry`/`pythagoras` (`segmented(caption)` לתצוגה, `caption.replace(/\`/g, "")` ל-`aria-label`). |
| `src/App.css` | `.angle-figure` + כל סגנון SVG שהצורה דורשת (קשתות, סימוני התאמה) — לפי התבנית הקיימת (`.pythagoras-figure` וכו׳). |
| `tests/e2e/content.spec.ts` | ספירת שאלות מעודכנת (כלל שסופר את כל הנושאים/השאלות כבר קיים — רק המספר הכולל גדל). |
| `docs/features/README.md`, `CLAUDE.md` | לא בשלב הזה — `developer`/`qa` לא נוגעים בהם; ה-orchestrator מעדכן בסוף. |

**אין שינוי ב-`promptSegments`/`segmented()`/`App.css` (`.prompt-math`)** — ראו הבירור
המפורט בסעיף הבא. זה לא ברשימה כי זה *לא* משתנה, ובדיקה הזו היא בדיוק הסיבה שהוא לא.

## Data / State Changes

```ts
export type AngleShape =
  | {
      kind: "straightAngle"; // ∡ ישרה/השלמה ל-90/180
      known: number;
      unknown: number; // = 180 (או 90) − known, ומאומת מול question.answer
      total: 90 | 180;
      caption: string;
    }
  | {
      kind: "triangleAngles"; // סכום זוויות / זווית חיצונית
      angleA: number;
      angleB: number;
      angleC: number; // הזווית הפנימית השלישית, תמיד מחושבת
      exteriorAt: "A" | "B" | "C" | null; // מסומן כשהשאלה על זווית חיצונית
      unknown: "A" | "B" | "C" | "exterior";
      caption: string;
    }
  | {
      kind: "parallelLines"; // זוויות מתאימות/מתחלפות/חד-צדדיות
      known: number;
      unknown: number;
      relation: "corresponding" | "alternate" | "coInterior";
      caption: string;
    }
  | {
      kind: "congruentTriangles"; // חח״צ/צז״ח/צל״צ בפועל
      knownLabel: string; // "AB", "∡A" וכו', כפי שמופיע בשאלה
      knownValue: number;
      unknownLabel: string;
      unknownValue: number; // = knownValue, מהחפיפה — מאומת מול question.answer
      valueKind: "side" | "angle";
      caption: string;
    }
  | {
      kind: "isoscelesTriangle"; // שווה-שוקיים + תיכון/גובה/חוצה-זווית
      apexAngle: number | null;
      baseAngle: number; // מחושב אם apexAngle נתון, ולהפך
      cevianIsRightAngle: boolean; // האם מציירים את הריבוע בבסיס
      caption: string;
    };
```

כל `kind` מכיל את ה-`caption` שלו (שורת ההסבר מ-design.md, טבלת ה-Copy) — אותו דפוס
כמו `GeometryShape`. אין `state` חדש ב-`Practice.tsx`/`App.tsx`: הצורה נגזרת מ-
`question` בכל רינדור, בדיוק כמו שאר עשר הצורות הקיימות.

## Technical Approach

### תבניות משפט קבועות לכל `kind` — לא ניסוח חופשי
בדיוק כמו ב-`pythagorasTriangle.readShape`: כל שאלה בנושא הזה חייבת להיכתב לפי אחת
מכמה תבניות `prompt` קבועות, כי החילוץ הוא רג׳קס על מבנה משפט, לא הבנת שפה חופשית.
תבניות מוצעות (developer רשאי להתאים ניסוח, אבל **המבנה** — סדר הנתונים במשפט —
צריך להישאר עקבי בתוך כל `kind`):

| `kind` | תבנית | דוגמה |
|---|---|---|
| `straightAngle` | `בזווית ישרה, זווית אחת היא (\d+)°. מה גודל הזווית השנייה?` | `130°` → `50` |
| `triangleAngles` (סכום) | `במשולש \`ABC\`, ∡A=(\d+)° ו-∡B=(\d+)°. מה גודל ∡C?` | |
| `triangleAngles` (חיצונית) | `במשולש \`ABC\`, ∡A=(\d+)° ו-∡B=(\d+)°. מה גודל הזווית החיצונית ב-C?` | |
| `parallelLines` | `שני ישרים מקבילים וישר חותך. זווית אחת היא (\d+)°, וה(מתאימה\|המתחלפת\|החד-צדדית) לה היא α. מה α?` | |
| `congruentTriangles` | `משולש \`ABC\` חופף למשולש \`(...)\`. \`(AB\|BC\|AC\|∡A\|∡B\|∡C)=(\d+)°?\`. מה (הצלע\|הזווית) המתאימה?` | |
| `isoscelesTriangle` | `במשולש \`ABC\` שווה-השוקיים (\`AB=AC\`), זווית הראש ∡A=(\d+)°. מה גודל זווית הבסיס?` | |

**כל תבנית מייצרת שני-שלושה וריאנטים בפועל** (איזו זווית ידועה/מבוקשת, מתאימה/
מתחלפת/חד-צדדית וכו׳) — כמו ש-Pythagoras מכסה שישה וריאנטים בשישה `if` נפרדים
באותה פונקציה. `angleShape.ts` יעקוב אחר אותה צורה: סדרת `if ((m = prompt.match(...)))`
עד שאחת תתאים, כל אחת בונה את ה-`kind` המתאים.

### אימות מול `answer` — כמו כל צורה קיימת
אחרי שהחילוץ מוצא ערכים, מחשבים את הערך ה"נכון" מהצורה (למשל `180 - known` ל-
`straightAngle`) ומשווים ל-`question.answer`. אי-התאמה → `null`, אין ציור. זה התופס
שגיאת הקלדה בין ה-`prompt` הכתוב ל-`answer` הכתוב — בדיוק כמו בכל הצורות האחרות,
ולמה זה משתלם כאן דווקא: 30 שאלות חדשות עם חישוב זוויתי ידני הן בדיוק המקום שבו
טעות הקלדה שקטה קורית.

### רינדור SVG — קשתות זווית כפרימיטיב משותף ברכיב, לא במודול הנתונים
חמשת ה-`kind` חולקים אלמנט חזותי חוזר: קשת עם מספר (זווית ידועה) מול קשת עם `?`
(זווית מבוקשת), וריבוע קטן לזווית ישרה (כבר קיים ב-`PythagorasTriangle.tsx` — ניתן
לחלץ helper `<RightAngleMark>` משותף אם נוח, זו החלטת מימוש של developer). **שיתוף
בשכבת הרינדור בסדר; שיתוף בשכבת החילוץ לא** — כל `kind` מפרש משפט שונה לגמרי, ולכן
`angleShape.ts` לא מנסה לאחד את הפענוח, בדיוק כפי שההחלטה הזו כבר נומקה
ב-`more-diagrams/architecture.md` (מודול לכל צורה ברמת הנתונים, לא ברמת הרינדור).

### בירור: אותיות לטיניות בתוך `promptSegments` — נבדק, לא דורש שינוי
`promptSegments()` (`src/data/curriculum.ts:250`) הוא `prompt.split(/`([^`]*)`/)` —
רג׳קס גנרי שלא מניח שום דבר על תוכן הגרשיים, רק שהוא בין שני תווי backtick. ותבנית
ה-CSS (`.prompt-math`, `App.css:299`) מפעילה `direction: ltr` + `unicode-bidi:
isolate` על **כל** מקטע כזה, בלי הבחנה בין ספרה לאות. שני המנגנונים כבר משמשים
היום מחרוזות מרובות-מקטעים באותו משפט (למשל `` "כמה זה `2x + 3` כאשר `x` שווה 4?" ``
ב-`grade8.ts`). **מסקנה: `` `A` ``, `` `∡ABC` ``, `` `α = 40°` `` עוברים דרך אותו
נתיב בדיוק בלי שום שינוי קוד** — האזהרה שהועלתה ב-design.md נבדקה ונסגרת כאן,
לא מועברת הלאה כ"עוד לבדוק" ל-developer.

### מיקום הנושא ברשימה
`GRADE_8_TOPICS` היא מערך סדור שקובע את סדר הכרטיסים ב-`TopicPicker` (אין מיון נפרד
— נבדק ב-`TopicPicker.tsx`, מציג `grade.topics` כפי שהם). הכנסת `"זוויות וחפיפת
משולשים"` מיד אחרי `"משפט פיתגורס"` ולפני `"פונקציה קווית"` ממלאת את המלצת ה-design.

## Edge Cases
- **זווית חיצונית שיוצאת `≥ 180°` או `≤ 0°`** — צריך לבחור ערכי `angleA`/`angleB` בכתיבת
  השאלות כך שכל הזוויות (כולל השלישית והחיצונית) יוצאות בטווח `1..179`. אין בדיקת
  תקינות גיאומטרית ב-`angleShape.ts` עצמו (כמו ש-`pythagorasTriangle` לא בודק אי-שוויון
  משולש) — האחריות על developer בבחירת המספרים, לא על הקוד בזמן ריצה.
- **`congruentTriangles` עם `valueKind: "angle"`** — התווית (`∡A` וכו׳) כוללת `∡`,
  שצריך להיות בתוך הגרשיים האחוריים יחד עם שם הנקודה (`` `∡A` ``, לא `∡` `` `A` ``)
  כדי שהבידוד יחול על הסימן והאות יחד ולא ייקרע ביניהם.
- **תרגום `known`/`unknown` להצגה** — ב-`straightAngle` ו-`parallelLines`, המספר
  הידוע תמיד מוצג עם מעלות (`°`) בתוך הקשת; ה-`?` מוצג בלי יחידה. עקביות בין חמשת
  ה-`kind` מונעת בלבול ילד/ה שרואה שתי צורות שונות לאותו רעיון.
- **שאלות שנכתבות בלי אף אחת מהתבניות** (למשל אם developer מנסח וריאציה שלא תוכננה)
  → `angleShape` מחזיר `null` בשקט, כמו כל צורה אחרת — השאלה עדיין תקינה ותפעל, רק
  בלי דיאגרמה. לא באג, אבל שווה סריקה ידנית לפני מיזוג שכל 30 השאלות אכן תופסות ציור
  (כמו שקרה ב-`more-diagrams`, שם `10` שאלות בכוונה נשארו בלי ציור — כאן הכוונה
  שכולן יתפסו, כי כל השאלות בנושא הזה *הן* גיאומטריה חזותית מטבען).
- **כללי תוכן קיימים (`tests/e2e/content.spec.ts`)** ימשיכו לרוץ על 30 השאלות
  החדשות — ייחודיות אנלוגיה, איסור עשרוני בנתוני שאלה, ניסוח רמזים וכו׳. לא צריך
  כלל חדש לנושא הזה, אלא אם QA ימצא דפוס חדש שדורש אחד.

## Risks / Tradeoffs
- **בוטל בסבב ב׳ — הבולט הבא מתאר החלטה מסבב א׳ שהמשתמש ביטל אחרי שראה תצוגה
  מקדימה.** נשאר לתיעוד היסטורי; ראו "עדכון ארכיטקטורה — סבב ב׳" בהמשך המסמך.
- ~~**בלי מחולל אדפטיבי (`adaptive`) בסבב הזה — מוצהר, לא שכחה.** design.md מניח
  "לוחצים ונכנסים ישר לתרגול" כמו ששת הנושאים האחרים של עומר, אבל זה נכון להם רק כי
  `difficulty-number-scaling`/`levels-as-practice` (`#48`) הוסיפו מחולל **בנפרד**,
  אחרי שהתוכן המקורי שלהם כבר היה קיים כ-`levels` סטטיים בלבד — בדיוק המצב שהנושא
  הזה יהיה בו עכשיו. כלומר זו **חזרה על אותו סדר היסטורי בדיוק**, לא סטייה ממנו:
  התוכן קודם, המחולל אחר כך כפיצ'ר נפרד. המשמעות המעשית: עד שמחולל אדפטיבי ייכתב
  לנושא הזה, לחיצה על הכרטיס **תציג את מסך שלוש הרמות (`LevelPicker`)** ולא תיכנס
  ישר לתרגול — שונה מהתיאור ב-design.md Overview. כתיבת מחולל אמיתי לזוויות/חפיפה
  (המצאת שאלות אקראיות שעדיין גיאומטריות תקינות — סכום זוויות `180°`, אי-שוויון
  משולש) היא עבודה משמעותית בפני עצמה ולא הגיוני לדחוס אותה לתוך פיצ'ר שכבר מוסיף
  תוכן חדש שלם; מומלץ כ-follow-up נפרד, בדיוק כמו `#48` היה ל-`#43`-ו הלאה.~~
- **קובץ נתונים/רכיב אחד לחמש הצורות, לא חמישה** — סטייה מתבנית `more-diagrams`
  (מודול לכל צורה), אבל תואמת תבנית קיימת אחרת ומדויקת יותר לכאן: `geometryShape.ts`
  (ריבוע/מלבן/משולש/מעגל באיחוד אחד, כי הן "אותה משפחה" — צורה עם מידה). חמש הצורות
  כאן הן כולן "דיאגרמת זווית/משולש עם סימון ידוע-מול-מבוקש", ולכן זו הבחירה הנכונה;
  הסיכון הוא קובץ אחד גדול יחסית (כנראה `150–250` שורות, כמו `geometryShape.ts`),
  שנשאר קריא כי כל `kind` הוא ענף עצמאי.
- **מה לא נוגעים בו:** אין שינוי ב-`promptSegments`, ב-`.prompt-math`, או במנגנון
  ההקראה הכללי (`speech.ts`) — כל אלה כבר תומכים בתוכן הזה כמו שהם.

## עדכון ארכיטקטורה — סבב ב׳: מחולל אדפטיבי (2026-09-01)

### Overview (סבב ב׳)
`generateAnglesQuestion(difficulty, rng)` חדש ב-`src/data/adaptiveAngles.ts`, בדיוק
בתבנית `adaptivePythagoras.ts` (הכי קרוב מבין 11 המחוללים הקיימים — נושא גיאומטרי,
כמה תבניות לפי tier). הנושא ב-`grade8.ts` מקבל שדה `adaptive` (כמו ששת האחרים),
ו-`levels` **נשאר בקוד כפי שהוא** — לא נמחק, לא בשימוש בתרגול בפועל (בדיוק כמו
שכל 11 הנושאים המסתגלים האחרים משאירים את ה-`levels` הכתובים שלהם). **אין שינוי
ב-`src/data/angleShape.ts`, `AngleShape.tsx`, `questionExplanation.ts`, או
`QuestionExplanation.tsx`** — המחולל רק צריך להזין את `angleShape.ts` הקיים
בפרומפטים שכבר תואמים את שנים-עשר תבניות ה-regex שלו; הדיאגרמה ממשיכה לעבוד בלי
לגעת בה.

### Affected Files / Components (סבב ב׳)

| קובץ | מה משתנה |
|---|---|
| `src/data/adaptiveAngles.ts` | **חדש.** `generateAnglesQuestion`, `nextAnglesDifficulty`, `ANGLES_MIN/MAX/INITIAL_DIFFICULTY`, `ANGLES_QUESTION_COUNT = 20`. שתים-עשרה פונקציות pattern (אחת לכל `kind`/וריאנט), מקובצות בשישה tiers. |
| `src/data/grade8.ts` | טופיק `angles` מקבל `adaptive: { generate: generateAnglesQuestion, minDifficulty: ANGLES_MIN_DIFFICULTY, maxDifficulty: ANGLES_MAX_DIFFICULTY, initialDifficulty: ANGLES_INITIAL_DIFFICULTY, nextDifficulty: nextAnglesDifficulty, questionCount: ANGLES_QUESTION_COUNT }`, בדיוק כמו `equations`/`pythagoras`/וכו׳. ה-`levels` הקיימים (`30` שאלות מסבב א׳) נשארים במקום, ללא שינוי. |
| `tests/e2e/grade8-angles-congruence.spec.ts` | נכתב ב-QA מול `LevelPicker` — כל הבדיקות שם שמניחות מסך רמות (`has three difficulty levels...`) צריכות עדכון ל-QA (סבב ב׳): כניסה ישירה לתרגול, `20` שאלות, בלי `.level-card`. זה תיקון של QA, לא של developer — ראו הפניה גם ב-status.md. |

### Technical Approach (סבב ב׳)

#### מיפוי שנים-עשר התבניות לשישה tiers
כל tier מכיל תבנית/וריאנט אחד או יותר; `pick()` (מ-`adaptiveHelpers.ts`) בוחר וריאנט
בתוך ה-tier בכל קריאה. הקיבוץ הוא לפי דמיון מושגי (כמו שכל tier ב-Pythagoras הוא
עוד רמת מורכבות באותה משפחת חישוב):

| Tier | וריאנטים | תיאור |
|---|---|---|
| 1 | `straightAngle-line`, `straightAngle-right` | חיסור פשוט מ-`180`/`90` |
| 2 | `triangleAngles-sum`, `triangleAngles-exterior` | עובדות זוויות במשולש |
| 3 | `parallelLines-corresponding`, `parallelLines-alternate`, `parallelLines-coInterior` | זוויות בין ישרים מקבילים |
| 4 | `isosceles-apexFromBase`, `isosceles-baseFromApex` | שווה-שוקיים, זוויות בסיס/ראש |
| 5 | `congruentTriangles-side`, `congruentTriangles-angle` | חפיפה — צלע/זווית מתאימה |
| 6 | `isosceles-medianRightAngle` | שווה-שוקיים + תיכון=גובה (הכי מורכב — משלב שתי עובדות) |

`ANGLES_MIN_DIFFICULTY = 1`, `ANGLES_MAX_DIFFICULTY = 6`, `ANGLES_INITIAL_DIFFICULTY = 1`,
`ANGLES_QUESTION_COUNT = 20`. `nextAnglesDifficulty` — אותו כלל בכל 12 המחוללים
הקיימים: `2` תשובות נכונות ברצף מעלות tier אחד, תשובה שגויה אחת מורידה tier אחד
מיד (`Math.max`/`Math.min` לגבולות, בדיוק כמו `nextPythagorasDifficulty`).

#### טווחי מספרים שמבטיחים תקינות גיאומטרית **בבנייה**, לא בבדיקה בדיעבד
לכל pattern, הטווחים נבחרים כך שהתוצאה **תמיד** בטווח `[10, 170]` מעלות (לא רק
`1..179` הגבול הטכני של `angleShape.ts` — שוליים נוספים כדי שלא ייצא זווית קיצונית
כמו `2°` שנראית מוזר בציור):

- **Tier 1:** `straightAngle-line`: `known = randInt(20, 160, rng)`. `straightAngle-right`:
  `known = randInt(10, 80, rng)`.
- **Tier 2:** `angleA = randInt(20, 80, rng)`; `remaining = 180 - angleA` (`100..160`);
  `angleB = randInt(20, remaining - 20, rng)`; `angleC = remaining - angleB`.
  **בבנייה הזו `angleA, angleB, angleC` תמיד ב-`[20, 160]` וסכומם תמיד `180`** — אין
  צורך לבדוק ולדחות, זה מובטח מתמטית מהטווחים עצמם. `triangleAngles-exterior` משתמש
  באותה בנייה בדיוק (הזווית החיצונית `angleA + angleB`, שתמיד `≤ 160` מאותה סיבה).
- **Tier 3:** `known = randInt(20, 160, rng)` לכל שלוש היחסים (`corresponding`/
  `alternate`/`coInterior`) — התשובה (`known` או `180 - known`) יוצאת אוטומטית
  באותו טווח.
- **Tier 4:** `apexFromBase`: `given (baseAngle) = randInt(10, 80, rng)` → `apex = 180 - 2×given` תמיד ב-`[20, 160]`. `baseFromApex`: `given (apexAngle) = 2 × randInt(5, 80, rng)` (**זוגי בבנייה**, כדי ש-`(180-given)/2` תמיד שלם) → `base = (180-given)/2` תמיד ב-`[10, 85]`.
- **Tier 5:** `side`: `value = randInt(4, 20, rng)` (טווח אורכי צלע כמו בשאלות הכתובות). `angle`: `value = randInt(15, 150, rng)`.
- **Tier 6:** `given (baseAngle) = randInt(10, 80, rng)` → `∡BAD = 90 - given` תמיד
  ב-`[10, 80]`.

זו בדיוק הגישה שכבר קיימת ב-`adaptivePythagoras.ts` (טריפלות פיתגורס מוכנות מראש,
לא בדיקת אי-שוויון משולש בדיעבד) — כאן במקום טבלת קבועים, טווחי `randInt` שהבנייה
המתמטית שלהם מבטיחה תוצאה חוקית בלי ענף "נסה שוב".

#### hints/steps/analogy — הופכים לפונקציות תבנית, לא נכתבים מחדש
לכל אחד משנים-עשר ה-patterns כבר קיים בפועל hint/step/analogy אחד ב-`grade8.ts`
מסבב א׳ (השאלה הראשונה מכל bucket, למשל `g8-angles-e1` ל-`straightAngle-line`).
developer הופך כל אחד למחרוזת תבנית עם `${...}` על המספרים שנבחרו ב-runtime, בדיוק
כמו ש-`findHypotenuse`/`findLeg`/וכו׳ ב-`adaptivePythagoras.ts` עושות היום — לא
כתיבה מאפס. ה-`analogy` לכל pattern נשאר **אחד קבוע** (לא בריכה של כמה), בדיוק כמו
בכל 11 המחוללים הקיימים (`findHypotenuse` תמיד "מדרגות...", לעולם לא שתי אנלוגיות
שונות) — הסיכון התיאורטי של התנגשות עם שאלה כתובה שיצאה עם אותם מספרים בדיוק כבר
קיים בכל מחולל אחר בפרויקט ומקובל; אין סיבה להמציא כאן הגנה שלא קיימת בשום מקום
אחר. כל שאלה בנויה עם `makeQuestion`/`freshId` (`makeFreshId("g8-angles-adaptive")`)
ועטופה ב-`withoutLeakingHints` (מ-`adaptiveHelpers.ts`) — אותה עטיפה שכל מחולל אחר
כבר משתמש בה נגד הדלפת תשובה מקרית ברמז.

### Edge Cases (סבב ב׳)
- **`isosceles-baseFromApex` דורש `given` זוגי** — אם developer ישכח את הבחירה
  הזוגית (`2 × randInt(...)`) ויבחר `given` אקראי כלשהו, `(180-given)/2` ייצא לפעמים
  לא שלם, ו-`angleShape()` יחזיר `null` בשקט (התשובה עדיין תקינה כמספר לא-שלם, אבל
  בלי ציור) — **צריך להיות שלם תמיד**, כי גם `question.answer` עצמו חייב להיות שלם
  (בדיוק כמו כל שאלה אחרת באפליקציה — אין תמיכה בתשובה עשרונית בנושא הזה).
- **`makeFreshId` מחזיר מזהה אקראי בכל קריאה** — לא בעיה כאן (בניגוד לבדיקות
  שמניחות `id` קבוע), אבל `tests/e2e/content.spec.ts` לא רץ על שאלות שנוצרו
  ב-runtime בכלל (רק על ה-`levels`/`topicSets` הסטטיים) — כלל תוכן חדש שרוצים
  להחיל גם על שאלות מסתגלות צריך בדיקה נפרדת, בדיוק כמו לכל 11 המחוללים האחרים.

## Open Questions
None.

## Implementation Notes

נבנה כמתוכנן: `src/data/angleShape.ts` (union מסוג מבחין עם 5 `kind`, שנים-עשר תבניות
`readShape`), `src/components/AngleShape.tsx` (SVG, `switch` על `kind`), חיווט מלא
ל-`questionExplanation.ts` ול-`QuestionExplanation.tsx`, `GRADE_8_TOPICS` ו-`grade8Topics`
עם `30` שאלות (`10` לכל רמה), וסגנון ב-`App.css`. `npm run build && npm run lint`
ירוקים. הועלתה גרסה (`bump:feature`, `1.26.1 → 1.27.0`).

**אימות ידני של כל 30 השאלות מול חוקי התוכן, לפני מסירה ל-QA** — לא רק build/lint:
כתבתי סקריפט חד-פעמי (Python/Node, לא נשמר בריפו) ששיחזר את הלוגיקה המדויקת של
`angleShape.readShape`/`expectedAnswer` ושל חמשת חוקי `tests/e2e/content.spec.ts`
הרלוונטיים (שני רמזים בדיוק בלי ספרה לא-מסומנת ובלי הדלפת תשובה, אלגברה מסומנת
בפרומפט, חשבון לא בשדה הפרוזה, וחשבון שכתוב ידנית שבאמת מסתכם נכון) — והרצתי אותם על
כל `30` השאלות. כולן עברו, כולל שהדיאגרמה (`angleShape`) אכן מחזירה ערך לא-`null`
ותואם את `answer` בכל אחת מהן (אין אף שאלה בלי ציור, בניגוד לחלק מ-`more-diagrams`
במכוון — ראו architecture.md, Edge Cases). זה חשוב כי `content.spec.ts` עצמו לא רץ
כחלק מ-`build`/`lint`, ורק QA ירים אותו בפועל.

**ממצא ל-QA, לא תוקן כאן (מחוץ ל-lane של developer):** `tests/e2e/topics-all-grades.spec.ts`
מחזיק רשימת `GRADE_8_TOPICS` **כפולה**, קבועה בקוד (שורה `33`), ובודק
`.topic-card` מול האורך שלה. הוספת הנושא כאן **תפיל** את הבדיקה הזו עד שהרשימה שם
תתעדכן גם היא (הוספת `"זוויות וחפיפת משולשים"` באותו מיקום). לא נגעתי בקובץ
`tests/e2e/` — זה לא בתחום הסקיל הזה (`qa` כותב/מתקן בדיקות) — אבל זו לא הפתעה
שכדאי ש-QA יגלה בעצמו; ציון מפורש כאן.
