---
type: Infra
title: "שרת הקראה בעברית (server/) ב-Cloud Run"
description: "Node+Express קטן: POST /synthesize מקבל טקסט עברי ומחזיר MP3 מ-Google Cloud TTS. השרת היחיד בפרויקט היום."
tags: [infra, server, tts, cloud-run]
aliases: ["tts server", "synthesize", "שרת הקראה", "hebrew-tts-server"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T23:00:00Z"}
---
* `server/` — Node+Express. `GET /health`, `POST /synthesize` (גוף: `{ "text": "שבע פחות שלוש שווה ארבע" }`, תשובה: MP3 בינארי).
* הטקסט כבר מנורמל בלקוח ([הקראה](/topics/speech.md)). נשלח **טקסט השאלה בלבד** — בלי נתוני ילד.
* כשל כלשהו (400/429/500) = הלקוח חוזר בשקט להקראה המובנית של המכשיר (`src/data/cloudSpeech.ts`).
* אימות: חשבון השירות של Cloud Run הוא כבר זהות גוגל; הספרייה הרשמית משתמשת ב-Application Default Credentials. **אין מפתח** בשום מקום ([הכלל](/decisions/no-api-key-in-browser.md)).
* פריסה: `.github/workflows/deploy-hebrew-tts-server.yml` — רץ על כל push ל-`main`, מחליט לבד אם יש מה לפרוס. WIF ל-GitHub Actions (pool `github`, חשבון `github-deployer@learn-math-506923`) — ייתכן שנשארו מהשרת הישן; לבדוק לפני יצירה מחדש (`server/README.md`).
* פרויקט `learn-math-506923`. פרטים מלאים: `server/README.md`. הפיצ'ר: [הקראה בקול טבעי](/features/hebrew-math-tts.md).
