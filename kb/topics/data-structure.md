---
type: Topic
title: "מבנה נתוני התוכן (src/data)"
description: "איפה כל דבר: curriculum, בנקי שאלות לפי כיתה, מחוללים אדפטיביים, הסברים, התקדמות."
tags: [topic, data, architecture]
aliases: ["src/data", "curriculum", "Grade", "בנקי שאלות"]
status: stable
generated: {by: "claude/sonnet-5-5", at: "2026-11-26T00:00:00Z"}
---
# קבצים עיקריים (`src/data/`)
* `curriculum.ts` — התלמידים, הכיתות, הטיפוסים. `Grade` הוא איחוד מבחין: `practice: "topics"` (מיקה) או `"levels"` (רותם, עומר).
* `grade1.ts` (150 שאלות), `grade2.ts`, `grade6.ts`, `grade8.ts` — בנקי השאלות. **מקור האמת לשאלות** — לא מעתיקים ל-KB.
* `level.ts` — `LEVEL_META` ו-`level()`, בנפרד בגלל [תלות מעגלית](/traps/circular-data-imports.md).
* `explain.ts` — בונה את ההסבר: שלבים כתובים או מחושבים מהאופרנדים.
* `progress.ts` — היסטוריית תרגולים ב-localStorage. `adaptiveProgress.ts` — רמת הקושי האחרונה לכל נושא.
* `adaptive*.ts` — מחוללי הנושאים האדפטיביים ([אדפטיבי](/glossary/adaptive.md)).
* `speech.ts`, `hebrewMathSpeech.ts` — [הקראה](/topics/speech.md).

# רכיבים (`src/components/`)
StudentPicker · TopicPicker · LevelPicker · Practice · Result · History.
