# שרת המחברת — שלב א׳ — Architecture

## Overview
שירות שרת חדש ועצמאי (Node.js + TypeScript + Express) חי בתיקיית `server/` חדשה
בשורש הריפו, נפרד לגמרי מבנייה/לינט/פריסה של אתר הלקוח הסטטי. הוא חושף endpoint
אחד שמקבל את המטריצה כ-JSON, מצייר אותה לתמונת PNG בזיכרון (ללא ספריות native —
`pngjs` בלבד), ומחזיר אותה כ-data URL. הלקוח מוסיף כפתור "שלח למורה" ל-
`PracticeNotebook.tsx` שממיר את `filledCells` (Set) למערך, שולח `fetch`, ומציג את
ה-data URL שחוזר בתוך הדיאלוג הקיים.

## Affected Files / Components

**חדש — שרת (לא חלק מ-build/lint/bundle של הלקוח):**
- `server/package.json` — פרויקט Node נפרד, תלויות: `express`, `cors`, `pngjs`
  (+ `typescript`, `@types/*` כ-dev). לא מתווסף ל-workspaces של הריפו הראשי —
  `npm run build`/`npm run lint`/`npm run test:e2e` בשורש ממשיכים להתייחס רק ללקוח.
- `server/tsconfig.json` — קונפיג TS עצמאי לשרת (target Node, לא DOM/JSX).
- `server/src/index.ts` — הקמת אפליקציית Express: middleware ל-CORS, endpoint יחיד
  (ראו "Technical Approach"), `app.listen(process.env.PORT ?? 8080, ...)` — הפורט
  מגיע מ-`PORT` כי Cloud Run מזריק אותו כמשתנה סביבה ולא קבוע.
- `server/src/renderMatrix.ts` — פונקציה טהורה: מקבלת רשימת תאים מלאים + מידות,
  מחזירה `Buffer` של PNG. כל לוגיקת הציור בקובץ אחד, נטול Express, קלה לבדוק.
- `server/Dockerfile` — build רב-שלבי: שלב `build` (`npm ci && npm run build`),
  שלב `run` קליל (`node:20-alpine`, מעתיק רק את ה-JS המקומפל ו-`node_modules`
  ל-production, `CMD ["node", "dist/index.js"]`).
- `server/.dockerignore` — `node_modules`, `dist` (נבנים מחדש בתוך הקונטיינר).
- `server/README.md` — הוראות פריסה ידניות ל-Cloud Run (`gcloud run deploy`),
  כולל איך למצוא את כתובת השירות אחרי הפריסה והיכן להזין אותה בלקוח (ראו למטה).

**חדש — לקוח:**
- `src/lib/notebookServer.ts` — פונקציה אחת, `sendPageToServer(page: NotebookPage):
  Promise<string>` (מחזירה data URL), שמכילה את כתובת השרת ואת המרת ה-`Set` למערך.
  קובץ נפרד מ-`PracticeNotebook.tsx` כדי שקריאת הרשת תהיה ניתנת לבדיקה/מוק בבידוד,
  ולא קבורה בתוך רכיב React.
- `.env`/קונפיג build (Vite): כתובת השרת מגיעה ממשתנה `VITE_NOTEBOOK_SERVER_URL`
  עם ברירת מחדל ל-placeholder ברור (למשל `""`) — כי אין עדיין כתובת פריסה אמיתית
  בזמן כתיבת הקוד. ראו "Edge Cases" למה שקורה כשזה ריק.

**משתנה — לקוח:**
- `src/components/PracticeNotebook.tsx` — מוסיף: state לשליחה (`idle` /
  `sending` / `error`), state לדיאלוג התמונה (`serverImage: string | null`),
  כפתור "שלח למורה" בסרגל הכלים (בין "נקה דף" לניווט הדפים, לפי design.md),
  הודעת שגיאה מתחת לסרגל (`aria-live="polite"`), ותוכן חדש לדיאלוג הקיים
  (`.notebook-confirm-backdrop`/`.notebook-confirm-dialog`) כשיש `serverImage` —
  לצד ה-state הקיים `confirmDelete` שכבר שולט על אותו דיאלוג (שני dialogs לא
  יכולים להיפתח בו-זמנית; ראו "Edge Cases").
