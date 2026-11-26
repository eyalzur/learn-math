---
type: Process
title: "ה-pipeline של פיצ'ר"
description: "כל שינוי עובר product → design → architecture → implementation → tests, וכל שלב כותב מסמך ועושה קומיט."
tags: [process, pipeline, feature]
aliases: ["/feature", "pipeline", "שישה skills"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
הפעילו `/feature <תיאור>`. הוא מריץ ברצף: `product-manager` → `designer` → `tech-lead` → `developer` → `qa`.

* כל שלב כותב מסמך ב-`docs/features/<slug>/` ועושה קומיט משלו, כך שהיסטוריית ה-PR נקראת כמו סיפור הפיצ'ר.
* **לא מדלגים על שלבים** — התיעוד הוא איך המשתמש (לא מתכנת) עוקב אחרי מה שקורה.
* כל שלב מעדכן `status.md` — כך `/resume-proj` ו-`/status` מדויקים.
* כללים משותפים: `.claude/skills/_shared/references/`.
* אחרי שהכל מוכן: [בקשת ריוויו](/process/review-request.md), ו-[מיזוג](/process/branch-pr-merge.md).
