---
type: Infra
title: "פריסת האתר ל-GitHub Pages"
description: "workflow Deploy to GitHub Pages בכל מיזוג ל-main; Source חייב להיות GitHub Actions."
tags: [infra, pages, deploy, ci]
aliases: ["pages", "deploy.yml", "פריסה"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
* `.github/workflows/deploy.yml` מפרסם ל-https://eyalzur.github.io/learn-math/ בכל מיזוג ל-`main`.
* דורש Settings → Pages → Source = "GitHub Actions". כשל 404: [מלכודת](/traps/github-pages-disabled.md).
* CI נוסף: `tests.yml` (4 shards), `version-check.yml`, `deploy-hebrew-tts-server.yml`.