- `src/App.css` — כללי עיצוב לכפתור החדש ולהודעת השגיאה, בהמשך למוסכמות הקיימות
  (`.notebook-clear-btn`, `.notebook-max-pages-note`).
- `.github/workflows/tests.yml`, `version-check.yml`, `deploy.yml` — **לא משתנים**.
  קוד השרת ב-`server/` אינו נבדק/נבנה/נפרס על ידי שום workflow קיים בשלב הזה
  (הפריסה עצמה ידנית, כפי שה-product-spec קבע ב-Out of Scope). ה-CI הקיים ממשיך
  להריץ build/lint/e2e על הלקוח בלבד.

## Data / State Changes

**חוזה הבקשה** — `POST /render-page` (Content-Type: `application/json`):
```json
{
  "cols": 258,
  "rows": 343,
  "cell": 4.665,
  "filledCells": ["10,20", "10,21", "42,100"]
}
```
הלקוח שולח `cols`/`rows`/`cell` בכל בקשה (נגזרים מ-`PAGE_WIDTH`/`PAGE_HEIGHT`/`CELL`
הקיימים ב-`src/data/notebook.ts`) — **השרת לא מקבע את המידות בקוד שלו**. זו החלטה
מכוונת: כך אין שני מקורות אמת למספרים האלה שעלולים לסטות זה מזה (בדיוק סוג הבאג
שכבר קרה עם `LEVEL_META` — ראו CLAUDE.md), ואם בעתיד יהיה גודל עמוד שונה (מסך אחר,
תלמיד אחר), השרת כבר תומך בזה בלי שינוי.

**חוזה התשובה** — הצלחה (`200`):
```json
{ "imageDataUrl": "data:image/png;base64,...." }
```
כישלון ולידציה (`400`) או שגיאת שרת (`500`): `{ "error": "<תיאור קצר, אנגלית, לוגים
בלבד — הלקוח מציג תמיד את אותה הודעת שגיאה גנרית מ-design.md, לא את תוכן זה>" }`.

**למה data URL בתוך JSON, ולא PNG בינארי ישירות:** קלט/פלט אחיד (JSON פנימה, JSON
החוצה) פשוט יותר ל-`fetch` בצד לקוח ול-endpoint יחיד שיתרחב בקלות בשלב הבא (למשל
תוספת שדה `note` בתשובה כשיתווסף ניתוח קלוד) — התשלום היחיד הוא ניפוח הבייטים
ב-33% (base64), זניח בסדר הגודל של תמונה כזו (עשרות KB) מול המורכבות שנחסכת
מהצד הקדמי.

**State חדש בלקוח (`PracticeNotebook.tsx`):**
```ts
type SendState = "idle" | "sending" | "error";
const [sendState, setSendState] = useState<SendState>("idle");
const [serverImage, setServerImage] = useState<string | null>(null); // data URL
```

## Technical Approach

