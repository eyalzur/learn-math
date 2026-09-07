# יומן מקרים שבהם המורה טעתה

השרת שומר כל מקרה שבו תלמיד/ה תיקן קריאה של המורה — הדף, הקריאה הקודמת,
התיקון, והקריאה שחזרה אחריו — כדי לבנות עם הזמן בנק בדיקות אמיתי.

## Progress
- [x] Product spec — product-manager — 2026-09-07
- [x] Design — designer — 2026-09-07
- [x] Architecture — tech-lead — 2026-09-07
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** developer
**Branch:** `feature/teacher-misread-log`
**PR:** not opened yet

## Open questions / blockers
None. הכרעות מוצר ננעלו: נשמר רק סבב שכולל תיקון בפועל (לא כל קריאה); אין
תקרת שמירה/מחיקה אוטומטית בהיקף הזה; אין מסך באפליקציה — גישה ישירה דרך
Google Cloud Console. זה הופך במפורש סעיף Out of Scope קודם של
`notebook-teacher-feedback` (`PR #68`) — מתועד ומוסבר ב-product-spec.md.

**Design (2026-09-07):** אין UI בכוונה — מתועד במפורש כ-design.md קצר שמאשר
שהזרימה הקיימת לא משתנה ושום מסך לא נדרש/נוסף.

**ארכיטקטורה (2026-09-07):** Firestore בלבד (לא GCS — התמונה קטנה מספיק כדי
לשבת ב-base64 בתוך המסמך; הכרעה מתועדת). אימות מול Firestore הוא IAM רגיל
על אותו service account, **לא** WIF כמו מול Anthropic. שמירה קורית רק אחרי
ש-`res.json()` כבר נשלח (fire-and-forget אמיתי, לא רק תיאורטי). הלקוח צריך
לשלוח `previousReading` חדש (state חדש `lastReading` ב-Practice.tsx) — בלעדיו
לא נשמר כלום, אבל שום דבר לא נכשל. **צעד חד-פעמי נדרש מהמשתמש**: יצירת
Firestore database (Native, `me-west1`) + הוספת `roles/datastore.user`
ל-service account הקיים — בלי זה השמירה נכשלת בשקט (בלוג בלבד).

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
