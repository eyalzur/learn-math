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

## פריסה מחדש ל-Google Cloud Run

הכי פשוט דרך **Cloud Shell** (אייקון `>_` בקונסולה של גוגל קלאוד) — אין צורך
להתקין `gcloud` מקומית, והוא כבר מחובר לחשבון:

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
