# שתי תשובות — שני כפתורים — Architecture

## Overview
שדה אופציונלי חדש `choices` על `Question` מסמן במפורש "שאלת שתי-תשובות" וקובע אילו שני מספרים מוצגים. `Practice.tsx` מציג, כשהוא קיים, רכיב כפתורים חדש במקום שורת התשובה והמקלדת, ומעביר את הבחירה לאותה פונקציית בדיקה שתשובה מוקלדת עוברת בה היום.

## Affected Files / Components
- `src/data/curriculum.ts` — `Question` מקבל `choices?: readonly [number, number]` עם הערת תיעוד (בלי ברירת מחדל: היעדרו = מקלדת, כמו היום).
- `src/data/grade1.ts` — 11 השאלות ("bigger" ×7, "smaller" ×4, כולן ב-"מספרים עד 20") מקבלות `choices: [X, Y]` בסדר שבו המספרים מופיעים בניסוח. שום שדה אחר לא משתנה (`answer`, `hints`, `analogy`, `style` נשארים).
- `src/components/TwoChoiceButtons.tsx` — חדש. מקבל `choices`, `answer`, `chosen` (המספר שנבחר או `null`), `feedback` ו-`onChoose(n)`. מציג שני `<button>` ב-`role="group"` עם `aria-label="בחרו תשובה"`.
- `src/components/Practice.tsx` — (א) פיצול `checkAnswer` ל-`submitAnswer(parsed: number)` שמכיל את כל הלוגיקה הקיימת (משוב, ספירה, `onAnswered`, `diagnose`), ו-`checkAnswer` הופך עטיפה דקה שמפרסרת את `answerInput` וקוראת לו; (ב) state חדש `chosen: number | null`, מתאפס ב-`next()`; (ג) כש-`question.choices` קיים: במקום `.answer-row` ו-`NumberPad` מרנדרים `TwoChoiceButtons` ומתחתיו, רק ב-`feedback === "wrong"`, כפתור "הבא"/"סיום" יחיד (אותה לוגיקת `next`); כפתור הרמז והרמזים נשארים כמו שהם.
- `src/App.css` — סגנונות `.two-choice`, `.two-choice-button` ומצביו (`.correct`, `.wrong`, `.reveal`), ללא שינוי בכללים קיימים.
- `tests/e2e/content.spec.ts` — בדיקת שלמות נתונים חדשה (ראו Edge Cases).
- `package.json` — העלאת גרסה (`npm run bump:feature`).

## Data / State Changes
- `Question.choices?: readonly [number, number]`. אופציונלי, כך שאף מחולל אדפטיבי, שום בנק אחר ושום שאלה שמורה ב-`localStorage` (תרגול שנקטע) לא נשבר. שאלות שנשמרו לפני השינוי בלי `choices` ימשיכו להראות מקלדת עד סוף אותה ריצה; ריצה חדשה תקבל כפתורים.
- state מקומי ב-`Practice`: `chosen`.
- שום שינוי בפורמט ההיסטוריה (`recordPractice`), בספירה, או ב-`interruptedSession.ts` (הוא מסריאל את אובייקט השאלה כמו שהוא, כולל השדה החדש).

## Technical Approach
1. הגדרה מפורשת בנתונים (לא ניחוש מהטקסט), לפי הכרעה 3 במפרט.
2. `TwoChoiceButtons` לא מכיר את הלוגיקה: הוא מקבל מה לצבוע (`chosen`, `answer`, `feedback`) ומדווח לחיצה. אחרי תשובה (`feedback !== null`) שני הכפתורים `disabled`; הנבחר מקבל `correct`/`wrong`, ובשגיאה הנכון מקבל `reveal` (ירוק) כדי שיהיה ברור מה התשובה. סימני ✓/✗ הם `aria-hidden`.
3. הלחיצה קוראת `choose(n)` ב-`Practice`: `setChosen(n); setAnswerInput(String(n)); submitAnswer(n)`. השמירה על `answerInput` מאפשרת לקוד הקיים (אם משהו קורא אותו) להישאר עקבי; `submitAnswer` מחזיר מיד אם `feedback !== null`, כך שלחיצה כפולה לא נספרת פעמיים.
4. `diagnose(question, parsed)` נקרא כמו היום; ההסברים, הרמזים וההקראה לא נוגעים ב-`choices`.
5. עיצוב: `display: flex; gap: 16px; width: 100%; max-width: 360px`. כל כפתור `flex: 1; min-height: 112px; font-size: 44px; direction: ltr; unicode-bidi: isolate`. סדר ה-DOM הוא סדר `choices`, ובעמוד RTL האפשרות הראשונה יוצאת מימין (כמו הקריאה). אין `autoFocus`.
6. הזוהר הכללי של האפליקציה ("זרקור מנוחה") חל על הכפתורים כמו על שאר הכפתורים. שני כפתורים מחליפים תור, וזה מקובל.

