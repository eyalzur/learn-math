# שיעור לעומת תרגול — מסך לימוד לכל נושא — Architecture

## Overview
שני מסכים חדשים (`ModePicker`, `Lesson`) נכנסים ל-`Screen` union של `App.tsx` בין
בחירת נושא לכניסה לתרגול. הבלוק שכבר מרנדר את "איך פותרים?" בתוך `Practice.tsx`
(שיטה + כל הדיאגרמות + שלבים + דימוי) יוצא לרכיב משותף `QuestionExplanation`, יחד עם
פונקציה טהורה שמחשבת את כל אובייקטי הדיאגרמה + מערך ההקראה פעם אחת — כך ש-`Practice`
ו-`Lesson` קוראים לאותו קוד בדיוק, במקום ששני מקומות יחשבו את אותם `diagram`/`frame`/
`strip`/... בנפרד ויסתכנו לסטות זה מזה.

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
- `src/components/ModePicker.tsx` — מסך הביניים "שיעור"/"תרגול", לפי `design.md`
  §Screens/States #1. Props: `topicTitle`, `gradeLabel`, `onLesson`, `onPractice`,
  `onBack`. אותו דפוס חזותי כמו `StylePicker`/`TopicPicker` (כרטיסים ב-grid, לא
  רשימה).
- `src/components/Lesson.tsx` — מסך השיעור לפי `design.md` §Screens/States #2. Props:
  `topic: Topic`, `gradeLabel: string`, `onBack`, `onPractice`, `readAloud?: boolean`.
  מציג: כותרת נושא, problem-box (משתמש באותן class names `box-rtl`/`box-ltr`/
  `prompt-rtl`/`prompt-ltr` ש-`Practice.tsx` כבר משתמש בהן, ו-`segmented()` המיובא
  מ-`QuestionExplanation.tsx`), שני הרמזים כטקסט פשוט (לא כפתור-חשיפה כמו בתרגול —
  זו לא אינטראקציה, הכל גלוי מההתחלה), `<QuestionExplanation>`, וכפתור "→ לתרגול".

**משתנים:**
- `src/App.tsx` —
  - `Screen` union: מוסיף `{ name: "mode"; topic: Topic }` ו-
    `{ name: "lesson"; topic: Topic }`.
  - `enterTopic(topic)` (הלוגיקה הקיימת — התחלת סשן אדפטיבי + ניתוב ל-`insideTopic`)
    משנה שם ל-`enterPractice(topic)` ותוכנה לא משתנה כלל.
  - פונקציה חדשה: `enterTopic(topic)` הופכת ל-`setScreen({ name: "mode", topic })` —
    זה מה ש-`TopicPicker`'s `onSelect` עדיין קורא לו, בלי שינוי ב-`TopicPicker` עצמו.
  - שני ענפי רינדור חדשים: `screen.name === "mode"` מרנדר `<ModePicker>` עם
    `onLesson={() => setScreen({ name: "lesson", topic: screen.topic })}`,
    `onPractice={() => enterPractice(screen.topic)}`,
    `onBack={() => setScreen({ name: "home" })}`; `screen.name === "lesson"` מרנדר
    `<Lesson>` עם `onBack={() => setScreen({ name: "mode", topic: screen.topic })}`,
    `onPractice={() => enterPractice(screen.topic)}`.
  - `insideTopic()` **לא משתנה** — יציאה מתרגול/תוצאה ממשיכה ללכת בדיוק לאותו מקום
    כמו היום (home/levels/styles), לא דרך מסך הביניים. זה מה ש-Acceptance Criteria
    "התרגול מתנהג בדיוק כמו היום" דורש.
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
- `Screen` union גדל בשני איברים (`mode`, `lesson`) — ראו למעלה.
- אין שינוי בטיפוסי `Topic`/`Level`/`Question`/`AdaptiveConfig` ב-`curriculum.ts`.
- אין state חדש ב-`localStorage`/`progress.ts` — מסך השיעור לא נרשם בהיסטוריה
  (Out of Scope בספק).

