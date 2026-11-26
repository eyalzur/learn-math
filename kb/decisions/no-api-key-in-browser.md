---
type: Decision
title: "מפתח API לעולם לא בדפדפן ולא בריפו"
description: "כלל שאינו משתנה: כל אימות מול שירות חיצוני נעשה בשרת, בלי מפתח."
tags: [decision, security, api-key]
aliases: ["api key", "מפתח api", "סוד"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
שני כללים שאינם משתנים:
1. **מפתח API לעולם לא בדפדפן ולא בריפו.** אימות מול שירותי גוגל קלאוד נעשה בשרת בלבד, בלי מפתח — ראו [שרת הקראה](/infra/hebrew-tts-server.md).
2. **הילד לעולם לא ממתין לשרת** — ראו [החלטה](/decisions/child-never-waits.md).
