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

## פריסה ל-Google Cloud Run

דורש `gcloud` CLI מותקן ומחובר לפרויקט הגוגל קלאוד הייעודי (`learn-math`).

```bash
gcloud run deploy notebook-server \
  --source server/ \
  --region <בחרו region, למשל me-west1> \
  --allow-unauthenticated
```

בסיום, הפקודה מדפיסה את כתובת השירות (נראית כמו
`https://notebook-server-xxxxxxxxxx.a.run.app`).

**`--allow-unauthenticated` הוא מכוון, לא פשרת אבטחה שנשכחה**: השירות בשלב הזה לא
מבצע שום פעולה בתשלום (אין קריאת Claude), ולקוח סטטי ב-GitHub Pages לא יכול לצרף
אישור מבלי לחשוף סוד בדפדפן. כשיתווסף בעתיד endpoint שקורא ל-Claude (עלות אמיתית
לכל בקשה), יידרש להוסיף הגנה מפני שימוש לרעה (rate limiting וכד') לפני שהוא נפרס —
ראו `docs/features/notebook-server-relay/architecture.md`, סעיף Risks.

## חיבור הלקוח לכתובת שהתקבלה

לאחר הפריסה, הזינו את הכתובת שהתקבלה כמשתנה סביבה בזמן ה-build של הלקוח (בשורש
הריפו, לא כאן):

```bash
VITE_NOTEBOOK_SERVER_URL=https://notebook-server-xxxxxxxxxx.a.run.app npm run build
```

לפיתוח מקומי, אפשר גם קובץ `.env.local` בשורש הריפו עם אותה שורה. בלי המשתנה הזה
מוגדר, כפתור "שלח למורה" במחברת עדיין מוצג, אך כל לחיצה נכשלת מיד עם הודעת השגיאה
הרגילה (אין כתובת לשלוח אליה).
