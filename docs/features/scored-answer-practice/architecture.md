# תרגול בתשובה סופית + ניקוד וסטטיסטיקה — Architecture

## Overview
`Practice.tsx` מפסיק לרנדר `PracticeNotebook` ועובר לרנדר השאלה באותו דפוס
`.problem-box`/`.problem-text` ש-`TopicLesson.tsx` כבר משתמש בו, עם שדה קלט טקסטואלי
אחד לתשובה הסופית מתחתיו. קוד המחברת (קומפוננטה, נתונים, שרת, CSS, הגדרות הקשורות
אליה) מוסר לגמרי. הסטטיסטיקה המצטברת נגזרת מרשומות הסשנים הקיימות שכבר נשמרות
ב-`progress.ts` — בלי מנגנון שמירה חדש — עם תוספת קטנה אחת (תיוג רמת-קושי לנושא
אדפטיבי) כדי שהפילוח "לפי רמת קושי" יהיה משמעותי גם שם.

## Affected Files / Components

### מוסר לגמרי
- `src/components/PracticeNotebook.tsx`
- `src/data/notebook.ts`
- `src/lib/notebookServer.ts`
- `server/` (כל התיקייה — `learn-math-notebook-server`, שני ה-endpoints שלו,
  `/render-page` ו-`/read-page`, משרתים אך ורק את המחברת; לא נמצא שימוש אחר).
  **הסרת הקוד מהריפו היא לא הסרת שירות ה-Cloud Run החי** — זה צעד נפרד בגוגל
  קלאוד, ביד, לא חלק מה-PR הזה; תיעוד ב-Implementation Notes.
- `.github/workflows/deploy-server.yml` (ה-workflow שפורס את `server/` — יישאר
  שבור/חסר-מטרה אם `server/` נמחק בלעדיו).
- בתוך `src/data/preferences.ts`: השדות `holdZoomLevel`, `autoScrollJumpLevel`,
  `panSpeedLevel`, `buttonSizeLevel`, `suggestionSensitivityLevel`, `navPadVisible`
  (כולם ב-`PreferencesShape`) + הפונקציות הקוראות/כותבות שלהם — **לא** `readAloud`,
  שנשאר כפי שהוא (לא קשור למחברת).
- בתוך `src/components/SettingsDialog.tsx`: כל הבלוקים שמרנדרים את חמש ההגדרות
  האלה (`.hold-zoom-setting`, `.auto-scroll-setting`, `.pan-speed-setting`,
  גודל-כפתור, נראות-פאד-ניווט) — נשאר רק "להקריא את השאלות בקול".
- בתוך `src/App.css`: כל הסלקטורים `.notebook-*` (כ-150 מופעים) + הסלקטורים
  הייעודיים של ההגדרות שהוסרו למעלה.
- בתוך `src/components/Practice.tsx`: `TeacherMark` interface, `sendToTeacher`/
  `sendCorrection`/`checkFollowUp`-adjacent reading-pipeline state (`reading`,
  `lastReading`, `isCorrectedReading`, `sendState`, `correctionOpen`,
  `correctionText`, `teacherNote`, `askedToSee`), `pages`/`currentPageIndex`/
  `pageHasContent` וכל ה-props הקשורים להגדרות המחברת (`holdZoomFactor`,
  `autoScrollJumpFraction`, `panStepPx`, `panHoldIntervalMs`, `buttonDiameterPx`,
  `suggestionDelayMs`), fullscreen state (`fullscreen`/`fullscreenWanted`).
- `tests/e2e/notebook-auto-scroll.spec.ts`, `notebook-default-practice.spec.ts`,
  `notebook-hold-to-zoom.spec.ts`, `notebook-nav-buttons-visibility.spec.ts`,
  `notebook-nav-buttons.spec.ts`, `notebook-nav-settings.spec.ts`,
  `notebook-question-on-page.spec.ts`, `notebook-server-relay.spec.ts`,
  `notebook-teacher-feedback.spec.ts`, `notebook-teacher-marks.spec.ts`,
  `notebook-toolbar-actions.spec.ts`, `notebook-toolbar-redesign.spec.ts`,
  `notebook-usability-fixes.spec.ts`, `tests/e2e/helpers/notebookAnswer.ts`.

### חדש
- **`src/components/Practice.tsx`** (נשאר, לא קובץ חדש) — מרנדר את השאלה בדפוס
  `.problem-box`/`.problem-text` (כמו `TopicLesson.tsx`), שדה `<input>` אחד לתשובה
  (ראו Technical Approach), כפתור בדיקה, ולוגיקת נכון/שגוי שמחליפה את
  `reading.finalAnswer === question.answer` ב-`typedAnswer === question.answer`.
  `diagnose(question, typedAnswer)` נקרא עם אותה חתימה בדיוק כמו היום (היא כבר
  מקבלת ערך סופי, לא תמונה) — בלי שינוי ב-`src/data/diagnose.ts` עצמו.
