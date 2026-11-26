---
type: Trap
title: "StrictMode + Math.random() בנושא אדפטיבי — פלייקי רק ב-dev"
description: "כשל e2e לא-עקבי בנושא אדפטיבי הוא כנראה תקלת dev של React StrictMode, לא רגרסיה באתר החי."
tags: [trap, react, strictmode, adaptive, flaky]
aliases: ["StrictMode", "Math.random", "פלייקי", "withoutRepeatingPrompt"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
# מה נמצא (2026-11-21)
בדיקת "run of correct answers… never repeats the question" (נושא `חיבור עד 10`) נכשלה כ-20% מהריצות תחת `npm run test:e2e` (שמריץ `npm run dev`, כלומר `<StrictMode>`), אבל עברה `8/8` מול `vite build && vite preview`. StrictMode מפעיל updater-functions של `useState` פעמיים בכוונה, וזה מתערב עם `adaptive.generate()` על `Math.random()` ויוצר לפעמים כפילות ש-`withoutRepeatingPrompt` לא תופס.

# הכלל
כשל e2e על נושא אדפטיבי שאינו משחזר בעקביות — **לפני שמניחים רגרסיה**, בודקים אם הוא נעלם תחת `vite build && vite preview`. אם כן: תקלת dev מוכרת. לא לשנות את הלוגיקה, ולא להתעלם בלי לתעד. ראו [הרצת בדיקות](/process/run-tests.md).
