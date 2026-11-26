---
type: Process
title: "מריצים בדיקות לפני שאומרים מוכן"
description: "build + lint + e2e; הריצה המקומית חייבת --workers=1 ופעם אחת בלבד."
tags: [process, tests, playwright, e2e]
aliases: ["בדיקות", "playwright", "test:e2e"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
```bash
npm run build && npm run lint && npm run test:e2e
```
כל הבדיקות צריכות לעבור. Playwright מוגדר; הדפדפן ב-`/opt/pw-browsers/chromium`.

* **מריצים פעם אחת, ומחכים.** מקומית חייבים `npx playwright test --workers=1` — ראו [בדיקות מקביליות](/traps/parallel-test-runs.md).
* כשל על נושא אדפטיבי שלא משחזר: ראו [StrictMode](/traps/strictmode-random-flaky.md).
* בכל שינוי ב-`kb/`: `npm run kb:test` ו-`npm run kb -- lint`.
