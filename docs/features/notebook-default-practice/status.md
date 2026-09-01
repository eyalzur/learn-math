# מחברת כמצב התרגול היחיד

התלמיד/ה כותב/ת את כל הפתרון (כולל התשובה) רק במחברת; המורה קוראת, משקפת מה
הבינה, מצביעה על טעות בדרך אם יש, והתוצאה הסופית עוברת לבדיקה המקומית הקיימת.

## Progress
- [x] Product spec — product-manager — 2026-08-31
- [x] Design — designer — 2026-08-31
- [x] Architecture — tech-lead — 2026-08-31
- [x] Implementation — developer — 2026-08-31
- [x] Tests — qa — 2026-08-31 (300/300, ריצה בודדת ונקייה)

**Current phase:** done — מוזג ל-`main`
**Branch:** `feature/notebook-default-practice`
**PR:** [#62](https://github.com/eyalzur/learn-math/pull/62) — מוזג 2026-09-01

## Open questions / blockers
None שחוסם. שלוש ההכרעות שהמשתמש סימן כלא-ידועות (מיקה, קריאה לא-ודאית, נתיב
גיבוי בלי שרת) הוכרעו ב-product-spec.md עם נימוק לכל אחת. תוצאת ההכרעה
המשמעותית ביותר: **אין נתיב גיבוי בלי שרת** — קבלת משוב על תשובה תלויה בהצלחת
קריאת המורה, כי אין עוד שדה טקסט חלופי. זו תוצאה מודעת ומפורשת של הבקשה, לא
פרצה בכלל "הילד לא ממתין לשרת" (שממשיך לחול על התוכן שכבר זמין תמיד: שיטה,
רמזים, דימוי).

- **Design → Tech-lead (הוכרע):** דף חדש נפתח אוטומטית לכל שאלה (כמו לחיצה
  עצמית על "+ דף חדש"); דפים קודמים נשארים לדפדוף. ראו architecture.md,
  "דף חדש לכל שאלה" ו-Edge Cases (מה קורה ב-`MAX_PAGES`).
- **Tech-lead → Developer (בוצע):** חוזה `/read-page` השתנה שינוי שובר (לא
  תוסף) — `PageReading`, הבקשה (`expectedPrompt` חדש), והתשובה
  (`processReflection`/`errorPointer`/`finalAnswer` במקום `question`/`answer`
  הישנים; `imageDataUrl` הוסר). מומש במלואו — ראו architecture.md, Implementation
  Notes.
- **Developer → QA (טופל):** הסרת שדה התשובה המוקלד שברה 23 מתוך 29 קובצי e2e
  קיימים. נפתר עם helper משותף חדש (`tests/e2e/helpers/notebookAnswer.ts`) —
  ראו tests.md לפירוט המלא, כולל שני באגים אמיתיים ושלושה תיקוני-בדיקות
  שהתגלו רק תוך כדי הרצת הסוויטה המלאה (regex לא מעוגן שתפס בטעות את כפתור
  ניווט הדפים של המחברת, ומרוץ תזמון כי מענה במחברת עובר `await` אמיתי
  בניגוד לשדה הטקסט הישן).

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
