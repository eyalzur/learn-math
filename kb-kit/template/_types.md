---
type: Reference
title: מבנה ה-KB וכללי כתיבה
description: אילו תיקיות וסוגי מושג מותרים ב-kb/, ואיך כותבים קובץ.
kb_title: שם האפליקציה — בסיס ידע
language: Hebrew
dirs:
  decisions: החלטות מוצר שהמשתמש הכריע
  traps: מלכודות שכבר עלו ביוקר
  features: מה נבנה, למה, ובאיזה מצב
  process: איך עובדים כאן
  infra: שרת, פריסה, CI, הגדרות
  glossary: מונחים
types: [Decision, Trap, Feature, Process, Infra, Glossary]
generated: {by: "human:owner", at: "2026-01-01T00:00:00Z"}
---
# כללי כתיבה

* **קובץ אחד = מושג אחד.** הנתיב הוא הזהות. slug באנגלית.
* **חובה בכותרת:** `type`, `title`, `description` (משפט אחד), `generated: {by, at}` (`at` עם אזור זמן: `2026-01-01T10:00:00Z`).
* **מומלץ:** `tags`, `aliases`, `sources` (`{resource: ../../path, hash: "<npm run kb -- hash path>"}`), `status`.
* עד 300 שורות לקובץ. עובדה במקום אחד — הצגה חוזרת = קישור.
* אחרי כל שינוי: `npm run kb -- index && npm run kb -- lint`.
