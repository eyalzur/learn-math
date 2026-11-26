---
type: Infra
title: "שרת המחברת (server/) ב-Cloud Run"
description: "Node+Express: POST /render-page (תאים ← PNG) ו-POST /read-page (קריאה ב-Claude vision). פרויקט learn-math-506923, region me-west1."
tags: [infra, server, cloud-run, notebook]
aliases: ["server", "cloud run", "read-page", "render-page", "שרת"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
* `server/` — Node+Express. נפרס ל-Google Cloud Run: `https://notebook-server-864901299725.me-west1.run.app`, פרויקט `learn-math-506923`, region `me-west1`.
* `POST /render-page` — מטריצת תאים ← תמונת PNG, בלי LLM. `POST /read-page` — אותה תמונה + Claude vision (`claude-opus-5`, פלט מובנה עם Zod) שמתמלל מה נכתב, בלי ניקוד.
* כתובת השרת מחוברת ל-build של האתר. "שלח למורה" עובד מקצה לקצה באתר החי (אומת 2026-08-31).
* אימות: [WIF](/infra/claude-wif-auth.md). פריסה: [אוטומטית](/infra/server-auto-deploy.md). פרטים: `server/README.md`.
* כללים: [בלי מפתח בדפדפן](/decisions/no-api-key-in-browser.md), [הילד לא ממתין](/decisions/child-never-waits.md).
* פיצ'רים: [relay](/features/notebook-server-relay.md), [המורה מבינה](/features/notebook-teacher-understanding.md), [סימוני המורה](/features/notebook-teacher-marks.md).
