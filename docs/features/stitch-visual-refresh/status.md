# רענון חזותי של 5 מסכים, בהשראת Stitch

עיצוב מחדש לבחירת תלמיד/ה, בחירת נושא, תרגול, תוצאה והיסטוריה — בלי שום מערכת
ניקוד/תגמול חדשה. מבוסס מוקאפי Stitch שהמשתמש אישר מראש (`docs/design/stitch/`).

## Progress
- [x] Product spec — product-manager — 2026-11-23 (אין שאלות חוסמות: המשתמש כבר שפט
  את חמשת הכיוונים מול מוקאפים בפועל ואישר את כולם, כולל שני הפריטים ה"חלקיים"
  (דירוג-נושאים מבוסס-נתונים אמיתיים, איור-נקודות מבוסס-אופרנדים של השאלה הספציפית —
  לא קישוט סטטי בשני המקרים). קריטריון מפורש וחוזר: אסור להוסיף ניקוד/מטבעות/סטריק
  במסך התוצאה — מנוגד בכוונה לעמדת המוצר.)
- [x] Design — designer — 2026-11-23 (היקף סופי לקריטריון #2: רק `TopicPicker` עצמו
  (מיקה, מבנה "נושאים") — `LevelPicker` של רותם/עומר הוא מבנה-כרטיסים שונה לגמרי
  (easy/medium/hard) ולא נבדק מול Stitch, הוחלט לא לגעת בו כאן. איור-הכמות בתרגול הוא
  רכיב **חדש**, לא שימוש-חוזר ב-TenFrame הקיים — נבדק בקוד: TenFrame מחושב רק לדפוסי
  "עשרות/יחידות" ספציפיים, לא לחיבור/חיסור כללי. דירוג-הכוכבים משתמש באותם ספי-אחוזים
  ש-Result.tsx כבר מגדיר, לא סף חדש.)
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** tech-lead
**Branch:** `feature/stitch-visual-refresh`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
