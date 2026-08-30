# שרת המחברת — שלב א׳

שרת Node.js/Express שמקבל מטריצת תאים מלאים של דף מחברת (`filledCells`, מפתחות
`"col,row"` — אותו פורמט שהלקוח כבר משתמש בו ב-`src/data/notebook.ts`) והופך אותה
לתמונת PNG. **אין כאן שום קריאה ל-Claude/Anthropic** — זו תשתית תקשורת והמרת פורמט
בלבד. פרטים מלאים: `docs/features/notebook-server-relay/`.

הקוד כאן עצמאי לגמרי מהלקוח (הריפו הראשי): `npm run build`/`npm run lint`/
`npm run test:e2e` בשורש הריפו לא נוגעים בתיקייה הזו, ואין CI שבודק או פורס אותה.

## חוזה ה-API

`GET /health` — מחזיר `200 ok`, לבדיקת חיות ידנית.

`POST /render-page` — גוף הבקשה:
```json
{ "cols": 258, "rows": 343, "cell": 4.665, "filledCells": ["10,20", "10,21"] }
```
תשובה מוצלחת (`200`): `{ "imageDataUrl": "data:image/png;base64,...." }`.
שגיאת ולידציה (`400`) או שרת (`500`): `{ "error": "..." }`.

## הרצה מקומית

```bash
cd server
npm install
npm run build
npm start
```

בדיקת חיות: `curl http://localhost:8080/health` אמור להחזיר `ok`.

## הפריסה הנוכחית

השרת **נפרס בפועל** (2026-08-29) וחי בכתובת:

```
https://notebook-server-864901299725.me-west1.run.app
```

פרויקט גוגל קלאוד: `learn-math-506923` (שם תצוגה `learn-math`), region `me-west1`
(תל אביב), שם השירות `notebook-server`. הכתובת הזו מחוברת ל-build של האתר דרך
`.github/workflows/deploy.yml`.

## פריסה אוטומטית — הגדרה חד-פעמית

מרגע שההגדרה כאן הושלמה, כל מיזוג ל-`main` שנוגע בקבצים תחת `server/` פורס את
השרת מעצמו, בלי שום פקודה ידנית. ה-workflow שעושה זאת הוא
`.github/workflows/deploy-server.yml`, והוא מופיע ב-GitHub תחת
**Actions → Deploy server to Cloud Run**.

> **עד שתסיימו את הצעדים כאן, הפריסה האוטומטית לא תעבוד וריצות הפריסה ב-GitHub
> ייכשלו. זה צפוי — זו לא תקלה.**

**מה זה עושה, בקצרה:** נותן ל-GitHub רשות לפרוס לפרויקט הזה — ובלי לייצר שום
סיסמה או מפתח שצריך לשמור. במקום זה, גוגל לומד לסמוך על ריצות שמגיעות מהריפו
`eyalzur/learn-math` בלבד. אין כאן שום ערך סודי, ולכן גם **אין שום דבר להדביק
בממשק של GitHub** — הכל קורה בטרמינל אחד.

### הצעדים

פותחים **Cloud Shell** (אייקון `>_` בקונסולה של גוגל קלאוד) ומדביקים את הבלוק
הבא **כולו בבת אחת**. הוא מכיל את כל הערכים האמיתיים — אין מה למלא:

```bash
gcloud config set project learn-math-506923

# 1. מפעיל את השירות שמנפיק אישורים זמניים
gcloud services enable iamcredentials.googleapis.com

# 2. יוצר את הזהות ש-GitHub יתחזה אליה בזמן פריסה
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions deployer"

# 3. נותן לזהות הזו את חמש ההרשאות הדרושות לפריסה מקוד מקור
for ROLE in roles/run.admin roles/cloudbuild.builds.editor \
            roles/artifactregistry.writer roles/storage.admin \
            roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding learn-math-506923 \
    --member="serviceAccount:github-deployer@learn-math-506923.iam.gserviceaccount.com" \
    --role="$ROLE" --condition=None
done

# 4. יוצר "מאגר זהויות" שאליו GitHub יתחבר
gcloud iam workload-identity-pools create github \
  --location=global --display-name="GitHub Actions"

# 5. מגדיר שרק הריפו הזה מורשה. השורה attribute-condition היא ההגנה עצמה:
#    בלעדיה כל ריפו ב-GitHub כולו יכול היה להתחזות ולפרוס לפרויקט שלכם.
gcloud iam workload-identity-pools providers create-oidc github \
  --location=global --workload-identity-pool=github \
  --display-name="GitHub" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='eyalzur/learn-math'"

# 6. מקשר בין השניים: הריפו הזה רשאי להתחזות לזהות מצעד 2
gcloud iam service-accounts add-iam-policy-binding \
  github-deployer@learn-math-506923.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/864901299725/locations/global/workloadIdentityPools/github/attribute.repository/eyalzur/learn-math"
```

