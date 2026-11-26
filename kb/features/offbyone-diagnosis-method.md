---
type: Feature
title: "אבחון \"סטייה של אחד\" — מתחבר לשיטה"
description: "תיקון לדפוס האבחון `offByOne`:"
tags: [feature, offbyone, diagnosis, method]
aliases: ["offbyone-diagnosis-method"]
status: stable
sources:
  - {resource: ../../docs/features/offbyone-diagnosis-method/status.md, hash: 49e08be1}
generated: {by: "process:kb-migration", at: "2026-11-26T00:00:00Z"}
---
# סיכום
תיקון לדפוס האבחון `offByOne`: שאלת ההמשך שלו מנותקת מהשאלה המקורית ("כמה זה `89 − 1`?" בלי שום `89`/`1` בשאלה עצמה). מתוקן ע"י ביטול שאלת הביניים לגמרי — המסך מדלג ישר לקופסת "איך פותרים?" הקיימת, שכבר בנויה מכלל כללי ואז יישום על המספרים האמיתיים של השאלה. מתפצל לשני דפוסים (המשכיות מול חיבור/חיסור שלמים).

# מצב
🟢 done — מוזג ל-main

PR: [#44](https://github.com/eyalzur/learn-math/pull/44)

# מסמכי הפיצ'ר
* [architecture](../../docs/features/offbyone-diagnosis-method/architecture.md)
* [design](../../docs/features/offbyone-diagnosis-method/design.md)
* [product-spec](../../docs/features/offbyone-diagnosis-method/product-spec.md)
* [status](../../docs/features/offbyone-diagnosis-method/status.md)
* [tests](../../docs/features/offbyone-diagnosis-method/tests.md)
