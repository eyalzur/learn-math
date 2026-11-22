# שרת הקראת חשבון בעברית

שרת Node.js/Express זעיר שמקבל טקסט עברי שהנורמליזטור בלקוח כבר הפיק
(`src/data/hebrewMathSpeech.ts` — "שבע פחות שלוש שווה ארבע", לא `7 - 3 = 4`), קורא בשמו
ל-Google Cloud Text-to-Speech, ומחזיר קובץ MP3. זה הדרך היחידה שבה מפתח/אישור של גוגל
קלאוד נוגע בכלל בבקשה הזו — **הוא לעולם לא מגיע לדפדפן ולא נשמר בריפו**.

הקוד כאן עצמאי לגמרי מהלקוח (הריפו הראשי): `npm run build`/`npm run lint`/
`npm run test:e2e` בשורש הריפו לא נוגעים בתיקייה הזו.

## זה לא השרת הראשון בפרויקט — יש כאן תקדים

הריפו הזה כבר הכיל שרת מהצורה הזו בדיוק: `server/` עם Node+Express ב-Cloud Run,
נפרס אוטומטית ב-GitHub Actions בכל push שנגע ב-`server/`, מאומת ל-Google Cloud בלי
סוד כלשהו בריפו (Workload Identity Federation). הוא הוסר ב-2026 כש-
`docs/features/scored-answer-practice/` החליף את מחברת הציור שהוא שירת — **הקוד הוסר,
אבל שום משאב בגוגל קלאוד לא נמחק אוטומטית אז.** יש סיכוי טוב שה-pool/חשבון-השירות
של ה-deploy (`github-deployer@...`, workload identity pool `github`) **עדיין קיימים**
בפרויקט `learn-math-506923`. בדקו לפני שאתם יוצרים אותם מחדש:

```bash
gcloud config set project learn-math-506923
gcloud iam workload-identity-pools list --location=global
gcloud iam service-accounts list
```

אם `github-deployer@learn-math-506923.iam.gserviceaccount.com` ו-pool בשם `github`
כבר מופיעים — דלגו על צעד 4 למטה (יצירת ה-WIF) ועברו ישר לצעד 5. הצעדים כאן בכל
מקרה אידמפוטנטיים (`already exists` אינו כשל, בדיוק כמו בפעם הקודמת).

## חוזה ה-API

`GET /health` — מחזיר `200 ok`, לבדיקת חיות ידנית.

`POST /synthesize` — גוף הבקשה:
```json
{ "text": "שבע פחות שלוש שווה ארבע" }
```
תשובה מוצלחת (`200`): גוף הבקשה הוא קובץ **MP3 בינארי** עם `Content-Type: audio/mpeg`
— לא JSON עטוף, כדי שהלקוח יוכל לקרוא אותו כ-`Blob` ישירות בלי שלב `base64` נוסף.
שגיאת ולידציה (`400`), rate limit (`429`), או שגיאת שרת (`500`): JSON רגיל
`{ "error": "..." }` — הלקוח לעולם לא מציג את תוכן השגיאה הזה; כל כשל מכל סוג גורם
ללקוח לחזור להקראה המובנית של המכשיר באופן שקט (ראו `src/data/cloudSpeech.ts`).

## הרצה מקומית

```bash
cd server
npm install
npm run build
GOOGLE_APPLICATION_CREDENTIALS=/path/to/a/local/service-account-key.json npm start
```

(מקומית בלבד — ב-Cloud Run אין צורך בקובץ מפתח כלל, ראו "אימות" למטה.)

בדיקת חיות: `curl http://localhost:8080/health` אמור להחזיר `ok`.
בדיקת הקראה: `curl -X POST http://localhost:8080/synthesize -H "Content-Type: application/json" -d '{"text":"שלום"}' --output test.mp3`

## אימות מול Google Cloud Text-to-Speech — בלי מפתח בשום מקום

בניגוד לחיבור הישן מול Claude (Anthropic) שהצריך Workload Identity Federation כדי
שגוגל "תסמוך" על זהות חוץ-גוגלית — כאן **אין צד שלישי**. חשבון השירות שה-Cloud Run
רץ בשמו הוא כבר זהות גוגל, וספריית הלקוח הרשמית (`@google-cloud/text-to-speech`)
מאתרת ומשתמשת בו-(Application Default Credentials) לגמרי בעצמה. אין קוד אימות
ידני בכלל בקובץ `synthesize.ts`.

**לא נדרשת הרשאת IAM ייעודית לקריאה ל-Text-to-Speech API עצמו** — בניגוד לשירותים
כמו Cloud Run או Cloud Storage, ל-Text-to-Speech אין מודל הרשאות לפי משאב; כל זהות
מאומתת בפרויקט שבו ה-API מופעל ויש לו חיוב פעיל יכולה לקרוא לו. **לא אומת בפועל
מול gcloud אמיתי בסשן הזה** — אם בכל זאת תיתקלו בשגיאת הרשאה, הפתרון הנפוץ הוא
להוסיף לחשבון השירות את התפקיד `roles/editor` (רחב, אבל זמין-מראש) עד שתאתרו
תפקיד ממוקד יותר.

## הצעדים (אם מתחילים מאפס, או אחרי שבדקתם למעלה שחלק כבר קיים)

### 1. מפעילים את ה-API

