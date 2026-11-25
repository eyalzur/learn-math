# תרגול שנקטע חוזר לנקודה המדויקת — Architecture

## Overview
מאגר `localStorage` חדש ונפרד, `src/data/interruptedSession.ts`, שומר אחרי כל תשובה
תמונת-מצב מלאה של הריצה הפעילה (מספר שאלה, ציון-חלקי, מערך-השאלות-המדויק של הריצה
הזו, וחותמת-זמן; גם דרגת-קושי/streak לנושא אדפטיבי). כניסה לנושא/רמה/סגנון בודקת
מאגר זה **לפני** כל נתיב "ריצה חדשה" קיים — אם יש רשומה טרייה (מתחת 24 שעות) היא
מנצחת, ו-`adaptiveProgress.ts` (דרגת-קושי לריצה *חדשה*) לא מתייעצים איתו בכלל.
סיום תקין (`finish()`) מוחק את הרשומה של אותו נושא/רמה/סגנון.

## Affected Files / Components
- **`src/data/interruptedSession.ts`** (חדש) — המאגר. אותו דפוס try/catch מגונן
  בדיוק כמו `adaptiveProgress.ts`/`progress.ts`. פונקציות:
  `loadInterruptedSession(studentId, gradeId, topicId, lessonKey?)`,
  `saveInterruptedSession(studentId, gradeId, topicId, lessonKey, snapshot)`,
  `clearInterruptedSession(studentId, gradeId, topicId, lessonKey?)`,
  `clearStudent(studentId)`.
