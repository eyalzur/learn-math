---
type: Feature
title: "שתי אפליקציות: ילדים והורים, שרת וקודי חיבור"
description: "אפליקציית ילדים ואפליקציית הורים נפרדות להתקנה; הילד יוצר פרופיל ומקליד קוד הורים, ההורה רואה התקדמות. מוזג, אבל לא פעיל עד הגדרת שרת."
tags: [feature, parents, kids, pwa, api]
aliases: ["parent-subscription", "מנוי הורים", "הפיצ'ר של שתי האפליקציות"]
status: stable
sources:
  - {resource: ../../docs/features/parent-subscription/status.md, hash: "2a15f68a"}
generated: {by: "claude/sonnet-5-5", at: "2026-11-27T22:30:00Z"}
---
# סיכום
שתי אפליקציות נפרדות מאותו קוד: ילדים (`/next/`) והורים (`/next/parents/`), עם שרת (`api/`, Cloud Run + Firestore). החלטות: [שתי אפליקציות](/decisions/two-apps-kids-and-parents.md).
* הילד יוצר פרופיל בעצמו; קוד של הורה מחבר אותו למשפחה (קוד אחד לכל הילדים, עד 3, 10 דקות). מכשיר חדש לילד: קוד חד-פעמי מההורה.
* הורה רואה התקדמות לפי נושא; הזמנות (ילד, הורה נוסף, מכשיר חדש) בקוד, QR ווואטסאפ.
* מנוי (שבוע חינם, 10/30 ₪, נעילה) בנוי אבל **כבוי** (`PAYWALL`). תשלום הוא stub.
* **נדחו:** לוח זמנים, תזכורות והתראות; ספק תשלום; PIN לילדים.

# מצב
מוזג ב-2026-11-27 ([#137](https://github.com/eyalzur/learn-math/pull/137)). **לא פעיל** עד ההגדרה החד-פעמית ב-`api/README.md` (Firestore, Firebase, secret, פריסה). לא נבדק מול Firebase/Firestore אמיתיים.

# מסמכי הפיצ'ר
* [status](../../docs/features/parent-subscription/status.md)
* [product-spec](../../docs/features/parent-subscription/product-spec.md)
* [architecture](../../docs/features/parent-subscription/architecture.md)
* [הגדרת השרת](../../api/README.md)
