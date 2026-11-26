# מכסת שיעורים שבועית — Architecture

## קבצים
- `src/data/lessonAllowance.ts` (חדש): הלוגיקה והאחסון.
  - `FREE_LESSONS_PER_WEEK = 5`; `freeLessonsPerWeek()` מחזיר עקיפה אם קיימת (מפתח
    `learn-math:free-lessons-override`, או `import.meta.env.VITE_FREE_LESSONS_PER_WEEK`).
  - `LESSON_PACKS: LessonPack[]` = `[{ id: "extra-10", lessons: 10, priceIls: 0 }]`.
  - `weekStart(date)`: יום ראשון 00:00 מקומי, כמחרוזת `YYYY-MM-DD`.
  - ממשק `LessonAllowanceStore { remaining(studentId); grantPack(packId) }` (אין `clearStudent` — המאגר משותף)
    ומימוש `localStorageLessonAllowance` (מפתח `learn-math:lessons-pool`, `{ week, extra }` — מאגר אחד).
    היום סינכרוני; שרת עתידי יחליף את המימוש ויהפוך לאסינכרוני.
  - נצרך לכל תלמיד/ה = רשומות היסטוריה מאז תחילת השבוע (`allHistory()`, חדש ב-`progress.ts`).
    משיכה מהמאגר = סכום `max(0, נצרך − חינם)` על כל התלמידים. נשאר לתלמיד/ה =
    `max(0, חינם − נצרך שלו/ה) + max(0, extra − משיכה)`. extra של שבוע ישן מתעלמים ממנו (פג).
- `src/components/LessonsDialog.tsx` (חדש): הדיאלוג רב-השלבים. מקבל `remaining`, `mode`,
  `onGrant(packId)`, `onClose`, `speakEnabled`.
- `src/components/TopicPicker.tsx`: פרופ `lessonsLeft` + `onOpenLessons`, שבב בשורת ההיסטוריה.
- `src/App.tsx`: מצב `lessonsDialog`; `canStartPractice()` נקראת ב-`enterTopicInGrade` (אדפטיבי),
  בחירת רמה, בחירת סגנון ו-`onRetry`; `renderScreen()` עוטף את הבחירה הקיימת של מסך כדי
  שהדיאלוג יוצג מעל כל מסך. `deleteStudent` **לא** נוגע במאגר.
- `src/App.css`: סגנונות הדיאלוג והשבב. `src/env.d.ts`: טיפוס ל-env.
- `playwright.config.ts`: `VITE_FREE_LESSONS_PER_WEEK=9999` לשרת ה-dev של הבדיקות.

## Edge cases
- localStorage זורק: כל גישה עטופה; במקרה כשל המכסה מלאה (לא חוסמים ילד בגלל תקלת אחסון).
- תרגול שהתחיל עם שיעור אחרון: מסתיים ונספר; לא נחסם באמצע.
- חצות שבת→ראשון תוך כדי תרגול: נספר לשבוע שבו הסתיים.
- `grantPack` עם id לא מוכר: מתעלם.

## סיכונים
בדיקות קיימות רצות הרבה תרגולים: מטופל ב-env בקונפיג. אם קיים שרת dev ישן על 5173 בלי
ה-env, `reuseExistingServer` ישתמש בו והבדיקות ייכשלו; מריצים בלי שרת קיים.
