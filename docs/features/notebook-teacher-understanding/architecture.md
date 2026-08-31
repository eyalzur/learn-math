# המורה מבינה מה נכתב בדף — Architecture

## Overview
מתווסף לשרת (`server/`) endpoint חדש, `POST /read-page`: מקבל את אותו חוזה בקשה
כמו `/render-page` הקיים (מטריצת תאים), מרנדר אותה לתמונה **באותו קוד קיים**
(`renderMatrix`), ואז שולח את התמונה ל-Claude (vision, `claude-opus-5`) עם הוראה
לתמלל בלבד — לא לשפוט נכון/שגוי, לא לפתור. Claude מוגבל לפלט מובנה (Zod +
`output_config.format`) כדי שהתשובה תהיה תמיד אחד משני צורות ברורות: קריאה ודאית
(שאלה+תשובה) או קריאה לא ודאית (דגל בלבד, בלי טקסט חופשי מהמודל). האימות מול
Claude משתמש בנתיב ה-WIF שכבר מוגדר (זיהוי אוטומטי של ה-SDK דרך משתני סביבה —
לא צריך לכתוב קוד OAuth ידני). הלקוח מחליף את הקריאה הקיימת ל-`/render-page`
בקריאה ל-`/read-page`, ומרחיב את דיאלוג התמונה הקיים בתיאור הטקסטואלי + כפתור
הקראה, בדיוק לפי `design.md`.

## Affected Files / Components

**שרת — חדש:**
- `server/src/anthropicAuth.ts` — מחזיק את קובץ ה-identity token ש-Anthropic SDK
  קורא ממנו, ומרענן אותו lazily (ראו Technical Approach). לא נוגע ב-Claude API
  עצמו — רק בטוקן של גוגל שה-SDK צריך כדי לבצע את חילופי ה-OAuth בעצמו.
- `server/src/readPage.ts` — פונקציה טהורה יחסית: מקבלת `Buffer` של PNG, קוראת
  ל-Claude (vision + structured output), מחזירה `PageReading` (ראו Data/State
  Changes). נטולת Express, כמו `renderMatrix.ts` — קלה לבדוק/לקרוא בבידוד מה-HTTP
  layer.
- `server/src/pageReading.ts` — סכימת ה-Zod והטיפוס המשותפים (`PageReadingSchema`,
  `type PageReading`) שגם `readPage.ts` וגם `index.ts` (לוולידציית ה-fallback)
  משתמשים בהם.

**שרת — משתנה:**
- `server/src/index.ts` — endpoint חדש `POST /read-page`; rate limiter פשוט
  בזיכרון שמוגבל אליו בלבד (לא ל-`/render-page`, שאין לו עלות); `app.set("trust
  proxy", true)` כדי ש-`req.ip` ישקף את כתובת הלקוח האמיתית מאחורי ה-load balancer
  של Cloud Run ולא את כתובת ה-LB עצמו (בלעדיו כל הבקשות "יגיעו מאותה כתובת").
  `/render-page` הקיים **לא משתנה** — נשאר זמין לבדיקה ידנית של הרינדור בלי לגעת
  ב-Claude (ראו Risks).
- `server/package.json` — תלויות חדשות: `@anthropic-ai/sdk`, `zod`.
- `server/README.md` — מתועד: חוזה `/read-page`, ארבעת משתני הסביבה החדשים
  שצריך על שירות ה-Cloud Run (`ANTHROPIC_FEDERATION_RULE_ID`,
  `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID`,
  `ANTHROPIC_WORKSPACE_ID` — ראו Technical Approach), וצעד חד-פעמי להגדיר אותם
  (**המשתמש מבצע, לא ה-CI** — ראו Risks).