- **`src/data/progress.ts`** — שתי תוספות:
  1. `PracticeRecord` מקבל שדה אופציונלי חדש `difficultyLabel?: string` —
     מאוכלס רק עבור נושא אדפטיבי (`topic.adaptive`), כדי שלסשן כזה יהיה תיוג
     רמת-קושי בר-צבירה (`levelTitle` נשאר ריק עבורו, בדיוק כמו היום — זה שדה
     נפרד, לא תחליף, כדי לא לשנות את תצוגת רשימת הסשנים הקיימת שמבוססת על
     `levelTitle` ריק = "בלי מפריד").
  2. שתי פונקציות קריאה חדשות, `statsByTopic(studentId)` ו-
     `statsByDifficulty(studentId)`, שמקבצות את `historyFor(studentId)` הקיים
     (סכום `correct`/`total` לפי `topicTitle`, ולפי `levelTitle || difficultyLabel`
     בהתאמה) — **בלי** מנגנון שמירה חדש, בלי מפתח `localStorage` נוסף.
- **`src/App.tsx`**'s `finish()` — שורה אחת נוספת ב-`recordPractice(...)`:
  `difficultyLabel: topic?.adaptive ? \`רמה ${adaptiveSession?.difficulty ?? ""}\` : undefined`.
- **`src/components/History.tsx`** — שני בלוקים חדשים מעל רשימת הסשנים הקיימת:
  "סיכום לפי נושא" ו-"סיכום לפי רמת קושי" (האחרון מוצג רק אם יש בכלל רשומה עם
  `levelTitle`/`difficultyLabel` לא-ריקים), כל אחד מרנדר את `statsByTopic`/
  `statsByDifficulty` בדפוס הניסוח מ-`Result.tsx` ("X מתוך Y נכונות (Z%)").
