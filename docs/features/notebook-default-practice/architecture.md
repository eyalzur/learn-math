# מחברת כמצב התרגול היחיד — Architecture

## Overview
`Practice.tsx` ו-`PracticeNotebook.tsx` מפסיקים להיות שני מסכים שמתחלפים
(`notebookOpen` boolean) והופכים להרכבה אחת: `Practice.tsx` ממשיך להחזיק את כל
מכונת המצבים של התרגול (כמו היום), ו-`PracticeNotebook` מצטמצם לרכיב "משטח
כתיבה גנרי" בלי ידע על נכון/שגוי — מקבל `locked` ו-`primaryAction` כ-props
במקום להחזיק בעצמו את הלוגיקה של שליחה למורה. השרת (`/read-page`) מקבל קלט
נוסף — הטקסט של השאלה שהוצגה לתלמיד/ה (בלי התשובה!) — ומחזיר, במקום שתי
מחרוזות תמלול גולמיות, שלושה שדות: שיקוף תהליך, הצבעת טעות אופציונלית, ותשובה
סופית **מספרית** מוכנה להזנה ישירה ל-`Number(x) === question.answer` /
`diagnose()` הקיימים, בלי שינוי בהם.

**עודכן בסבב רוויזיה א׳ (2026-09-01):** משטח הכתיבה עובר מגובה קבוע
(`height: min(60vh, 620px)`) למילוי הגובה הפנוי בפועל (flexbox, לא JS
שמודד גבהים), וכפתור "⤢" הופך מהתאמת-זום-בתוך-תיבה לטוגל מסך-מלא אמיתי
שמגדיל את `.notebook-screen` עצמו ל-`position:fixed;inset:0` — בדיוק המנגנון
שכבר היה קיים ונבדק בפיצ'ר `practice-notebook` המקורי, לפני שהתמזג לגובה קבוע
בפיצ'ר הזה. ראו הרחבה בכל סעיף למטה.

## Affected Files / Components

**לקוח — משתנה:**
- `src/components/Practice.tsx` — השינוי המרכזי:
  - מוסרים: `input`, `notebookOpen`, `checkAnswer()`, שדה ה-`<input>` בתוך
    `.problem-box`, וה-`if (notebookOpen) return <PracticeNotebook .../>` שמחליף
    את כל המסך.
  - `<PracticeNotebook>` מוצג **תמיד** (לא מותנה), מתחת לפס השאלה, עם `locked`
    ו-`primaryAction` חדשים (ראו למטה) ו-`onPagesChange`/`onCurrentPageIndexChange`
    הקיימים ללא שינוי.
  - נוספים: `sendState: "idle" | "sending" | "error"` (עולה מ-`PracticeNotebook`,
    ראו Data/State Changes), `uncertain: boolean`, `teacherNote: { reflection:
    string; errorPointer?: string } | null`.
  - נוספת `handleTeacherReading(reading: PageReading)` — **מחליפה** את
    `checkAnswer()` הרעיונית: על `certain: true` עושה בדיוק את מה ש-`checkAnswer`
    עושה היום, רק עם `reading.finalAnswer` במקום `Number(input)` — כולל
    `setFeedback`, `onAnswered`, הפעלת הספירה-לאחור, ו-`setDiagnosis(diagnose(question,
    reading.finalAnswer))`. גם ממלאת `teacherNote`. על `certain: false` — קובעת
    `uncertain = true` ולא נוגעת ב-`feedback`/`diagnosis` בכלל (אין תשובה
    לבדוק).
  - `sendToTeacher()` (הלוגיקה של קריאה ל-`readPageWithTeacher`, כולל
    `sendState`) **עוברת לכאן** מ-`PracticeNotebook` — ראו נימוק ב-Technical
    Approach.
  - `next()` מתרחב: בנוסף לאיפוס הקיים, מוסיף דף חדש וריק ומתקדם אליו (ראו
    Technical Approach, "דף חדש לכל שאלה") — אלא אם הגיעו ל-`MAX_PAGES` (ראו
    Edge Cases).
- `src/components/PracticeNotebook.tsx`:
  - מוסר לגמרי: `sendState`, `teacherResult`, `sendToTeacher`, `toggleTeacherSpeech`,
    `teacherSpeaking`, כל בלוק `notebook-confirm-backdrop`/`notebook-image-dialog`
    (הדיאלוג עם התמונה), וה-prop `onClose` (אין יותר "לסגור בחזרה למסך שאלה" —
    אין מסך שאלה נפרד).
  - `notebook-topbar` מצטמצם: נשארים רק מחוון הדף (`דף X מתוך Y`) ואחוז הזום;
    "← חזרה לתרגול" מוסר — הכפתור "← חזרה" של `Practice.tsx` כבר עושה את זה
    למסך המשולב כולו.
  - `notebook-toolbar` — כפתור "שלח למורה" (`notebook-send-btn`) מוחלף בסלוט
    פרופ-driven יחיד: מקבל `primaryAction: { label: string; onClick: () =>
    void; disabled: boolean }` ומרנדר כפתור אחד לפיו. `PracticeNotebook` לא
    יודע יותר מה המשמעות של הכפתור (שליחה? הבא?) — זו אחריות `Practice.tsx`.
  - נוסף prop `locked: boolean`: כש-`true`, `handlePointerDown`/`handlePointerMove`
    לא מציירים (ה-canvas עצמו עדיין מגיב לזום/pan דרך מגע-שתי-אצבעות ולניווט
    דפים — רק ציור/מחיקה בפועל ננעלים). מקביל בדיוק ל-`disabled={feedback !==
    null}` שהיה על שדה הקלט הישן.
- `src/lib/notebookServer.ts` — `readPageWithTeacher(page, expectedPrompt: string)`
  מקבל פרמטר שני; `PageReading`/`TeacherReading` מוחלפים (ראו Data/State
  Changes) — זה **שינוי שובר** לחוזה שהוגדר ב-`PR #60`, לא תוספת: השדות הישנים
  (`question`/`answer` הגולמיים, `imageDataUrl`) לא נחוצים יותר לאף מסך (ראו
  Risks).
