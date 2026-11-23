# רענון חזותי של 5 מסכים, בהשראת Stitch — Architecture

## Overview
חמש תוספות עצמאיות, כל אחת כקומפוננטה/פונקציה חדשה וקטנה שמתחברת למסך קיים, בלי לשנות
state קיים ובלי להוסיף מאגר-נתונים חדש. **בלי flag בזמן-ריצה** (ראו Risks/Tradeoffs) —
הביקורת קורית כמו בכל שינוי ויזואלי קודם בפרויקט (candy-redesign, playful-redesign,
back-link-redesign): בראנץ' → build עצמאי לתצוגה מקדימה (CLAUDE.md סעיף 3) → מיזוג.

## Affected Files / Components

**חדשים:**
- `src/data/studentBadge.ts` — `studentBadge(id: string): { shape: Shape; color: string }`,
  פונקציה טהורה ודטרמיניסטית (hash קבוע על ה-id).
- `src/data/quantityDots.ts` — `quantityDots(question: Question): QuantityDots | null`,
  עלה עצמאי כמו `tenFrame.ts` (לא מייבא ולא נכנס תחתיו).
- `src/components/QuantityDots.tsx` — מרנדר `QuantityDots` כ-SVG, באותה צורה ש-
  `TenFrame.tsx` כבר קיים (props: `data`, `label`).
- `src/components/NumberPad.tsx` — `{ onDigit: (d: string) => void; onBackspace: () => void;
  disabled: boolean }`, בלי state פנימי משלו.

**משתנים:**
- `src/data/progress.ts` — פונקציה חדשה `starsForAccuracy(correct: number, total: number):
  0 | 1 | 2 | 3` (0 = `total === 0`, אחרת אותם ספי-אחוז שכבר קיימים ב-`Result.tsx`:
  `≥80 → 3`, `≥50 → 2`, אחרת `1`). שום שינוי ב-`PracticeRecord`/`statsByTopic` עצמם.
- `src/components/Result.tsx` — מחליף את חישוב ה-`stars` הפנימי (3 שורות ה-`if` שקובעות
  `stars`) בקריאה ל-`starsForAccuracy(correctCount, total)` — ה-icon/message נשארים
  כמו שהם, בלי שינוי התנהגות. שינוי CSS/מבנה-DOM: קיבוץ אייקון+כוכבים ב-wrapper אחד
  (`.result-headline`), מרווח/גודל-גופן לציון.
- `src/components/StudentPicker.tsx` — `import { studentBadge } from "../data/studentBadge"`,
  רנדור `<span className="student-badge" aria-hidden="true" style={{ color: badge.color
  }}>{shapeGlyph[badge.shape]}</span>` בתוך `.student-card`, ליד `.student-name`.
- `src/components/TopicPicker.tsx` — prop חדש `studentId: string`; מחשב
  `const statsRows = statsByTopic(studentId)` פעם אחת (בראש הפונקציה, לא בתוך ה-map),
  בונה `Map<string, StatsRow>` לפי `label`, ולכל כרטיס-נושא מחשב
  `starsForAccuracy(row?.correct ?? 0, row?.total ?? 0)` ומרנדר שורת-כוכבים.
- `src/components/Practice.tsx` — מחשב `const dots = quantityDots(question)` באותו מקום
  שבו `bundle.clock`/`bundle.angle` כבר מחושבים; מרנדר `<QuantityDots data={dots}
  label={mathToWords(question.prompt)} />` מעל `.problem-box` כש-`dots !== null`. מוסיף
  `<NumberPad onDigit={(d) => setAnswerInput((v) => v + d)} onBackspace={() =>
  setAnswerInput((v) => v.slice(0, -1))} disabled={feedback !== null} />` אחרי
  `.answer-row` הקיים. אין שינוי ב-`checkAnswer`/`next`/שאר הלוגיקה.
- `src/components/History.tsx` — שינוי JSX בלבד: עטיפת שתי ה-`StatsSection` ברכיב-אב
  אחד (`.history-stats-group`) לצורך ה-card-grouping; בלי שינוי לוגי.
