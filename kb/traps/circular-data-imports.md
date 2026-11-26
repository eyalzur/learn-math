---
type: Trap
title: "תלות מעגלית בין קבצי נתונים — מסך לבן"
description: "grade1.ts קרא ל-level() מ-curriculum.ts שמייבא אותו בחזרה; TypeScript לא תופס. level() יושב ב-level.ts."
tags: [trap, typescript, imports, data]
aliases: ["circular import", "LEVEL_META", "מסך לבן", "תלות מעגלית"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
* תסמין: מסך לבן, `Cannot access 'LEVEL_META' before initialization`. **TypeScript לא תופס.**
* תיקון: `level()` ו-`LEVEL_META` ב-`src/data/level.ts` בנפרד.
* **קובץ תוכן חדש לכיתה — מייבאים מ-`level.ts`**, לא מ-`curriculum.ts`. ראו [מבנה הנתונים](/topics/data-structure.md).
