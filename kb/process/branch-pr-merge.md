---
type: Process
title: "בראנץ' ל-PR, ומיזוג רק באישור"
description: "main נפרס אוטומטית לאתר החי — אין push ישיר; PR נפתח רק אחרי בדיקות ירוקות; ממזגים רק באישור מפורש."
tags: [process, git, pr, merge]
aliases: ["pr", "merge", "מיזוג", "main"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
* `main` **נפרס אוטומטית לאתר החי**, לכן push ישיר אליו מפרסם קוד שלא נבדק.
* כל פיצ'ר/תיקון בבראנץ' משלו: `feature/<slug>` או `fix/<slug>`. רק המתאם פותח PR, אחרי שהבדיקות ירוקות.
* **לא ממזגים בלי אישור מפורש של המשתמש.** המיזוג דרך skill `merge-pr`, שמעדכן `status.md`, `docs/features/README.md` ואת "מה פתוח" באותו קומיט.
* גרסה: שינוי שנוגע ב-`src/` / `public/` / `index.html` מחייב העלאת גרסה (`npm run bump:feature|fix`) — בודק ב-CI.
* הגנת הבראנץ' (Settings → Branches → require `check`+`test`) עוד לא הוגדרה; רק המשתמש יכול.
