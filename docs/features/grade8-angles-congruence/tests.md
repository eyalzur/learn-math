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

## How to run
`npm run test:e2e`

## Status
ירוק — 2026-09-01 (סבב ב׳). הרצה בודדת ונקייה: **`320/320`** עוברות (`319` מסבב א׳
ועוד בדיקה חדשה — "streak של תשובות נכונות מגיע לחפיפה, streak של תשובות שגויות
לא" — לכיסוי קריטריון ה-"קושי מגיב בזמן אמת" החדש; אותו קובץ בדיקות עודכן במקום, לא
נוסף קובץ חדש). `npm run build` ו-`npm run lint` ירוקים גם הם.

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