```bash
gcloud services enable texttospeech.googleapis.com
```

### 2. יוצרים חשבון שירות ייעודי להרצה (runtime)

נפרד מחשבון השירות של ה-notebook-server הישן (אם עדיין קיים) — זהות מצומצמת, בלי שום
קשר לשום דבר אחר בפרויקט:

```bash
gcloud iam service-accounts create hebrew-tts-server \
  --display-name="Hebrew TTS server runtime"
```

### 3. (רק אם צעד הבדיקה למעלה הראה שהם לא קיימים) יוצרים את זהות ה-deploy

זהה לגמרי לצעדים שבוצעו בפעם הקודמת לשרת המחברת (ראו היסטוריית git,
`git show <commit-before-removal>:server/README.md` לנוסח המקורי המלא) — חשבון
שירות ש-GitHub Actions מתחזה אליו דרך OIDC, בלי שום סוד שנשמר בשום מקום:

```bash
gcloud config set project learn-math-506923
gcloud services enable iamcredentials.googleapis.com

gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions deployer"

for ROLE in roles/run.admin roles/cloudbuild.builds.editor \
            roles/artifactregistry.writer roles/storage.admin \
            roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding learn-math-506923 \
    --member="serviceAccount:github-deployer@learn-math-506923.iam.gserviceaccount.com" \
    --role="$ROLE" --condition=None
done

gcloud iam workload-identity-pools create github \
  --location=global --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc github \
  --location=global --workload-identity-pool=github \
  --display-name="GitHub" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='eyalzur/learn-math'"

gcloud iam service-accounts add-iam-policy-binding \
  github-deployer@learn-math-506923.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/864901299725/locations/global/workloadIdentityPools/github/attribute.repository/eyalzur/learn-math"
```

### 4. בודקים שזה עובד

**Actions → Deploy Hebrew TTS server to Cloud Run → Run workflow** בממשק של GitHub.
ריצה ידנית מנסה לפרוס בפועל, ולכן היא בדיקה אמיתית. אמורה להסתיים ירוקה, עם השורה
`deployed: <כתובת>` בעמוד הריצה.

### 5. מחברים את הכתובת לבנייה של האתר

לוקחים את הכתובת שהופיעה בצעד 4 ומוסיפים אותה כ-`VITE_HEBREW_TTS_SERVER_URL`
בשלב הבנייה של `.github/workflows/deploy.yml` (ראו השורה המקבילה שהייתה קיימת שם
בעבר ל-`VITE_NOTEBOOK_SERVER_URL`). **בלי הצעד הזה, האתר ממשיך לעבוד בדיוק כמו
היום** — `src/data/cloudSpeech.ts` מתייחס לכתובת ריקה כ"אין שרת מוגדר" ומדלג ישר
להקראת המכשיר, באופן שקט ובלי שום שגיאה.

## פריסה אוטומטית

ה-workflow `.github/workflows/deploy-hebrew-tts-server.yml` עוקב אחרי `server/` בכל
push ל-`main`, בדיוק לפי התבנית של ה-workflow הישן (`deploy-server.yml`, ראו היסטוריית
git) — כולל ריצה תמיד (לא רק כשמשהו השתנה תחת `server/`) כדי שהיעדר ריצה יהיה סימן
בעצמו, לא רק הצלחה/כשל שבתוך ריצה שבכלל לא קרתה.

## עלות וה-Free Tier

**מאומת מול דף התמחור הרשמי של גוגל ב-2026-11-21** (לא מהזיכרון):

| דרגת קול | he-IL זמין? | מכסה חינמית חודשית | מחיר אחרי המכסה |
|---|---|---|---|
| Standard | כן (A–D) | 4,000,000 תווים | $4 / מיליון תווים |
| WaveNet | כן (A–D) | 4,000,000 תווים | $4 / מיליון תווים |
| Neural2 | **לא** | 1,000,000 תווים | $16 / מיליון תווים |
| **Chirp 3: HD** (**נבחר**) | **כן**, בחירה רחבה של קולות | 1,000,000 תווים | $30 / מיליון תווים |
| Studio | **לא** | 1,000,000 תווים | $160 / מיליון תווים |

Chirp 3: HD הוא דרגת האיכות הגבוהה ביותר שה-he-IL נתמך בה **וגם** נמצאת במכסה
החינמית — Studio איכותי דומה אך לא קיים כלל בעברית, ו-Neural2 גם הוא לא קיים בעברית.
1,000,000 תווים בחודש הוא נפח גדול בהרבה ממה שתרגול יומי של שלושה ילדים מפיק (כל
הסבר הוא כמה עשרות תווים, מוקלט פעם אחת בלבד בזכות ה-cache בלקוח —
`src/data/cloudSpeech.ts`), כך שבפועל לא צפוי חיוב כלל. שם הקול המדויק
(`he-IL-Chirp3-HD-Leda`, קבוע ב-`server/src/synthesize.ts`, ניתן לשינוי דרך משתנה
הסביבה `TTS_VOICE_NAME` בלי build מחדש) הוא בחירת-טעם של פרסונה, לא החלטה
טכנית — ראו `docs/features/hebrew-math-tts/architecture.md`, סעיף "החלטות שהתקבלו
בלי ריוויו תוכן", אם רוצים קול אחר מתוך הרשימה.
