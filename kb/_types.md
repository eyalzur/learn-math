---
type: Reference
title: מבנה ה-KB וכללי כתיבה
description: אילו תיקיות וסוגי מושג מותרים ב-kb/, ואיך כותבים קובץ.
kb_title: לומדים חשבון — בסיס ידע
language: Hebrew
dirs:
  students: תלמידים — מי הם ומה חשוב לדעת
  topics: נושאי תרגול ובנקי השאלות (תיאור, לא העתק)
  rules: כללי תוכן, ניסוח ועיצוב
  traps: מלכודות שכבר עלו ביוקר
  features: מה נבנה, למה, ובאיזה מצב
  decisions: החלטות מוצר שהמשתמש הכריע
  infra: שרת, פריסה, CI, הגדרות
  process: איך עובדים כאן (pipeline, ריוויו, מיזוג)
  glossary: מונחים — עברית מול קוד
types: [Student, Topic, Rule, Trap, Feature, Decision, Infra, Process, Glossary]
generated: {by: "human:eyal", at: "2026-11-26T00:00:00Z"}
---
# כללי כתיבה

* **קובץ אחד = מושג אחד.** הנתיב הוא הזהות (`traps/rtl-math-direction.md`). slug באנגלית, תוכן בעברית.
* **חובה בכותרת:** `type`, `title`, `description` (משפט אחד), `generated: {by, at}`.
  `at` בפורמט `2026-11-26T10:00:00Z` (חייב אזור זמן).
* **מומלץ:** `tags`, `aliases` (כל איך שאנשים קוראים לזה — "RTL", "כיווניות", "bidi"),
  `sources` (מאיפה זה בא: `{resource: ../../CLAUDE.md, hash: "<kb hash>"}`), `status` (draft/stable/deprecated).
* **גודל:** עד 300 שורות. יותר מזה — מפצלים.
* **עובדה במקום אחד.** הצגה חוזרת = קישור (`[טקסט](/traps/x.md)`), לא העתקה.
* **השאלות עצמן נשארות ב-`src/data`.** כאן רק תיאור + קישור לקובץ.
* אחרי כל שינוי: `npm run kb -- index && npm run kb -- lint`.
