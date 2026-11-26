# לומדים חשבון — הנחיות לסשן חדש

אפליקציית ווב בעברית לתרגול חשבון, לשלושה ילדים אמיתיים. חי ב-https://eyalzur.github.io/learn-math/ ·
React + TypeScript + Vite. **קראו את הקובץ הזה לפני שנוגעים בקוד.**

> **הידע המלא חי ב-`kb/`** (בסיס ידע בפורמט OKF). כאן רק מה שחייבים לדעת בכל סשן.
> צריכים הקשר — החלטה, מלכודת, חומר על תלמיד, איך פיצ'ר עובד? **`/kb-ask <שאלה>`** (זול: עד 3 קבצים).
> נסגר משהו שכדאי לזכור? **`/kb-add <טקסט>`** (בלי כפילויות). ראו [`kb/process/knowledge-base.md`](kb/process/knowledge-base.md).

## התלמידים
| שם | כיתה | מה זה אומר |
|---|---|---|
| מיקה | א׳ (בת 7) | **עדיין לומדת לקרוא.** כל טקסט קצר, ורצוי שאפשר להקריא אותו |
| רותם | ו׳ | כיתה קטנה, אבל חומר של כיתה ו׳ רגילה |
| עומר | ח׳ | אלגברה, פיתגורס, פונקציות |

זה לא פרויקט הדגמה. החלטות מוצר נשפטות לפי "האם זה עוזר לילד/ה שכרגע טעו", לא לפי מה שנוח לבנות.

## תקשורת עם המשתמש
* כותבים לו **בעברית — תמיד**.
* **בצ'אט כותבים קצר:** מה הוספתי/שיניתי, בשורות תחתונות. בלי תחקיר של קבצים/פקודות — זה שייך לקומיטים ול-`docs/features/`.
* **בקשת ריוויו — תמיד ארבעה שדות**, והיא תמיד **דף תצוגה מקדימה ממוקד** (HTML אחד), לא הדרכה לנווט באפליקציה:
  > **איפה:** [לינק לחיץ] · **איך:** רותם ← שברים עשרוניים ← קל ← שאלה 3 ← הקלד `6` ·
  > **מה אמור לקרות:** … · **מה לשפוט:** האם הניסוח מלמד, או רק מודיע

  "צריך את הריוויו שלך על X" אסור; "ראה בטבלה למעלה" אינה הוראה; PR שני בלי ארבעה שדות — לא מזכירים אותו כדבר שדורש ריוויו.
  ל-PR של תיעוד: **איפה** = קישור לקובץ, **איך** = איזה סעיף. הכלי: skill `review-ready`. פירוט: [`kb/process/review-request.md`](kb/process/review-request.md).

## איך עובדים
1. **מתחילים סשן ב-`/resume-proj`** — מה פתוח, מה חסום על המשתמש, והצעה אחת להתחיל בה. (`/status` — בדיקה אמצע-סשן.)
2. **כל שינוי עובר `/feature <תיאור>`**: product → design → architecture → implementation → tests. כל שלב כותב ב-`docs/features/<slug>/`, עושה קומיט, ומעדכן `status.md`. **לא מדלגים על שלבים.** כללים משותפים: `.claude/skills/_shared/references/`.
3. **בראנץ' משלו עם PR** (`feature/<slug>` / `fix/<slug>`). `main` **נפרס אוטומטית לאתר החי** — אין push ישיר. רק המתאם פותח PR, אחרי בדיקות ירוקות. **לא ממזגים בלי אישור מפורש** (דרך skill `merge-pr`, לא עורכים ידנית את "מה פתוח").
4. **בדיקות לפני "מוכן"** — פעם אחת, ומחכים:
   ```bash
   npm run build && npm run lint && npx playwright test --workers=1
   ```
   (`--workers=1` מקומית חובה — אחרת ריצה "בודדת" היא בעצם כמה ריצות על שרת אחד.) שינוי ב-`kb/`: `npm run kb:test && npm run kb -- lint`.

