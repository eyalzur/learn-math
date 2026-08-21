# שיעור לעומת תרגול — מסך לימוד לכל נושא — Architecture

## Overview
מסך שיעור חדש (`TopicLesson`) נכנס ל-`Screen` union של `App.tsx`, נגיש דרך כפתור
משני על כרטיס הנושא ב-`TopicPicker` — **לא** דרך מסך ביניים חובה (ראו "תיקון אחרי
גילוי" למטה: הגרסה הראשונה של המסמך הזה תכננה מסך ביניים, והתגלתה כבעיה בזמן
הפיתוח). הבלוק שכבר מרנדר את "איך פותרים?" בתוך `Practice.tsx` (שיטה + כל
הדיאגרמות + שלבים + דימוי) יוצא לרכיב משותף `QuestionExplanation`, יחד עם פונקציה
טהורה שמחשבת את כל אובייקטי הדיאגרמה + מערך ההקראה פעם אחת — כך ש-`Practice` ו-
`TopicLesson` קוראים לאותו קוד בדיוק, במקום ששני מקומות יחשבו את אותם
`diagram`/`frame`/`strip`/... בנפרד ויסתכנו לסטות זה מזה.

## Affected Files / Components

**חדשים:**
- `src/data/questionExplanation.ts` — פונקציה טהורה `buildExplanation(question)` שמחשבת
  ומחזירה: `method` (מ-`methodSentence`), `explanation` (מ-`explainQuestion`), וכל אחד
  מ-11 אובייקטי הדיאגרמה (`diagram`, `frame`, `strip`, `vertical`, `line`, `geometry`,
  `pythagoras`, `percent`, `ratio`, `linear`) — בדיוק אותן 11 הקריאות שכבר קיימות
  ב-`Practice.tsx` (שורות ~104–119), רק מרוכזות במקום אחד. פונקציה שנייה,
  `explanationSpeechParts(bundle)`, בונה את מערך ההקראה — בדיוק ההיגיון שכבר קיים
  ב-`Practice.tsx`'s `toggleSpeech` (שורות ~300–315), פחות שני החלקים הספציפיים
  לאבחון-טעות (`diagnosis`) שלא שייכים לשיעור.
- `src/components/QuestionExplanation.tsx` — הרכיב שמרנדר את הבלוק (method + 11
  הפיגורות המותנות + שלבים + דימוי) — מועתק כמעט מילה-במילה מ-`Practice.tsx`'s
  `<div className="explanation">...</div>` (שורות ~468–591), רק לוקח `bundle` כ-prop
  במקום לחשב בעצמו. גם `segmented()` (כרגע מוגדרת פרטית ב-`Practice.tsx`, שורות
  46–56) עוברת לכאן ומיוצאת — שני הצרכנים (`Practice`, `Lesson`) משתמשים באותה אחת.
  Prop אופציונלי `speak?: { active: boolean; onToggle: () => void }` לכפתור ה-🔊 —
  נעדר ⇒ בלי כפתור הקראה, כמו שקורה היום כש-`speechSupported()` הוא false.
- `src/components/TopicLesson.tsx` — מסך השיעור לפי `design.md` §Screens/States #2.
  Props: `topicTitle: string`, `gradeLabel: string`, `question: Question`, `onBack`,
  `onPractice`. מציג: כותרת נושא, problem-box (משתמש באותן class names
  `box-rtl`/`box-ltr`/`prompt-rtl`/`prompt-ltr` ש-`Practice.tsx` כבר משתמש בהן,
  ו-`segmented()` המיובא מ-`components/segmented.tsx`), שני הרמזים כטקסט פשוט (לא
  כפתור-חשיפה כמו בתרגול — זו לא אינטראקציה, הכל גלוי מההתחלה), `<QuestionExplanation>`,
  וכפתור "→ לתרגול". שם הרכיב `TopicLesson`, לא `Lesson` — `Lesson` הוא כבר הטיפוס
  הקיים ב-`data/style.ts` (title+questions), ושם זהה לשניהם היה מתנגש בייבוא.

