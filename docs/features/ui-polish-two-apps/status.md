# שיפור UI לשתי האפליקציות החדשות — סטטוס

**ענף:** `feature/ui-polish-two-apps` · **גרסה:** 1.68.0 · **PR:** https://github.com/eyalzur/learn-math/pull/139 — מוזג 2026-11-28

## מה נעשה
- `DESIGN.md` (שורש): טוקנים, ניגודיות, רכיבים, החלטות פתוחות.
- `INTERACTIONS.md` (שורש): טבלת משוב לכל רכיב לחיץ, כללי מצב לחוץ והפחתת תנועה.
- `src/cloud/feedback.ts`: נקודת כניסה אחת ל-tap/success/fail.
- `src/cloud/cloud.css`, `ChildApp.tsx`, `KidsApp.tsx`, `ParentsApp.tsx`, `ParentApp.tsx`, `errors.ts`, `CodeCard.tsx`: תיקוני ניגודיות, משוב, נגישות, פריסה.
- דוח ביקורת מלא: `.ux-polish/REPORT.md` (מקומי, לא בגיט).

## מה לא נעשה (ראו REPORT.md)
- נוסחים שדורשים החלטה: פרטיות, חץ חזרה, וואטסאפ, כותרת הורים, תוויות, פאנל נעילה, מחיקה.
- Skeleton וספינרים מלאים; מסכים לא מצולמים; בדיקה במכשיר.

## סטטוס
- [x] app-design-system
- [x] motion-feedback-rewards (ללא תגמולים וצלילים — החלטה למשתמש)
- [x] ui-ux-polish (שני סבבי ביקורת + תיקונים)
- [x] מיזוג — מוזג ל-`main` 2026-11-28 (אושר במפורש)
- [ ] בדיקה במכשיר
