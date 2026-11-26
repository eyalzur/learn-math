# אותיות קודקוד על ציורי זוויות ומשולשים

תיקון: הטקסט אמר "∡A = 34°, ∡B = 63°" והציור לא הראה A, B, C — התלמיד לא יכול לקשר טקסט לציור.

## מה נעשה
- כל ציור ב-`AngleShape` מצייר עכשיו את האותיות שהשאלה מזכירה: משולש (סכום, חיצונית) A/B/C; שווה-שוקיים A/B/C (+D בתיכון); חפיפה A/B/C/D/E (כבר היה, הועבר למנגנון המשותף); ישרים מקבילים a/b/c. זווית על קו ישר — השאלות לא מזכירות אותיות, אז אין.
- מקור אמת יחיד: `drawnLabels(shape)` ב-`src/data/angleShape.ts`. הרכיב זורק שגיאה אם הציור והרשימה לא תואמים.
- בדיקת תוכן `tests/e2e/angle-figure-labels.spec.ts`: נכשלת אם prompt (כתוב או נוצר) מזכיר אות שהציור לא מצייר.

## Progress
- [x] Product / Design / Architecture / Implementation / Tests — 2026-11-26 (תיקון קטן, מסמך אחד)

**Current phase:** done — מוזג ל-`main`
**Branch:** `fix/triangle-vertex-labels`
**PR:** https://github.com/eyalzur/learn-math/pull/130 — מוזג 2026-11-26

## Open questions / blockers
None.
