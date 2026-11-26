---
type: Decision
title: "האתר נשאר סטטי ב-GitHub Pages"
description: "הקראה, ציורים והסברים רצים בדפדפן; אין שרת לאתר עצמו."
tags: [decision, pages, static]
aliases: ["אתר סטטי", "static site"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
* האתר חי ב-https://eyalzur.github.io/learn-math/ (React + TypeScript + Vite) ונשאר סטטי.
* ההקראה ב-`speechSynthesis` המובנה; הציורים וההסברים מחושבים בדפדפן.
* יש צד שרת נפרד (`server/`, Cloud Run) — ראו [שרת ההקראה](/infra/hebrew-tts-server.md). הוא רק **משפר**; האתר לא תלוי בו.
* פריסה: ראו [פריסת Pages](/infra/github-pages-deploy.md).