**המרת מטריצה לתמונה (`server/src/renderMatrix.ts`):** `pngjs` בלבד (ללא
`node-canvas`) — ספרייה טהורה-JS ללא תלות native, כדי שקונטיינר ה-Docker יישאר
קטן ומהיר לבנייה/עלייה קרה (cold start) ב-Cloud Run, ובלי כאבי-ראש ידועים של
קומפילציה native בזמן `docker build`. האלגוריתם: יוצרים `PNG` בגודל
`Math.round(cols * cell) × Math.round(rows * cell)`, ממלאים רקע לבן, ועבור כל
מפתח ב-`filledCells` (בפורמט `"col,row"`) צובעים את הריבוע המתאים (`col*cell` עד
`(col+1)*cell`, וכנ"ל ל-row) בשחור — בדיוק אותה לוגיקת ריבועים שהלקוח כבר מצייר
על `<canvas>` היום (`src/components/PracticeNotebook.tsx`), רק שהפלט כאן הוא PNG
buffer ולא פיקסלים על מסך. הפונקציה מייצאת חתימה טהורה
`renderMatrix({ cols, rows, cell, filledCells }): Buffer` — בלי Express, בלי
side effects, קלה לבדיקת יחידה נפרדת מה-HTTP layer.

**Express layer (`server/src/index.ts`):**
1. `cors()` עם allow-list מפורש ל-origin: `https://eyalzur.github.io` (הפרודקשן)
   ו-`http://localhost:5173` (dev server מקומי של Vite) — לא `*`, כדי לא לפתוח
   את ה-endpoint לכל אתר בעולם ללא צורך.
2. `express.json({ limit: "2mb" })` — תקרת גודל payload סבירה למטריצה של דף בודד
   (מונעת בקשות ענק בטעות/בזדון; לדף מלא ריאלי המערך הרבה יותר קטן מזה).
2. `POST /render-page` — ולידציה בסיסית של המבנה (ראו Edge Cases), קריאה ל-
   `renderMatrix`, המרה ל-`data:image/png;base64,${buffer.toString("base64")}`,
   החזרה כ-JSON.
3. `GET /health` — endpoint שקט שמחזיר `200 ok`, לבדיקת חיות ידנית של הפריסה
   (curl) בלי לשלוח מטריצה — נוח לאימות ראשוני שהשירות באוויר לפני חיבור הלקוח.

**מבנה תיקיות השרת** — נבחר `server/` כתיקייה עצמאית עם `package.json` משלה
(לא monorepo workspaces, לא שיתוף `node_modules` עם הלקוח): השרת הזה ייפרס
כקונטיינר Docker נפרד, לא נבנה על ידי Vite, ולא צריך את React/הכלים של הלקוח —
הפרדה מלאה מונעת שהשינוי בפרויקט אחד ישפיע (או ידרוש בדיקה) בשני.

**פריסה ל-Google Cloud Run (ידנית, לפי product-spec):** `server/README.md` יתעד
`gcloud run deploy notebook-server --source server/ --region <region> --allow-unauthenticated`.
**`--allow-unauthenticated` הוא מכוון**: ה-endpoint לא עושה עדיין שום פעולה
בתשלום (אין קריאת Claude), ולקוח סטטי ב-GitHub Pages לא יכול לצרף אישור מבלי
לחשוף סוד בדפדפן — ולכן בשלב הזה "ציבורי" הוא הפשרה הנכונה. שם השירות המלא
(שנקבע בפריסה בפועל) יוזן ידנית על ידי המשתמש כ-`VITE_NOTEBOOK_SERVER_URL` בזמן
build הלקוח (`.env` מקומי / secret ב-GitHub Actions של `deploy.yml`, בהתאם למה
שהמשתמש יבחר) — אין דרך לדעת את הכתובת מראש בזמן כתיבת הקוד, כי הפרויקט טרם נפרס.

**איך זה משאיר מקום לשלב הבא (קלוד) בלי שכתוב:** ה-endpoint נקרא `/render-page`
(לא `/analyze` או `/read`) — שם שמתאר בדיוק ורק את הפעולה של השלב הזה. שלב הבא
מוסיף endpoint **נפרד**, למשל `/read-page`, שקורא פנימית ל-`renderMatrix` (שימוש
חוזר) ואז שולח את התוצאה ל-Claude — בלי לגעת בחוזה של `/render-page` הקיים.
הפרדת קבצים (`renderMatrix.ts` טהור, `index.ts` HTTP בלבד) מכינה בדיוק את נקודת
ההרחבה הזו. מפתח Anthropic (כשיגיע) ייכנס דרך `process.env.ANTHROPIC_API_KEY`
שמוזרק ב-Cloud Run מ-Secret Manager — לא נוגע בקובץ הזה כלל.

## Edge Cases
- **דף ריק נשלח בכל זאת** (הכפתור אמור להיות מושבת לפי design.md, אך הרשת/מרוץ
  תנאים עלול לאפשר בקשה עם `filledCells: []`) — השרת מטפל בזה כבקשה תקינה
  לחלוטין ומחזיר תמונה לבנה ריקה; אין צורך בשגיאה מיוחדת, זו התנהגות נכונה
  שמשקפת נאמנה "מה שצויר" (=כלום).
- **מטריצה לא תקינה** (`cols`/`rows`/`cell` חסרים/שליליים/לא-מספריים, או מפתח
  ב-`filledCells` שלא בפורמט `"col,row"`, או קואורדינטה מחוץ לתחום `cols`×`rows`):
  ולידציה מפורשת ב-Express layer מחזירה `400` עם `error` כללי; קואורדינטות מחוץ
  לתחום נחתכות/מדולגות בשקט ברמת `renderMatrix` ולא מפילות את כל הבקשה (עדיף
  תמונה חלקית-נכונה על שגיאה גורפת בגלל תא בודד פגום).
- **payload ענק** — תקרת `express.json({ limit: "2mb" })` מחזירה `413` באופן
  טבעי; הלקוח מציג את אותה הודעת שגיאה גנרית (אין צורך להבחין בין סוגי כשלים
  בממשק, לפי design.md).
- **השרת לא זמין / timeout / CORS נכשל** — `fetch` בלקוח נכשל (`reject` או
  `!response.ok`); `sendPageToServer` מתרגם את כל אלה ל-exception אחיד, ו-
  `PracticeNotebook.tsx` תופס אותו ב-`catch` ומעביר ל-`sendState = "error"`.
  אין timeout מפורש בצד לקוח בשלב הזה — נפח הבקשה קטן ופעולת ציור מקומית מהירה,
  לא צפוי תלוי-רשת ארוך; אם ייתקל בפועל, ניתן להוסיף `AbortController` בעתיד.
- **הדיאלוג הקיים (`confirmDelete`) ודיאלוג התמונה החדש (`serverImage`) לא יכולים
  להיפתח בו-זמנית** — שני ה-state-ים עצמאיים, אך ה-UI מציג את אחד מהם בכל רגע
  נתון (בפועל בלתי-אפשרי מבחינת זרימת המשתמש: "שלח למורה" ו"הסר דף" הן שתי
  פעולות נפרדות שלא ניתן להפעיל בו-זמנית מאותו סרגל). ה-developer יוודא ששני
  ה-state-ים לעולם לא `truthy` יחד (למשל: פתיחת אחד מאפסת את השני).
- **`VITE_NOTEBOOK_SERVER_URL` לא מוגדר** (למשל בזמן פיתוח מקומי לפני שהשרת נפרס
  בפועל) — הכפתור עדיין מוצג (אין לדעת בזמן build אם השרת "אמור" להיות זמין),
  אבל הלחיצה נכשלת מיד (כתובת ריקה → `fetch` נכשל) ומציגה את הודעת השגיאה
  הרגילה — לא קורס, לא מתנהג אחרת מכל כשל תקשורת אחר.

## Risks / Tradeoffs
- **Endpoint ציבורי ללא אימות.** מקובל לשלב הזה (אין עדיין עלות תפעולית אמיתית
  מאחורי הבקשה — רק ציור PNG מקומי, זול וחסין-DoS יחסית), אבל **זה ישתנה בשלב
  הבא**: ברגע שיתווסף endpoint שקורא ל-Claude (עלות כסף אמיתית לכל בקשה), יידרש
  מנגנון הגנה מפני שימוש לרעה (rate limiting לפי IP, או origin-check מחמיר יותר)
  לפני שהוא נפרס — מסומן כאן במפורש כדי שהשלב הבא לא ישכח את זה, לא כפתרון
  לבנות עכשיו.
- **`pngjs` על פני `node-canvas`.** `node-canvas` נותן API ציור עשיר יותר (קווים,
  צורות מורכבות) שיכול להיות שימושי אם הציור יתעשר בעתיד, אבל דורש קומפילציית
  native (Cairo) שמסבכת בניית Docker image ומאיטה cold start ב-Cloud Run. הציור
  הנוכחי הוא אך ורק ריבועים מלאים בגריד קבוע — בדיוק מה ש-`pngjs` (מניפולציית
  פיקסלים ישירה) עושה בפשטות מלאה, בלי הצדקה לתלות הכבדה יותר.
- **אין timeout/retry logic בלקוח.** לשלב תשתית ראשון, פשטות עדיפה; אם בפועל
  יתגלו תקיעות רשת ארוכות, זו תוספת קטנה ומבודדת ל-`notebookServer.ts` בעתיד,
  לא שינוי ארכיטקטוני.
- **כתובת השרת כמשתנה סביבה, לא קבועה בקוד.** דורש מהמשתמש צעד ידני נוסף (הזנת
  הכתובת אחרי הפריסה) שלא ניתן להימנע ממנו — אין דרך לדעת את כתובת ה-Cloud Run
  Service מראש. תועד בבירור ב-`server/README.md` ובהערות ה-Implementation Notes
  שה-developer יוסיף.
- **קוד השרת לא נבדק ב-CI הקיים.** מכוון לשלב הזה (הפריסה ידנית, לפי product-spec
  Out of Scope) — `renderMatrix.ts` הטהור עדיין ראוי לבדיקת יחידה מקומית (לא
  Playwright — זה קוד Node, לא UI), אך זה לא חובה לשלב הזה ומושאר לשיקול דעת
  ה-developer/qa אם יש זמן; אין CI job חדש שנפתח כאן.

## Open Questions
None.

## Implementation Notes

נבנה בדיוק לפי התוכנית, ללא סטיות ארכיטקטוניות. פרטים:

**שרת (`server/`):** Node.js + TypeScript + Express, כמתוכנן. `npm install` הותקן
בפועל בתוך `server/` (תלויות: `express`, `cors`, `pngjs` + טיפוסים) ו-`npm run build`
(`tsc -b`) עבר נקי. השרת נבדק ידנית עם `node dist/index.js`: `GET /health` החזיר
`ok`, `POST /render-page` עם מטריצה תקינה החזיר `imageDataUrl` תקין, ובקשה לא תקינה
(`cols` שלילי) החזירה `400` עם `{"error": "invalid request body"}` כמתוכנן.
`server/package-lock.json` נוצר על ידי `npm install` והוא חלק מהקומיט (לפריסת
Docker דטרמיניסטית עם `npm ci`). נוסף `server/.gitignore` (לא הוזכר בארכיטקטורה
במפורש) ל-`node_modules`/`dist`/`*.tsbuildinfo` של תיקיית השרת — הגיגנור הראשי
של הריפו כבר מכסה את שני הראשונים בלי `/` מוביל, אבל `.tsbuildinfo` לא היה מכוסה.

**לקוח:** `src/lib/notebookServer.ts` נוסף בדיוק כמתוכנן — פונקציה טהורה אחת,
`sendPageToServer`, קוראת ל-`import.meta.env.VITE_NOTEBOOK_SERVER_URL` (משתנה
Vite קיים מסוג `any` דרך `ImportMetaEnv`, לא נדרשה הצהרת טיפוס נוספת). כשה-URL
ריק, הפונקציה זורקת מיד (`fetch` אפילו לא מתבצע) — הלקוח מטפל בזה כמו כל כשל
תקשורת אחר, כפי שה-Edge Cases תיארו.

`src/components/PracticeNotebook.tsx`: נוספו `sendState`
(`"idle" | "sending" | "error"`) ו-`serverImage` (`string | null`), כפתור "שלח
למורה" בין "נקה דף" לניווט הדפים, הודעת שגיאה עם `aria-live="polite"`, ודיאלוג
תמונה חדש שמשתמש באותו `.notebook-confirm-backdrop`/`.notebook-confirm-dialog`
עם קלאס נוסף (`notebook-image-dialog`) להרחבת ה-`max-width`. כותרת הדיאלוג
("זה מה שהשרת קיבל") מומשה כ-`<h2>` (לא `<p>` כמו דיאלוג המחיקה) כי design.md
מכנה אותה במפורש "כותרת" — הבחנה סמנטית קלה, לא סטייה מהעיצוב.

**סגירת הדיאלוג בקליק על הרקע:** design.md תיאר "קליק על הרקע — אותה התנהגות
שכבר קיימת בחלון אישור המחיקה", אך בפועל דיאלוג המחיקה הקיים **לא** תומך בסגירה
בקליק על הרקע (רק כפתור). מומש כאן באותה צורה בדיוק (סגירה רק דרך "סגירה") —
התאמה להתנהגות שבאמת קיימת בקוד, לא לתיאור. שינוי סמנטי קטן, לא מוצרי — לא
נדרשה חזרה ל-designer.

**גילוי בזמן פיתוח (לא סטייה מהתכנון, אך דורש עדכון בדיקה קיימת):**
`tests/e2e/practice-notebook.spec.ts` הכיל בדיקה קודמת, "the notebook has no
submit or export action", שקבעה כאינווריאנט שלא יהיה שום כפתור "שלח"/"ייצוא"/
"הגש" במחברת — נכון כשהמחברת הייתה טיוטה בלבד, ועכשיו סותר במפורש את
product-spec.md המאושר של הפיצ'ר הזה. עודכנה לבדוק את מה שבאמת אמור להיות נכון
עכשיו: יש בדיוק כפתור "שלח למורה" אחד, ואין שום כפתור ייצוא/הגשה **אחר**. שם
הבדיקה עודכן בהתאם. הרצת קובץ הבדיקה בבידוד (7/7) ואז הסוויטה המלאה (279/279,
כולל הקובץ הזה) אישרו שאין רגרסיה נוספת.

**גרסה:** `npm run bump:feature` הורץ (1.22.0 → 1.23.0), `npm run build` ו-
`npm run lint` נקיים.

**הפריסה בוצעה בפועל (2026-08-29), והכתובת חוברה לאתר.** המשתמש פרס את השרת
ל-Cloud Run דרך Cloud Shell; הכתובת שהתקבלה היא
`https://notebook-server-864901299725.me-west1.run.app` (פרויקט `learn-math-506923`,
region `me-west1`). שלוש בדיקות ידניות מול השרת החי עברו: `/health` החזיר `ok`,
`POST /render-page` עם מטריצה תקינה החזיר `imageDataUrl`, וקלט לא תקין החזיר
`400` עם `{"error":"invalid request body"}` — וה-base64 שחזר מהשרת בענן היה זהה
בייט-בבייט לזה שהתקבל מהרצה מקומית של אותו קוד. הכתובת נוספה ל-
`.github/workflows/deploy.yml` כמשתנה `VITE_NOTEBOOK_SERVER_URL` בטקסט גלוי (לא
secret — היא ממילא מגיעה ל-bundle הציבורי, והשירות ציבורי בכוונה). בלי הצעד הזה
המיזוג היה מביא לאתר החי כפתור שתמיד נכשל. שני מכשולי הקמה חד-פעמיים (חשבון חיוב
שלא היה מקושר, והרשאת `roles/cloudbuild.builds.builder` החסרה לחשבון השירות של
הבנייה) תועדו ב-`server/README.md` כדי שלא יתגלו מחדש.

**תיקון שנדרש אחרי שה-qa כתב בדיקות (חזרה קצרה ל-developer):** הבדיקה הראשונה
שנכתבה לכפתור ("מושבת בדף ריק, פעיל כשיש תוכן") חשפה שהכפתור נשאר מושבת גם אחרי
ציור אמיתי. הסיבה: ציור על ה-canvas מעדכן את `currentPage.filledCells` ישירות
דרך refs בלי לקרוא ל-state setter כלשהו (במכוון — כדי לא לגרום לרינדור מחדש על
כל `pointermove`, שיכול לירות עשרות פעמים בשנייה). "שלח למורה" הוא הכפתור הראשון
באפליקציה שה-`disabled` שלו תלוי בתוכן הדף בזמן רינדור, ולכן הוא הראשון שחשף
שאין שום מנגנון שמכריח רינדור מחדש כשהתוכן משתנה. תוקן בהוספת `useReducer` זעיר
(`notifyContentChanged`) שמופעל רק בשלוש נקודות לא-תדירות: סיום משיכת קו
(`endPointer`, כשהיה ציור בפועל), ביטול משיכה עקב pinch-gesture (`undoRecording`),
וניקוי דף (`clearCurrentPage`) — לא בכל `pointermove`, כדי לשמר את שיקול הביצועים
המקורי של הרכיב.
