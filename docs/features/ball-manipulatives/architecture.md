# ויזואליזציית-כדורים — חיבור, חיסור — Architecture

## Overview
שני קבצים חדשים (data module + component), בדיוק באותו תבנית שכל ציור קיים
כבר משתמש בה (`tenFrame.ts`/`TenFrame.tsx`), עם שינוי אחד אמיתי: זו **הציור
המונפש הראשון** באפליקציה — כל ציור קיים היום (`TenFrame`, `PercentStrip`,
`RatioStrips`, `GeometryShape`, `NumberLine`, וכו') סטטי לגמרי. האנימציה
עצמה נשארת CSS בלבד (`transition` על `transform`/`fill`, לא `@keyframes` ולא
ספריית-אנימציה) — עקבי עם כל האנימציה הקיימת בבאנדל (`idle-breathe`,
`playful-pop-in`, `result-pop` — כולן CSS טהור).

## Affected Files / Components

| קובץ | שינוי |
|---|---|
| `src/data/ballDiagram.ts` **(חדש)** | גוזר `BallDiagram` מ-`Question`, מאמת מול `question.answer`, בונה caption. |
| `src/components/BallDiagram.tsx` **(חדש)** | SVG: שכבת-כדורים + toggle-מצב (`start`→`settled`) שמפעיל את ה-transition; תומך `prefers-reduced-motion`. |
| `src/data/questionExplanation.ts` **(שינוי)** | `ExplanationBundle` מקבל שדה `balls`; `buildExplanation` קורא ל-`ballDiagram(question)`; `explanationSpeechParts` מוסיף את ה-caption. |
| `src/components/QuestionExplanation.tsx` **(שינוי)** | `<figure>` חדש, אותו מקום ברשימה כמו שאר הציורים, מרנדר `<BallDiagram>` + `figcaption`. |
| `src/App.css` **(שינוי)** | מחלקות `.ball-diagram-figure`/`.ball-diagram`/`.bd-ball`/`.bd-group` חדשות; `.ball-diagram` מצטרף ל-selector ה-LTR המשותף הקיים (`.geometry-shape, .pythagoras-triangle, ...`); `.ball-diagram-figure` מצטרף לselector ה-figure-wrapper המשותף הקיים (`.geometry-figure, .pythagoras-figure, ...`). |

שום קובץ-תוכן (`grade1.ts`) לא משתנה — הציור נגזר מ-`question.prompt`/`answer`
הקיימים, לא דורש שדה חדש בשאלה.

## Data / State Changes

### `src/data/ballDiagram.ts`
```ts
export interface BallDiagram {
  op: "add" | "sub";
  a: number;
  b: number;
  result: number;      // a+b (add) or a-b (sub)
  caption: string;      // template מ-design.md, מספרים בגרשיים-אחוריים
}
export function ballDiagram(question: Question): BallDiagram | null
```
לוגיקה (אותו idiom בדיוק כמו `tenFrame.ts`'s `readShape`+bounds-check, "נכשל
בעדינות" ולא מנחש):
1. `question.style` חייב להיות `"add10"` (עם `op "+"`) או `"sub10"` (עם
   `op "-"`) — אחרת `null`. בדיקת style היא שכבת-הגנה ראשונה, לא היחידה (ראו
   Edge Cases — **הטווח המספרי האמיתי של הסטיילים האלה רחב יותר ממה שהנחנו**).
2. `bareExpression(question.prompt)` (הפרסר המשותף הקיים ב-`expression.ts`,
   אותו אחד ש-`explain.ts`/`diagnose.ts` כבר משתמשים בו — לא פרסר חדש) —
   `null` אם אין ביטוי-חשבון-גלוי (לא רלוונטי ל-add10/sub10 שהם תמיד ביטוי
   חשוף, אבל עדיין נכשל בעדינות אם זה לא המקרה).
3. **גבול חד-ספרתי מפורש**: `a`/`b` חייבים להיות שלמים, `0 ≤ a ≤ 9`,
   `0 ≤ b ≤ 9` — אחרת `null`. זו לא רק "ברירת-מחדל סבירה" כמו שspec/design
   כתבו — ראו Edge Cases, זו עכשיו עובדה מאומתת על הנתונים האמיתיים.
4. `result = op==="+" ? a+b : a-b`; חייב להיות שווה ל-`question.answer` —
   אימות-עצמי, אותו כלל שכל ציור אחר כבר מקיים. חיסור עם תוצאה שלילית נפסל
   כאן גם מבחינה לוגית (לא קורה בפועל עם `a,b` חד-ספרתיים ו-style אמיתי, אבל
   הבדיקה עדיין שם, "נכשל בעדינות" ולא מניח).
5. `caption` נבנה מהתבנית ב-design.md, לפי `op`.

### `src/data/questionExplanation.ts`
- `import { ballDiagram } from "./ballDiagram";`
- `ExplanationBundle.balls: ReturnType<typeof ballDiagram>`
- `buildExplanation`: `balls: ballDiagram(question)`
- `explanationSpeechParts`: `...(bundle.balls ? speechParts([bundle.balls.caption]) : [])`
  — נוסף באותו מיקום יחסי לשאר (אחרי `angle`, לפני `explanationToSpeechParts`),
  לא קריטי לסדר, רק קונסיסטנטי.

### `src/components/BallDiagram.tsx`
אין state חדש מעבר לרכיב עצמו: `const [phase, setPhase] = useState<"start"|"settled">("start")`,
עובר ל-`"settled"` ב-`useEffect` (מיד ב-mount, ללא delay מכוון — ה-CSS
`transition-duration` הוא מה שקובע כמה זמן זה נראה בתנועה, לא timer ב-JS).
אם `prefers-reduced-motion` פעיל, הרכיב **לא** עובר דרך ה-state הזה בכלל —
הוא מרנדר ענף אחר לגמרי (ראו Technical Approach).

## Technical Approach

### הפריסה הגיאומטרית — "המצב-הסופי הוא הבסיס, המצב-ההתחלתי הוא transform מעליו"
בשני המקרים (חיבור/חיסור), ה-`viewBox` וכל קואורדינטת-`cx`/`cy` של כל כדור
מחושבים **פעם אחת**, לפי המצב-הסופי (המאוחד בחיבור, המפוצל בחיסור) — בדיוק
כמו `tenFrame.ts`'s `gridCells` (שורות של עד 5, אותו `CELL`/`DOT_R` בסדר-גודל).
אין צורך בשני viewBox-ים שונים ובלי בעיית-רוחב בין המצבים (המצב-הסופי הוא
התמיד ה"גדול ביותר" — ראו Risks). המצב-ההתחלתי מושג **לא** על ידי קואורדינטות
שונות, אלא על ידי `transform: translate(dx, 0)` שמופעל רק על קבוצת-הכדורים
שצריכה "להיראות" מרוחקת:
- **חיבור**: הכדורים מחולקים ל-`groupA` (ה-`a` הראשונים, תמיד ב-`cx/cy`
  הסופיים שלהם, בלי transform, מלאים מההתחלה) ו-`groupB` (ה-`b` האחרונים).
  `groupB` עטוף ב-`<g>` עם `transform: translate(+offset, 0)` במצב `"start"`
  (מרוחק ימינה, "ערימה נפרדת") ו-`translate(0,0)` במצב `"settled"`; הכדורים
  שבתוכו גם עוברים מחלקת `.bd-ball` (מוקווקו) ל-`.bd-ball.filled` במעבר בין
  המצבים. CSS `transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
  fill 0.5s cubic-bezier(0.22, 1, 0.36, 1)` על ה-`<g>`/הכדורים בתוכו.
- **חיסור**: הכדורים מחולקים ל-`remaining` (ה-`a-b` הראשונים, בלי transform
  בכלל — הם לא זזים בשום שלב) ו-`removed` (ה-`b` האחרונים). `removed` עטוף
  ב-`<g>` עם `transform: translate(0,0)` במצב `"start"` (צמוד ל-remaining,
  "ערימה אחת") ו-`translate(+offset, 0)` במצב `"settled"` (זז הצידה); הכדורים
  בתוכו עוברים `.bd-ball.filled` → `.bd-ball` (ממלא למוקווקו) במעבר.
- `offset` קבוע פר-דיאגרמה, בסביבות `CELL * 1.75` — מרחק שברור-לעין בלי
  לדרוש viewBox גדול בהרבה מהמצב-הסופי.
- פונקציית-עזר אחת, `gridCells(count)`, מחושבת פעם אחת ומחולקת ל-2 תתי-מערכים
  (`slice`) — לא שני מחוללי-רשת נפרדים.

### המעבר בין המצבים
- `useEffect(() => { const id = requestAnimationFrame(() => setPhase("settled")); return () => cancelAnimationFrame(id); }, [])`
  — פריים אחד אחרי ה-mount הראשוני, כך שהדפדפן מצייר את מצב `"start"` לפני
  שה-transition מתחיל (בלי זה, React עשוי "לדלג" ישר למצב הסופי בלי שה-CSS
  transition בכלל נרשם כ-שינוי-אמיתי).
- אין טיימר/לופ נוסף, אין "replay" — המצב `"settled"` הוא סופי וקבוע לכל
  חיי ה-component (תואם design.md: "אין כפתור הצג-שוב").

### `prefers-reduced-motion`
נבדק **ב-JS**, לא רק ב-CSS (חובה — design.md דורש **שתי תמונות סטטיות שונות**
במצב מופחת-תנועה, לא "קיצור-דרך-מיידי" לתמונה אחת; CSS `transition: none`
לבדו לא היה מספיק כי הוא פשוט "מדלג" ישר למצב `settled` ולא מציג את `start`
בכלל):
```ts
const reduced = typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
```
נקרא **פעם אחת** (לא subscription חי — שום מקום אחר בבאנדל לא עוקב אחרי
שינוי-באמצע-session של ההגדרה הזו, אותה רמת-פשטות). אם `true`: הרכיב מרנדר
את **אותה** פונקציית-ציור פעמיים, בלי toggle — פעם עם `phase="start"` (כיתוב
"לפני" מעליה) ופעם עם `phase="settled"` (כיתוב "אחרי" מעליה), בעמודה (`flex-
direction: column`), בלי שום `transition`/`useEffect`.

### CSS (`src/App.css`)
- `.bd-ball { fill: none; stroke: var(--text-h); stroke-width: 1.5; transition: fill 0.5s cubic-bezier(0.22, 1, 0.36, 1); }`
- `.bd-ball.filled { fill: #c4b5fd; }` — **אותו** צבע-מילוי כמו `tf-dot.filled`/
  `gs-filled`/`ps-filled`/`rs-block.rs-filled` — לא גוון חדש, המשכיות-צבע
  מכוונת.
- `.bd-group { transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1); }`
- `.ball-diagram` מתווסף ל-selector המשותף: `.geometry-shape, .pythagoras-
  triangle, .percent-strip, .ratio-strips, .linear-graph, .angle-shape,
  .ball-diagram { direction: ltr; max-width: 100%; height: auto; }` —
  **הצטרפות ל-selector קיים, לא כלל נפרד** (עקבי עם איך `TenFrame`/`NumberLine`
  כבר בנויים).
- `overflow: visible` על ה-`<svg>` עצמו (inline, לא class חדש) — כדי שה-offset
  של `groupB`/`removed` ב-transform לא יקטע חלקית על-ידי viewBox; זה דורש
  שה-`<figure>` העוטף ישאיר רווח אופקי (כבר קיים ב-`.geometry-figure, ...`
  המשותף — `display:flex; flex-direction:column; align-items:center;` כבר
  ממרכז, לא דוחק לקצה).
- `@media (prefers-reduced-motion: reduce) { .bd-ball, .bd-group { transition: none !important; } }`
  מתווסף לאחד משלושת ה-blocks הקיימים ב-App.css (שורות ~811/946/1616) כ-הגנה
  כפולה (belt-and-suspenders) — לא התלות העיקרית (ה-branch ב-JS הוא העיקרי,
  ראו מעלה), אבל עקבי עם איך כל שאר האפליקציה מגינה כפול.

## Edge Cases
- **התגלה בפועל, לא ניחוש**: סטייל `add10`/`sub10` ב-`grade1.ts` כולל שאלות
  עם אופרנד דו-ספרתי (למשל `"10 + 8"`, `"15 + 2"`, `"18 − 9"`, `"20 − 13"`) —
  לא רק את הדוגמאות החד-ספרתיות שה-product-spec/design.md נתנו כמייצגות. שם
  ה-style לבדו **אינו** מבטיח "יחידות בלבד". `ballDiagram` חוסם את אלה
  במפורש בבדיקת-הגבול `0 ≤ a,b ≤ 9` (סעיף 3 למעלה) — בדיוק אותו idiom שכבר
  קיים ב-`tenFrame.ts` (`whole < 10 || whole > 19` נכשל). **זו לא רגרסיה
  ולא פרצה** — זו המימוש הנכון של "יחידות בלבד" שה-product-spec/design.md
  כבר דרשו, רק שהדרך לאמת אותה היא בדיקת-מספרים ולא בדיקת-style. מי שעובד
  על זה בעתיד לא צריך "לתקן" את זה כדי שגם `"15 + 2"` יקבל ציור-כדורים — זה
  בכוונה.
- `a === 0` או `b === 0` (`"2 + 0"`, `"5 − 0"` קיימים בנתונים): מתרנדר תקין —
  קבוצה ריקה (0 כדורים) שלא עושה כלום ויזואלית; לא caseה מיוחד, לא crash.
  לא "מעניין" לצפייה אבל לא שגוי.
- חיסור עם תוצאה שלילית: לא קורה בפועל (self-verification כבר חוסם — התוצאה
  חייבת להתאים ל-`question.answer` שהוא תמיד ≥0 בסטייל הזה), אבל הבדיקה
  המפורשת נשארת כרשת-ביטחון, לא מניחה.
- שאלה שה-style שלה הוא `add10`/`sub10` אבל ה-prompt אינו ביטוי-בר (לא קורה
  היום בנתונים, אבל `bareExpression` מחזיר `null` ומכסה את זה אוטומטית).
- `prefers-reduced-motion` באמצע-session (המשתמש/ת משנה את הגדרת המערכת כשה
  פאנל כבר פתוח): לא נתפס (הערך נקרא פעם אחת ב-mount) — עקבי עם שאר האפליקציה,
  לא caseה חדש.

## Risks / Tradeoffs
- **ראשון-מונפש באפליקציה** — אין תקדים-קוד-ישיר להעתיק (רק תקדים-CSS מהחיים
  האחרים של האפליקציה: `idle-breathe`/`playful-pop-in`/`result-pop`, שכולם
  CSS-only). הבחירה המודעת: `transition` על `transform`/`fill` (לא
  `@keyframes`, לא ספרייה) — מספיק לתנועה דו-מצבית אחת (start→settled), ו
  -עקבי עם כל האנימציה הקיימת. לא נבנה abstraction כללי ל"ציור מונפש" — אם
  ציור-מונפש שני יצטרך את זה (קלפים/בדידים, Out of Scope כרגע), השכבה
  המשותפת תיחשב אז, לא מראש (YAGNI, תואם את קצב-הבנייה ההדרגתי הקיים
  בפרויקט).
- `overflow: visible` על ה-SVG אומר שכדורים בתנועה (groupB בחיבור,
  `removed` בחיסור) יכולים זמנית "לבלוט" מעבר ל-`viewBox` המוצהר. ה-offset
  נבחר קטן בכוונה (`CELL * 1.75`, לא קפיצה גדולה) כדי שזה יישאר בתוך
  המרחב-האופקי שה-`figure` המשותף כבר נותן (`align-items: center` +
  רוחב-מקסימלי-280-320px מה-design) — לא בדוק מול דפדפן אמיתי בשלב הארכיטקטורה
  הזה; developer מאמת בפועל (QA מכוון לבדוק ספירת-כדורים, לא פיקסלים).
- בדיקת-`prefers-reduced-motion` חד-פעמית ב-JS (לא live) — זהה לכל שאר
  האפליקציה, לא כשל חדש, אבל כדאי ש-QA יכתוב בדיקה אחת עם
  `page.emulateMedia({ reducedMotion: "reduce" })` (ה-API הקיים של Playwright)
  ולא ינסה לדמות שינוי-באמצע.
- **לבדיקות e2e**: ספירת-כדורים (`.bd-ball` / `.bd-ball.filled` / `.bd-ball:not(.filled)`)
  נכונה **מהרגע הראשון שה-DOM קיים**, בלי קשר לשלב-האנימציה — הטרנספורם/הצבע
  משתנים חזותית, אבל מספר-האלמנטים לא. QA לא צריך לחכות לסיום-אנימציה כדי
  לספור כדורים; רק בדיקה שבודקת מיקום/transform בפועל תצטרך
  `emulateMedia({ reducedMotion: "reduce" })` או המתנה ל-class `settled`
  (לא קיימת class כזו על ה-DOM החוצה — השלב הוא state פנימי בלבד; אם QA
  צריך הוק-בדיקה חיצוני, זו תהיה תוספת-developer, לא בהיקף ה-architecture
  הזו כברירת-מחדל כי ה-AC של ה-product-spec לא דורש בדיקת-תזמון-פיקסלים).

## Open Questions
None.