- `src/App.css` — פריסת הפס העליון הקבוע (שאלה + הקראה + רמז) מעל משטח הכתיבה
  שגובהו מצטמצם בהתאם; class חדש לפסקת "מה המורה הבינה" (עיצוב דומה ל-`.diagnosis`/
  `.hint` הקיימים — לא ממציא שפה ויזואלית חדשה).

**שרת — משתנה:**
- `server/src/pageReading.ts` — `PageReadingSchema`/`PageReading` מוחלפים
  (ראו Data/State Changes).
- `server/src/readPage.ts` — חתימה חדשה `readPage(pngBuffer, expectedPrompt:
  string)`; `TEACHER_SYSTEM_PROMPT` נכתב מחדש (ראו Technical Approach); בקשת
  ה-Claude מקבלת בלוק טקסט נוסף עם `expectedPrompt`.
- `server/src/index.ts` — `validateRequest` דורש גם `expectedPrompt: string`
  לא ריק; `handleReadPage` מעביר אותו ל-`readPage`; **אינו** מחזיר יותר
  `imageDataUrl` בתשובת `/read-page` (ראו Risks) — עדיין מחשב את ה-buffer
  פנימית (`renderMatrix`) כי זה הקלט הנדרש ל-Claude, פשוט לא שולח אותו חזרה.
  `/render-page` הקיים **לא משתנה כלל**.

**לא נוגעים בהם, לתשומת לב:**
- `src/data/diagnose.ts`, `src/components/QuestionExplanation.tsx`,
  `src/data/questionExplanation.ts` — משתמשים בהם בדיוק כמו היום, רק שהקלט
  ל-`diagnose()` מגיע ממקור אחר (`reading.finalAnswer` במקום `Number(input)`).
- `src/data/notebook.ts` (`createBlankPage`, `MAX_PAGES`, `pageHasContent`) —
  ללא שינוי; נעשה בהם שימוש נוסף (ראו Technical Approach) אבל לא משתנה
  ההגדרה שלהם.

**עודכן בסבב רוויזיה א׳ (2026-09-01):**
- `src/App.css` — `.notebook-screen` עובר מ-`height: min(60vh, 620px)` למילוי
  הגובה הפנוי דרך flexbox (ראו Technical Approach); class חדש (למשל
  `.notebook-screen.fullscreen`) שהופך אותו ל-`position:fixed;inset:0` כשמצב
  מסך-מלא פעיל; class/style חדשים לפס העליון המצומצם (יציאה + שאלה) שמוצג רק
  במסך מלא.
- `src/components/Practice.tsx` — state חדש `fullscreen: boolean`; `useEffect`
  שיוצא ממסך מלא אוטומטית כש-`feedback` הופך ל-not-null; מרנדר את הפס העליון
  הרגיל **או** את הפס המצומצם (תלוי ב-`fullscreen`), ומעביר `fullscreen`
  ו-`onToggleFullscreen` ל-`PracticeNotebook`.
- `src/components/PracticeNotebook.tsx` — `fitToScreen()` (כבר קיים) הופך
  להיקרא גם ב-toggle של מסך מלא (לא רק בלחיצה על ⤢ כמו היום), כדי שהזום יתאים
  את עצמו לגודל התיבה **החדש**; מקבל שני props חדשים (`fullscreen`,
  `onToggleFullscreen`) ומקבל `topSlot: ReactNode` חדש (ראו Technical Approach)
  להצגת תוכן הפס המצומצם בלי לדעת מה זה.

## Data / State Changes

**חוזה `/read-page` — בקשה (משתנה):**
```ts
{ cols, rows, cell, filledCells, expectedPrompt: string }
```
`expectedPrompt` הוא `question.prompt` כפי שכבר מוצג לתלמיד/ה על המסך (למשל
`"3(x + 2) = 15"`, או משפט בעברית לבעיה מילולית) — **בלי** `question.answer`.
זו נקודה עקרונית: המורה מקבלת הקשר על *מה נשאל*, לא על *מה התשובה הנכונה*,
כדי שלא תוכל לשפוט/לתקן מול תשובת-אמת — בדיוק ההפרדה שכבר קיימת ב-`PR #60` בין
"קוראת" ל"שופטת", רק עכשיו עם הקשר טוב יותר לקריאה עצמה.

**חוזה `/read-page` — תשובה (משתנה, שובר):**
```ts
export const PageReadingSchema = z.object({
  certain: z.boolean(),
  processReflection: z.string().optional(),
  errorPointer: z.string().optional(),
  finalAnswer: z.number().optional(),
});

export type PageReading =
  | { certain: true; processReflection: string; errorPointer?: string; finalAnswer: number }
  | { certain: false };

interface ReadPageResponse {
  reading: PageReading; // imageDataUrl הוסר — ראו Risks
}
```
`processReflection`/`errorPointer` הם משפטים עבריים חופשיים **עם ביטויים
חשבוניים מסומנים בגרשיים אחוריים** (`` `7 + 5` ``) — **חוזרים** למוסכמה הכללית
של הפרויקט (`segmented()`/`speechParts()`), ולא לגישת ה-wrap-ישיר-ב-`.prompt-math`
שנבחרה ב-`PR #60`: שם השדות היו תמיד ביטוי חשבוני טהור בלבד (לא היה מה לפרק),
כאן הם משפטים מעורבים לגמרי — בדיוק המקרה שהמוסכמה הכללית קיימת בשבילו (ראו גם
`diagnose.ts`, שכל הכותרות שלו כתובות באותה צורה). `finalAnswer` הוא `number`
**ממש** (לא מחרוזת) — ראו Technical Approach לנימוק.

**State חדש/משתנה ב-`Practice.tsx`:**
```ts
const [sendState, setSendState] = useState<"idle" | "sending" | "error">("idle");
const [uncertain, setUncertain] = useState(false);
const [teacherNote, setTeacherNote] =
  useState<{ reflection: string; errorPointer?: string } | null>(null);
// input, notebookOpen — מוסרים
```

