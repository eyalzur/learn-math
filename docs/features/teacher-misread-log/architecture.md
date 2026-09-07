# יומן מקרים שבהם המורה טעתה — Architecture

## Overview
`/read-page` הקיים שומר ל-**Firestore** (בלבד — לא GCS, ראו Risks/Tradeoffs) רשומה
אחת בכל פעם שהבקשה כוללת `studentCorrection`, אחרי ששלח כבר את התשובה ללקוח
(fire-and-forget, אף פעם לא חוסם ולא יכול להכשיל את התשובה). הלקוח (`Practice.tsx`)
צריך לשלוח שני שדות חדשים שהוא כבר "יודע" אבל לא שולח היום: **הקריאה שקדמה
לתיקון** (`previousReading`) וזיהוי קל של השאלה (`questionId`/`topic`/`lessonTitle`).
השירות (Cloud Run, service account קיים) צריך תוספת הרשאה חדשה ב-IAM — צעד חד-פעמי
של המשתמש, לא קוד.

## Affected Files / Components

### שרת
- **`server/package.json`** — תלות חדשה: `@google-cloud/firestore`.
- **`server/src/misreadLog.ts`** *(חדש)* — כל הלוגיקה של השמירה: אתחול הקליינט
  (`new Firestore()`, בלי קונפיגורציה — ADC כבר עובד על Cloud Run מתוך ה-service
  account המחובר, ראו Technical Approach), ופונקציה `saveMisreadCase(input):
  Promise<void>` שבונה ושומרת מסמך אחד. שום דבר כאן לא זורק החוצה — כל שגיאה
  נתפסת ונרשמת ללוג, לא מוחזרת לקורא (עקבי עם "לעולם לא משפיע על התשובה").
- **`server/src/index.ts`** — `validateReadPageRequest` מקבל שני שדות אופציונליים
  נוספים: `previousReading` (מאומת מול `PageReadingSchema` הקיים ב-`pageReading.ts`)
  ו-`questionMeta` (אובייקט קטן: `questionId`/`topic`/`lessonTitle`, כל השדות
  אופציונליים ומחרוזתיים). `handleReadPage` קורא ל-`saveMisreadCase(...)`
  **אחרי** `res.status(200).json(...)`, בלי `await`, רק כש-`input.studentCorrection`
  **וגם** `input.previousReading` קיימים — היעדר `previousReading` (למשל לקוח ישן)
  לא נכשל, פשוט לא נשמרת רשומה.

### לקוח
- **`src/components/Practice.tsx`** — state חדש: `const [lastReading, setLastReading]
  = useState<PageReading | null>(null)`. `handleTeacherReading` שומר את הקריאה
  שהיא **עצמה** קיבלה לתוך `lastReading` (בתחילת הפונקציה, לפני כל שינוי אחר —
  כך שסבב תיקון שני ישלח כ-`previousReading` בדיוק את מה שהוצג *לפני* התיקון
  השני, לא את הקריאה המקורית מהתחלה). `sendCorrection()` מעביר את `lastReading`
  (הערך *לפני* הקריאה הנוכחית) ל-`readPageWithTeacher` כפרמטר חדש, יחד עם
  `question.id`, `question.topic`, ו-`lesson.title`. `next()` מאפס `lastReading`
  ל-`null` כמו כל state אחר שתלוי בשאלה.
- **`src/lib/notebookServer.ts`** — `readPageWithTeacher` מקבל שני פרמטרים
  אופציונליים נוספים (`previousReading?: PageReading`,
  `questionMeta?: { questionId?: string; topic?: string; lessonTitle?: string }`),
  שמתווספים ל-body של הבקשה כשהם קיימים — בדיוק כמו ש-`studentCorrection` כבר
  התווסף ב-`PR #68`.

## Data / State Changes
- בקשת `POST /read-page`: שני שדות אופציונליים חדשים — `previousReading`
  (אותו shape בדיוק כמו `reading` בתשובה: `{certain: false}` או
  `{certain: true, processReflection, errorPointer?, finalAnswer}`) ו-`questionMeta`
  (`{questionId?, topic?, lessonTitle?}`, כל השדות מחרוזת אופציונלית). אין שינוי
  בתשובה.
