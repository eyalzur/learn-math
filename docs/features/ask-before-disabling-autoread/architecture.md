# שאלה לפני כיבוי הקראה אוטומטית — Architecture

## Overview
כרטיסון חדש (`AutoReadPrompt`), רכיב מצגת טהור בלי state משלו שמשפיע על החלטות,
נרנדר מתוך `Practice.tsx` ברגע הנכון בתוך `toggleSpeech()` — כשנעצרת הקראה של
תיבת ה-`"question"` (שאלה/רמז, הקטגוריה היחידה שמוקראת אוטומטית היום) לפני
שהסתיימה. תוקף-השתקה של יומיים נשמר ב-`localStorage` לצד הגדרת ה-`readAloud`
הקיימת, ב-`src/data/preferences.ts`. אין מודאל/backdrop חדש — הכרטיסון זורם
בתוך הדף, בדיוק כמו שהוא ממוקם (ליד הרמקול, מתחת לקופסת השאלה), ולכן "לא חוסם"
הוא תוצאה ישירה של המיקום, לא מנגנון נוסף שצריך לבנות.

## Affected Files / Components

- **`src/data/preferences.ts`** — שדה חדש ב-`Preferences`:
  `autoReadPromptUntil?: Record<string, number>` (מזהה תלמיד/ה → epoch ms שבו
  פגה תקופת-ההשתקה). שתי פונקציות חדשות: `isAutoReadPromptSuppressed(studentId):
  boolean` ו-`suppressAutoReadPrompt(studentId): void`, לצד קבוע
  `AUTO_READ_PROMPT_SUPPRESS_MS = 2 * 24 * 60 * 60 * 1000`. אותו דפוס
  try/catch-ו-התעלם כמו שאר הקובץ.
- **`src/components/AutoReadPrompt.tsx`** (חדש) — הכרטיסון מ-design.md: שתי
  שורות טקסט, שני כפתורים, תיבת סימון. Props: `{ onYes: () => void; onNo: () =>
  void }`. בלי prop ל"האם מסומן" — ראו Risks/Tradeoffs.
