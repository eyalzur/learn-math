---
type: Infra
title: "אימות מול Claude דרך Workload Identity Federation"
description: "בלי מפתח API: חשבון שירות ב-GCP, federation rule ב-Anthropic Console, וה-SDK מחליף OAuth בעצמו."
tags: [infra, auth, wif, anthropic]
aliases: ["WIF", "workload identity", "federation", "anthropic auth"]
status: deprecated
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
> ⚠️ **לא בשימוש.** אין היום קוד שקורא ל-Claude (נעלם עם שרת המחברת). הדפוס (WIF בלי מפתח) משמש עדיין לפריסה מ-GitHub Actions — ראו [שרת הקראה](/infra/hebrew-tts-server.md). כדאי לבדוק שאין חשבון שירות/federation rule מיותרים בגוגל קלאוד ובקונסול של Anthropic.

* חשבון שירות: `notebook-server-claude@learn-math-506923.iam.gserviceaccount.com`; federation rule `fdrl_01XniC27RcjaHrrtruBHC3ht` ב-workspace `Default`.
* ה-SDK הרשמי (`@anthropic-ai/sdk`) מבצע את חילופי ה-OAuth בעצמו — אין קוד ידני מול `/v1/oauth/token`.
* הרשאה נדרשת: `roles/iam.serviceAccountTokenCreator` (מכשול ידוע). פרטים: `server/README.md`.
* **פתוח:** לוודא שתקרת השימוש (`$5`/חודש) מוגדרת ב-Rate limits של ה-workspace — לא אומת.
* [כלל המפתח](/decisions/no-api-key-in-browser.md); [השרת](/infra/notebook-server.md).
