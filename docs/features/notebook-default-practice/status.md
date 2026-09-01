# מחברת כמצב התרגול היחיד

התלמיד/ה כותב/ת את כל הפתרון (כולל התשובה) רק במחברת; המורה קוראת, משקפת מה
הבינה, מצביעה על טעות בדרך אם יש, והתוצאה הסופית עוברת לבדיקה המקומית הקיימת.

## Progress
- [x] Product spec — product-manager — 2026-08-31 (עודכן 2026-09-01, סבב רוויזיה א׳ — גודל משטח הכתיבה)
- [x] Design — designer — 2026-09-01 (סבב רוויזיה א׳ — מצב A מעודכן, מצב F חדש "מסך מלא")
- [x] Architecture — tech-lead — 2026-09-01 (סבב רוויזיה א׳ — flexbox למילוי גובה, `position:fixed;inset:0` למסך מלא)
- [x] Implementation — developer — 2026-09-01 (סבב רוויזיה א׳ — ממומש ואומת ידנית)
- [ ] Tests — qa — not started

**Current phase:** qa
**Branch:** `fix/notebook-fullscreen`
**PR:** not opened yet

**היסטוריה:** הפיצ'ר המקורי מוזג ל-`main` ב-2026-09-01 (`PR #62`, ראו למטה).
הסבב הנוכחי הוא תיקון על סמך בדיקה באתר החי.

**PR #62 (הפיצ'ר המקורי):** מוזג 2026-09-01.

## Open questions / blockers
None שחוסם על הסבב הנוכחי. שלוש ההכרעות שהמשתמש סימן כלא-ידועות בסבב המקורי
(מיקה, קריאה לא-ודאית, נתיב גיבוי בלי שרת) הוכרעו ב-product-spec.md עם נימוק
לכל אחת. תוצאת ההכרעה המשמעותית ביותר: **אין נתיב גיבוי בלי שרת** — קבלת משוב
על תשובה תלויה בהצלחת קריאת המורה, כי אין עוד שדה טקסט חלופי. זו תוצאה מודעת
ומפורשת של הבקשה, לא פרצה בכלל "הילד לא ממתין לשרת" (שממשיך לחול על התוכן
שכבר זמין תמיד: שיטה, רמזים, דימוי).

- **Designer → Tech-lead (סבב רוויזיה א׳, 2026-09-01):** מצב A — משטח הכתיבה
  ממלא את כל הגובה הפנוי אחרי הפס העליון/שאלה/רמז וסרגל הכלים (לא אחוז/פיקסלים
  קבועים). מצב F חדש — "⤢" הופך לטוגל מסך-מלא אמיתי: מגדיל את תיבת המחברת,
  מכווץ את הפס העליון לפס מצומצם עם יציאה (✕) + השאלה (אף פעם לא מקוצרת).
  קריאה ודאית (מצב D) יוצאת ממסך מלא אוטומטית — מסך מלא הוא מצב-כתיבה, לא
  מצב-תוצאה. פרטים מלאים ב-design.md.

- **Design → Tech-lead (הוכרע):** דף חדש נפתח אוטומטית לכל שאלה (כמו לחיצה
  עצמית על "+ דף חדש"); דפים קודמים נשארים לדפדוף. ראו architecture.md,
  "דף חדש לכל שאלה" ו-Edge Cases (מה קורה ב-`MAX_PAGES`).
- **Developer → QA (סבב רוויזיה א׳, 2026-09-01):** ממומש במלואו לפי הארכיטקטורה
  — `.practice` הפך ל-flex container (`flex:1`, לא `min-height:100vh/100dvh`
  כמו שתועד ראשונית, כי `#root` כבר `flex` מתחילת הפרויקט — ראו architecture.md
  Implementation Notes לנימוק). `.notebook-screen` עובר ל-`flex:1 1 auto;
  min-height:360px`, וכש-`fullscreen` פעיל מקבל `.fullscreen`
  (`position:fixed;inset:0;z-index:30`, אותו z-index שהיה במנגנון המקורי של
  `practice-notebook`). כפתור "⤢" קורא ל-`onToggleFullscreen` בלבד (לא עוד
  ל-`fitToScreen` הישן, שהוסר) — טוגל `fullscreen` state ב-`Practice.tsx`,
  שיוצא אוטומטית כש-`feedback !== null`. `topSlot` (שאלה+✕+הקראה) ו-`statusSlot`
  (הודעות אי-ודאות/כישלון שליחה) הם props חדשים ל-`PracticeNotebook`, מורכבים
  ב-`Practice.tsx` ומוצגים רק בתוך מסך מלא. אומת ידנית (לא אוטומטית — זו עבודת
  QA) עם dev server + Playwright חד-פעמי: מילוי גובה כברירת מחדל, כניסה/יציאה
  ממסך מלא, יציאה אוטומטית בקריאה ודאית, השארות במסך מלא בקריאה לא-ודאית —
  כל חמשת הבדיקות עברו. `npm run build`/`lint` נקיים, `npm run bump:fix`
  (1.25.0 → 1.25.1). לא הורצה סוויטת ה-e2e המלאה.
- **Tech-lead → Developer (סבב רוויזיה א׳, 2026-09-01):** שני שינויים ב-CSS/state
  בלבד, בלי לגעת בחוזה `/read-page`/`diagnose`/זרימת נכון-שגוי. (1) `.practice`
  הופך ל-`display:flex;flex-direction:column` (עם `100vh`/`100dvh` fallback),
  ו-`.notebook-screen` עובר מ-`height: min(60vh, 620px)` ל-`flex: 1 1 auto;
  min-height: 360px` — ממלא את כל הגובה הפנוי, עם רצפה כדי לא להידחק במצב D.
  (2) כפתור "⤢" הופך לטוגל `fullscreen: boolean` (state ב-`Practice.tsx`,
  props חדשים `fullscreen`/`onToggleFullscreen`/`topSlot` ב-`PracticeNotebookProps`):
  מוסיף class `.notebook-screen.fullscreen` עם `position:fixed;inset:0` — **אותו
  מנגנון בדיוק** שכבר היה קיים ונבדק בפיצ'ר `practice-notebook` המקורי, לא
  Fullscreen API של הדפדפן (נימוק מלא ב-architecture.md: iOS Safari, user
  gesture, `:fullscreen` pseudo-class מול קוד קיים ומוכר). `computeFitTransform`
  רץ מחדש בכל טוגל (לא רק ב-mount) כי גודל התיבה בפועל משתנה. פרטים מלאים
  ב-architecture.md, כולל Edge Cases (סיבוב טלפון, viewport קטן במיוחד) ו-Risks
  (flex container חדש על `.practice`).
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