- **Firestore, collection `misread-cases`**, מסמך אחד לכל סבב תיקון (Firestore
  auto-ID, לא נגזר מ-session/page — אין היום שום מזהה session בצד השרת):
  ```
  {
    createdAt: Timestamp,          // Firestore server timestamp, לא שעון הלקוח
    expectedPrompt: string,
    questionId: string | null,
    topic: string | null,
    lessonTitle: string | null,
    studentCorrection: string,
    previousReading: PageReading,  // מה שהמורה חשבה *לפני* התיקון
    correctedReading: PageReading, // מה שהיא חשבה *אחרי*
    pageImagePngBase64: string,    // אותו PNG ש-renderMatrix כבר מייצר
  }
  ```
- `Practice.tsx`: state חדש `lastReading: PageReading | null`.

## Technical Approach

### אחסון: Firestore בלבד, בלי GCS
נבדק בפועל: דף מחברת הוא `1200×1600` (`PAGE_WIDTH`/`PAGE_HEIGHT` ב-`src/data/notebook.ts`),
ברובו לבן עם קווי דיו דלילים — PNG כזה דחוס לכמה עשרות KB לכל היותר, גם על דף
"עמוס". Base64 מנפח את זה בפי ~1.33, עדיין רחוק ממגבלת ה-1MiB למסמך Firestore.
בהיקף הזה (מקרי תיקון בודדים בשבוע, לא זרם תמונות) — **GCS מוסיף שירות שני,
IAM שני, וספריית קליינט שנייה בלי לפתור בעיה אמיתית**. אם בעתיד מישהו יבוא לכאן
עם דף מלא-לגמרי שחורג ממגבלת הגודל, השמירה תיכשל בבדיקת גודל מפורשת (ראו Edge
Cases) — לא תתרסק ולא תשבש את התשובה ללקוח.

### אימות מול Firestore — לא WIF, שונה מ-Anthropic
זה **לא** אותו מנגנון כמו החיבור ל-Anthropic (`anthropicAuth.ts`): Firestore הוא
שירות Google Cloud רגיל **באותו פרויקט** (`learn-math-506923`) שבו כבר רץ
ה-Cloud Run — `new Firestore()` (מ-`@google-cloud/firestore`, בלי ארגומנטים)
משתמש ב-Application Default Credentials, שעל Cloud Run הן פשוט **זהות
ה-service account המחובר לשירות עצמו** (`notebook-server-claude@...`), מהמטא-דאטה
המקומית של האינסטנס — בלי שום exchange, בלי קובץ token, בלי federation rule.
צריך רק **הרשאת IAM** (ראו "צעד חד-פעמי נדרש" למטה), לא מנגנון אימות חדש.

### fire-and-forget
ב-`handleReadPage`, סדר הפעולות המדויק:
1. `readPage(...)` רץ ומחזיר `reading` — **בדיוק כמו היום**, בלי שינוי.
2. `res.status(200).json({ reading })` — התשובה יוצאת ללקוח.
3. **רק אז**, ובלי `await`: אם `input.studentCorrection && input.previousReading`
   קיימים — `void saveMisreadCase({...}).catch((err) => console.error("failed to
   save misread case:", err))`.