**לקוח — משתנה:**
- `src/lib/notebookServer.ts` — `sendPageToServer` (קוראת ל-`/render-page`)
  **מוחלפת לגמרי** בפונקציה חדשה `readPageWithTeacher(page): Promise<{
  imageDataUrl: string; reading: PageReading }>` שקוראת ל-`/read-page`. לפי
  מוסכמות הפרויקט נגד קוד מת (CLAUDE.md), אם `sendPageToServer` הופכת ללא שימוש
  בכל הלקוח (יש לוודא) — נמחקת, לא נשארת "ליתר ביטחון". `PageReading` מוגדר כאן
  כטיפוס מקומי (union, ראו Data/State Changes) — משוכפל בכוונה משרת ללקוח, כמו
  שכבר קורה עם צורת הבקשה של `/render-page`; אין חבילת טיפוסים משותפת בין שני
  הפרויקטים הנפרדים האלה.
- `src/components/PracticeNotebook.tsx` — `sendToTeacher` קורא ל-
  `readPageWithTeacher` במקום `sendPageToServer`; `serverImage: string | null`
  מתרחב ל-state נוסף שמחזיק גם את ה-`reading` (ראו Data/State Changes); כפתור
  השליחה מציג `"המורה קוראת..."` בזמן `sendState === "sending"` (היה `"שולח..."`);
  דיאלוג התמונה מקבל את הבלוק החדש (כותרת "מה המורה הבינה", שתי שורות מובחנות
  או משפט אי-ודאות, כפתור 🔊) בדיוק לפי מסכי `design.md`.
- `src/App.css` — כללי עיצוב לבלוק החדש בדיאלוג ולכפתור ה-🔊 (משתמש ב-class
  הקיים `.speak-button`, לא ממציא class מקביל).

**לא משתנה, לתשומת לב:**
- `.github/workflows/deploy-server.yml` — **אינו** צריך שינוי. הוא קורא
  `gcloud run deploy` בלי `--set-env-vars`/`--service-account`, ולכן שני
  ההגדרות שכבר בוצעו ידנית על השירות (חשבון השירות `notebook-server-claude@...`,
  ומשתני הסביבה החדשים אחרי שהמשתמש יוסיף אותם) נשמרים בין דיפלוי לדיפלוי —
  `gcloud run deploy` משמר שדות שלא הועברו לו במפורש, לא מאפס אותם. ראו Risks
  לסייג החשוב היחיד כאן.

## Data / State Changes

**חוזה הבקשה** — `POST /read-page`, **זהה לחלוטין** לחוזה `/render-page` הקיים
(`{ cols, rows, cell, filledCells }`) — אותה ולידציה, אותו `renderMatrix`.