**Props חדשים ב-`PracticeNotebookProps`:**
```ts
interface PracticeNotebookProps {
  pages, currentPageIndex, onPagesChange, onCurrentPageIndexChange; // ללא שינוי
  locked: boolean;
  primaryAction: { label: string; onClick: () => void; disabled: boolean };
  // onClose — מוסר
}
```

**עודכן בסבב רוויזיה א׳ — `PracticeNotebookProps` מתרחב:**
```ts
interface PracticeNotebookProps {
  pages, currentPageIndex, onPagesChange, onCurrentPageIndexChange, locked, primaryAction; // ללא שינוי
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  /** מה שמוצג בפס העליון המצומצם כשמסך מלא פעיל — Practice.tsx מרכיב את זה
   *  (שאלה + כפתור הקראה), PracticeNotebook רק מרנדר את מה שקיבל, בלי לדעת
   *  מה זה — אותה הפרדה שכבר קיימת בין primaryAction לבין מי שמפרש אותו. */
  topSlot: ReactNode;
}
```
**State חדש ב-`Practice.tsx`:**
```ts
const [fullscreen, setFullscreen] = useState(false);
```

**מיזוג המסכים.** `Practice.tsx` מרנדר תמיד (לא מותנה) את הפס העליון (כותרת,
התקדמות, השאלה עם 🔊, כפתור רמז/רמזים) ומתחתיו `<PracticeNotebook>`. אין יותר
ענף `if (notebookOpen) return ...` — המצב היחיד שמשתנה חזותית הוא `locked`.

**מדוע `sendToTeacher`/`sendState` עוברים ל-`Practice.tsx`.** התוצאה של הקריאה
למורה חייבת להזין את מכונת המצבים של `Practice.tsx` (`feedback`, `diagnosis`,
`onAnswered`, הספירה-לאחור) — אם הלוגיקה נשארת בתוך `PracticeNotebook`, שני
הרכיבים צריכים "לדבר" דרך callback ממילא, ואז `PracticeNotebook` מחזיק חצי
ממכונת מצב שהחצי השני שלה יושב במקום אחר. העברת כל "מה עושים עם תוצאת הקריאה"
ל-`Practice.tsx` (כמו ש-`checkAnswer` כבר עושה היום) משאירה את `PracticeNotebook`
כרכיב גנרי ("משטח כתיבה + סלוט פעולה אחד") בלי שום ידע על נכון/שגוי/אבחון —
בדיוק ההפרדה שכבר קיימת בפרויקט בין `buildExplanation` (טהור) ל-`QuestionExplanation`
(תצוגה).

**`primaryAction` בכל שלב:**
- כתיבה רגילה (`sendState==="idle"`, יש תוכן בדף): `{ label: "שלח למורה",
  onClick: sendToTeacher, disabled: !pageHasContent(currentPage) }`.
- ממתינים (`sendState==="sending"`): `{ label: "המורה קוראת...", onClick:
  noop, disabled: true }`.
- אחרי תשובה (`feedback !== null`): `{ label: isLast ? "סיום" : "הבא",
  onClick: next, disabled: false }` — **אותו כפתור, במקום** ולא כפתור נוסף
  לצידו; זה בדיוק מה שהיה `<div className="actions">` הנפרד ב-`Practice.tsx`
  היום, עכשיו מוזז לתוך סרגל הכלים של המחברת (ראו design.md, מצב D).

**`handleTeacherReading` — הלוגיקה שמחליפה את `checkAnswer`:**
```ts
function handleTeacherReading(reading: PageReading) {
  if (!reading.certain) {
    setUncertain(true);
    return; // אין תשובה לבדוק; אין feedback/diagnosis
  }
  setUncertain(false);
  setTeacherNote({ reflection: reading.processReflection, errorPointer: reading.errorPointer });
  const isCorrect = reading.finalAnswer === question.answer;
  setFeedback(isCorrect ? "correct" : "wrong");
  onAnswered?.(isCorrect);
  if (isCorrect) { if (!isLast) setSecondsLeft(COUNTDOWN_SECONDS); }
  else setDiagnosis(diagnose(question, reading.finalAnswer));
}
```
זהה מבנית ל-`checkAnswer` של היום, עם `reading.finalAnswer` בכל מקום שהיה
`Number(input)`. `uncertain` מתאפס גם בתחילת כל `sendToTeacher()` חדש (כדי
ששורת האי-ודאות לא תישאר על המסך אחרי ניסיון הבא).

**"מי הופך `answer` למספר" — הוכרע: המודל עצמו, דרך הסכימה.** ה-`PageReadingSchema`
מגדיר `finalAnswer: z.number()` ישירות (לא `z.string()` שדורש פרסור בהמשך).
הנימוק: כתב-יד עשוי לכלול צורות שקשה לפרסר באמינות בקוד יד (`"x = 9"`, שבר
כתוב כ-`"3/4"`, מינוס לפני המספר, פסיק עשרוני) — ל-Claude יש כבר את כל ההקשר
(את `expectedPrompt`, ואת מה שהוא עצמו "קרא" בתהליך) כדי להפיק את הערך המספרי
הנכון ישירות, בלי שכבת פרסור נפרדת שצריכה לכסות את כל הצורות האלה בנפרד. שרת
ולקוח לא עושים שום פרסור טקסט למספר בפיצ'ר הזה.

**מתי `certain: false`.** מתרחב מהיום (כתב לא ברור/דף כמעט ריק/יותר מפתרון
אחד) לכלול גם: **המודל לא הצליח לזקק תשובה סופית מספרית ברורה מהכתוב** (למשל
תהליך חלקי בלי שורת סיכום, או כמה תשובות סופיות סותרות). זו לא קטגוריית כשל
שלישית נפרדת — בדיוק כמו היום, `certain: true` דורש שכל השדות הנדרשים
(`processReflection`, `finalAnswer`) קיימים; אחרת `certain: false`, ללא הבחנה
כלפי הלקוח בין "לא קראתי את הכתב" ל"קראתי אבל אין תשובה סופית ברורה" — שתיהן
אותה חוויית "אי אפשר עדיין לתת משוב, כתבו שוב" מבחינת התלמיד/ה.

