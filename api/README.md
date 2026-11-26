# api — שרת מנוי הורים

Express דק מעל `src/cloud/server/service.ts` (כל הלוגיקה שם, גם בדמו שבדפדפן).

```bash
cd api && npm install
npm run dev          # DEV_AUTH=1: כניסת הורה בלי Firebase (Authorization: Bearer dev:<email>), אחסון בזיכרון/קובץ
npm test             # בדיקות השירות (ללא רשת)
```

סביבה: `PORT` (8787), `DEV_AUTH=1` (אסור בייצור), `CHILD_TOKEN_SECRET` (חובה בייצור), `ALLOWED_ORIGINS`,
`STORE=firestore` (+ אישורי גוגל של ה-Cloud Run), `FIREBASE_PROJECT_ID`, `DEV_DATA_FILE` (שמירה לקובץ בפיתוח).
**לא נבדק מול Firestore/Firebase אמיתיים** — רק מול `MemoryStore`. ראו `docs/features/parent-subscription/architecture.md`.