## Edge Cases
- **שלמות נתונים (בדיקה חדשה ב-`content.spec.ts`):** לכל שאלה עם `choices`: שני המספרים שונים זה מזה; `answer` הוא אחד מהם; שניהם מופיעים בניסוח ובסדר שבו הם ב-`choices`; ולכל שאלה בסגנון `bigger` או `smaller` ב-grade1 חייב להיות `choices` (כדי ששאלה חדשה לא תחזור בשקט למקלדת).
- אין אפשרות להקליד תשובה שאינה אחת משתי האפשרויות (מטרה במפרט).
- לחיצה כפולה מהירה: מחזיר מיד אחרי הראשונה.
- תרגול שנקטע ושחוזר: השאלה נשמרת עם `choices`, ולכן חוזרת כפתורים; `chosen` מתחיל `null`.
- מספר דו-ספרתי ("13", "20"): `direction: ltr` + `isolate`.
- מקלדת חיצונית: Enter לא מוגדר (אין שדה); Tab+Enter/רווח על הכפתורים.
- השאלה האחרונה: אחרי תשובה שגויה הכפתור הוא "סיום" ומפעיל `onFinish`; אחרי נכונה ההתקדמות האוטומטית הקיימת.

## Risks / Tradeoffs
- **לחיצה בטעות נספרת** כטעות (הכרעה זמנית 1). הפער של 16px והגודל מצמצמים; אם יתברר שזה בעיה אפשר להוסיף אישור — לא נבנה עכשיו.
- שדה נתונים חדש מוסיף "דרך שנייה" לענות. לכן הבדיקה החדשה, ולא ניחוש מהטקסט.
- לא נוגעים בתוכן ב-`grade2`/`grade6`/`grade8`: אין בהם שאלות בחירה בין שני מספרים כרגע (נבדק ב-grep על ניסוח "X או Y").
- הזרימה במצב ענן (מנוי הורים) משתמשת באותו `Practice`, לכן מקבלת את זה בחינם; שרת השאלות יעביר את `choices` כשהוא מגיש שאלות כאלה (כלול בטיפוס `Question`).

## Open Questions
None.

## Implementation Notes
נבנה לפי התכנון, בלי סטיות:
- `Question.choices?: readonly [number, number]` ב-`curriculum.ts`; 11 שאלות grade1 (bigger ×7, smaller ×4) קיבלו `choices` בסדר הניסוח.
- `TwoChoiceButtons.tsx` חדש; `Practice.tsx`: `checkAnswer` פוצל ל-`checkAnswer` (פרסור הקלדה) + `submitAnswer(parsed)` (השיפוט והרישום) + `choose(value)` (לחיצה); state `chosen`, מתאפס ב-`next()`. כש-`question.choices` קיים מרונדרים הכפתורים (ו"הבא"/"סיום" רק אחרי טעות) במקום שורת התשובה והמקלדת.
- `App.css`: `.two-choice*`. הכפתור המושבת שומר על צבעי התוצאה (`opacity: 1`) כדי שה-dimming הגלובלי לא ימחק אותם.
- `content.spec.ts`: שתי בדיקות נתונים חדשות (המספרים בשאלה = `choices` לפי הסדר ו-`answer` אחד מהם; כל "bigger"/"smaller" בכיתה א׳ חייב `choices`).
- גרסה 1.65.0 ← 1.66.0. שימו לב: הענף `feature/parent-subscription` גם הוא על 1.66.0 — מי שממוזג שני יצטרך להעלות שוב.
- `npm run build` נקי; lint בלי אזהרות חדשות; `content.spec.ts` 44/44.