שלב 3 לעולם לא יכול לעכב או להכשיל את שלב 2 — הוא רץ אחריו, לא לפניו, ושגיאה
בתוכו נבלמת במקום. גם timeout ארוך ב-Firestore (רשת איטית וכו') לא "תולה" את
הבקשה — ה-response כבר נשלח.

### `saveMisreadCase` בפירוט
פונקציה אחת ב-`misreadLog.ts`, `async`, שמקבלת את כל מה שצריך למסמך (כולל ה-
`buffer` שכבר קיים מ-`renderMatrix` — אין רינדור כפול), בונה את האובייקט,
ובודקת גודל (ראו Edge Cases) לפני `collection("misread-cases").add(doc)`.

### צעד חד-פעמי נדרש מהמשתמש (לא קוד)
כמו כל שלב "רק המשתמש יכול לעשות" קודם בפרויקט (`server/README.md`):
1. **ליצור Firestore database במצב Native** בפרויקט `learn-math-506923`, אם
   עוד אין (`gcloud firestore databases create --location=me-west1` או דרך
   הקונסולה) — בלי זה, כל קריאה ל-`saveMisreadCase` תיכשל (ותירשם ללוג, לא
   תשבור כלום, אבל שום דבר לא יישמר).
2. **להוסיף ל-service account הקיים הרשאת כתיבה ל-Firestore**:
   ```
   gcloud projects add-iam-policy-binding learn-math-506923 \
     --member="serviceAccount:notebook-server-claude@learn-math-506923.iam.gserviceaccount.com" \
     --role="roles/datastore.user"
   ```
עד ששני אלה בוצעו, הפיצ'ר **קיים בקוד אבל לא שומר בפועל** — כל ניסיון שמירה
נכשל בשקט (נרשם ל-Cloud Logging, לא משפיע על שום דבר אחר). developer/qa לא
יכולים לבדוק שמירה אמיתית ל-Firestore בלי זה — הבדיקות (qa) יבדקו את ההתנהגות
הנצפית מהלקוח (זהה לגמרי להיום) ואת קריאת ה-API בצד השרת עם Firestore ממוקק,
לא כתיבה אמיתית לענן.

## Edge Cases
- **`studentCorrection` בלי `previousReading`** (לקוח ישן/גרסה קודמת בקאש) —
  לא נשמר כלום, לא נכשל שום דבר. זה המקרה היחיד שבו סבב תיקון "אמיתי" לא
  ייכנס ליומן — מקובל, כי גרסת הלקוח תתעדכן.
- **`previousReading` תקין אבל `correctedReading` (התוצאה) יוצא `certain: false`**
  (התיקון לא עזר, המורה עדיין לא בטוחה) — נשמר בכל זאת, כדרישת הספק ("גם אם
  עדיין לא הצלחתי לקרוא — גם זו עדות שימושית").
- **מסמך גדול מדי** (תיאורטי, דף חריג) — לפני `add()`, בדיקת
  `pageImagePngBase64.length` מול תקרה שמרנית (למשל 700KB); אם חורג, הפונקציה
  רושמת אזהרה ומדלגת על השמירה במקום לנסות ולקבל שגיאת Firestore.
- **Firestore database לא קיים / אין הרשאה** (המשתמש עוד לא ביצע את הצעד
  החד-פעמי) — `saveMisreadCase` נכשל, נתפס ב-`.catch`, נרשם ללוג. שום נראות
  ללקוח, בדיוק כמו שצריך.
- **כמה תיקונים באותה שאלה** — כל סבב יוצר מסמך נפרד (כמו שהספק דורש), כי
  `lastReading` מתעדכן אחרי כל קריאה, כולל קריאה מתוקנת.

## Risks / Tradeoffs
- **הפיצ'ר יכול "לעבוד" מבחינת קוד ולא לשמור כלום בפועל** עד שהמשתמש מבצע את
  שני הצעדים החד-פעמיים למעלה — ואין שום סימן על זה בשום מסך, בכוונה (הספק
  אוסר UI). הדרך היחידה לגלות שזה לא מוגדר היא Cloud Logging. שווה להזכיר
  למשתמש אחרי המיזוג לבדוק שם אחרי התיקון "האמיתי" הראשון שלו.
- **Firestore נבחר על פני GCS** למרות שתמונות "בטבעיות" שייכות ל-blob storage —
  הכרעה מכוונת בהיקף הנוכחי (ראו Technical Approach), לא פספוס. אם הנפח
  יגדל משמעותית (לא צפוי — זה פרויקט למשפחה אחת), זה המקום הראשון לשקול מחדש.
- **אין הגנה על גודל/תדירות השמירות מעבר למגבלת הקצב הכללית שכבר קיימת על
  `/read-page`** (30/שעה) — מקובל, כי שמירה קורית רק על סבב תיקון בפועל, שכבר
  נדיר יחסית לקריאות רגילות.
- **תלות חדשה בענן** (`@google-cloud/firestore`) מתווספת לשרת — עוד חבילה
  לתחזק, לא סיכון תפקודי (היא לא בנתיב הקריטי של התשובה ללקוח, כפי שכל
  הארכיטקטורה הזו נבנתה סביבו).

## Open Questions
None.