- **`src/App.css`** — סגנון מינימלי לשדה התשובה החדש והסעיפים החדשים ב-History;
  לא נדרש CSS חדש משמעותי מעבר לזה (אין גופנים/פלטה חדשים בפיצ'ר הזה).

## Data / State Changes
```ts
// src/data/progress.ts
export interface PracticeRecord {
  // ...existing fields unchanged...
  difficultyLabel?: string; // חדש — רק לנושא אדפטיבי
}

export function statsByTopic(studentId: string): { topicTitle: string; correct: number; total: number }[];
export function statsByDifficulty(studentId: string): { label: string; correct: number; total: number }[];
```
שום שינוי בפורמט הקיים של `localStorage` חוץ מהשדה האופציונלי החדש (תואם-לאחור:
רשומות ישנות בלי `difficultyLabel` פשוט לא נכללות בפילוח-לפי-קושי שלהן, לא
שוברות כלום).

## Technical Approach
**שדה הקלט:** `type="text" inputMode="decimal"` (**לא** `type="number"`) — שליטה
מלאה על הפרסור והכיווניות, ובלי ה-spinner-UI שחלק מהדפדפנים מוסיפים ל-`number`
שמתנהג מוזר בתוך עמוד RTL. `direction: ltr` מפורש על השדה (ראו Edge Cases). פרסור:
`Number(value.trim())`, נכון כש-`!Number.isNaN(parsed) && parsed === question.answer`.
מקלדת: Enter בשדה שקול ללחיצה על כפתור הבדיקה.

**זרימת נכון/שגוי:** אותו `feedback` state שכבר קיים (`"correct" | "wrong" | null`)
נשאר. בנכון: `onAnswered?.(true)` (ללא שינוי בחתימה), ואז `setTimeout(next, ~700ms)`
— התעכבות קצרה כדי שהמשוב החיובי יספיק להיראות, לפני המעבר האוטומטי. בשגוי:
אותה `diagnose`/`QuestionExplanation` שכבר קיימות מוצגות, וה-`primaryAction`
("הבא"/"סיום") שכבר קיים הוא הדרך היחידה להמשיך — לא מתווסף טיימר.

**סטטיסטיקה — גזירה, לא כתיבה חדשה:** `statsByTopic`/`statsByDifficulty` הן
פונקציות טהורות שמחשבות מעל `historyFor(studentId)` הקיים בזמן רינדור של
`History.tsx` — אין נקודת-כתיבה חדשה, אין צורך לתאם בין שני מנגנוני שמירה.
התוספת היחידה לכתיבה היא שדה `difficultyLabel` אחד ב-`recordPractice`'s payload
הקיים ב-`App.tsx`'s `finish()`.

## Edge Cases
- **שדה הקלט הוא משטח LTR חדש בתוך עמוד RTL** (ראו `design.md`) — `direction: ltr`
  מפורש על ה-`<input>` עצמו הוא הכרחי, לא אופציונלי; זה בדיוק סוג הבאג שכבר קרה
  שלוש פעמים בפרויקט (ראו CLAUDE.md).
- **תשובות שליליות/עשרוניות:** כמה נושאים (אלגברה, עשרונים, אחוזים) יכולים
  לכלול תשובה שלילית או לא-שלמה — `inputMode="decimal"` (לא `"numeric"`) מאפשר
  `.`/`-`; הפרסור חייב לטפל בשניהם, לא רק במספרים שלמים חיוביים.
- **קלט ריק/לא-תקין:** כפתור הבדיקה מנוטרל כש-`value.trim() === ""` או
  `Number.isNaN(parsed)` — אותו דפוס הגנה שכבר קיים ב-`checkFollowUp()` היום.
- **נושא אדפטיבי בלי `adaptiveSession` בזמן `finish()`** (מקרה-קצה תיאורטי —
  מופע קיים, לא נוסף כאן): `difficultyLabel` נופל ל-`undefined` אם
  `adaptiveSession` חסר, בלי לזרוק שגיאה.
- **`History.tsx`'s מצב ריק** — הבלוקים החדשים לא מוצגים כשאין שום רשומה, כמו
  שה-Open Questions ב-design.md כבר ציינו; ההודעה הקיימת ("עוד לא תרגלת...")
  ממשיכה לכסות את זה.
- **רשומות היסטוריה ישנות (לפני הפיצ'ר הזה)** שעדיין יושבות אצל משתמשים —
  אין להן `difficultyLabel`, ולכן ימשיכו להיספר תחת "לפי נושא" אבל לא תחת "לפי
  רמת קושי" לנושאים האדפטיביים שלהן — תואם-לאחור, לא שגיאה.

## Risks / Tradeoffs
- **היקף הבדיקות (e2e) הוא הסיכון הגדול ביותר כאן, לא הקוד עצמו.** מעבר ל-13
  קבצי `notebook-*.spec.ts` שנמחקים ישירות, לפחות 6 קבצים נוספים
  (`grade2-syllabus`, `question-hints`, `read-aloud-questions`, `review-status`,
  `students-and-syllabus`, `teacher-reading-precision`) עדיין מתייחסים לסלקטורים
  `.notebook-*` כדי "לשחק" סשן תרגול שלם — אלה **לא** נמחקים, הם צריכים להיכתב
  מחדש מול הזרימה החדשה (שדה קלט במקום ציור). סבב קודם באותו ריפו (הפיכת מסך
  מלא לברירת מחדל) נתקל בדיוק בדפוס הזה וגילה עוד קבצים תוך כדי ריצה (29 בסוף,
  לא 13) — `qa` צריך לצפות לאותו דבר כאן, כנראה בהיקף גדול יותר כי השינוי הפעם
  הוא בכל מנגנון המענה, לא רק בברירת מחדל אחת.
- **תכונות שלמות שכבר מוזגו נעלמות לגמרי**: קריאת-כתב-יד (`notebook-teacher-
  understanding`), הערות מורה בצבע (`notebook-teacher-marks`), משוב-על-מה-שהמורה-
  קראה (`notebook-teacher-feedback`), דיוק-קריאה (`teacher-reading-precision`),
  יומן-טעויות-קריאה (`teacher-misread-log`), וכל מנגנוני הניווט/זום/גלילה
  במחברת. תיקי התיעוד שלהן ב-`docs/features/` נשארים כרשומה היסטורית (לא
  נמחקים) — הן פשוט מתועדות כמוחלפות, לא מעודכנות בפועל.
- **`server/`'s הסרה מהריפו אינה הסרת התשתית החיה** — אם היא לא מוסרת גם
  מ-Google Cloud (ידנית, ע"י המשתמש), השירות ימשיך לרוץ ולצרוך עלות בלי שום
  קוד שקורא לו יותר. מצוין גם ב-Implementation Notes כתזכורת.
- נבחר **לא** להוסיף נקודת-כתיבה חדשה לסטטיסטיקה (per-question), אלא לגזור
  מהרשומות הקיימות — פחות קוד, פחות סיכון לפיצול בין שני מקורות אמת, אבל המשמעות
  היא שהסטטיסטיקה מתעדכנת רק בסיום סשן (כמו היום), לא שאלה-שאלה באמצע סשן ארוך
  שננטש. זה עקבי עם ההתנהגות הקיימת של `progress.ts`, לא רגרסיה.

## Open Questions
None.
