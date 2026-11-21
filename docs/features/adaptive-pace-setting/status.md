# קצב התקדמות בקושי — ניתן לכיוון

בורר חדש (אטי/רגיל/מהיר) בדיאלוג ⚙️ שקובע כמה תשובות נכונות/שגויות ברצף דרושות
כדי שרמת הקושי תעלה/תרד.

## Progress
- [x] Product spec — product-manager — 2026-11-18
- [x] Design — designer — 2026-11-18
- [x] Architecture — tech-lead — 2026-11-18
- [x] Implementation — developer — 2026-11-18
- [x] Tests — qa — 2026-11-18

**Current phase:** done — מוזג ל-`main`
**Branch:** `feature/adaptive-pace-setting`
**PR:** https://github.com/eyalzur/learn-math/pull/90 — מוזג 2026-11-21

**מיזוג `main` פנימה (2026-11-21):** `main` זז משמעותית מאז פתיחת ה-PR (כולל
`scored-answer-practice`, שהחליף את המחברת בשדה-תשובה מוקלד). קונפליקטים
אמיתיים ב-`App.tsx`/`SettingsDialog.tsx`/`preferences.ts`/`settingsVisibility.ts`/
`App.css` — כל הגדרות-המחברת הישנות (hold-zoom, pan-speed, button-size,
suggestion-sensitivity, nav-pad) כבר לא קיימות ב-`main`, נשאר רק `pace`. נמצא
בדרך: שני טסטים ("מחליפים קצב באמצע תרגול פעיל") לא ניתנים יותר להרצה — אין
עוד שום מסך שפותח ⚙️ מתוך `Practice.tsx` עצמו (ה-`onOpenSettings` נעלם יחד עם
סרגל-הכלים הישן של המחברת), כך שבפועל גם שום הגדרה אחרת לא ניתנת לשינוי
באמצע תרגול פעיל יותר — לא רק קצב. זו רגרסיה כללית שקדמה ל-PR הזה (ירשה
אותה מ-`scored-answer-practice`), לא באג בקוד הזה. שני הטסטים סומנו
`test.skip` עם הסבר, לא נמחקו ולא נאלצו לעבור. **לא טופל כאן** — דורש החלטת
מוצר נפרדת (האם להחזיר גישה ל-⚙️ מתוך מסך התרגול). `347/349` בסוויטה המלאה
אחרי המיזוג (`--workers=1`): שני כשלים, שניהם flakes לא-קשורים —
`grade8-angles-congruence.spec.ts` (מתועד כבר) ו-`mika-adaptive-difficulty.spec.ts`
"history records the topic without a level suffix" (19/20 במקום 20/20 —
נמצא פעם אחת מתוך 15 הרצות חוזרות, לא קשור לשינוי הזה, לא תועד קודם).
גרסה `1.50.1` → `1.51.0`.

## Open questions / blockers
None לחסימת המיזוג. **הערה לא-חוסמת (tech-lead):** ההגדרה מאוחסנת פר-תלמיד/ה,
לא גלובלית כפי שנכתב מילולית ב-product-spec.md — ראו architecture.md,
Risks/Tradeoffs, לנימוק. **ממצא חדש לא-חוסם (מיזוג `main`):** אי-אפשר יותר
לפתוח ⚙️ מתוך מסך תרגול פעיל (לשום הגדרה) — ראו למעלה.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
