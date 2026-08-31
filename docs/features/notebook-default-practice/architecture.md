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

## Technical Approach

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

## Open Questions
None.
