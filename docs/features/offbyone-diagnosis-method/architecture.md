# אבחון "סטייה של אחד" — מתחבר לשיטה — Architecture

## Overview
`Diagnosis` מקבל שדה `followUp` אופציוני שמחליף את ארבעת השדות הקבועים
(`question`/`answer`/`onRight`/`onWrong`) — נוכח לחמשת הדפוסים הקיימים, נעדר לשני
הדפוסים החדשים שמחליפים את `offByOne`. `Practice.tsx` מפסיק לרנדר את קופסת השיחה
כש-`followUp` נעדר, ו-`revealed` (המשתנה שקובע מתי מוצגת קופסת "איך פותרים?")
הופך ל-`true` מיד באותו מקרה — בלי לגעת בהתנהגות הקיימת של חמשת הדפוסים האחרים.

## Affected Files / Components

| קובץ | מה משתנה |
|---|---|
| `src/data/diagnose.ts` | `Diagnosis.id` מאבד `"offByOne"`, מקבל `"offByOneSequence"` \| `"offByOneSum"`. `question`/`answer`/`onRight`/`onWrong` יוצאים מ-`Diagnosis` ועוברים לאובייקט מקונן אופציוני `followUp?`. `isCounted()` מתפצלת לשתי פונקציות שומר נפרדות. הדפוס האחרון ב-`PATTERNS` (קווים 258-275 היום) מתחלף בשני דפוסים נפרדים. |
| `src/components/Practice.tsx` | `revealed` (קו 203) מוסיף תנאי על `followUp`. בלוק ה-`.followup` (קווים 380-429) נכנס תחת תנאי נוסף שבודק `followUp`. הפניות ל-`diagnosis.question`/`.answer`/`.onRight`/`.onWrong` (בתוך אותו בלוק, ובתוך `checkFollowUp` קו 242-245, ובתוך `toggleSpeech` קו 285-286) עוברות דרך `diagnosis.followUp`. `toggleSpeech`'s `"explanation"` case (קווים 287-304) מוסיף את `diagnosis.headline` לתחילת הדיבור כש-`followUp` נעדר — ראו Edge Cases. |
| `tests/e2e/mistake-diagnosis.spec.ts` | שלוש בדיקות מתייחסות ל-`id === "offByOne"` ול-`found.answer` (קווים 408-449) — צריכות עדכון ל-QA. לא נוגעים בהן כאן; מפורט ב-Risks/Tradeoffs. |

לא נוגעים: `explain.ts`, `method.ts`, כל קובץ תוכן (`grade*.ts`) — קופסת "איך פותרים?"
כבר קיימת ונכונה לכל שאלה, ללא שינוי.

## Data / State Changes

### `Diagnosis` — `src/data/diagnose.ts`
```ts
export interface Diagnosis {
  id:
    | "sign"
    | "operation"
    | "decimalPoint"
    | "reversed"
    | "tens"
    | "offByOneSequence"
    | "offByOneSum";
  headline: string;
  /**
   * The interactive follow-up — present for every pattern except the two off-by-one
   * ones, which reuse the standard explanation instead of asking anything (see
   * docs/features/offbyone-diagnosis-method).
   */
  followUp?: {
    question: string;
    answer: number;
    onRight: string;
    onWrong: string;
  };
}
```
חמשת הדפוסים הקיימים (`sign` עד `tens`) עוברים לעטוף את ארבעת השדות שלהם תחת
`followUp: { ... }` במקום להחזיק אותם ברמה העליונה — שינוי מבני בלבד, שום התנהגות
לא זזה. שני הדפוסים החדשים מחזירים `{ id, headline }` בלבד.

### שני דפוסים חדשים, במקום `offByOne`
```ts
function isSequenceQuestion(question: Question): boolean {
  return Number.isInteger(question.answer) && /בא אחרי|בא לפני/.test(question.prompt);
}

function isSumQuestion(question: Question): boolean {
  if (!Number.isInteger(question.answer)) return false;
  const expr = bareExpression(question.prompt);
  return (
    expr !== null &&
    (expr.op === "+" || expr.op === "-") &&
    Number.isInteger(expr.a) &&
    Number.isInteger(expr.b)
  );
}
```
אלה בדיוק שני הענפים של `isCounted()` היום, מופרדים לשם שכל אחד קורא לעצמו. אין
שינוי בהיקף מה שנתפס — כל שאלה שהתאימה ל-`isCounted()` היום תואמת בדיוק לאחת
מהשתיים (הן ממצות ואינן חופפות, כי `/בא אחרי|בא לפני/` ו-`bareExpression` עם `+`/`-`
לא יכולים להיות אמת על אותו `prompt` בו-זמנית — פורמט השאלות באפליקציה הוא תמיד
אחד או השני).

