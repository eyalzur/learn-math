# תיקוני שימושיות במחברת התרגול

חמישה תיקונים למסך המחברת: אישור לפני מחיקת דף, זום פתיחה קבוע (70%), ביטול
המעבר האוטומטי לשאלה הבאה, פונט תרגיל קטן יותר במסך מלא, וסימון ברור לתשובה
נכונה שהתהליך שלה כלל שגיאה.

## Progress
- [x] Product spec — product-manager — 2026-09-04
- [x] Design — designer — 2026-09-04
- [x] Architecture — tech-lead — 2026-09-04
- [x] Implementation — developer — 2026-09-04
- [x] Tests — qa — 2026-09-04

**Current phase:** done — ממתין ל-PR ולריוויו
**Branch:** `fix/notebook-usability-fixes`
**PR:** יתעדכן כשייפתח

## Open questions / blockers
None. שני תיקונים לניסוח לא מדויק ב-design.md נעשו בשלב הארכיטקטורה בלי לחזור
ל-designer, כי הם לא שינוי בכוונת המוצר — ראו architecture.md, תיקונים 2 ו-4:
זום פתיחה נשאר "נשמר בין שאלות" כמו היום (רק ה-fit הראשוני קבוע), ופונט מסך
מלא יורד ל-18px, לא עולה ל-40px.

**שני באגים אמיתיים נתפסו ותוקנו ב-QA** (לא רק תיעוד — ראו architecture.md,
"עדכון — שני באגים אמיתיים שנתפסו ב-QA"): זום ה-70% נדרס בחזרה לדינמי בגלל
הכפלת ה-mount של React StrictMode, ו-`drawOnCanvas` (עזר בדיקות משותף) הפסיק
לעבוד על מסכים לא-צרים בגלל אותו זום קבוע. שניהם תוקנו ואומתו מול הסוויטה
המלאה. `328/328` בדיקות עוברות בריצה בודדת ונקייה, `build`/`lint` ירוקים,
גרסה `1.27.1`.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