### מה אמור לחזור

| צעד | מה אמור להופיע |
|---|---|
| 1 | `Operation ... finished successfully` |
| 2 | `Created service account [github-deployer]` |
| 3 | שש פעמים `Updated IAM policy for project [learn-math-506923]` |
| 4 | `Created workload identity pool [github]` |
| 5 | `Created workload identity pool provider [github]` |
| 6 | `Updated IAM policy for serviceAccount [github-deployer@...]` |

**`already exists` אינו כשל.** אם אתם מריצים את הבלוק פעם שנייה (למשל אחרי
תיקון של צעד שנתקע), הצעדים שכבר הצליחו יגידו שהם קיימים. זה תקין — אפשר
להמשיך הלאה.

### לבדוק שזה עובד

אין צורך לחכות למיזוג הבא. ב-GitHub: **Actions → Deploy server to Cloud Run →
Run workflow**. ריצה ידנית תמיד מנסה לפרוס בפועל, ולכן היא בדיקה אמיתית של
ההגדרה. אמורה להסתיים ירוקה, ובעמוד הריצה תופיע השורה `deployed:` עם כתובת
השרת.

### מה תראו מכאן והלאה

בכל מיזוג ל-`main` תופיע ריצה אחת בשם **Deploy server to Cloud Run**, באחד
משלושה מצבים:

| מה קרה | מה מופיע |
|---|---|
| נגעתם בקוד השרת | ✅ ירוק, ובסוף `deployed: <כתובת>` |
| השינוי היה רק בלקוח | ✅ ירוק וקצר, `no changes under server/ — nothing to deploy` |
| משהו נשבר | ❌ אדום, עם רשימת שלוש הסיבות הסבירות והפניה לכאן |

המצב האמצעי קיים בכוונה: כך אתם יודעים שהשרת **לא** התעדכן ושזה תקין, במקום
לנחש. ומכיוון שריצה מופיעה תמיד, **היעדר ריצה הוא בעצמו סימן שמשהו לא בסדר.**

## פריסה מחדש ל-Google Cloud Run

הפריסה הידנית נשארת תקפה וזמינה — שימושית לבדיקה מהירה, או אם האוטומציה
מושבתת. הכי פשוט דרך **Cloud Shell** (אייקון `>_` בקונסולה של גוגל קלאוד) — אין
צורך להתקין `gcloud` מקומית, והוא כבר מחובר לחשבון:

```bash
git clone https://github.com/eyalzur/learn-math.git
cd learn-math
gcloud run deploy notebook-server \
  --source server/ \
  --region me-west1 \
  --allow-unauthenticated
```

בסיום, הפקודה מדפיסה את כתובת השירות. **אם הכתובת משתנה** (שם שירות אחר, region
אחר), צריך לעדכן אותה גם ב-`.github/workflows/deploy.yml`.

### מכשולים חד-פעמיים שנתקלנו בהם (מתועדים כדי לא לגלות אותם מחדש)

בהקמה הראשונה נדרשו שני צעדים שאינם חלק מהפקודה עצמה:

1. **חשבון חיוב לא היה מקושר לפרויקט.** יצירת חשבון חיוב וקישורו לפרויקט הם שני
   דברים נפרדים — קיומו של חשבון לא אומר שהוא מקושר:
   ```bash
   gcloud billing accounts list   # למצוא את ה-ACCOUNT_ID
   gcloud billing projects link learn-math-506923 --billing-account=<ACCOUNT_ID>
   ```
2. **חשבון השירות של הבנייה היה חסר הרשאות.** בפרויקטים חדשים גוגל כבר לא מעניק
   אותן אוטומטית, והפריסה נכשלת ב-`Uploading sources...` עם `PERMISSION_DENIED`:
   ```bash
   gcloud projects add-iam-policy-binding learn-math-506923 \
     --member=serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com \
     --role=roles/cloudbuild.builds.builder
   ```
   (`PROJECT_NUMBER` הוא `864901299725`.) אחרי ההענקה כדאי להמתין כחצי דקה
   להתפשטות ההרשאה לפני ניסיון חוזר.

