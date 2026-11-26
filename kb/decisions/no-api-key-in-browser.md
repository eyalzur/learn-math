---
type: Decision
title: "מפתח API לעולם לא בדפדפן ולא בריפו"
description: "כלל שאינו משתנה: אימות מול Anthropic רק מהשרת, דרך Workload Identity Federation."
tags: [decision, security, api-key]
aliases: ["api key", "מפתח api", "סוד"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
שני כללים שאינם משתנים:
1. **מפתח API לעולם לא בדפדפן ולא בריפו.** האימות מול Anthropic נעשה בשרת, ללא מפתח כלל — ראו [WIF](/infra/claude-wif-auth.md).
2. **הילד לעולם לא ממתין לשרת** — ראו [החלטה](/decisions/child-never-waits.md).