- **`src/App.css`** — כללי עיצוב לכרטיסון (`.auto-read-prompt` וכו'). תוכן
  רגיל בזרימת הדף, **לא** `position: fixed`/`absolute` ו**לא** backdrop —
  ראו Technical Approach.
- **`src/components/Practice.tsx`** — משתנה הכי הרבה:
  - state חדש: `const [showAutoReadPrompt, setShowAutoReadPrompt] =
    useState(false);`
  - prop חדש: `studentId: string` (כבר קיים ב-`App.tsx` ברמת ה-caller, רק לא
    עובר היום ל-`Practice`).
  - prop חדש: `onDisableReadAloud: () => void` — לא כותב ל-`localStorage`
    בעצמו; קורא ל-callback הקיים מ-`App.tsx` כדי שה-`readAloud` prop של
    `Practice` עצמו יתעדכן באותה פעימה (ראו Technical Approach).
  - `toggleSpeech()`: נקודת ההחלטה היחידה שמציגה את הכרטיסון — ראו להלן.
  - כל handler שמייצג "התלמיד/ה ממשיכ/ה בתרגול": `onDigit`/`onBackspace`
    של `NumberPad` (שורות 324-325 היום), `checkAnswer()`, `checkFollowUp()`,
    `next()`, כפתור הרמז (שורה 344), כפתור "לראות את הפתרון" (שורה 425) —
    כל אחד מקבל שורה ראשונה `setShowAutoReadPrompt(false);`.
  - `diagrams` prop שמועבר ל-`QuestionScreenTemplate` (היום
    `<>{clockSlot}{angleSlot}</>`) מקבל איבר שלישי:
    `{showAutoReadPrompt && <AutoReadPrompt onYes={...} onNo={...} />}`.
- **`src/App.tsx`** — ב-JSX של `screen.name === "practice"`:
  `<Practice ... studentId={student.id} onDisableReadAloud={() =>
  settingsProps.onReadAloudChange(false)} />`. אין שינוי ל-`settingsProps`
  עצמו — `onReadAloudChange` הקיים (שורות 457-461) בדיוק עושה את מה שצריך
  (כותב ל-`preferences.ts` **וגם** מפעיל `setPreferencesTick` שגורם ל-`App`
  לקרוא מחדש את ה-`readAloud` prop שמוזרם ל-`Practice`).

לא נוגעים ב: `src/components/TopicLesson.tsx` (אין שם הקראה אוטומטית, ראו
product-spec.md Out of Scope), `src/components/SettingsDialog.tsx`/
`DeleteStudentDialog.tsx` (אין שינוי בדיאלוגים הקיימים).

## Data / State Changes

| מה | איפה | חיים |
|---|---|---|
| `showAutoReadPrompt: boolean` | state מקומי ב-`Practice` | סשן התרגול הנוכחי בלבד (לא נשמר, לא שורד מעבר-שאלה מכוון) |
| `autoReadPromptUntil[studentId]: number` (epoch ms) | `localStorage` תחת `learn-math:preferences`, לצד `readAloud`/`paceLevel` הקיימים | פר-תלמיד/ה, שורד בין סשנים, מתעדכן בכל תשובה (כן/לא) |
| `studentId`, `onDisableReadAloud` | props חדשים ל-`Practice` | מועברים מ-`App.tsx` כל render, כמו שאר ה-props |

## Technical Approach

**מתי מציגים את הכרטיסון — בתוך `toggleSpeech()` בלבד, לא ב-effect נפרד.**
`toggleSpeech(box)` כבר מכיל את כל המידע הדרוש: הענף הקיים

```ts
if (speakingBox !== null) {
  stopSpeaking();
  setSpeakingBox(null);
  if (speakingBox === box) return;   // <- הנקודה הזו
}
```

הוא בדיוק "המשתמש/ת לחצ/ה על הכפתור שמראה ⏹ עבור התיבה הפעילה כרגע" —
כלומר בדיוק הגדרת "עצר/ה הקראה באמצע" מ-product-spec.md (ה-`speakingBox`
עדיין לא `null` כי `onDone` עדיין לא רץ). מוסיפים בדיקה בדיוק שם, לפני ה-
`return`:

```ts
if (box === "question" && readAloud && !isAutoReadPromptSuppressed(studentId)) {
  setShowAutoReadPrompt(true);
}
```

`box === "question"` הוא איך שה-scope מוגבל רק לקטגוריה שבאמת מוקראת
אוטומטית היום (שאלה+רמז — AC #10 במפרט). תיבות `"diagnosis"`/`"explanation"`
מעולם לא מוקראות אוטומטית, ולכן עצירה שלהן לעולם לא מציגה את השאלה — בלי
תנאי נוסף, כי הענף הזה נבדק רק כש-`box === "question"`.

**שורה ראשונה בפונקציה: `setShowAutoReadPrompt(false);`** — מכסה גם את
המקרה "לחצ/ה שוב על הרמקול כדי להאזין מההתחלה" מ-design.md (מצב 4, ננטש).
React מקבץ (batches) את שתי הקריאות ל-`setShowAutoReadPrompt` בתוך אותה
הפעלת-event; אם הענף שלמעלה קורא `setShowAutoReadPrompt(true)` אחר כך
באותה הרצה, התוצאה הסופית היא `true` — "הסתר" ואז "הצג" נטו.

**החלטה מכוונת: הטריגר לא מבדיל בין "הקראה שהתחילה אוטומטית" לבין "הקראה
של תיבת ה-`question` שהתלמיד/ה הפעיל/ה ביד (לחיצה חוזרת על 🔊 כדי לשמוע שוב
אחרי שזה כבר נגמר)".** שני המקרים מגיעים לאותו state (`speakingBox ===
"question"`) ואין שום דגל קיים שמבדיל ביניהם, ושינוי `speak()`/`speakingBox`
כדי להוסיף אחד הוא שינוי גדול יחסית לתועלת. design.md לא דן בהבחנה הזו
במפורש, אבל product-spec.md AC #1 מגדיר את התנאי טכנית ("לוחצ/ת על כפתור
העצירה בזמן שהקראה... עדיין לא הסתיימה") בלי תנאי-מקור — כך שהתנהגות זו
תואמת את הניסוח הקיים כפי שהוא, לא מנחשת משהו שלא נכתב. מסומן כהחלטה
מתועדת, לא כשאלה פתוחה.

**איפה נשמרת ההשתקה.** `suppressAutoReadPrompt(studentId)` נקראת משני
המקומות היחידים שמסתירים את הכרטיסון עם תשובה בפועל — `onYes` ו-`onNo`
שמוגדרים inline במקום שה-`<AutoReadPrompt>` מרונדר ב-`Practice.tsx`:

```ts
{showAutoReadPrompt && (
  <AutoReadPrompt
    onYes={() => {
      setShowAutoReadPrompt(false);
      suppressAutoReadPrompt(studentId);
      onDisableReadAloud();
    }}
    onNo={() => {
      setShowAutoReadPrompt(false);
      suppressAutoReadPrompt(studentId);
    }}
  />
)}
```

`onDisableReadAloud` (prop שמגיע מ-`App.tsx`) הוא מה שבאמת מכבה את ההקראה
האוטומטית — לא כתיבה ישירה מ-`Practice` ל-`preferences.ts` — כי רק
`App.tsx` מחזיק את ה-`setPreferencesTick` שגורם ל-render מחדש ולכן ל-prop
`readAloud` חדש שמגיע בחזרה ל-`Practice` (בלי זה, התיקון היה נדרש
לרפרש/לעזוב-ולחזור למסך לפני שהקראה אוטומטית נעלמת, מה שסותר AC #5 —
"מרגע זה האפליקציה לא מקריאה... מעשיו").

## Edge Cases

- **לחיצה על ⏹ של תיבת `question` כש-`readAloud` כבוי:** התנאי ב-`toggleSpeech`
  בודק `readAloud` מפורשות — אין כרטיסון. (AC #2.)
- **עדיין בתוך תקופת-השתקה של יומיים:** `isAutoReadPromptSuppressed` מחזיר
  `true`, אין כרטיסון, גם אם שאר התנאים מתקיימים.
- **מעבר שאלה/יציאה בזמן שהכרטיסון מוצג בלי תשובה:** `showAutoReadPrompt`
  הוא state מקומי של `Practice` — unmount (יציאה) מאפס אותו מעצמו; שינוי
  שאלה (`next()`) כבר מאפס אותו במפורש ברשימת ה-handlers למעלה. שום ערך
  ב-`localStorage` לא נכתב אם לא הייתה תשובה בפועל — זה בדיוק מה שמשאיר
  "עצירה הבאה שואלת מחדש" (product-spec AC #3, design.md מצב 4).
- **`localStorage` לא נגיש (מצב פרטי וכו'):** `isAutoReadPromptSuppressed`/
  `suppressAutoReadPrompt` עוקבים אחרי אותו דפוס try/catch כמו שאר
  `preferences.ts` — כשל שקט, לא קריסה. בפועל: בלי `localStorage` עובד,
  השאלה תישאל שוב בכל עצירה (לא גרוע מההיום, פשוט לא "פעם אחת" אמיתי) — דה
  מינימיס, אין צורך בטיפול מיוחד.
- **תיבת "לא לשאול אותי יותר":** לא נקראת/מועברת כלל ל-`Practice` —
  `onYes`/`onNo` מתנהגים זהה בין אם מסומנת או לא (product-spec AC #3,
  design.md צעד 6). אין prop בשביל זה ב-`AutoReadPromptProps` — ראו
  Risks/Tradeoffs.
- **RTL/bidi:** אין תוכן חשבוני/מספרים בכרטיסון (ראו design.md) — אין
  סיכון לבאג ה-RTL המוכר, ולכן אין `direction`/`unicode-bidi` מיוחד נדרש
  מעבר לכיווניות-ברירת-המחדל (RTL) של שאר הדף.

## Risks / Tradeoffs

- **הכרטיסון לא "חוסם" כי הוא לא overlay בכלל, לא כי יש מנגנון
  pointer-events מיוחד.** זו הכרעה מכוונת: במקום לבנות backdrop
  "שקוף-ללחיצות" (`pointer-events: none` על השכבה, שהופך מסובך ברגע
  שרוצים גם ללחוץ על הכרטיסון עצמו), הוא פשוט מרונדר כתוכן רגיל בזרימת
  הדף (ב-slot `diagrams` של `QuestionScreenTemplate`) — כמו `clockSlot`/
  `angleSlot` הקיימים. התוצאה: "לא חוסם" הוא עובדה גיאומטרית (אין שום
  אלמנט שמכסה את לוח הספרות/שורת התשובה), לא state נוסף לתחזק.
- **התיבה "לא לשאול אותי יותר" לא משנה שום דבר בפועל (עדיין יומיים,
  עדיין "פעם אחת" בכל מקרה).** החלטת product-spec/design, לא הכרעה
  חדשה כאן — אבל שווה לציין בבירור כדי ש-QA לא יחפש הבדל-תנהגות שאינו
  קיים: הבדיקה הרלוונטית היחידה היא "התיבה קיימת ואפשר לסמן אותה", לא
  "סימון שלה גורם למשהו שונה".
- **אין הבחנה בין הקראה-אוטומטית-שהופרעה לבין הקראה-ביד-שהופרעה (שתיהן
  תיבת `"question"`).** נדון ב-Technical Approach — אם זה מתגלה כמטרד
  בפועל (למשל תלמיד/ה ששומע/ת שאלה פעם שנייה ביד ועוצר/ת, ונשאל/ת בטעות),
  זה סבב-תיקון נפרד שדורש state חדש (למשל דגל `autoTriggered` לצד
  `speakingBox`), לא נבנה מראש בלי עדות.
- **אין טיימר/אנימציה-של-פקיעה גלויה למשתמש/ת.** תוקף היומיים הוא עניין
  פנימי בלבד (`autoReadPromptUntil`) — אין שום UI שמראה "עוד X ימים לא
  תישאל/י". עולה בקנה אחד עם design.md (אין אזכור ליומיים בכרטיסון עצמו).

## Open Questions
None.