שני פונקציות הדפוס עצמן (מחליפות את הדפוס השישי היום):
```ts
// 6. Off by one, counting a sequence. Last among the two, ties broken arbitrarily —
//    isSequenceQuestion and isSumQuestion never both match the same prompt.
(question, given) => {
  const correct = question.answer;
  if (!isInteger(correct) || !isInteger(given)) return null;
  if (Math.abs(given - correct) !== 1) return null;
  if (!isSequenceQuestion(question)) return null;
  const short = given < correct;
  return {
    id: "offByOneSequence",
    headline: short ? "כמעט! חסר בדיוק אחד" : "כמעט! זה אחד יותר מדי",
  };
},

// 7. Off by one, a bare sum or difference.
(question, given) => {
  const correct = question.answer;
  if (!isInteger(correct) || !isInteger(given)) return null;
  if (Math.abs(given - correct) !== 1) return null;
  if (!isSumQuestion(question)) return null;
  const short = given < correct;
  return {
    id: "offByOneSum",
    headline: short ? "כמעט! חסר בדיוק אחד" : "כמעט! זה אחד יותר מדי",
  };
},
```
הכותרות (`headline`) נשארות המחרוזות הקיימות בדיוק, כפי ש-design.md קבע — שום
ניסוח חדש. `wasMissing`/`short`/`onRight`/`onWrong` שהיו קיימים בדפוס הישן נעלמים
כי אין יותר שיחה שצריכה אותם.

## Technical Approach

### `Practice.tsx` — `revealed`
```ts
const revealed =
  diagnosis === null || diagnosis.followUp === undefined || followUpResult !== null || askedToSee;
```
תוספת אחת (`|| diagnosis.followUp === undefined`) לתנאי הקיים. עבור שני הדפוסים
החדשים זה הופך את הביטוי ל-`true` מיד אחרי שהאבחנה נקבעת — בדיוק ההתנהגות
שתוארה ב-design.md (המסך "מדלג" ישר למצב שהיום מגיעים אליו רק אחרי שיחה).

### `Practice.tsx` — קופסת השיחה
התנאי שמרנדר את בלוק ה-`.followup` (קו 380 היום) מוסיף בדיקה:
```ts
{feedback === "wrong" && diagnosis !== null && diagnosis.followUp !== undefined && (
  <div className="followup">
    {/* כמו היום, עם diagnosis.question → diagnosis.followUp.question,
        diagnosis.answer → diagnosis.followUp.answer,
        diagnosis.onRight/.onWrong → diagnosis.followUp.onRight/.onWrong */}
  </div>
)}
```
`checkFollowUp()` (קו 242-245) מקבל את אותה תוספת בבדיקת ה-guard בשורה הראשונה, ומשתמש
ב-`diagnosis.followUp.answer` במקום `diagnosis.answer`.

### `Practice.tsx` — הקראה
`toggleSpeech("diagnosis")` (קו 285-286) — כפתור ההקראה שבתוך `.followup-header`, ולכן
כבר לא ברנדר בכלל עבור שני הדפוסים החדשים (הבלוק כולו לא קיים). מספיק לעדכן את
הביטוי ל-`diagnosis.followUp && speechParts([diagnosis.headline, diagnosis.followUp.question])`
כדי שהטיפוסים יעברו — לא ישפיע על שום מסך בפועל.

`toggleSpeech("explanation")` (קו 287-304) — **כאן יש תוספת אמיתית**, ראו Edge Cases.

## Edge Cases

### שורת האבחנה חייבת להישאר ניתנת להקראה
ב-5 הדפוסים הקיימים, `diagnosis.headline` נקרא בקול דרך כפתור ההקראה של קופסת
השיחה (`toggleSpeech("diagnosis")`). לשני הדפוסים החדשים **אין** קופסת שיחה, ולכן
אין שום כפתור שקורא את ה-`headline` — הוא נשאר טקסט מוצג בלבד, בלתי נגיש להקראה.
זו בדיוק הבעיה ש-`docs/features/mistake-diagnosis/design.md` מזהיר מפניה: "אבחנה
שהיא לא יכולה לקרוא שווה בדיוק כמו אבחנה שלא נאמרה" — design.md של הפיצ'ר הזה לא
התייחס לזה במפורש כי הניח שימוש חוזר מלא בקופסת "איך פותרים?", אבל כפתור ההקראה
שלה (`toggleSpeech("explanation")`) לא כולל היום את `diagnosis.headline` בכלל.

**הפתרון:** מוסיפים את ה-`headline` כחלק הראשון של הדיבור בכפתור ההקראה של קופסת
"איך פותרים?", רק כש-`followUp` נעדר:
```ts
: explanation && [
    ...(diagnosis && diagnosis.followUp === undefined ? speechParts([diagnosis.headline]) : []),
    ...(method ? speechParts([method]) : []),
    // ...שאר הרשימה הקיימת, ללא שינוי
  ];
```
כפתור אחד, לא שניים — מיקה לוחצת "🔊 הקריאו לי את ההסבר" ושומעת "כמעט! חסר בדיוק
אחד" ואז את ההסבר הרגיל ברצף, בלי כפתור נוסף שהיה צריך לחפש.