**`--allow-unauthenticated` הוא מכוון, לא פשרת אבטחה שנשכחה**: השירות בשלב הזה לא
מבצע שום פעולה בתשלום (אין קריאת Claude), ולקוח סטטי ב-GitHub Pages לא יכול לצרף
אישור מבלי לחשוף סוד בדפדפן. כשיתווסף בעתיד endpoint שקורא ל-Claude (עלות אמיתית
לכל בקשה), יידרש להוסיף הגנה מפני שימוש לרעה (rate limiting וכד') לפני שהוא נפרס —
ראו `docs/features/notebook-server-relay/architecture.md`, סעיף Risks.

## חיבור ל-Claude — Workload Identity Federation (2026-08-30)

השרת **עדיין לא קורא ל-Claude בקוד** — הסעיף הזה מתעד רק את נתיב האימות שהוקם
ונבדק, כדי שהפיצ'ר הבא (קריאת דף המחברת בכתב יד) יוכל להשתמש בו בלי לגלות מחדש
את ההגדרה. **אין כאן שום מפתח API** — לא בכספת, לא בריפו, לא בשום מקום. במקום
זה, חשבון השירות של Cloud Run מזדהה ישירות מול Anthropic דרך OIDC, בדיוק כמו
שכבר נעשה בין GitHub Actions לגוגל קלאוד (ראו "פריסה אוטומטית" למעלה).

### מה קיים

- חשבון שירות ייעודי: `notebook-server-claude@learn-math-506923.iam.gserviceaccount.com`
- ה-Cloud Run של `notebook-server` פרוס איתו (`gcloud run deploy ... --service-account=...`)
- כלל federation ב-Anthropic Console (Settings → Workload identity), workspace
  `Default`, מזהה `fdrl_01XniC27RcjaHrrtruBHC3ht`

### איך זה עובד בזמן ריצה

קוד שרץ בתוך אותו Cloud Run יכול לבקש אסימון OIDC מ-metadata server מקומי
(`http://metadata.google.internal/.../identity?audience=https://api.anthropic.com`),
ולהחליף אותו ב-access token אמיתי מול `POST https://api.anthropic.com/v1/oauth/token`
עם `grant_type: urn:ietf:params:oauth:grant-type:jwt-bearer`. זה מה שקוד השרת
יצטרך לעשות בפועל כשיתווסף endpoint שקורא ל-Claude.

### איך בודקים את זה ידנית (בלי לפרוס קוד)

מ-Cloud Shell, בהתחזות (impersonation) לחשבון השירות — אין צורך ב-VM או ב-Cloud
Run job זמניים:

```bash
JWT=$(gcloud auth print-identity-token \
  --impersonate-service-account=notebook-server-claude@learn-math-506923.iam.gserviceaccount.com \
  --audiences=https://api.anthropic.com \
  --include-email)

curl -sS https://api.anthropic.com/v1/oauth/token \
  -H "content-type: application/json" \
  --data @- <<JSON | jq 'with_entries(if (.key | test("token$")) then .value = "<redacted>" else . end)'
{
  "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
  "assertion": "$JWT",
  "federation_rule_id": "fdrl_01XniC27RcjaHrrtruBHC3ht",
  "organization_id": "623419be-a6b9-442d-a558-435eaacb4d2d",
  "service_account_id": "svac_01G2VDg1jBnmiQDmszYuJgq7",
  "workspace_id": "wrkspc_01Fd13eMa6fpYvRpwdJMpMF3"
}
JSON
```

תשובה תקינה מחזירה `access_token` (עם ttl של `expires_in` שניות, `600` בבדיקה
שנעשתה). **אף פעם אל תדפיסו/תשמרו את ה-`access_token` בפועל** — ה-`jq` למעלה
מחליף אותו ב-`<redacted>` לפני שהוא מודפס, בדיוק כדי שלא ייחשף בטעות בלוגים.

### מכשול חד-פעמי שנתקלנו בו

הפקודה הראשונה (`print-identity-token --impersonate-service-account`) נכשלת
עם `PERMISSION_DENIED` אם המשתמש שמריץ אותה חסר את ההרשאה להתחזות לחשבון
השירות — זה **נפרד** מיצירת חשבון השירות עצמו:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  notebook-server-claude@learn-math-506923.iam.gserviceaccount.com \
  --member="user:<your-email>" \
  --role="roles/iam.serviceAccountTokenCreator"
```

אחרי ההענקה יש להמתין כחצי דקה-דקה להתפשטות ההרשאה לפני ניסיון חוזר — כמו כל
IAM binding אחר בפרויקט הזה.

## חיבור הלקוח לכתובת

**באתר החי זה כבר מחובר** — `.github/workflows/deploy.yml` מעביר את הכתובת
כ-`VITE_NOTEBOOK_SERVER_URL` בזמן ה-build. הכתובת שם בטקסט גלוי ולא כ-secret,
במכוון: הדפדפן חייב להכיר אותה כדי לקרוא לשרת, ולכן היא ממילא מופיעה ב-bundle
שמתפרסם — והשירות עצמו ציבורי בכוונה. כך הכתובת שהאתר משתמש בה נמצאת בבקרת גרסאות
וניתנת לריוויו, במקום להיות מוסתרת בהגדרה בממשק של GitHub.

לפיתוח מקומי, אפשר קובץ `.env.local` בשורש הריפו:

```
VITE_NOTEBOOK_SERVER_URL=https://notebook-server-864901299725.me-west1.run.app
```

בלי המשתנה הזה מוגדר, כפתור "שלח למורה" במחברת עדיין מוצג, אך כל לחיצה נכשלת מיד
עם הודעת השגיאה הרגילה (אין כתובת לשלוח אליה).
