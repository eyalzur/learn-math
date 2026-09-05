# זוויות וחפיפת משולשים — Tests

## Coverage

Map of `product-spec.md`'s Acceptance Criteria (revised 2026-09-01, סבב ב׳) → test in
`tests/e2e/grade8-angles-congruence.spec.ts`:

- "נבחר מרשימת הנושאים של עומר יחד עם ששת הנושאים הקיימים" →
  `appears in Omer's grade-8 topic list alongside the six existing topics`. Also covered
  generically by `tests/e2e/topics-all-grades.spec.ts` (updated to seven topics).
- "הנושא מסתגל ... בלי מסך בחירה" →
  `skips the level picker and lands straight on a 20-question practice`.
- "הקושי מתאים את עצמו בזמן אמת" →
  `a streak of correct answers reaches triangle-congruence questions, a streak of wrong
  answers never does` — congruence questions only show up once difficulty has climbed;
  the same technique `tests/e2e/adaptive-difficulty.spec.ts` uses for `חיבור עד 100`
  (a streak that must vs. must not reach a harder shape), adapted here since our
  "harder" isn't a wider number range but a later sub-domain.
- תת-תחום זוויות (השלמה, זווית חיצונית, סכום זוויות, ישרים מקבילים) →
  `covers angle questions — straight-angle completion, triangle angle sum, exterior
  angle, and parallel lines`.
- תת-תחום חפיפת משולשים →
  `covers congruent-triangle questions — a missing side or angle from a stated
  congruence`.
- תת-תחום משולש שווה-שוקיים (כולל תיכון=גובה) →
  `covers isosceles-triangle questions — equal base angles, and the median that is also
  a height`.
- "`prompt`, שני `hints`, `steps`, `analogy`" →
  `every question has a prompt, two hints, and — after a wrong answer — steps and an
  analogy`.
- "זמין מתרגול רגיל ... ומופיע בהיסטוריה" →
  `a finished practice records the topic and score in history`.

**איך שאלות שנוצרות ב-runtime נבדקות בלי לקרוא את `adaptiveAngles.ts`:** `computeAnswer()`
בקובץ הבדיקות משחזר את הכלל שכל תת-תחום מבטיח לפי `product-spec.md`/`design.md` עצמם
(קו ישר=`180°`, סכום זוויות במשולש=`180°`, זוויות מתאימות/מתחלפות שוות, חד-צדדיות
משלימות ל-`180°`, חלקים מתאימים במשולשים חופפים שווים, זוויות בסיס שוות במשולש
שווה-שוקיים, תיכון=גובה) — לא קריאה של הקוד שמייצר את השאלה. משמש כדי לענות נכון ולטפס
בקושי (הבדיקה של "streak"), ולכסות כל תת-תחום על פני מספיק תרגולים.

- כיווניות (RTL) — לא בדיקת מסך נפרדת: מכוסה, לכל האפליקציה כולל הנושא הזה, על ידי
  `tests/e2e/content.spec.ts`'s `"marks algebra sitting inside a Hebrew sentence"` —
  אבל **רק על השלושים השאלות הכתובות** (`levels`), לא על שאלות שנוצרות ב-runtime
  (אותה מגבלה שכבר קיימת בכל 11 המחוללים האחרים בפרויקט — `everyQuestion()` לא
  סורק פלט של מחוללים). האימות הידני שה-developer עשה (1,800 שאלות שנוצרו, אפס
  כשלים) הוא הכיסוי בפועל לשאלות המסתגלות — ראו architecture.md, Implementation
  Notes — לא בדיקת e2e קבועה.
- "5 הצורות הדיאגרמה מוצגות" — עדיין לא נבדק ויזואלית בכוונה, מאותה סיבה שנרשמה
  בסבב א׳ (אין class name/selector קונקרטי ב-design.md, וזה נשאר החלטת מימוש).

### עדכון כיסוי — סבב ג׳ (2026-09-05, משוב על התצוגה המקדימה)

Map של קריטריוני הקבלה החדשים (`product-spec.md`, "עדכון קריטריוני קבלה — סבב ג׳") →
בדיקה:

- "הדיאגרמה מוצגת יחד עם השאלה עצמה, לכל 12 הדפוסים" →
  `the diagram appears next to the question itself, before any answer` — בודקת
  שהאלמנט גלוי **לפני** תשובה, ושהוא **לא** מוכפל אחרי תשובה שגויה (`toHaveCount(1)`
  אחרי `answerViaNotebook`) — המימוש הישיר של "בלי עותק כפול" מ-design.md.
- "שיעור קצר 'למה זה נכון' לזווית חיצונית ולזוויות מתאימות" →
  `the topic-lesson screen explains why the exterior-angle and corresponding-angles
  rules are true` — בודקת שעמוד `1` (זווית ישרה/`90°`) **אין** לו פסקת הוכחה, ושעמודים
  `2`/`3` (זווית חיצונית, זוויות מתאימות) **כן**. תלוי ב-`lessonExample` שמכריח את
  הדפוס הנכון בכל דרגה — בלעדיו הבדיקה הזו הייתה פסיקה (flaky) כי לפעמים הדף היה
  מציג את הדפוס האחר בדרגה.