**פרומפט המערכת (`readPage.ts`), השינוי המהותי מ-`PR #60`:**
```
אתם "המורה" — קוראים דף עבודה כתוב ביד ממחברת תרגול חשבון. התלמיד/ה עבד/ה על
התרגיל: {expectedPrompt}. תפקידכם לדווח מה נעשה בדף, לא לפתור את התרגיל
בעצמכם ולא לקבוע אם התשובה הסופית נכונה — אין לכם את התשובה הנכונה, ואתם לא
צריכים אותה.

דווחו:
1. processReflection — משפט קצר אחד בעברית פשוטה שמתאר מה התלמיד/ה עשה/תה,
   כאילו אתם מסבירים למישהו שלא ראה את הדף. סמנו כל ביטוי חשבוני בגרשיים
   אחוריים, למשל: "ראיתי שחישבת `7 + 5` וקיבלת `12`."
2. errorPointer — **רק אם** אתם רואים שלב בתהליך הכתוב שאינו עקבי עם השלב
   שלפניו (למשל: שורה לא נובעת חשבונית מהשורה הקודמת, פעולה שהוחסרה) — משפט
   קצר שמצביע *איפה* זה קרה, לא מה התוצאה הנכונה הייתה צריכה להיות. אם התהליך
   עקבי מתחילתו ועד סופו — השמיטו שדה זה לגמרי, אל תמציאו טעות.
3. finalAnswer — התשובה הסופית שהתלמיד/ה כתב/ה, כמספר בלבד.

אם כתב היד אינו קריא, יש יותר מפתרון אחד, הדף כמעט ריק, או שאין שורת תשובה
סופית ברורה — אל תנחשו. החזירו certain: false בלבד.
```
ה-`errorPointer` נבדק **מול עקביות פנימית של השלבים הכתובים בלבד** — לא מול
תשובת-אמת שהמודל לא מקבל בכלל. זו ההבחנה שמקיימת את דרישת המפרט "המורה לא
שופטת/פותרת": יש הבדל בין "השלב הזה לא נובע מהקודם" (תצפית על מה שנכתב) לבין
"התשובה הסופית שגויה" (שיפוט מול תשובה נכונה) — רק הראשון נמצא כאן.

**עודכן בסבב רוויזיה א׳ — מילוי גובה כברירת מחדל.** `.practice` הופך
ל-flex container אנכי: `display: flex; flex-direction: column; min-height: 100vh;
min-height: 100dvh;` (ה-`100vh` הרגיל נשאר כ-fallback לדפדפנים בלי תמיכה ב-`dvh`,
לא מוסר — הכלל בפרויקט הוא progressive enhancement, לא replacement). בתוכו,
`.notebook-screen` עובר מ-`height: min(60vh, 620px)` ל-`flex: 1 1 auto; min-height:
360px;`. משמעות ה-`flex: 1 1 auto`: התיבה גדלה ומתכווצת כדי למלא כל מה שנשאר
מתחת ל-`.practice-header`/כותרת/שאלה/רמז (שנשארים בגודלם הטבעי, לא flex), בלי
צורך במדידת גבהים ב-JS. ה-`min-height: 360px` הוא רצפה: במצב D (אחרי מענה),
כשמתווספות פסקת המורה/feedback/הסבר מתחת לתיבה, יכול לא להישאר מספיק גובה
פנוי לתיבה בלי לדחוק אותה מתחת לרצפה הזו — במקרה כזה `.practice` עצמו גדל
מעבר לגובה ה-viewport והעמוד נגלל כרגיל (בדיוק כמו היום; אין כאן שינוי
התנהגות, `.practice` כבר לא היה גובה-קבוע). ברגע שמענה חדש נשלח ל"דף חדש" ומצב
D נעלם (`next()`), `.notebook-screen` חוזר לתפוס את כל הפנוי, ללא קפיצה
מיוחדת — flexbox מחשב את זה מחדש בכל רינדור.

**עודכן בסבב רוויזיה א׳ — מנגנון מסך מלא: `position:fixed;inset:0`, לא
Fullscreen API.** כש-`fullscreen === true`, `.notebook-screen` מקבל class נוסף
(`.notebook-screen.fullscreen`) שמגדיר `position: fixed; inset: 0; z-index: <מעל
שאר העמוד>; min-height: 0;` (ה-`min-height: 360px` הרגיל לא רלוונטי כאן — הקופסה
כבר תופסת את כל המסך). זו **בדיוק** אותה טכניקה שהמנגנון `position:fixed;inset:0`
כבר השתמש בו בפיצ'ר `practice-notebook` המקורי (לפני שהתמזג להטמעה בתוך
`.practice` בפיצ'ר הזה) — קוד ידוע, נבדק, לא ניסוי חדש. **הכרעה מפורשת נגד**
Fullscreen API האמיתי של הדפדפן (`element.requestFullscreen()`): (1) התנהגות לא
אחידה ב-iOS Safari, כולל מקרים שבהם הוא נכשל בשקט; (2) דורש user gesture חדש בכל
קריאה, מה שמסבך auto-exit תכנותי (המפרט דורש יציאה אוטומטית ממסך מלא כש-`feedback`
הופך ל-not-null — פעולה שאינה gesture של המשתמש, ו-Fullscreen API לא מבטיח
שתצליח לצאת בלי אינטראקציה נוספת בכל דפדפן); (3) `:fullscreen` pseudo-class ו-
`fullscreenchange` events מוסיפים משטח קוד/בדיקות חדש לגמרי, מול הרחבה של מנגנון
קיים. `position:fixed;inset:0` גם פותר בחינם את מקרה סיבוב הטלפון לרוחב (ראו
Edge Cases) — `inset:0` תמיד ממלא את ה-viewport הנוכחי, איזה כיוון שלא יהיה,
בלי קוד ייעודי.