- **`src/components/Practice.tsx`**:
  - שני props חדשים, שניהם אופציונליים עם ברירת-מחדל `0` (לא משנה אף קורא קיים):
    `initialIndex?: number`, `initialCorrectCount?: number` — משמשים כערך ההתחלה
    של `useState(index)`/`useState(correctCount)` במקום `0` הקבוע.
  - `onAnswered` משנה חתימה: מ-`(correct: boolean) => void` (אופציונלי, רק
    לנושאים אדפטיביים) ל-`(correct: boolean, progress: { answeredCount: number;
    correctCount: number }) => void` — **תמיד מסופק**, לא רק לאדפטיבי. נקרא בתוך
    `checkAnswer()`, באותו מקום שהיה היום, עם `answeredCount = index + 1` ו-
    `correctCount` **מחושב מקומית** (`isCorrect ? correctCount + 1 : correctCount`),
    **לא** נקרא מה-state אחרי `setCorrectCount` — אותה מלכודת שכבר מתועדת בהערה
    הקיימת בקובץ (שורה ~145: "checkAnswer's own closure still has the
    pre-increment value"). קריאה ל-state כאן תחזיר את הערך הישן.
- **`src/App.tsx`**:
  - `Screen`'s `"practice"` variant מקבל שני שדות אופציונליים חדשים: `lessonKey?:
    string` (ה-`id` של הרמה/הסגנון שנבחר/ה — ריק לנושא אדפטיבי, שאין לו רמה/סגנון
    לבחור) ו-`resume?: { index: number; correctCount: number }`.
  - `enterTopicInGrade`'s ענף האדפטיבי: לפני `loadAdaptiveTier`/`freshAdaptiveSession`,
    קורא `loadInterruptedSession(student.id, forGradeId, topic.id)` (בלי `lessonKey`).
    רשומה תקפה → בונה את `adaptiveSession` **ישירות** מהרשומה (`difficulty`,
    `streak`, `answeredCount`, `questions` כמו שהם) ו-`setScreen({ ..., resume: {
    index: rec.answeredCount, correctCount: rec.correctCount } })` — מדלג
    לגמרי על `loadAdaptiveTier`/`freshAdaptiveSession`. אין רשומה (או שלא תקפה)
    → ההתנהגות הקיימת, ללא שינוי.
  - `LevelPicker`'s `onSelect` ו-`StylePicker`'s `onSelect`: לפני `setScreen`, קורא
    `loadInterruptedSession(student.id, gradeId, topic.id, level.id)` (או
    `style.id`). רשומה תקפה → `lesson: { title: level.title (או style.title),
    questions: rec.questions }` (לא `level`/`style` הגולמיים — המערך המדויק
    השמור, לא מה שכתוב בתוכן, כדי לשרוד שינוי-תוכן בין גרסאות) ו-`resume: {
    index: rec.answeredCount, correctCount: rec.correctCount }`; גם כש**אין**
    רשומה, `lessonKey: level.id`/`style.id` מועבר ל-`screen` כדי שהכתיבה-אחרי-כל-תשובה
    (ראו למטה) תדע לאיזה מפתח לכתוב.
  - תוחלף `onAnswered={topic?.adaptive ? (correct) => handleAdaptiveAnswered(topic,
    correct) : undefined}` ב-handler אחד כללי, **תמיד מסופק**, שמקבל גם את
    `progress` החדש: `onAnswered={(correct, progress) => handleAnswered(topic,
    lesson, screen.lessonKey, correct, progress)}`.
  - `handleAdaptiveAnswered` (שם נשאר, לוגיקה פנימית משתנה קלות) מחשב
    `difficulty`/`streak`/`questions` **כערכים מקומיים רגילים** (לא בתוך updater
    עם `prev`) מה-closure החיצוני `adaptiveSession` — ממשיך את התבנית שכבר
    קיימת מ-`adaptive-lesson-start` (שם `streak`/`difficulty` כבר נקראים מה-closure
    ולא מ-`prev`); ההבדל היחיד: ה-`questions` החדש מחושב גם הוא כערך מקומי לפני
    הקריאה ל-`setAdaptiveSession`, לא בתוכה, כדי שיהיה זמין גם לכתיבה למאגר
    החדש מבלי לקרוא state שעדיין לא התעדכן.
  - `handleAnswered(topic, lesson, lessonKey, correct, progress)` — פונקציה חדשה,
    עוטפת את `handleAdaptiveAnswered` הקיים (רק לנושא אדפטיבי) ומוסיפה בנוסף,
    **לכל סוג נושא**: `if (student && gradeId && topic) saveInterruptedSession(
    student.id, gradeId, topic.id, lessonKey, { answeredCount: progress.answeredCount,
    correctCount: progress.correctCount, questions: topic.adaptive ? <ה-questions
    המקומי שחושב לעיל> : lesson.questions, difficulty: topic.adaptive ?
    <ה-difficulty המקומי> : undefined, streak: topic.adaptive ? <ה-streak המקומי>
    : undefined })`.
  - `finish(topic, lesson, correctCount, lessonKey)` — פרמטר רביעי חדש. מוסיף
    `if (student && gradeId && topic) clearInterruptedSession(student.id, gradeId,
    topic.id, lessonKey)` לצד ה-`setAdaptiveSession(null)` הקיים. הקריאה
    ב-JSX הופכת מ-`finish(topic, lesson, correctCount)` ל-`finish(topic, lesson,
    correctCount, screen.lessonKey)`.
  - `deleteStudent` מוסיף קריאה שלישית, `clearInterruptedSessions(id)` (ה-`clearStudent`
    המיובא מהמודול החדש, עם alias כמו ששתי הקריאות הקיימות כבר עושות:
    `clearStudentProgress`/`clearStudentAdaptiveTiers`).
  - **`onExit` לא משתנה** — יציאה-באמצע לא מוחקת כלום; המאגר כבר מעודכן מהתשובה
    האחרונה שנענתה, וזו כל הנקודה.

## Data / State Changes
- **מאגר חדש:** `Record<string, InterruptedSession>` תחת `learn-math:interrupted-session`
  ב-`localStorage`. מפתח: `` `${studentId}:${gradeId}:${topicId}${lessonKey ? `:${lessonKey}` : ""}` ``
  — ריק ל-`lessonKey` בנושא אדפטיבי (אין רמה/סגנון, בדיוק כמו `adaptiveProgress.ts`'s
  מפתח-משולש), אחרת `level.id`/`style.id`.
  ```ts
  interface InterruptedSession {
    answeredCount: number;
    correctCount: number;
    questions: Question[]; // תמונת-מצב מדויקת, לא מחושבת מחדש
    savedAt: number; // Date.now(), לבדיקת 24 השעות
    difficulty?: number; // רק לנושא אדפטיבי
    streak?: number;     // רק לנושא אדפטיבי
  }
  ```
- `Screen`'s `"practice"` variant: שני שדות אופציונליים חדשים (`lessonKey`, `resume`)
  — לא שוברים שום מקום קיים שלא יודע עליהם.
- `Practice`'s props: שני אופציונליים חדשים (`initialIndex`, `initialCorrectCount`),
  `onAnswered`'s חתימה מתרחבת (תמיד מסופק, לא עוד `undefined` אף פעם).
- **אין שינוי** ל-`adaptiveProgress.ts`/`progress.ts`/`curriculum.ts` — שלושה מאגרים
  נפרדים, בדיוק כמו ש-`adaptive-lesson-start`'s architecture.md כבר קבע בין השניים
  הקיימים.

## Technical Approach
1. **כתיבה (כל תשובה, לכל סוג נושא):** `Practice.checkAnswer()` מחשב `answeredCount`
   ו-`correctCount` מקומית (לא מה-state) וקורא `onAnswered(isCorrect, { answeredCount,
   correctCount })`. `App.tsx`'s `handleAnswered` כותב למאגר החדש **בכל קריאה**, בלי
   תנאי על סוג הנושא — זה מה שמבטיח שגם רמות/סגנונות (לא רק נושאים אדפטיביים) נהנים
   מהפיצ'ר, בלי לוגיקה כפולה.
2. **קריאה (תחילת תרגול):** שתי נקודות-כניסה בודקות את המאגר **לפני** בניית ריצה
   חדשה — `enterTopicInGrade`'s ענף האדפטיבי (מפתח בלי `lessonKey`), ו-`LevelPicker`/
   `StylePicker`'s `onSelect` (מפתח עם `level.id`/`style.id`). שני המקרים: רשומה
   תקפה → המערך/המונים נלקחים **בדיוק כמו שנשמרו**, בלי יצירה-מחדש של אף שאלה —
   זה מה ששומר על ההבטחה הקיימת ש"שאלה לא חוזרת ברצף על עצמה"
   (`docs/features/no-repeat-consecutive-questions/`): השאלה הראשונה שתוצג אחרי
   החזרה היא בדיוק השאלה שנוצרה/נבדקה-מול-withoutRepeatingPrompt **לפני** היציאה,
   לא שאלה חדשה שנוצרה ברגע החזרה. שום קוד חדש לא קורא ל-`withoutRepeatingPrompt`
   בנקודת-החזרה — זה כבר נכון מעצמו, ולא כי נוספה הגנה חדשה.
3. **תקפות הרשומה (`loadInterruptedSession`):**
   - גיל: `Date.now() - savedAt <= 24h`, אחרת מתייחסים כ"אין רשומה" (ראו Edge Cases).
   - שלמות: `answeredCount < questions.length` — רשומה שבה כל השאלות כבר נענו
     (ריצה שהגיעה בפועל לסוף אבל נקטעה *אחרי* התשובה האחרונה ולפני המעבר למסך
     הסיכום) מתייחסת כ"אין רשומה" — אין "שאלה הבאה" להציג (ראו Edge Cases).
   - התאמה לתוכן הנוכחי, רק לאדפטיבי: `questions.length === adaptive.questionCount`
     וה-`difficulty` השמור בטווח `[minDifficulty, maxDifficulty]` הנוכחי — אחרת
     "אין רשומה" (תוכן שהשתנה בין גרסאות, אותה מחשבה כמו `adaptiveProgress`'s
     קולאמפ, אבל כאן פוסל את כל הרשומה ולא קולאמפ חלקי, כי מערך-שאלות שלם לא ניתן
     "לקולאמפ" כמו מספר בודד).
   - כל הבדיקות האלה חיות בתוך `loadInterruptedSession` עצמה, לא בקוד הקורא —
     קורא מקבל `InterruptedSession | null`, לא רשומה גולמית שהוא צריך לאמת בעצמו.
4. **מחיקה (סיום תקין בלבד):** `finish()` קורא `clearInterruptedSession` עם אותו
   `lessonKey` שנכנסו איתו לתרגול. יציאה-מוקדמת (`onExit`) לא קוראת למחיקה בכלל —
   ההבדל בין "סיימו" ל"עזבו" הוא ההבדל היחיד בין שני הנתיבים.

## Edge Cases
- **ריצה שהגיעה לסוף אך נקטעה בדיוק אחרי התשובה האחרונה, לפני מסך הסיכום**
  (לדוגמה: תשובה נכונה על השאלה ה-20, סגירת האפליקציה בתוך חלון ה-2 השניות
  לפני שה-`setTimeout` קורא ל-`next()`/`onFinish`): הרשומה האחרונה שנכתבה יש לה
  `answeredCount === questions.length` — `loadInterruptedSession` מזהה את זה
  ומתייחס כ"אין רשומה תקפה" (סעיף 3 למעלה), כך שהכניסה הבאה היא ריצה חדשה רגילה
  (עם דרגת-קושי שמורה מ-`adaptiveProgress` כרגיל) — לא קריסה, לא "שאלה 21 מתוך 20".
- **יציאה בלי לענות אף שאלה:** שום כתיבה חדשה לא קורית (אין קריאה ל-`onAnswered`
  בכלל) — הרשומה הקודמת (אם יש) נשארת תקפה כפי שהיא; אם זו הכניסה הראשונה
  לריצה הזו, אין רשומה כלל, בדיוק כמו היום.
- **מעבר לנושא/רמה/סגנון אחר ואז חזרה:** המפתח כולל `topicId`/`lessonKey`, כך
  שכניסה לנושא אחר לא נוגעת ברשומה של הנושא הקודם — חזרה לנושא המקורי תוך 24
  שעות עדיין מוצאת ומשתמשת בה, בדיוק כמו ש-product-spec דורש.
- **התיישנות (24 שעות):** נבדקת ב-`loadInterruptedSession` בזמן-קריאה, לא
  ב-timer/ניקוי-ברקע — רשומה ישנה פשוט לא נטענת יותר (מתנהגת כ"אין רשומה"),
  ונדרסת בפעם הבאה שנכתב משהו חדש לאותו מפתח. אין צורך במנגנון-ניקוי יזום.
- **תוכן שהשתנה בין גרסאות (נושא אדפטיבי):** רשומה שה-`questionCount`/טווח-הקושי
  שלה לא תואם את התוכן הנוכחי נפסלת כולה (סעיף 3), לא "מתוקנת" — מערך שאלות
  שלם אינו משהו שניתן לתקן חלקית בלי לשנות מה שהתלמיד/ה בפועל ראה/תה.
- **`localStorage` חסום/לא זמין:** אותו דפוס try/catch-והחזר-ריק כמו שני המאגרים
  הקיימים — קריאה כושלת = "אין רשומה" (ריצה חדשה), כתיבה כושלת נבלעת בשקט.
- **מחיקת תלמיד/ה:** `clearStudent`/`deleteStudent` מנקה גם את המאגר הזה, לא
  משאיר רשומות-יתומות של תלמיד/ה שנמחק/ה.

## Risks / Tradeoffs
- **שמירת מערך-השאלות המלא גם לרמות/סגנונות לא-אדפטיביים, אף שהוא כבר קבוע-מראש
  ולא היה חייב להישמר** (אפשר היה להסתפק ב-`answeredCount`/`correctCount` בלבד
  ולהישען על `topic.levels`/`stylesOf` לשלוף את המערך מחדש) — נבחר בכוונה בשביל
  מימוש אחיד (אותה קריאה/כתיבה לשני סוגי הנושאים, בלי branch נפרד) ובשביל עמידות
  מול שינוי-תוכן בין גרסאות (ראו Edge Cases). העלות: עותק קטן (10-30 שאלות,
  כל אחת כמה מחרוזות/מספרים) שנכתב לכל תשובה — תקציב-זמן-ריצה זניח, בדיוק כמו
  ש-`adaptive-lesson-start`'s כתיבה-בכל-תשובה כבר הוכרעה.
- **מפתח `lessonKey` משתמש ב-`id` (לא `title`)** של הרמה/הסגנון — נבחר כי זה
  המזהה הקאנוני שכבר קיים על האובייקט (`Level.id`/`Style.id`), בלי להסתכן
  בכפילות-כותרת או בשינוי-ניסוח עתידי שישבור את המפתח.
- **`onAnswered` הופך מאופציונלי (רק אדפטיבי) לתמיד-מסופק** — שינוי-חתימה לא
  תאימת-לאחור לקומפוננטה, אבל יש קורא יחיד בקוד (`App.tsx`'s מסך-התרגול), אז
  אין סיכון-תאימות אמיתי מעבר לעדכון אותו קורא יחיד.
- **לא נבנה מנגנון "התחל מחדש" מפורש** (Out of Scope ב-product-spec) — אם רשומה
  לא-רצויה "נדבקת" (למשל קטיעה באמצע שהתלמיד/ה לא רוצה להמשיך ממנה), אין דרך
  ידנית למחוק אותה חוץ מהמתנה ל-24 שעות. זה הכרעה מוצרית מכוונת, לא פער שנשכח.

## Open Questions
None.