- `src/App.tsx` — שני מקומות שמרנדרים `<TopicPicker>` (שורה ~472 ו-~583) מקבלים
  `studentId={student.id}` נוסף. `student` כבר נמצא ב-scope בשני המקומות (state ברמת
  הפונקציה, `useState` בשורה 166) — אין שינוי state, רק prop נוסף.
- `src/App.css` — מחלקות חדשות: `.student-badge`; `.topic-stars`/`.topic-star`/
  `.topic-star-on`/`.topic-star-empty`; `.quantity-dots`/`.qd-dot`/`.qd-dot-outline`;
  `.number-pad`/`.number-pad-button`; `.result-headline`; `.history-stats-group`. שינוי
  בלבד, בלי הסרת מחלקות קיימות.

## Data / State Changes
- אין `localStorage` חדש, אין מבנה-נתונים חדש שנשמר. `studentBadge`, `quantityDots`
  ו-`starsForAccuracy` הן פונקציות טהורות שמחושבות מחדש בכל רינדור מנתונים שכבר קיימים
  (`student.id`, `question`, `statsByTopic(studentId)`).
- `TopicPicker` מקבל prop חדש (`studentId`) — שינוי-סוג לא-שובר (prop נוסף, לא מוחלף).
- `QuantityDots` data shape (ב-`quantityDots.ts`):
  ```ts
  interface QuantityDots {
    operation: "add" | "subtract";
    a: number; // 1–10
    b: number; // 1–10, ולחיסור: a >= b
  }
  ```
  (ה-caption/label לא חלק מה-data עצמו — מחושב ב-`Practice.tsx` עם `mathToWords`
  הקיים, ראו Technical Approach).

## Technical Approach