## מלכודות — כלל אחד לכל אחת (הסיפור המלא ב-`/kb-ask`)
* **RTL:** טקסט עברי וביטוי חשבוני הם תמיד שני אלמנטים נפרדים; `unicode-bidi: isolate`; ביטוי בתוך משפט בגרשיים אחוריים. [`kb/traps/rtl-math-direction.md`](kb/traps/rtl-math-direction.md)
* **אותיות סופיות:** `בלון` אינו תת-מחרוזת של `בלונים` — לא מחפשים מחרוזות בעברית. [`kb/traps/hebrew-final-letters.md`](kb/traps/hebrew-final-letters.md)
* **תלות מעגלית:** קובץ תוכן חדש לכיתה מייבא את `level()` מ-`src/data/level.ts`, לא מ-`curriculum.ts` (מסך לבן, TypeScript לא תופס). [`kb/traps/circular-data-imports.md`](kb/traps/circular-data-imports.md)
* **StrictMode:** כשל e2e לא-עקבי בנושא אדפטיבי — קודם בודקים תחת `vite build && vite preview` לפני שמניחים רגרסיה. [`kb/traps/strictmode-random-flaky.md`](kb/traps/strictmode-random-flaky.md)
* **אתר חי "לא עובד" בלי PR חשוד:** בודקים קודם את ריצת `Deploy to GitHub Pages` האחרונה (404 = Settings → Pages → Source = GitHub Actions, רק המשתמש משנה). [`kb/traps/github-pages-disabled.md`](kb/traps/github-pages-disabled.md)
* **ריצות בדיקה מקבילות אינן מדידה.** [`kb/traps/parallel-test-runs.md`](kb/traps/parallel-test-runs.md)

## מבנה
```
src/data/       curriculum.ts (תלמידים, כיתות; Grade = איחוד מבחין topics/levels) · grade1/2/6/8.ts (בנקי שאלות)
                level.ts · explain.ts · progress.ts · adaptive*.ts · speech.ts   (מפה מלאה: kb/topics/data-structure.md)
src/components/ StudentPicker · TopicPicker · LevelPicker · Practice · Result · History
server/         Node+Express ב-Cloud Run — שרת הקראה (/synthesize)         docs/features/  מסמך לכל פיצ'ר (README = אינדקס)
kb/             בסיס הידע (OKF v0.2) + kb/tools                          .claude/        skills ו-agents
```
**לכל שאלה חייב להיות `analogy`** — שדה חובה, הקומפיילר מסרב לשאלה בלי דימוי מהחיים.

## אילוצים שאינם משתנים
* **האתר נשאר סטטי ב-GitHub Pages.** הקראה ב-`speechSynthesis`; ציורים והסברים מחושבים בדפדפן.
* **מפתח API לעולם לא בדפדפן ולא בריפו** (השרת רץ בזהות גוגל, בלי מפתח).
* **הילד לעולם לא ממתין לשרת** — ההקראה נופלת בשקט להקראה המובנית. (⚠️ צפוי להשתנות עם מנוי הורים: שאלות בשרת, תרגול דורש חיבור — מעדכנים כשממוזג.)
* הצד השרת: [`kb/infra/hebrew-tts-server.md`](kb/infra/hebrew-tts-server.md). (שרת המחברת והקריאה ב-Claude הוסרו עם `scored-answer-practice`.)

## מה פתוח
**רשימת הרעיונות והבקשות שטרם התחילו:** `docs/BACKLOG.md` — קראו אותו בתחילת סשן. (מנוי הורים: ענף `feature/parent-subscription`, החלטות התקבלו ב-2026-11-26, מסמכים בלבד.)

> רק מה שעוד לא נעשה. מה שמוזג — ב-`docs/features/README.md` וב-`kb/features/`. `/resume-proj` ו-`/status` קוראים את הסעיף הזה.

### מתוכנן ומאושר, טרם נבנה
* **גל ב׳ של הסגנונות** — כיתות ו׳ ו-ח׳. המשתמש יכתוב שאלות חדשות למלא סגנונות דלילים (ב"בעיות מילוליות" אין סגנון עם `3` שאלות), ולכן זו עבודת תוכן. ראו `docs/features/style-lessons/product-spec.md`.

### רק המשתמש יכול לעשות
* **הגנת בראנץ'.** `main` נפרס אוטומטית ועדיין אין דרישה שהבדיקות יעברו לפני מיזוג: Settings → Branches → `main` → require `check` + `test`.
* **ניקוי משאבי Claude ישנים.** אין היום קוד שקורא ל-Claude. אפשר למחוק את ה-federation rule ב-Anthropic Console ואת חשבון השירות `notebook-server-claude@learn-math-506923` (וכן לבדוק שה-pool של WIF עדיין נחוץ לפריסת שרת ההקראה).
