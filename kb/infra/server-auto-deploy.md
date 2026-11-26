---
type: Infra
title: "פריסת השרת — מה חייב להישמר בכל דיפלוי"
description: "push ל-main שנוגע ב-server/ נפרס לבד ל-Cloud Run דרך GitHub Actions + Workload Identity Federation."
tags: [infra, deploy, github-actions]
aliases: ["service account reset", "דיפלוי איפס חשבון שירות"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
* כל push ל-`main` שנוגע ב-`server/` נפרס ל-Cloud Run, בלי סוד בריפו (WIF). [הפיצ'ר](/features/server-auto-deploy.md).
* **מלכודת (2026-08-31):** הפריסה האוטומטית איפסה בשקט את חשבון השירות לברירת המחדל (במקום `notebook-server-claude@…`). תוקן ב-#61 — לוודא `--service-account` בכל פריסה.
* ארבעה משתני סביבה (`ANTHROPIC_FEDERATION_RULE_ID` וכו') חייבים להיות מוגדרים על השירות — ראו `server/README.md`. [WIF](/infra/claude-wif-auth.md).