**חוזה התשובה** — הצלחה (`200`):
```ts
type PageReading =
  | { certain: true; question: string; answer: string }
  | { certain: false };

interface ReadPageResponse {
  imageDataUrl: string; // זהה בדיוק למה ש-/render-page כבר מחזיר
  reading: PageReading;
}
```
`question`/`answer` הם המחרוזות הגולמיות שהתמלול מחזיר, עם ביטויים חשבוניים
מסומנים בגרשיים אחוריים (`` `7 + 5=` ``) — **בדיוק** הפורמט שהלקוח כבר יודע לפרק
ולבודד (`segmented()`/`.prompt-math`, וגם `speechParts()` להקראה) בכל שאר
האפליקציה. אין כאן משפטים מנוסחים בעברית מהמודל — התוויות ("מה שכתבת:" וכו')
הן קבועות בלקוח, לפי `design.md`. `certain: false` **לא** נושא שום טקסט מהמודל;
הודעת אי-הוודאות קבועה גם היא בלקוח. זו החלטה מכוונת: תוכן שתלמיד/ה רואה נשאר
תחת בקרת הפרויקט (כמו כל שאר האפליקציה), לא תלוי בניסוח חופשי של מודל שפה.

כישלון תקשורת/שרת (רשת, timeout, שגיאת אימות מול Claude, `429` על rate limit):
`{ error: "<אנגלית, ללוגים בלבד> }`, בדיוק כמו `/render-page` — הלקוח מציג תמיד
את אותה הודעת שגיאה גנרית הקיימת, לא נבדל.

**State חדש בלקוח (`PracticeNotebook.tsx`):**
```ts
const [teacherResult, setTeacherResult] =
  useState<{ imageDataUrl: string; reading: PageReading } | null>(null);
// מחליף את serverImage: string | null הקיים
```

## Technical Approach

**זרימת `/read-page`:**
1. ולידציה זהה ל-`/render-page` (שימוש חוזר באותה `validateRequest`).
2. אם `filledCells` ריק — מחזיר מיד `{ imageDataUrl, reading: { certain: false } }`
   **בלי לקרוא ל-Claude בכלל**. אין מה לתמלל בדף ריק, וזו קריאה שעולה כסף אמיתי
   שאין שום סיבה לשלם עליה על מידע שכבר ידוע וודאי.
3. `renderMatrix(validated)` (כמו היום) → `Buffer`.
4. `readPage(buffer)` (הפונקציה החדשה) → `PageReading`.
5. מחזיר `200` עם שניהם. כל כשל בשלבים 3-4 נתפס ב-`try/catch` אחד ומחזיר `500`
   עם `error` גנרי (ללוגים).

**קריאה ל-Claude (`server/src/readPage.ts`):** `@anthropic-ai/sdk`, מודל
`claude-opus-5` (ברירת המחדל הפרויקטלית — ראו Risks לגבי עלות/תקציב), פלט מובנה
עם Zod:
```ts
const PageReadingSchema = z.object({
  certain: z.boolean(),
  question: z.string().optional(),
  answer: z.string().optional(),
});

const response = await anthropic.messages.parse({
  model: "claude-opus-5",
  max_tokens: 4096,
  output_config: { effort: "low", format: zodOutputFormat(PageReadingSchema) },
  system: TEACHER_SYSTEM_PROMPT, // developer: תמלול בלבד, לא פתרון/שיפוט;
    // "לא בטוח" בכל מקרה של כתב לא ברור/יותר מתשובה אחת/עמימות; לסמן כל ביטוי
    // חשבוני בגרשיים אחוריים — ראו Copy-contract למעלה
  messages: [{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: "image/png", data: pngBuffer.toString("base64") } },
      { type: "text", text: "זה דף ממחברת תרגול. מה כתוב בו?" },
    ],
  }],
}, { timeout: 30_000 }); // לא 10 הדקות שברירת המחדל של ה-SDK — זו פעולה
  // שתלמיד/ה מחכה לה מול מסך, לא batch job

const parsed = response.parsed_output;
const reading: PageReading =
  parsed && parsed.certain && parsed.question && parsed.answer
    ? { certain: true, question: parsed.question, answer: parsed.answer }
    : { certain: false };
```
`effort: "low"` — זו משימת תמלול/תפיסה, לא הסקה מורכבת; לפי ההנחיה הפרויקטלית
לבחירת effort, משימות כאלה "עושות טוב ב-low". `parsed_output === null` (כשל
ולידציה מול הסכימה) מטופל בדיוק כמו `certain: false` — **בברירת מחדל לצד
הבטוח**: אי אפשר לדעת מה המודל התכוון, אז לא מנחשים.

**אימות מול Anthropic — Workload Identity Federation (`server/src/anthropicAuth.ts`):**
נתיב האימות עצמו **כבר קיים ובדוק** (ראו `server/README.md`), ו-SDK הרשמי
**כבר יודע לבצע אותו לבד**: קונסטרוקטור ריק (`new Anthropic()`) מזהה WIF
אוטומטית כשארבעת משתני הסביבה `ANTHROPIC_FEDERATION_RULE_ID`,
`ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID`,
`ANTHROPIC_WORKSPACE_ID` מוגדרים יחד עם `ANTHROPIC_IDENTITY_TOKEN_FILE`
(או `ANTHROPIC_IDENTITY_TOKEN`), ומחליף את הטוקן מול Anthropic **בעצמו**
(כולל רענון). **אין שום קוד ידני של קריאת `/v1/oauth/token` בפרויקט הזה** — זה
היה נחוץ רק לבדיקה הידנית התיעודית ב-`server/README.md`, לא לקוד שרת בפועל.

מה שכן צריך קוד: **הטוקן שה-SDK קורא מהקובץ הוא טוקן זיהוי של גוגל (לא של
Anthropic), ולגוגל אין endpoint ל"רענון" — צריך למשוך אחד טרי מה-metadata server
המקומי של Cloud Run.** `ensureFreshIdentityToken()`:
```ts
const TOKEN_FILE = "/tmp/anthropic-identity-token";
const MAX_AGE_MS = 45 * 60 * 1000; // טוקני זיהוי של גוגל תקפים כשעה; מתרעננים
  // הרבה לפני שפגים כדי שלא לרוץ בול על הקצה

let cached: { fetchedAt: number; promise: Promise<void> } | null = null;

function fetchAndWrite(): Promise<void> {
  return fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/" +
      "service-accounts/default/identity?audience=https://api.anthropic.com&format=full",
    { headers: { "Metadata-Flavor": "Google" } },
  )
    .then((res) => {
      if (!res.ok) throw new Error(`metadata server responded ${res.status}`);
      return res.text();
    })
    .then((token) => writeFileSync(TOKEN_FILE, token, "utf8"));
}

export function ensureFreshIdentityToken(): Promise<void> {
  if (cached && Date.now() - cached.fetchedAt < MAX_AGE_MS) return cached.promise;
  const promise = fetchAndWrite();
  cached = { fetchedAt: Date.now(), promise };
  return promise;
}
```
נקרא (עם `await`) בתחילת הטיפול ב-`/read-page`, **לפני** `readPage()` — לא
ברקע/טיימר. `cached.promise` (לא רק timestamp) ממוזג בקשות מקבילות שקורות
בדיוק סביב רגע הרענון לאותה קריאת metadata אחת, במקום להכפיל אותה. ב-cold
start הראשון זה מוסיף קריאה מקומית אחת מהירה (metadata server הוא רשת מקומית
לקונטיינר, לא אינטרנט) — לא צפוי מורגש. **בסביבת פיתוח מקומית (`npm start` לא
על Cloud Run) הקריאה הזו נכשלת תמיד** (אין metadata server מקומי) — זה תקין
ומצופה: `/read-page` יחזיר `500` בפיתוח מקומי בלי הגדרה נוספת, בדיוק כמו כל
כשל תקשורת אחר; `/render-page` וכל שאר השרת ממשיכים לעבוד רגיל.

**ארבעת משתני הסביבה עצמם** (לא סודיים — מזהים, לא credentials, כמו שכבר
מתועד ב-`server/README.md` לגבי ה-WIF של GitHub↔Google) מוגדרים **פעם אחת,
ידנית, על שירות ה-Cloud Run** — לא בקוד, לא ב-workflow (ראו Risks לסדר
החשוב שבו זה קורה):
```
ANTHROPIC_FEDERATION_RULE_ID=fdrl_01XniC27RcjaHrrtruBHC3ht
ANTHROPIC_ORGANIZATION_ID=623419be-a6b9-442d-a558-435eaacb4d2d
ANTHROPIC_SERVICE_ACCOUNT_ID=svac_01G2VDg1jBnmiQDmszYuJgq7
ANTHROPIC_WORKSPACE_ID=wrkspc_01Fd13eMa6fpYvRpwdJMpMF3
```
(הערכים כבר מתועדים ב-`server/README.md` מהבדיקה הידנית ב-2026-08-30.)

**Rate limiting על `/read-page` בלבד:** מפה בזיכרון, `IP → timestamps` ב-
`server/src/index.ts`, חלון נגלל של שעה, תקרה גבוהה בכוונה (למשל `30`
בקשות/שעה) — מטרתה לעצור שימוש לרעה גס, לא לתחום שימוש רגיל של שלושה ילדים.
מעל התקרה: `429` עם אותו `error` גנרי. **לא** מנגנון מבוזר (אין Redis) — מקובל
לשלב הזה כי מדובר במופע יחיד/מעטים של Cloud Run, ותקרת ה-`$5`/חודש ברמת
ה-workspace (שכבר סומנה ל"רק המשתמש יכול לעשות" ב-CLAUDE.md, טרם אומתה) היא
הרשת הביטחון האמיתית מול שימוש לרעה רציני — לא הרשת הזו.

## Edge Cases
- **דף ריק** — מטופל בלי לקרוא ל-Claude בכלל (ראו שלב 2 למעלה). זהה להתנהגות
  היום ב-`/render-page` (תמונה לבנה), פלוס `reading: { certain: false }`.
- **`parsed_output` הוא `null`** (הפלט מ-Claude לא תאם את הסכימה) — מטופל כ-
  `certain: false`, לא כשגיאה. שקול מבחינת התלמיד/ה ל"לא הצלחתי לקרוא בבירור".
- **Claude מחזיר `certain: true` עם `question`/`answer` חסרים או ריקים** (חוסר
  עקביות תיאורטי בפלט המודל, גם עם סכימה) — מטופל כ-`certain: false` (ראו הבדיקה
  המפורשת ב-`readPage.ts` למעלה: `parsed.question && parsed.answer`), לא נשלח
  ללקוח שדה ריק.
- **timeout על קריאת Claude** (`30s`) — נתפס כ-exception רגיל ב-`try/catch`,
  מתורגם ל-`500`, אותה הודעת שגיאה גנרית בלקוח.
- **metadata server לא זמין / הרשאת ה-impersonation חסרה** — `ensureFreshIdentityToken`
  זורק; נתפס באותו `try/catch` ב-`/read-page`, `500` גנרי. **חשוב: זה בדיוק אותו
  קוד שגיאה שהתלמיד/ה רואה עבור "רשת נכשלה"** — אבחון בפועל דורש לוגים בצד השרת
  (Cloud Run), לא UI נבדל (per design.md, הכשלים האלה לא אמורים להיבדל כלפי
  התלמיד/ה).
- **בקשות מקבילות סביב רגע רענון הטוקן** (נדיר בתדירות השימוש הצפויה) — ממוזגות
  ל-promise משותף אחד, לא מכפילות קריאות ל-metadata server.
- **דיאלוג התמונה הקיים (`confirmDelete`) ודיאלוג "המורה" (`teacherResult`)** —
  אותה הבטחה שכבר קיימת היום בין `confirmDelete` ל-`serverImage`: לא נפתחים
  בו-זמנית, מבחינת זרימת המשתמש בלבד (developer מוודא ששני ה-state-ים לא
  `truthy` יחד, כמו היום).

## Risks / Tradeoffs
- **סדר הפעולות בפריסה קריטי, ואם מתהפך — הפיצ'ר "נכשל" באופן שקוף למשתמש.**
  ה-endpoint החדש ידרוש את ארבעת משתני הסביבה על שירות ה-Cloud Run **לפני**
  שהוא נפרס בפועל דרך `main`, אחרת כל קריאה ל-`/read-page` תיכשל ב-`500` עם
  הודעת השגיאה הגנרית — נראה בדיוק כמו "אין רשת", לא כמו "המשתמש שכח צעד הגדרה".
  developer צריך לתעד את הצעד הזה (`gcloud run services update notebook-server
  --update-env-vars=...`) ב-`server/README.md` באופן שאי-אפשר לפספס, ולהוסיף
  אותו ל-CLAUDE.md תחת "רק המשתמש יכול לעשות" — בדיוק כמו שכבר נעשה
  ל-Workload Identity Federation עצמו.
- **חשבון השירות המותאם (`notebook-server-claude@...`) חייב עדיין להיות מחובר
  לשירות אחרי כל דיפלוי אוטומטי.** לפי התנהגות Cloud Run, `gcloud run deploy`
  בלי `--service-account` משמר את החשבון הקיים מהרוויזיה הקודמת — לא מאפס
  לברירת המחדל. זו ההנחה שהארכיטקטורה הזו נשענת עליה במלואה (בלעדיה, שום
  `ANTHROPIC_*` env var לא יעזור — ל-WIF יידרש חשבון השירות הנכון). **מומלץ
  לאמת בפועל** (`gcloud run services describe notebook-server --format
  "value(spec.template.spec.serviceAccountName)"`) אחרי המיזוג הראשון שנוגע
  בשרת, ולא להניח בעיוורון — סומן כאן כי זו בדיוק מהסוג של הנחה ששווה לבדוק
  פעם אחת ולתעד, לא לגלות מחדש בעוד חודש.
- **מודל `claude-opus-5` (ברירת המחדל הפרויקטלית לקוד Claude, לא נבחר כאן
  משיקולי עלות) מול תקרת `$5`/חודש שמוזכרת ב-CLAUDE.md כטרם-מאומתת.** עלות
  משוערת לקריאה בודדת נמוכה (תמונה קטנה יחסית, `max_tokens: 4096`, `effort:
  low`) — סדר גודל של סנטים בודדים, לא דולרים, ובהיקף השימוש הריאלי (שלושה
  ילדים, לא כל תרגול) לא צפוי לקרב את התקרה. עדיין, זו הפעם **הראשונה**
  שקריאה מהאפליקציה עולה כסף אמיתי לכל לחיצה — שווה שהמשתמש יאמת בפועל שהתקרה
  אכן מוגדרת (המשימה שכבר מסומנת פתוחה ב-CLAUDE.md) לפני מיזוג, לא רק אחרי.
- **Rate limiting בזיכרון, לא מבוזר.** אינו שורד הפעלה מחדש של הקונטיינר
  ואינו משותף בין מופעים אם Cloud Run יגדיל את מספר המופעים בעומס — הגנה
  "best effort" בלבד. מקובל לעומס הצפוי (שלושה ילדים ידועים); לא פתרון ברמת
  מוצר ציבורי.
- **`/render-page` נשאר קיים ולא בשימוש מהלקוח יותר.** נשמר במכוון (לא קוד מת
  מבחינה תפעולית): נוח לבדיקה ידנית/curl של הרינדור בבידוד מ-Claude, בלי לשלם
  על קריאה. הפער בין "לא נקרא מהלקוח" ל"קוד מת" — ה-endpoint עדיין נגיש ובעל
  ערך תפעולי, בניגוד ל-`sendPageToServer` בלקוח שנמחקת.
- **אין retry/backoff על שגיאות זמניות מול Claude** (למשל עומס רגעי). לשלב
  ראשון, פשטות עדיפה — בדיוק כמו ש-`/render-page` מעולם לא קיבל retry logic;
  כישלון מציג את הודעת השגיאה הרגילה, והתלמיד/ה יכול/ה פשוט ללחוץ שוב.
- **אין עיבוד/כיווץ תמונה לפני השליחה ל-Claude.** התמונה שכבר הוכחה נאמנה
  (הפיצ'ר הקודם) עוברת כמות שהיא. בגודל הנוכחי (עמוד מחברת בודד) זה זול וקטן
  מספיק שלא להצדיק שכבת עיבוד נוספת כרגע.

## Open Questions
None.

## Implementation Notes

נבנה בעיקרו בדיוק לפי התוכנית. סטיות/פרטים שהתבררו רק בכתיבה:

**גרסת `@anthropic-ai/sdk`.** architecture.md לא נקב מספר גרסה. `messages.parse`
ו-`output_config.format` (structured outputs) דורשים גרסה עדכנית של ה-SDK —
נבדק בפועל: `^0.68.0` (ניחוש ראשוני) לא כלל אותם כלל, `^0.122.0` (העדכנית
בזמן הכתיבה) כן. מותקן `^0.122.0`.

**גרסת `zod`.** מאותה סיבה — `zodOutputFormat` דורש את הצורה הפנימית של Zod v4
(`def`/`type`/`check`/`clone`), לא v3. `^4.5.4` מותקן (במקום `^3.24.1` שהוצע
בארכיטקטורה); הסכימה עצמה (`z.object({...})`) זהה בין הגרסאות, רק ה-build
נכשל תחת v3 עם שגיאת טיפוסים ברורה.

**סימון ביטויים חשבוניים בגרשיים אחוריים — הוסר מהתכנון.** architecture.md
תיכנן ש-Claude יסמן חשבון בתוך `question`/`answer` בגרשיים אחוריים, והלקוח
יעביר את זה דרך `segmented()`/`.prompt-math` הקיימים (התשתית שכל שאר האפליקציה
כבר משתמשת בה לטקסט עברי מעורב עם חשבון). בפועל `question`/`answer` הם **תמיד**
ביטוי חשבוני טהור בלבד (זו בדיוק ההגדרה שלהם — לא פרוזה, לא בעיה מילולית) —
אין כאן טקסט מעורב שדורש פירוק. הסתמכות על שהמודל יזכור לעטוף בגרשיים אחוריים
הייתה תלות שברירית מיותרת (ואם המודל היה שוכח, התוצאה הייתה בדיוק הבאג
הידוע-מראש של כיווניות שהתועד ב-CLAUDE.md — לא נראה, לא נבדק). הפתרון שנבחר:
הפרומפט למודל כבר לא מבקש גרשיים אחוריים כלל (רק "ביטוי חשבוני בלבד, בלי
מילים"), והלקוח עוטף את `question`/`answer` ישירות ב-`<span className="prompt-math">`
— אותו class CSS שכבר מבודד LTR (`.prompt-math` הקיים ב-`src/App.css`), בלי
תלות ב-`segmented()`/גרשיים בכלל. זו החלטה טכנית מקומית (שיטת בידוד ה-RTL,
לא הדרישה עצמה) — התוצאה זהה למה ש-design.md דרש: הביטוי מבודד ומיושר LTR.
לא נדרשה חזרה ל-tech-lead.

**Affected Files שלא הוזכרו בארכיטקטורה, התגלו בזמן המימוש:**
- הקראה בקול (`toggleTeacherSpeech`, `teacherSpeaking` state, וכפתור `.speak-button`)
  דורשה `useEffect(() => stopSpeaking, [])` לניקוי בעת יציאה מהמסך — אותו דפוס
  קיים ב-`Practice.tsx`, לא הוזכר במפורש ב-architecture.md אבל נדרש לעקביות
  (חוסר ניקוי היה משאיר קול ממשיך לדבר אחרי סגירת המחברת).
- `sendPageToServer` נמחקה לגמרי מ-`src/lib/notebookServer.ts` (אומת עם grep
  שאין שימוש נוסף בלקוח) והוחלפה ב-`readPageWithTeacher` + טיפוס `PageReading`
  מיוצא, בדיוק כמתוכנן.

**נבדק ידנית מקומית** (`cd server && npm run build && node dist/index.js`):
`/health` מחזיר `ok`; `/read-page` עם `filledCells: []` מחזיר `200` עם
`reading: {certain:false}` **בלי** לקרוא ל-Claude (מאומת — אין קריאת רשת
יוצאת); `/read-page` עם תוכן מחזיר `500` (metadata server של גוגל לא קיים
בסביבת פיתוח מקומית — צפוי ומתועד כ-Edge Case); `/render-page` הקיים ממשיך
לעבוד ללא שינוי.

**גרסה:** `npm run bump:feature` הורץ (1.23.1 → 1.24.0). `npm run build` ו-
`npm run lint` נקיים בלקוח; `npm run build` (`tsc -b`) נקי בשרת.

**לא נבדק בסבב הזה, ותלוי בצעד שהמשתמש עדיין צריך לבצע:** קריאה אמיתית
ל-Claude מקצה לקצה (מול Cloud Run בפועל). זה דורש את ארבעת משתני הסביבה
שמתועדים ב-`server/README.md`, סעיף "הפעלת /read-page — צעד חד-פעמי נדרש" —
**המשתמש צריך להריץ את זה ידנית לפני שהפיצ'ר עובד בפרודקשן**, גם אחרי מיזוג.
זה מתועד גם כ-Risk ב-architecture.md למעלה. `CLAUDE.md` **לא** נערך בסבב הזה
(הפער בין תיעוד-כשלב-פיתוח לעדכון "מה פתוח"/אילוצים ב-`CLAUDE.md` שמור
במכוון לסקיל `merge-pr`, לפי הכלל המפורש ב-`CLAUDE.md` עצמו נגד עריכה ידנית
מקבילה של הטבלה הזו) — הצעד הנדרש יופיע לתשומת לב המשתמש דרך בקשת הריוויו.