**תג-זהות (StudentPicker):** `studentBadge(id)` עושה hash פשוט ועקבי על המחרוזת (למשל
סכום-קודי-תווים מודולו אורך-הפלטה), בוחר צורה מתוך מערך-קבוע בן 5 וצבע מתוך מערך-קבוע
בן 5 (אינדקסים נפרדים, כך שיש עד 25 שילובים אפשריים, לא רק 5) — אותו `id` נותן תמיד
אותו תוצר, שום `Math.random()`. גליפים: `⭐ ▲ ◆ ● ■` (תווי יוניקוד, לא SVG — עקבי עם
השימוש הקיים באימוג'י בכל האפליקציה, בלי asset חדש).

**דירוג-כוכבים (TopicPicker):** `statsByTopic(studentId)` כבר מחזיר `StatsRow[]` עם
`label` ששווה בדיוק ל-`topic.title` (נבדק בקוד הקיים: `groupAndSum` משתמש ב-
`r.topicTitle` כ-key, ו-`PracticeRecord.topicTitle` נשמר שווה ל-`Topic.title` בזמן
הקלטה). לכן אין צורך במיפוי נוסף — בניית `Map` פעם אחת לכל רינדור של המסך (לא לכל
כרטיס) כדי לא לקרוא ל-`statsByTopic`/לעבור על ה-records כמות פעמים כמספר הנושאים.

**איור-כמות (Practice):** `quantityDots` מפענח את `question.prompt` בדיוק כמו
`tenFrame.ts` (regex על מחרוזת שלמה, `^(\d+)\s*([+]|[−-])\s*(\d+)$`), מחזיר `null` על
כל דבר אחר (בעיה מילולית, כפל/חילוק, אופרנד מחוץ ל-1–10, או לחיסור עם `b > a`). ה-label
הנגיש נבנה ב-`Practice.tsx` עם `mathToWords(question.prompt)` **הקיים** ב-`speech.ts`
(ממיר "+"/"−" למילים — "3 ועוד 1" / "3 פחות 1" — הספרות עצמן נשארות ספרות, מנוע-ההקראה
כבר קורא אותן נכון; אין צורך בהמרת-מספרים-למילים נפרדת, זה מה ש-`mathToWords` כבר
עושה). `QuantityDots.tsx` מרנדר שתי קבוצות נקודות בתוך שני ריבועי-מתאר נפרדים (לא
ריבוע אחד משותף) — לחיבור: שתי קבוצות מלאות, צבעים שונים; לחיסור: קבוצה אחת בגודל `a`,
שבה `b` הנקודות האחרונות מתאר-בלבד (לא נעלמות) — אותו principle "מלא מול מתאר" של
`TenFrame`, לא גוון-בלבד.

**מקלדת-מספרים (Practice):** `NumberPad` הוא רכיב מצג-בלבד (stateless) — 10 כפתורי-ספרה
(0–9) וכפתור מחיקה אחד, `disabled` מועבר ישירות מ-`feedback !== null` הקיים ב-
`Practice.tsx` (אותו תנאי ששדה-הטקסט כבר מושבת לפיו). שום לוגיקה חדשה ב-`checkAnswer`.

**Result/History:** CSS + ריבוד-JSX בלבד, ללא state/props חדשים.

## Edge Cases
- **נושא שמעולם לא תורגל:** `statsByTopic` לא מחזיר שורה בכלל (לא שורה עם `total: 0`) —
  `TopicPicker` מטפל בזה כ-`row ?? { correct: 0, total: 0 }`, ו-`starsForAccuracy(0, 0)`
  מחזיר `0` → שלושה כוכבים ריקים, לא ברירת-מחדל "מלא".
- **יותר מ-5 תלמידים:** חזרה על שילוב צורה+צבע היא התנהגות מתוכננת, לא באג (ראו design.md).
- **שאלה שגם מתאימה ל-`tenFrame` וגם ל-`quantityDots`:** אין התנגשות — `tenFrame`
  מוצג רק בתוך `QuestionExplanation` (אחרי תשובה שגויה), `quantityDots` מוצג מעל
  תיבת-השאלה (מיד, לפני תשובה). שתי תצוגות שונות באותה שאלה אינן סתירה.
- **מקלדת-מספרים אחרי תשובה:** `disabled` זהה לתנאי של שדה-הטקסט — אי-אפשר "להקליד"
  דרך המקלדת אחרי שהתשובה כבר נבדקה, בדיוק כמו שדה-הטקסט עצמו.
- **חיסור עם `b > a` בפרומפט:** לא אמור לקרות בנתונים אמיתיים (זו שאלת-חיסור תקינה),
  אבל `quantityDots` מחזיר `null` אם זה כן קורה — בלי לנחש/לתקן, בדיוק כמו `tenFrame`
  שמחזיר `null` על כל דבר שלא תואם בדיוק.
- **RTL:** כל התוספות הן ספרות-בודדות/אייקונים/SVG — אין מחרוזת-מעורבת חדשה שנכנסת
  ל-bidi algorithm של הדפדפן (ראו design.md, Accessibility/RTL notes).

## Risks / Tradeoffs
- **בכוונה בלי flag בזמן-ריצה (`?ui2=...`), בניגוד להצעה המקורית בבקשה:** כל שינוי-
  עיצוב קודם בפרויקט (candy-redesign, playful-redesign, back-link-redesign) עבר ביקורת
  דרך build עצמאי על בראנץ' + קישור, לא דרך toggle חי באפליקציה עצמה — האפליקציה הזו
  פרוסה כאתר סטטי ללא rollout הדרגתי, אז flag בזמן-ריצה מוסיף מורכבות (localStorage
  נוסף, query-param נוסף) בלי יתרון אמיתי כאן. תבנית `uiFlags.ts` שהוזכרה בבקשה שייכת
  לפרויקט-משחקים אחר עם rollout הדרגתי אמיתי מול משתמשי-קצה רבים — לא רלוונטית למבנה
  הזה. אם המשתמש בכל זאת רוצה את זה, זו תוספת קטנה בסבב נפרד, לא חוסמת כאן.
- **גליפי יוניקוד לתג-הזהות, לא SVG מותאם-אישית:** עקבי עם הסגנון הקיים (🗑➕🎉⭐ כבר
  בכל מקום), אבל פחות "מעוצב" מהמוקאפ של Stitch. נחשב viable כי הקריטריון המוצרי הוא
  "תג חזותי קבוע", לא עיצוב ספציפי.
- **איור-הכמות מוגבל ל-1–10 לכל אופרנד:** חלק משאלות-חיבור/חיסור של מיקה (כיתה א׳)
  עשויות לחרוג מהטווח הזה (למשל "add100") — אלה פשוט לא יקבלו איור, בלי שגיאה. תואם את
  הסעיף ב-design.md ("שאלה שלא עומדת בתנאי — המסך נשאר כמו היום").

## Open Questions
None.