**משתנים:**
- `src/components/TopicPicker.tsx` — כל כרטיס נושא עוטף בשורה (`.topic-row`) עם
  כפתור-אייקון נוסף (`onLesson?: (topic: Topic) => void`) לצידו — לא בתוכו. הכרטיס
  הראשי (`onSelect`) לא משתנה כלל.
- `src/App.tsx` —
  - `Screen` union: מוסיף רק `{ name: "lesson"; topic: Topic }`.
  - `enterTopic(topic)` **לא משתנה** — אותה פונקציה, אותה התנהגות, בדיוק כמו לפני
    הפיצ'ר הזה.
  - פונקציה חדשה `enterLesson(topic)`: `setScreen({ name: "lesson", topic })`.
  - ענף רינדור חדש: `screen.name === "lesson"` מרנדר `<TopicLesson>` עם
    `onBack={() => setScreen({ name: "home" })}`, `onPractice={() => enterTopic(topic)}`.
  - `TopicPicker`'s שתי קריאות (מסך הבית + ה-fallback) מקבלות `onLesson={enterLesson}`.
  - `insideTopic()` **לא משתנה בכלל**.
- `src/components/Practice.tsx` —
  - מסיר את 11 שורות החישוב (`const diagram = ...` וכו') ואת `segmented()` המקומית;
    מייבא `buildExplanation`, `explanationSpeechParts`, `segmented` מהקבצים החדשים.
  - הבלוק `<div className="explanation">...</div>` מוחלף ב-
    `<QuestionExplanation bundle={bundle} speak={...} />`.
  - `toggleSpeech`'s `explanation` box מחליף את הבנייה הידנית של המערך בקריאה
    ל-`explanationSpeechParts(bundle)` (פלוס שני חלקי ה-diagnosis שנשארים ספציפיים
    ל-Practice).
  - שום שינוי בהתנהגות גלויה — זה ריפקטור, לא פיצ'ר.

## Data / State Changes
- `Screen` union גדל באיבר אחד (`lesson`) — ראו למעלה.
- אין שינוי בטיפוסי `Topic`/`Level`/`Question`/`AdaptiveConfig` ב-`curriculum.ts`.
- אין state חדש ב-`localStorage`/`progress.ts` — מסך השיעור לא נרשם בהיסטוריה
  (Out of Scope בספק).

## Technical Approach
1. **שאלת הדוגמה** נגזרת ב-`App.tsx` (`lessonExample(topic)`), לפני שהיא מועברת
   כ-prop מוכן ל-`TopicLesson` — כך שהרכיב עצמו נשאר פשוט, בלי לוגיקת בחירה:
   `topic.levels.find(l => l.id === "easy")?.questions[0] ?? topic.levels[0]?.questions[0] ?? null`.
   אם התוצאה `null` (לא אמור לקרות בנתונים הקיימים — כל נושא שומר `levels` גם
   כשהוא אדפטיבי, ראו PR #48), `App.tsx`'s `screen.name === "lesson"` branch מחזיר
   `null` במקום לקרוס — לא אמור להיות נגיש, כי `TopicPicker` מציע את כפתור השיעור
   רק לנושא `reviewed`, וכל נושא `reviewed` היום מחזיק `levels` תקין.
2. **`buildExplanation(question)`** רץ פעם אחת בראש `TopicLesson` ובראש `Practice`
   (רק כש-`feedback === "wrong"`, כמו היום) — לא בכל render של כל שאלה בתרגול, אותו
   עיקרון ביצועים שכבר קיים.
3. **`QuestionExplanation`** לא יודע כלום על "תרגול" מול "שיעור" — הוא מקבל `bundle`
   ו-`speak` אופציונלי ומרנדר. ה-caller מחליט מתי להראות אותו (Practice: אחרי טעות;
   TopicLesson: תמיד).
4. **הרמזים בשיעור** הם `question.hints[0]`/`[1]` מוצגים ישירות כטקסט, עטופים
   ב-`segmented()` (יש בהם ביטויים בגרשיים אחוריים בדיוק כמו בתרגול) — בלי מנגנון
   ה"חשיפת רמז בלחיצה" של `Practice.tsx`, כי אין כאן ניסיון לפתור.
5. **כפתור השיעור ב-`TopicPicker`** עוקב אחרי `StylePicker.tsx`'s כפתור ה-🔊 כתבנית —
   כפתור-אייקון קטן, לצד הכרטיס בתוך שורה משותפת, לא class names חדשים בלי צורך.

## Edge Cases
- **נושא בלי `levels` בפועל (לא אמור לקרות)**: מטופל בסעיף 1 למעלה — `TopicPicker`
  לא מציע שיעור לנושא לא-`reviewed`, וכל נושא `reviewed` מחזיק `levels`.
- **`methodSentence` מחזיר `null`** (רוב הנושאים): `TopicLesson`/`QuestionExplanation`
  לא מרנדרים את השורה בכלל — כבר ההתנהגות הקיימת ב-`Practice.tsx` (`{method && ...}`),
  שום קוד חדש נדרש.
- **נושא בלי אף דיאגרמה** (הרוב — לרוב הצורות אין ציור): `QuestionExplanation` מרנדר
  רק method+שלבים+דימוי, בדיוק כמו שקורה היום ב-Practice לאותם נושאים.
- **הקראה (`readAloud`)**: `TopicLesson` מציע כפתור הקראה רק אם `speechSupported()` —
  אותו תנאי שכבר קיים ב-Practice, לא כתיבה כפולה של הבדיקה.

## Risks / Tradeoffs
- **הריפקטור ב-`Practice.tsx` הוא סיכון אמיתי** — לא הוספת קוד, אלא הזזת ~150 שורות
  קיימות. הסוויטה המלאה (ריצה נקייה בודדת) רצה אחרי הריפקטור ולפני הוספת המסכים
  החדשים, בדיוק כמו שתוכנן.
- **תיקון אחרי גילוי בזמן הפיתוח**: התכנון המקורי (ראו design.md) היה מסך ביניים
  חובה ("שיעור"/"תרגול") בין כל כניסה לנושא לתרגול. מימוש ראשוני שלו + ריצת הסוויטה
  המלאה חשפו שכמעט כל בדיקות ה-e2e הקיימות (כ-20 קבצי spec) מניחות שכרטיס נושא
  נכנס ישר לתרגול — כל אחת מהן נכשלה (timeout, לא שגיאה אמיתית בקוד). זה סיכון
  שהיה צריך להיצפות כבר בשלב העיצוב ולא נצפה. **התיקון**: הוחלף למסך ביניים בכפתור
  משני על הכרטיס (לא מסך חוסם) — קריאה ל-`enterTopic` חוזרת בדיוק להתנהגות המקורית,
  אפס נגיעה בזרימת התרגול הקיימת. `design.md` עודכן לשקף את זה. הלקח לפעמים הבאות:
  שינוי בזרימת הניווט הראשית (לא רק הוספת מסך בקצה) מצדיק בדיקה ידנית של כמה בדיקות
  e2e קיימות תלויות בנתיב הזה, לפני מימוש מלא — לא רק אחריו.

## Open Questions
None.

## Implementation Notes

בנוי בדיוק לפי הארכיטקטורה למעלה (הגרסה המתוקנת), אחרי סבב אחד של תיקון אמיתי
שתועד למעלה תחת "תיקון אחרי גילוי בזמן הפיתוח" — לא חוזר על זה כאן.

**מה נבנה בפועל:**
- `src/data/questionExplanation.ts` — `buildExplanation`/`explanationSpeechParts`,
  בדיוק כמתוכנן.
- `src/components/segmented.tsx` — קובץ נפרד ל-`segmented()` שלא תוכנן מראש
  ב-architecture.md (שם תוכנן שהיא תגור ב-`QuestionExplanation.tsx`): oxlint's
  `react(only-export-components)` מזהיר כשקובץ מייצא גם קומפוננטה וגם פונקציה רגילה
  (שובר Fast Refresh) — `segmented()` הוצאה לקובץ נפרד במקום, ו-`Practice.tsx`/
  `TopicLesson.tsx`/`QuestionExplanation.tsx` שלושתם מייבאים ממנו.
- `src/components/QuestionExplanation.tsx`, `src/components/TopicLesson.tsx` —
  כמתוכנן, עם התאמת השם `TopicLesson` (לא `Lesson`) שתועדה למעלה.
- `src/components/TopicPicker.tsx` — כפתור-אייקון `.lesson-link` נוסף לכל שורת נושא
  `reviewed`, בתוך `.topic-row` חדש שעוטף את `.topic-card` הקיים. הכרטיס עצמו לא
  נגע בכלל.
- `src/App.tsx` — `enterTopic` נשאר בדיוק כמו שהיה; `enterLesson` חדש; `Screen`
  מקבל רק `"lesson"`. תוך כדי התיקון נמצא ותוקן גם באג אמיתי (לא קשור לתכנון
  המקורי, לא קשור לתיקון עצמו): `Result`'s `onRetry` לנושא אדפטיבי קרא ל-`enterTopic`
  שבגרסת-הביניים (המסך החוסם) כבר לא נכנס ישר לתרגול — "נסה שוב" היה שולח למסך
  ביניים במקום להתחיל תרגול חדש. תוקן יחד עם המעבר לגרסה הסופית, שבה `enterTopic`
  חזר להתנהג בדיוק כמו לפני הפיצ'ר.
- `src/App.css` — `.topic-row`, `.lesson-link` (בהשראת `.style-row`/`.style-speak`
  הקיימים).

**מה לא נבנה בכלל (ורוד בכוונה, לא הושמט בטעות):** `src/components/ModePicker.tsx`
נכתב, נבדק ידנית, ואז נמחק לגמרי כשהתכנון המקורי הוחלף — לא נשאר קוד מת ממנו.

**בדיקות:** `236/236` בריצה אחת נקייה (`npm run build && npm run lint && npm run
test:e2e`), גרסה `1.19.0`. שום קובץ בדיקה קיים לא נגע — הגרסה הסופית לא שינתה שום
נתיב שבדיקה קיימת תלויה בו.

## עדכון ארכיטקטורה לרוויזיה (2026-08-21) — כמה דוגמאות אצל topic.adaptive

המשתמש אישר את המסך בתצוגה מקדימה, אבל ביקש (design.md's "עדכון עיצוב לרוויזיה"):
נושא עם `Topic.adaptive` (רותם/עומר, 12 מחוללים) מציג דוגמה אחת לכל דרגת קושי
(`minDifficulty..maxDifficulty`, בפועל תמיד `1`–`5`), לא רק את הקלה ביותר; נושא
בלעדיו (מיקה) ללא שינוי — דוגמה אחת בדיוק כמו היום.

### Affected Files / Components (מעודכן)
- **`src/App.tsx`** — `lessonExample(topic): Question | null` (שורה 179) הופך
  ל-`lessonQuestions(topic): Question[]`. הענף `screen.name === "lesson"`
  (שורות 275–292) קורא לפונקציה החדשה, בודק `questions.length === 0` במקום
  `question === null`, ומעביר `questions` (לא `question`) ל-`TopicLesson`.
- **`src/components/TopicLesson.tsx`** — פרופ `question: Question` הופך ל-
  `questions: Question[]` (שינוי לא-תואם לאחור בכוונה — קורא יחיד, `App.tsx`,
  מתעדכן באותו commit). הבלוק שמרנדר קופסת שאלה + רמזים + `QuestionExplanation`
  (שורות 83–95 היום) עובר לתוך `questions.map(...)`; `toggleSpeak` מתרחב לבנות
  את מערך ההקראה על פני כל השאלות ברצף.
- אין שינוי ב-`src/data/curriculum.ts` — `Topic.adaptive` כבר מחזיק בדיוק את
  השדות הדרושים (`generate`, `minDifficulty`, `maxDifficulty`).

### Technical Approach
```ts
function lessonQuestions(topic: Topic): Question[] {
  if (!topic.adaptive) {
    const q = topic.levels.find((l) => l.id === "easy")?.questions[0] ?? topic.levels[0]?.questions[0];
    return q ? [q] : [];
  }
  const { generate, minDifficulty, maxDifficulty } = topic.adaptive;
  const questions: Question[] = [];
  for (let d = minDifficulty; d <= maxDifficulty; d++) questions.push(generate(d));
  return questions;
}
```
נקרא **בלי `rng` מפורש** — `generate` נופל חזרה ל-`Math.random` כברירת המחדל שלו
(אותה חתימה בה `Practice.tsx` כבר משתמש), כך שכל פתיחה של מסך השיעור מציגה מספרים
טריים לאותה דרגת קושי — עקבי עם איך שהתרגול עצמו כבר מתנהג, לא בונים seed קבוע רק
בשביל מסך אחד.

ב-`TopicLesson.tsx`, הבלוק החוזר (`problem-box` + `hints` + `QuestionExplanation`)
עובר ללולאה על `questions`, עם `key={question.id}` (כבר ייחודי בשני המקורות —
`makeFreshId` במחוללים, מזהה כתוב קבוע בשאלות הכתובות). כותרת
`<h3>דוגמה {i + 1} מתוך {questions.length}</h3>` מוצגת **רק כש-`questions.length > 1`**
— כך גם נושא לא-`adaptive` (תמיד מערך של איבר אחד) וגם המקרה הקיצוני התיאורטי
`minDifficulty === maxDifficulty` (מערך של איבר אחד מנושא `adaptive`) מתנהגים
זהה: בלי כותרת, בדיוק כמו העיצוב הישן.

`toggleSpeak` בונה את מערך החלקים כך: לכל שאלה ב-`questions`, אם
`questions.length > 1` מוסיף קודם חלק טקסט "דוגמה {i+1} מתוך {questions.length}"
(דרך `speechParts`, לא מחרוזת גולמית מוזרקת לתור ה-`speak` — עקבי עם שאר הקוד),
ואז את `speechParts([promptText, ...hints])` + `explanationSpeechParts(bundle)`
של אותה שאלה, לפני שעובר לשאלה הבאה.

### Edge Cases
- **`minDifficulty === maxDifficulty`** (תיאורטי — אף `AdaptiveConfig` היום לא
  כזה): מערך של איבר אחד, אין כותרת "דוגמה N מתוך M" — זהה להתנהגות נושא לא-`adaptive`.
- **סדר הדרגות**: `for (d = minDifficulty; d <= maxDifficulty; d++)` מבטיח קל→קשה
  תמיד, לא סדר יצירה שרירותי.

### Risks / Tradeoffs
- מסך ארוך יותר משמעותית אצל רותם/עומר (חמישה בלוקי הסבר מלאים במקום אחד) —
  הוחלט ואושר במפורש ב-design.md, לא תגלית של השלב הזה.
- `generate(d)` בלי `rng` קבוע אומר שהדוגמאות משתנות בכל פתיחה מחדש של השיעור —
  qa יצטרך לבדוק מבנה/ספירה (מספר בלוקים, כותרות, קל→קשה), לא תוכן מדויק, בדיוק
  כמו כל בדיקת e2e קיימת שנוגעת במחוללים האדפטיביים.

## Open Questions (מעודכן)
None.