## Technical Approach
1. **שאלת הדוגמה** נגזרת ב-`Lesson.tsx` (או ב-`App.tsx` לפני שהיא מועברת כ-prop —
   עדיף ב-`App.tsx`, כך ש-`Lesson` נשאר פשוט ומקבל `question` מוכן, לא לוגיקת בחירה):
   `topic.levels.find(l => l.id === "easy")?.questions[0] ?? topic.levels[0]?.questions[0] ?? null`.
   אם התוצאה `null` (לא אמור לקרות בנתונים הקיימים — כל נושא שומר `levels` גם
   כשהוא אדפטיבי, ראו PR #48), `App.tsx` לא בונה מסך שיעור ריק: כפתור "שיעור" ב-
   `ModePicker` מקבל `disabled` כש-`exampleQuestion === null`.
2. **`buildExplanation(question)`** רץ פעם אחת בראש `Lesson` ובראש `Practice` (רק
   כש-`feedback === "wrong"`, כמו היום) — לא בכל render של כל שאלה בתרגול, אותו
   עיקרון ביצועים שכבר קיים.
3. **`QuestionExplanation`** לא יודע כלום על "תרגול" מול "שיעור" — הוא מקבל `bundle`
   ו-`speak` אופציונלי ומרנדר. ה-caller מחליט מתי להראות אותו (Practice: אחרי טעות;
   Lesson: תמיד).
4. **הרמזים בשיעור** הם `question.hints[0]`/`[1]` מוצגים ישירות כטקסט, עטופים
   ב-`segmented()` (יש בהם ביטויים בגרשיים אחוריים בדיוק כמו בתרגול) — בלי מנגנון
   ה"חשיפת רמז בלחיצה" של `Practice.tsx`, כי אין כאן ניסיון לפתור.
5. **מבנה `ModePicker`/`Lesson`** עוקב אחרי `StylePicker.tsx` כתבנית (props דומות,
   `grade-header` + `h1` + grid של כרטיסים) — לא ממציא class names חדשים בלי צורך;
   `App.css` מקבל כללים חדשים לכרטיסי "שיעור"/"תרגול" ולכפתור "→ לתרגול" בלבד.

## Edge Cases
- **נושא בלי `levels` בפועל (לא אמור לקרות)**: מטופל בסעיף 1 למעלה — כפתור "שיעור"
  מנוטרל במקום קריסה או מסך ריק.
- **`methodSentence` מחזיר `null`** (רוב הנושאים): `Lesson`/`QuestionExplanation` לא
  מרנדרים את השורה בכלל — כבר ההתנהגות הקיימת ב-`Practice.tsx` (`{method && ...}`),
  שום קוד חדש נדרש.
- **נושא בלי אף דיאגרמה** (הרוב — לרוב הצורות אין ציור): `QuestionExplanation` מרנדר
  רק method+שלבים+דימוי, בדיוק כמו שקורה היום ב-Practice לאותם נושאים.
- **הקראה (`readAloud`)**: `Lesson` מעביר `speak` ל-`QuestionExplanation` רק אם
  `speechSupported()` — אותו תנאי שכבר קיים ב-Practice, לא כתיבה כפולה של הבדיקה.
- **תלמיד/ה שמגיעים ל-`Lesson` דרך ניווט ישיר (`onBack` מ-Result וכו')**: לא רלוונטי
  — `Lesson` נגיש רק דרך `ModePicker`, ו-`insideTopic()` לעולם לא מחזיר `lesson`.

## Risks / Tradeoffs
- **הריפקטור ב-`Practice.tsx` הוא הסיכון האמיתי כאן** — לא הוספת קוד, אלא הזזת ~150
  שורות קיימות. חובה להריץ את הסוויטה המלאה (ריצה נקייה בודדת) אחרי הריפקטור, לפני
  שממשיכים להוסיף את המסכים החדשים — אם משהו ב-`Practice.tsx` נשבר, עדיף לגלות את
  זה מיד ולא אחרי שגם `Lesson`/`ModePicker` כבר נבנו על גביו.
- **`buildExplanation` נקרא גם ל-`Lesson` וגם, בעקיפין, בכל מקום ש-`Practice.tsx`
  היה קורא בעבר לחישובים הנפרדים** — מבחינת ביצועים זה אותו מספר קריאות בדיוק, רק
  מקובץ יחד; אין רגרסיית ביצועים.
- **נבחר לא לגעת ב-`insideTopic()`** (יציאה מתרגול) כדי לצמצם סיכון — המשמעות היא
  שהזרימה **לא** סימטרית לגמרי (כניסה תמיד עוברת דרך `ModePicker`, יציאה מתרגול לא
  חוזרת דרכו) אלא הולכת ישר ל-`home`/`levels`/`styles`. זה תואם את קריטריון הקבלה
  המפורש ("תרגול מתנהג בדיוק כמו היום") ואת מה ש-`design.md` בפועל תיאר (רק כניסה
  ל-שיעור/תרגול משתנה, לא יציאה מתרגול).

## Open Questions
None.