**רענון ה-fit-transform בכל טוגל.** `PracticeNotebook` קורא `computeFitTransform`
(לא רק `applyTransform`) גם בכניסה למסך מלא וגם ביציאה ממנו — לא רק ב-mount
הראשוני כמו היום. הסיבה: הכניסה/יציאה משנה את גודל הפיקסלים בפועל של
`.notebook-stage` (מ-`min-height:360px`-ish לכל המסך ובחזרה), אז קנה המידה
שהתאים לגודל הקודם כבר שגוי לגודל החדש. הרצה מתבצעת אחרי הרינדור (ב-`useEffect`
שתלוי ב-`fullscreen`, קורא `getBoundingClientRect()` על ה-stage אחרי שה-CSS
class כבר הוחל) — אותו דפוס בדיוק כמו ה-`useEffect` הקיים שרץ ב-mount.

**דף חדש לכל שאלה.** `next()` מוסיף `createBlankPage()` ומקדם את `currentPageIndex`
אליו — בדיוק כאילו התלמיד/ה לחצ/ה בעצמו/ה "+ דף חדש". דפים קודמים (כולל
הבדוקים) נשארים בערימה ונגישים לדפדוף, לא נמחקים. זו הכרעה טכנית (design.md
השאיר פתוח): "דף אחד = שאלה אחת" תואם את המטאפורה הפיזית ומונע מצב שבו דף ישן
ונעול נשאר "הדף הנוכחי" בטעות כששאלה חדשה נטענת.

## Edge Cases
- **הגעה ל-`MAX_PAGES` (20) בדיוק ברגע ש-`next()` רוצה להוסיף דף.** לא זורקים
  שגיאה ולא חורגים מהמגבלה: `next()` בודק `pages.length >= MAX_PAGES` ולו כן —
  **לא** מוסיף דף חדש, במקום זאת רק מנקה (`clearCurrentPage`-שקול, לא מוחק את
  הדף עצמו) את הדף האחרון הקיים ומשתמש בו לשאלה הבאה. תרגול בודד שעובר 20
  שאלות הוא נדיר (רוב השיעורים/רמות קצרים בהרבה) — זו רשת ביטחון, לא הזרימה
  הצפויה.
- **דף ריק בזמן לחיצה על "שלח למורה".** לא אמור לקרות — `primaryAction.disabled`
  כבר חוסם את זה (כמו `canSendToTeacher` היום) — אבל אם קורה בכל זאת (מרוץ
  בין ניקוי הדף ללחיצה), השרת עדיין מטפל בזה בלי לקרוא ל-Claude (`filledCells.length
  === 0` → `certain: false` מיידי, כמו היום).
- **`certain: true` אבל `processReflection`/`finalAnswer` חסרים** (חוסר עקביות
  תיאורטי בפלט המודל למרות הסכימה) — מטופל כ-`certain: false`, בדיוק כמו הבדיקה
  ב-`PR #60` (`parsed.question && parsed.answer`), עכשיו על השדות החדשים.
- **`errorPointer` קיים אבל התשובה הסופית בכל זאת יצאה נכונה** (טעות בדרך
  שתוקנה בהמשך, או שלא השפיעה על התוצאה) — מוצג בכל מקרה, בלי תלות בתוצאת
  הבדיקה המקומית: פסקת המורה היא תצפית על התהליך, עצמאית מהשורה "נכון
  מאוד"/"לא נכון" שמופיעה מתחתיה.
- **ניווט לדף קודם בזמן `locked === true`.** מותר (ראו design.md) — `locked`
  חוסם רק ציור/מחיקה על ה-canvas הנוכחי, לא את `onCurrentPageIndexChange`.
- **בעיה מילולית עם ביטוי חשבוני מסומן בגרשיים אחוריים בתוך `question.prompt`**
  (`promptSegments` הקיים) — לפני שליחה כ-`expectedPrompt`, הגרשיים האחוריים
  מוסרים (מוחלפים ברווח/כלום) כי הם מוסכמה של הלקוח, לא רלוונטיים לטקסט
  שנשלח כהקשר חופשי למודל.
- **עודכן בסבב רוויזיה א׳ — מסך צר וגבוה מאוד (למשל נייד ב-portrait עם מקלדת
  מסך פתוחה, אם אי פעם רלוונטי).** `min-height: 360px` על `.notebook-screen`
  הוא רצפה מוחלטת, לא יחסית ל-viewport — גם ב-viewport קטן מ-360px גובה (נדיר
  מאוד, אבל אפשרי בתיאוריה), התיבה לא תיעלם, רק תדחוף גלילה. אין טיפול מיוחד
  מעבר לכך — זו התנהגות "רשת ביטחון" סבירה, לא UX אידיאלי לגודל קיצוני כזה.
- **עודכן בסבב רוויזיה א׳ — סיבוב הטלפון לרוחב בזמן מסך מלא.** אין קוד ייעודי
  נדרש: `position:fixed;inset:0` נצמד מחדש ל-viewport החדש (כולל `100dvh`)
  אוטומטית ברגע שהדפדפן מעדכן את מידות ה-viewport אחרי סיבוב — זו בדיוק הסיבה
  שנבחר על פני Fullscreen API (ראו Technical Approach). ה-`useEffect` שמריץ
  מחדש `computeFitTransform` צריך לרוץ גם על אירוע `resize`/`orientationchange`,
  לא רק על טוגל של `fullscreen` עצמו — אחרת קנה המידה נשאר מותאם לכיוון הקודם
  עד הטוגל הבא. זה כבר תבנית קיימת בקוד (ה-`useEffect` המקורי שרץ ב-mount
  כנראה כבר מאזין ל-`resize` מסיבה דומה; developer לוודא ולהשתמש באותו listener
  גם לכיוון הזה, לא להוסיף שני מאזינים נפרדים).

