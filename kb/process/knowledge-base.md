---
type: Process
title: "בסיס הידע (kb/) — איך משתמשים"
description: "kb/ הוא bundle בפורמט OKF; שואלים עם /kb-ask, מוסיפים עם /kb-add, והכלים רצים בלי LLM."
tags: [process, kb, okf]
aliases: ["kb", "בסיס ידע", "knowledge base", "okf"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
* **לשאול:** `/kb-ask <שאלה>` — סוכן `kb-query` (haiku) מנווט: אינדקס ← חיפוש ← עד 3 קבצים. תשובה בעברית + מקורות.
* **להוסיף:** `/kb-add <טקסט או נתיב>` — סוכן `kb-ingest` מחפש קודם, מעדכן קובץ קיים במקום ליצור כפילות, בונה אינדקס ו-lint.
* **כלים:** `npm run kb -- index|search|lint|stale|hash|log`. ראו `kb/tools/README.md`.
* **כללי כתיבה:** [מבנה ה-KB](/_types.md). קובץ אחד = מושג אחד; עובדה במקום אחד.
* ה-KB הוא ידע **לפיתוח**; האתר לא נוגע בו. התוכנית המלאה: `docs/features/knowledge-base/plan.md`.
* כשסוגרים פיצ'ר: מעדכנים את קובץ ה-feature שלו ב-`kb/features/` (סטטוס) ומוסיפים החלטות/מלכודות שעלו.
