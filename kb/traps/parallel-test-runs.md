---
type: Trap
title: "ריצות בדיקה מקבילות אינן מדידה"
description: "reuseExistingServer + workers מרובים = תחרות על שרת אחד. מריצים פעם אחת עם --workers=1."
tags: [trap, tests, playwright, flaky]
aliases: ["workers=1", "ריצות מקבילות", "reuseExistingServer", "flake"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
# מה קרה (2026-08-15)
שתי ריצות מקבילות של `npm run test:e2e` חלקו שרת אחד ודרכו זו על זו: דיווחו `14`, `40`, `46`, `62` כשלים על אותו קוד, ואחת **אפס**. מסקנה שנשענה על אחת מהן ("רק 5 קבצים נשברו") הייתה שגויה.

# אותו מנגנון גם בריצה בודדת (2026-11-21)
`playwright.config.ts` לא מגדיר `workers`, ולכן מקומית יש 3–4 worker-ים על אותו שרת dev (ב-CI: `1`). זה גרם לכשלים "אמיתיים" ב-`idle-spotlight.spec.ts` (מדידת תזמון) וב-`.answer-input`.

# הכלל
**מריצים את הסוויטה פעם אחת, ומחכים — ומקומית תמיד `npx playwright test --workers=1`.** דיווח שנשען על ריצה שהתחילה בזמן שריצה אחרת רצה — לא נמדד, נוחש.

flake ידוע: `grade8-angles-congruence.spec.ts` (ראו [עומר](/students/omer.md)). ב-CI הסוויטה מחולקת ל-4 shards עם שרת משלהם.