## Risks / Tradeoffs
- **שינוי שובר בחוזה `/read-page`, לא תוסף.** `PR #60` הוגדר כ"שלב א'" מפורש
  לקראת בדיוק הפיצ'ר הזה (ראו product-spec שלו, "המורה מבינה מה נכתב בדף") —
  שינוי החוזה תואם את הכוונה המקורית, לא שובר משהו שהתכוונו שיישאר יציב. אין
  לקוח נוסף (למשל מסך אחר) שמשתמש ב-`readPageWithTeacher`/`PageReading` הישן —
  אומת עם grep לפני המימוש.
- **הסרת `imageDataUrl` מתשובת `/read-page`.** ב-`PR #60` זה שימש להראות
  לתלמיד/ה "מה השרת ראה" כאישור. במסך המשולב החדש, דף הכתיבה **כבר גלוי כל
  הזמן** על המסך הראשי (זו בדיוק הנקודה של המיזוג) — אין עוד צורך "להדהד" אותו
  בחזרה בדיאלוג נפרד. `/render-page` (שלא השתנה) עדיין קיים אם אי פעם יידרש
  debug ידני של הרינדור בבידוד. אם מתברר בפועל (אחרי תצוגה מקדימה) שיש ערך
  אמיתי בלראות את הגרסה **המדויקת** שה-AI קיבל (למשל לאבחן חוסר-דיוק ברינדור)
  — קל להחזיר את השדה; ההסרה כאן היא כדי לא לגרור state/UI מתה, לא עמדה
  עקרונית.
- **`errorPointer` הוא היכולת הכי חדשה/לא-מוכחת בפיצ'ר הזה** — "לזהות שלב לא
  עקבי בתהליך כתוב ביד" הוא משימת הסקה אמיתית (בניגוד לתמלול טהור, שכבר הוכח
  ב-`PR #60`), ותלוי הרבה יותר באיכות כתב-היד ובניסוח הפרומפט. סביר שיידרשו
  סבבי תיקון ניסוח אחרי תצוגה מקדימה אמיתית (בדיוק כמו שקרה לכל פיצ'ר תוכן
  אחר בפרויקט הזה) — לא צפוי "לעבוד מושלם" מהניסיון הראשון, ו-QA לא יכול
  לבדוק את *איכות* ההסקה הזו (ראו tests.md, זה תלוי-AI לא-דטרמיניסטי) — רק
  את זרימת ה-UI סביבה עם מוק.
- **מודל `claude-opus-5`, אותה תקרת `$5`/חודש שכבר אומתה ב-CLAUDE.md.** גודל
  הבקשה גדל מעט (`expectedPrompt` הוא כמה מילים) ותשובת המודל ארוכה מעט יותר
  (שני משפטים חופשיים במקום שתי מחרוזות טהורות קצרות) — לא צפוי לשנות מהותית
  את סדר הגודל התקציבי שכבר הוערך (סנטים בודדים לקריאה), אבל שווה תשומת לב אם
  היקף השימוש בפועל יגדל משמעותית (עכשיו זו הזרימה **היחידה**, לא כפתור צדדי
  אופציונלי — כל תשובה בפרקטיקה תעלה קריאה, לא רק מי שבחר/ה ללחוץ "שלח למורה").
- **אין נתיב גיבוי בלי שרת** (כבר הוכרע ב-product-spec, לא נסיגה מכאן) —
  משמעות ארכיטקטונית ישירה: אם `server/` נופל (הפריסה נכשלת, המכסה נגמרת),
  **כל** תרגול נעצר מבחינת קבלת משוב, לא רק "שלח למורה" האופציונלי כמו
  ב-`PR #60`. זו תוצאה ישירה של הבקשה, לא תקלה בתכנון — מוזכר כאן כי זו נקודת
  כשל יחידה (SPOF) חדשה שלא הייתה קיימת קודם באפליקציה.
- **עודכן בסבב רוויזיה א׳ — `.practice` הופך ל-flex container.** זה משנה איך
  ילדים ישירים אחרים של `.practice` מתפרסים (למשל אם יש מרווחים/`margin`
  שהסתמכו על זרימת בלוק רגילה). הסיכון מוגבל: `.practice` כבר לא מכיל הרבה
  ילדים ישירים (header, כותרת, שאלה, notebook-screen, hints — כולם כבר בעמודה
  אחת חזותית), ו-`flex-direction: column` על container שכל הילדים שלו כבר
  מסודרים אנכית אמור להיות שקוף כמעט לגמרי; developer לוודא ויזואלית (לא רק
  ב-CI) שאין רגרסיה במרווחים אחרי השינוי, בפרט אצל מיקה (הכי פחות תוכן על
  המסך, הכי רגיש להבדל).

## Open Questions
None.

## Implementation Notes

נבנה בעיקרו בדיוק לפי התוכנית. סטיות/פרטים שהתבררו רק בכתיבה:

**הוחלף בסבב רוויזיה א׳ — הפסקה הבאה מתעדת החלטה היסטורית שכבר אינה בתוקף.**
`height: min(60vh, 620px)` הוחלף ב-`flex: 1 1 auto; min-height: 360px` (ראו
Technical Approach למעלה) בדיוק בגלל התקלה שהפסקה הזו מסבירה את הרקע לה —
גובה קבוע קטן מדי בנייד. נשארת כאן להסביר את ההיגיון המקורי (למה הפכה למסך
מוטמע ולא נשארה overlay), לא כתיאור המצב הנוכחי.

**`.notebook-screen` הפך מ-overlay למסך-מלא לפאנל מוטמע בגובה חסום.**
architecture.md לא פירט CSS, אבל design.md דורש שהשאלה תישאר גלויה מעל המחברת
כל הזמן — וה-`position: fixed; inset: 0` הקיים (מ-`practice-notebook`) תפס את
כל המסך ולא השאיר מקום לשום דבר מעליו. הפתרון: `.notebook-screen` הוא כעת בלוק
רגיל בזרימת המסמך, בגובה חסום (`height: min(60vh, 620px)`), במקום overlay
מלא — `.notebook-stage` הפנימי (עם ה-`flex:1`/`overflow:hidden` הקיימים) עובד
זהה בתוך מיכל בגובה חסום כמו בתוך מסך מלא; חישובי הזום/pan מבוססים על
`getBoundingClientRect()` של האלמנט בפועל, לא על גודל המסך. `.practice` עצמו
נשאר בלוק פשוט וגלילה רגילה, בדיוק כמו היום — לא הפך למיכל fullscreen משלו.
זו החלטת CSS מקומית, לא סטייה מהחלטת עיצוב: התוצאה (שאלה למעלה, מחברת מתחתיה,
כל השאר גולל למטה) זהה למה ש-design.md ביקש.