### שני הענפים אכן ממצים ולא חופפים
`isSequenceQuestion` ו-`isSumQuestion` נבדקות כענפים נפרדים בשתי פונקציות דפוס
נפרדות (לא ב-if/else אחד), ולכן תיאורטית שתיהן יכולות להיות אמת על אותו `prompt`.
בפועל זה לא קורה — פורמט השאלות באפליקציה הוא תמיד "מה בא אחרי/לפני X" (משפט
עברי) **או** ביטוי חשבוני חשוף כמו `"A + B"`, לעולם לא שניהם. `qa` יכתוב בדיקת
property שמוודאת את זה במפורש על פני כל 330+ השאלות, כדי שהנחה הזו לא תישבר בשקט
אם ייכתב תוכן חדש בעתיד.

## Risks / Tradeoffs
- **`tests/e2e/mistake-diagnosis.spec.ts` נשבר על ידי השינוי, במכוון.** שלוש
  בדיקות (קווים 408-449 היום) מתייחסות ל-`id === "offByOne"` (שם שכבר לא קיים)
  ול-`found.answer` (שדה שעבר ל-`found.followUp?.answer`, ותמיד `undefined` לשני
  הדפוסים החדשים). הבדיקה השלישית ("the small question walks toward the answer")
  בדקה בדיוק את הבאג שה-followUp הישן היה יכול לחזור אליו — ועכשיו שאין יותר
  followUp לדפוס הזה, הבדיקה כשלעצמה מתייתרת מהמטרה המקורית שלה. זו עבודת QA
  לעדכן/לפרק אותן, לא developer — אבל חשוב שהן לא יישברו "בהפתעה" באמצע.
- **`Diagnosis.followUp` כאובייקט מקונן, ולא ארבעה שדות אופציונליים נפרדים.** נבחר
  במכוון: ארבעה `?` נפרדים מאפשרים מצב לא-חוקי (יש `question` בלי `answer`), בעוד
  אובייקט אחד אופציונלי הופך את זה ללא ניתן לייצוג מלכתחילה.

## Open Questions
None.

## Implementation Notes

נבנה בדיוק לפי המסמך הזה, בלי סטייה. `Diagnosis.followUp` הוחלף כמתוכנן; חמשת
הדפוסים הקיימים עברו ל-`followUp: {...}` בלי שינוי ניסוח או התנהגות. `isCounted()`
התפצלה ל-`isSequenceQuestion`/`isSumQuestion`, ושני הדפוסים החדשים (`offByOneSequence`,
`offByOneSum`) מחזירים `{ id, headline }` בלבד — ה-`headline` נשאר בדיוק שתי המחרוזות
הקיימות ("כמעט! חסר בדיוק אחד" / "כמעט! זה אחד יותר מדי"), כפי ש-design.md קבע.

ב-`Practice.tsx`: `revealed`, בלוק ה-`.followup`, ו-`checkFollowUp()` קיבלו את הבדיקה
הנוספת על `followUp` בדיוק כפי שתואר. תוספת ההקראה של `diagnosis.headline` לכפתור
ה-"🔊 הקריאו לי את ההסבר" (סעיף Edge Cases) יושמה כמתוכנן — כפתור אחד קורא הכל ברצף
עבור שני הדפוסים החדשים.

`npx tsc -b` נקי (אין אף `any`/type assertion חדש), `npm run build`/`npm run lint`
נקיים בגרסה `1.16.1` (`bump:fix`, כי זה `fix/<slug>`).

**כצפוי לפי Risks/Tradeoffs**, `tests/e2e/mistake-diagnosis.spec.ts` נכשל בשלוש
בדיקות (לא נגעתי בו, כמתוכנן — עבודת QA):
- שתיים ("answering one too many/few...") מחפשות `.followup-input` שכבר לא מתרנדר
  לדפוס הזה — טיים-אאוט של 30 שניות, לא כישלון לוגי.
- אחת ("nearness alone is not a diagnosis...") בודקת `id === "offByOne"` — שם שכבר
  לא קיים.
שאר `20` הבדיקות בקובץ עברו בלי נגיעה, כולל כל מה שנוגע בחמשת הדפוסים האחרים —
מאשר שהעטיפה ב-`followUp` לא שינתה שום התנהגות קיימת.

ריצה מלאה של `npm run test:e2e` לא בוצעה בשלב הזה במכוון — הכישלון בקובץ הזה צפוי
ומתועד, ו-QA היא זו שתריץ את הסוויטה המלאה אחרי שהיא מעדכנת את הבדיקות.