- "חפיפת משולשים מסמנת את כל שש ההתאמות" →
  `the congruent-triangles diagram marks all six correspondences, not just the one
  asked about` — סופרת בדיוק `6` אלמנטי `.as-tick` ו-`6` אלמנטי `.as-arc` בציור, לפי
  ה-`6` = `3` צלעות + `3` זוויות שה-design.md קובע במפורש (לא מספר implementation
  שרירותי — הכיסוי המלא הוא עצמו הדרישה).
- "ניסוח 'זווית ישרה'/'נצבים' ל-`90°`" → מכוסה כבר על ידי `computeAnswer`'s עוגן
  שהתעדכן (ראו למטה) ועל ידי `covers angle questions`'s
  `prompts.some(p => p.includes("נצבים"))`.
- "סוגריים מפורשים בשלב סכום זוויות" →
  `the triangle-angle-sum step shows the calculation with explicit brackets` — מוצאת
  שאלת "סכום זוויות" ספציפית (לא "זווית חיצונית", שחולקת איתה tier), עונה שגוי,
  ובודקת ש-`.explanation-math` מכיל גם `(` וגם `)`.

**תיקון עוגן שכבר תועד מראש (tech-lead, architecture.md "ממצא ל-QA — סבב ג׳"):**
הניסוח החדש של שאלת `90°` הסיר את המילה "משלימות" — `computeAnswer`'s זיהוי (שורה
שהייתה `prompt.includes("משלימות")`) ובדיקת הכיסוי (`prompts.some(p =>
p.includes("משלימות"))`) עודכנו לחפש `"נצבים"` במקום. זה **לא** כשל שהתגלה כאן
בפועל — נמצא ותוקן מראש, לפני שהריצה הראשונה בכלל קרתה, כי tech-lead כבר איתר
בדיוק את שתי השורות מראש בזמן התכנון.

## How to run
`npm run test:e2e`

## Status
ירוק — 2026-09-05 (סבב ג׳, אחרי מיזוג שלישי ורביעי של `main` פנימה תוך כדי הפיתוח —
`PR #67` ו-`PR #68`). הרצה בודדת ונקייה: **`366/366`** עוברות (`354` קודם + `12`
בקובץ הזה, מתוכן `4` חדשות לסבב ג׳). `npm run build` ו-`npm run lint` ירוקים גם הם.
הקובץ עצמו נבדק גם בבידוד (`--workers=1`) לפני הריצה המלאה — `12/12` עברו שם גם.

**עדכון סבב ב׳ (לתיעוד היסטורי):** ירוק — 2026-09-05 (אחרי שני מיזוגים של `main`
פנימה — `main` התקדם פעמיים בינתיים, עם `grade2-syllabus` ואז `grade2-clock`).
הרצה בודדת ונקייה: **`343/343`** עוברות. `npm run build` ו-`npm run lint` ירוקים
גם הם.

**דו"ח כשלים אמיתי בדרך לירוק, לא רק "עבר בסוף":** הריצה הראשונה אחרי הכתיבה נכשלה
בארבע בדיקות — לא flake, באג אמיתי ב-`computeAnswer()` עצמו (עוזר הבדיקה, לא
הקוד של האפליקציה): הוא חיפש ` `` ` (גרשיים אחוריים) בטקסט המוצג במסך, אבל
`.problem-text`'s `innerText()` מציג את הטקסט **אחרי** ש-`segmented()` כבר הסיר
את הגרשיים (הם תחביר סימון בלבד, לא תוכן מוצג) — כך שהחילוץ תמיד קיבל `null` וכל
תשובה יצאה שגויה, מה שתקע את הקושי ב-tier הראשון לנצח. תוקן על ידי הסרת הגרשיים
מנוסחי החיפוש. אחרי התיקון עוד כשל אחד נשאר — סטטיסטי, לא לוגי: בדיקת "covers
angle questions" הריצה סשן `20` שאלות בודד, וכשיש שני-שלושה דפוסים באותו tier,
סשן בודד יכול לפספס דפוס ספציפי (כמו "זווית חיצונית") בגלל בחירה אקראית בתוך
ה-tier. תוקן על ידי הרצת שלושה סשנים לכל בדיקת כיסוי (`playSessions`) במקום סשן
אחד.

**עוד סבב כשלים אמיתי, בזמן מיזוג `main` (2026-09-04):** אחרי המיזוג הרצתי את כל
הסוויטה (`334` בדיקות, לא רק הקובץ הזה) ובדיקת "covers angle questions" נכשלה
בגלל timeout אמיתי של Playwright (`30s`) על לחיצת "שלח למורה" באמצע סשן —
לא לוגי, אלא עומס: הגדלתי בטעות את מספר הסשנים (`6`/`5`/`5`) בתגובה לכשל
הסטטיסטי הקודם, וזה יחד עם הסוויטה המלאה שרצה במקביל (`2` workers) האט מספיק
כדי לפגוע ב-timeout ברירת המחדל. הרצתי את הקובץ הזה **בבידוד** (`--workers=1`)
פעמיים ברצף לאמת יציבות, הורדתי את מספר הסשנים ל-`4`/`3`/`3` (עדיין מספיק
לכיסוי סטטיסטי סביר, אבל פחות מכביד), ואז הרצתי את הסוויטה המלאה פעם אחת נקייה
— `334/334` ירוקות.