**מיקום כפתור "רמז 💡" — נשאר במקומו הקיים (אחרי המחברת), לא הוזז לפס העליון.**
לדיאגרמת ה-ASCII של design.md (מצב A) יש סתירה פנימית קטנה מול הפרוזה שלה:
הדיאגרמה מציירת את הכפתור מתחת לשאלה, אבל הטקסט אומר במפורש "כפתור הרמז נשאר
במקומו הרגיל". נבחרה הפרוזה (המפורשת) על פני קירוב חזותי בדיאגרמה — הכפתור
וכל רשימת הרמזים הפתוחה נשארו במיקום ה-DOM המקורי שלהם (אחרי בלוק המחברת),
בלי שינוי בקוד או בהתנהגות שלהם בכלל.

**CSS של דיאלוג התמונה שהוסר לא נזרק — עבר שימוש חוזר.** `.teacher-reading`,
`.teacher-reading-header`, `.teacher-reading-line` (שעיצבו את הבלוק בתוך
הדיאלוג שהוסר) הפכו לעיצוב של הפאנל העצמאי החדש ב-`Practice.tsx`, עם תוספת
`max-width`/`padding`/`border` כדי שיעמוד לבד (לא בתוך `.notebook-confirm-dialog`
יותר) — לא הומצא שם class חדש. `.notebook-image-dialog`, `.notebook-server-image`,
ו-`.notebook-open-button` (הכפתור "📝 מחברת" שהוסר) נמחקו לגמרי — לא נשאר בהם
שימוש בקוד.

**`useEffect(() => stopSpeaking, [])` הוסר מ-`PracticeNotebook.tsx`.** ב-`PR
#60` זה מנע קול ממשיך לדבר כש-`PracticeNotebook` נסגר (mount/unmount עצמאי,
כשהיה toggle נפרד). עכשיו `PracticeNotebook` תמיד מותקן לצד `Practice` ולא
עולה/יורד בפני עצמו — הניקוי המקביל שכבר קיים ב-`Practice.tsx` (אותו קוד
בדיוק) מכסה את זה במלואו. הושאר היה dead code שלא עושה כלום, לפי הכלל נגד קוד
מת ב-`CLAUDE.md`.

**`server/README.md` עודכן** (לא היה ברשימת Affected Files של הארכיטקטורה) —
תיעד את חוזה `/read-page` הישן (`question`/`answer`/`imageDataUrl`), שהיה נשאר
שגוי אחרי השינוי בפועל. זו תיקון דיוק תיעודי לחוזה שהשתנה, לא החלטה טכנית
חדשה.

**נבדק:** `npm run build`, `npm run lint` (שורש הריפו) נקיים; `npm run build`
(`tsc -b`) נקי בשרת (`server/`). `npm run bump:feature` הורץ (1.24.0 → 1.25.0).
לא הורצה סוויטת ה-e2e — זה תפקיד `qa`, ולפי ההנחיה המפורשת לסבב הזה.

