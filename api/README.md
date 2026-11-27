# api — השרת של אפליקציית הילדים ואפליקציית ההורים

Express דק מעל `src/cloud/server/service.ts` (כל הלוגיקה שם). רץ ב-Cloud Run, שומר ב-Firestore, מאמת הורים מול Firebase Auth.

## כדי שיהיו שתי אפליקציות שאפשר להתקין (הגדרה חד-פעמית, בערך 15 דקות)

אחרי כל השלבים, שני הקישורים האלה יעבדו, וכל אחד ניתן להתקנה ב"הוספה למסך הבית":

* ילדים: https://eyalzur.github.io/learn-math/next/
* הורים: https://eyalzur.github.io/learn-math/next/parents/

האתר החי (`/learn-math/`) לא משתנה.

**0. למזג את ה-PR** של `feature/parent-subscription` (ה-workflows צריכים להיות ב-`main`). אחרי המיזוג לא קורה כלום באתר החי: הבנייה של `/next/` מדלגת עד שמוגדר `NEXT_API_URL` (שלב 4).

**1. Google Cloud — ב-Cloud Shell, פעם אחת:**
```bash
gcloud config set project learn-math-506923
gcloud services enable firestore.googleapis.com run.googleapis.com
gcloud firestore databases create --location=me-west1
gcloud iam service-accounts create learn-math-api --display-name="learn-math api"
gcloud projects add-iam-policy-binding learn-math-506923 \
  --member="serviceAccount:learn-math-api@learn-math-506923.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
gcloud iam service-accounts add-iam-policy-binding \
  learn-math-api@learn-math-506923.iam.gserviceaccount.com \
  --member="serviceAccount:github-deployer@learn-math-506923.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```
(`already exists` אינו כשל. אם כבר יצרת Firestore אחר באותו פרויקט — השמיטו את השורה השלישית.)

**2. Firebase Console** (הפרויקט `learn-math-506923`):
* Authentication ← Sign-in method: להפעיל **Google** ו-**Email link (passwordless)**.
* Authentication ← Settings ← Authorized domains: להוסיף `eyalzur.github.io`.
* Project settings ← Your apps ← להוסיף Web app, ולהעתיק את אובייקט ה-`firebaseConfig` (JSON).

**3. GitHub** (Settings ← Secrets and variables ← Actions):
* **Secret** בשם `CHILD_TOKEN_SECRET`: מחרוזת אקראית ארוכה (למשל הפלט של `openssl rand -hex 32`). זה מה שחותם את החיבור של מכשירי הילדים.

**4. פריסה:**
* Actions ← "Deploy parents-and-kids API to Cloud Run" ← Run workflow. (עד שמבצעים את ההגדרה, הריצה הזו מסתיימת ירוקה עם הודעה "לא נפרס", זה תקין.) בסוף, בסיכום הריצה, יופיע הכתובת של השרת.
* GitHub ← Variables (באותו מקום): `NEXT_API_URL` = אותה כתובת, ו-`NEXT_FIREBASE_CONFIG` = ה-JSON משלב 2 בשורה אחת.
* Actions ← "Deploy to GitHub Pages" ← Run workflow. זה בונה את `/next/`.

**5. על כל טלפון:** לפתוח את הקישור, ו"שיתוף ← הוספה למסך הבית" (אייפון), או "התקנה" (אנדרואיד).

מצב מנוי: ברירת המחדל כבויה (בלי מחירים ונעילה). להדליק: משתנה `PAYWALL=1` ב-Variables, ולהריץ את פריסת ה-API שוב.

## פיתוח מקומי
```bash
cd api && npm install
npm run dev          # DEV_AUTH=1: כניסת הורה בלי Firebase, אחסון בזיכרון — לבדיקות בלבד, לא לפרסם
npm test             # בדיקות השירות (ללא רשת)
```
משתני סביבה: `PORT`, `DEV_AUTH=1` (**אסור** בשרת ציבורי), `CHILD_TOKEN_SECRET` (חובה מחוץ ל-DEV_AUTH), `ALLOWED_ORIGINS`, `STORE=firestore`, `FIREBASE_PROJECT_ID`, `PAYWALL=1`, `DEV_DATA_FILE`.

**מה לא נבדק:** כניסה עם Firebase (גוגל / קישור במייל), Firestore אמיתי, ופריסה ל-Cloud Run — נכתבו לפי התיעוד, ורצו רק נגד חנות בזיכרון וכניסת בדיקה.