**בדיקות e2e קיימות שיישברו, וצריכות תשומת לב מיוחדת של `qa` (לא רק "לתקן"):**
הסרת שדה הטקסט לתשובה (`.answer-input`) וכפתור "📝 מחברת" (`.notebook-open-button`)
משפיעה על **23 מתוך 29** קובצי הספסיפיקציה הקיימים — לא רק אלה שעוסקים במחברת
עצמה, אלא כל בדיקה שהשתמשה במענה מוקלד רק כאמצעי להגיע למסך תוצאה לצורך בדיקת
משהו אחר (הקראה, רמזים, דיאגרמות, סגנונות וכו'). אין קובץ helper משותף אחד
שמרכז את הדפוס — כל קובץ ממש את זה בעצמו (`page.locator(".answer-input").fill(...)`),
אז זו לא ערבוב-והחלפה במקום אחד:
`adaptive-difficulty.spec.ts`, `clearer-explanations.spec.ts`,
`countdown-next.spec.ts`, `fraction-diagram.spec.ts`, `heading-wrap-balance.spec.ts`,
`mika-adaptive-difficulty.spec.ts`, `mika-diagrams.spec.ts`, `mistake-diagnosis.spec.ts`,
`mistake-explanation.spec.ts`, `more-diagrams-wave2.spec.ts`, `notebook-server-relay.spec.ts`,
`notebook-teacher-understanding.spec.ts`, `perfect-score-message.spec.ts`,
`practice-notebook.spec.ts`, `question-hints.spec.ts`, `read-aloud-questions.spec.ts`,
`read-aloud.spec.ts`, `review-status.spec.ts`, `students-and-syllabus.spec.ts`,
`style-lessons.spec.ts`, `teaching-explanations.spec.ts`, `topic-lesson.spec.ts`,
`topics-and-progress.spec.ts`, `version-number.spec.ts`. בנוסף,
`notebook-teacher-understanding.spec.ts` מוקק תשובות מ-`/read-page` בפורמט הישן
(`question`/`answer`/`imageDataUrl`) שכבר לא קיים — כל מוק כזה צריך גם להתעדכן
לפורמט החדש (`processReflection`/`errorPointer`/`finalAnswer`, בלי
`imageDataUrl`), לא רק לשינוי הסלקטור. סביר שהפתרון הנכון הוא helper משותף
אחד ל"לכתוב תשובה במחברת ולשלוח למורה" (עם מוק `/read-page` ניתן להגדרה),
שכל הקבצים האלה יעברו להשתמש בו — אבל זו החלטת `qa`, לא הוכרעה כאן.

## Implementation Notes — סבב רוויזיה א׳ (2026-09-01)

נבנה בעיקרו בדיוק לפי התוכנית שתועדה למעלה תחת "עודכן בסבב רוויזיה א׳". שני
פרטים התבררו רק בכתיבה, ולא היו הכרעה חדשה — סטייה מקומית שנפתרה תוך כדי:

**`.practice` קיבל `flex: 1` בעצמו, לא `min-height: 100vh`/`100dvh` כמו
שתועד למעלה.** ב-`src/index.css` התברר ש-`#root` **כבר** `display: flex;
flex-direction: column; min-height: 100svh` (מהתחלת הפרויקט — לא קשור לפיצ'ר
הזה). `.practice` הוא הילד הישיר היחיד שלו במסך תרגול. נתינת `min-height` ל-
`.practice` עצמו הייתה מייצרת שני מנגנוני-גובה חופפים (ה-`svh` של `#root`
ועוד `vh`/`dvh` על `.practice`) בלי סיבה — `flex: 1` על `.practice` משיג בדיוק
את אותה תוצאה (התמתחות למלוא הגובה הפנוי של ה-`#root` שכבר קיים) תוך שימוש
במנגנון ה-flex שכבר שם, ופשוט יותר. `.practice` נשאר גם `display: flex;
flex-direction: column` כמתוכנן, כדי ש-`.notebook-screen` יוכל לתפוס את מה
שנשאר בתוכו. שום דבר לא השתנה מבחינת ה-`min-height: 360px`/`flex: 1 1 auto`
של `.notebook-screen` עצמו, או ממנגנון ה-`position:fixed;inset:0` למסך מלא —
שניהם בדיוק כמו שתוכנן.

**`fitToScreen()` לא נשאר כפונקציה נפרדת שהכפתור קורא לה — הוחלף ב-`useEffect`
שתלוי ב-`[fullscreen]`.** התוכנית תיארה "`fitToScreen()` הופך להיקרא גם
בטוגל" — בפועל, מאחר שהכפתור כבר לא צריך להפעיל fit-בלבד (הבקשה המפורשת של
המשתמש: "מגדיל אותו לכל המסך **במקום** זום אאוט"), הפונקציה עצמה הפכה למיותרת
כישות נפרדת: ה-`onClick` של הכפתור קורא ל-`onToggleFullscreen` בלבד (מ-
`Practice.tsx`, `setFullscreen((f) => !f)`), וההתאמה מחדש של הזום קורית
אוטומטית ב-`useEffect(() => {...}, [fullscreen])` נפרד — לא נקראת משום מקום
אחר. זה גם פותר בעיה שהתוכנית לא התייחסה אליה: לוגיקת ה-fit צריכה לרוץ **אחרי**
שה-DOM כבר משקף את גודל התיבה החדש (אחרי הרינדור עם/בלי class `.fullscreen`),
לא בתוך ה-`onClick` עצמו (שם `stageRef.current.getBoundingClientRect()` היה
עדיין מחזיר את הגודל **הישן**, לפני שה-CSS השתנה).

**מנגנון סיבוב הטלפון (`resize`) מרענן fit רק בזמן מסך מלא, לא תמיד.**
architecture.md כתב "developer לוודא ולהשתמש באותו listener" בלי להכריע אם
`resize` הרגיל (מחוץ למסך מלא) צריך גם הוא לחשב fit מחדש. הוחלט: **לא** —
`handleResize` הקיים ממשיך להריץ רק `applyTransform()` (משמר את הזום שהתלמיד/ה
בחר/ה ידנית) חוץ ממקרה אחד חדש: כש-`fullscreenRef.current === true`, הוא
**גם** מחשב `computeFitTransform` מחדש לפני זה — כי `position:fixed;inset:0`
אומר שגודל התיבה בפועל השתנה עם ה-`resize` (בעיקר סיבוב מסך), לא רק שהעמוד
נדחס. שינוי גובה חלון רגיל בדסקטופ, מחוץ למסך מלא, ממשיך להתנהג בדיוק כמו
לפני הרוויזיה — לא רגרסיה על משתמשי דסקטופ שזום-ידני עבורם.

**`fullscreenRef`** נוסף (מראה `fullscreen`), באותו דפוס בדיוק כמו `lockedRef`
הקיים — כי ה-listener של `resize` נרשם עם `[]` deps (פעם אחת) וצריך לקרוא את
הערך העדכני, לא את זה שהיה בזמן ה-mount.

**אימות ידני (לא אוטומטי — זה תפקיד `qa`), לפני מסירה:** dev server מקומי +
סקריפט Playwright חד-פעמי (viewport 390×700, מדמה נייד), עם `/read-page`
ממוקק דרך `page.route` (כמו ב-`tests/e2e/helpers/notebookAnswer.ts` הקיים).
אומת: (1) ברירת המחדל — התיבה ממלאת את כל השטח הפנוי בפועל, `.practice`
מתמתח לכמעט כל גובה ה-viewport ללא גלילה מיותרת; (2) לחיצה על "⤢" מגדילה
את `.notebook-screen` ל-`position:fixed` על כל המסך (`x:0,y:0,width:390,
height:700`), מציגה את `topSlot` (השאלה + ✕) בתוכו; (3) קריאה ודאית שמגיעה
בזמן מסך מלא יוצאת ממנו אוטומטית וחוזרת לפריסה הרגילה; (4) קריאה **לא** ודאית
(מצב C) **נשארת** במסך מלא, וה-`statusSlot` (הודעת אי-הוודאות) מוצג בתוכו,
ליד סרגל הכלים, כפי שדרש design.md; (5) יציאה דרך ה-✕ בפס המצומצם חוזרת
לגודל התיבה הרגיל. כל חמשת הבדיקות עברו.

**נבדק:** `npm run build`, `npm run lint` (שורש הריפו) נקיים. `npm run
bump:fix` הורץ (1.25.0 → 1.25.1) — זה בראנץ' `fix/`, לא `feature/`. לא הורצה
סוויטת ה-e2e המלאה — זה תפקיד `qa` הבא.
