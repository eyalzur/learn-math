# תרגול בתשובה סופית + ניקוד וסטטיסטיקה — Tests

## Coverage
- "שדה תשובה סופית, בלי קנבס, לכל נושא" → `tests/e2e/scored-answer-practice.spec.ts` ›
  `a typed final-answer field is offered, with no drawing canvas`,
  `works the same way for a different grade/student (עומר, כיתה ח׳)`
- "תשובה נכונה → משוב קצר ומעבר מיידי" → `a correct answer gives brief positive feedback
  and advances on its own`
- "תשובה שגויה → הסבר, ורק אז המשך ידני" → `a wrong answer shows the right answer and an
  explanation, and waits for a manual continue`
- "ביטויי חשבון נשארים LTR" → `arithmetic expressions still render left-to-right`
- "ניקוד/סטטיסטיקה לפי נושא ולפי רמת קושי, מצטבר, נראה" →
  `finishing a lesson records cumulative score stats, viewable by topic and by difficulty`
- "המחברת מוסרת לגמרי" → לא בדיקה ייעודית; נבדק דרך שאר הסוויטה (כל קובץ e2e אחר)
  שנשארת ירוקה בלי שום תלות ב-`.notebook-*`/`canvas`/`שלח למורה` — ראו "Regression" למטה.

## How to run
`npm run test:e2e`

## Regression — the rest of the suite
הסרת המחברת נגעה כמעט בכל קובץ e2e בריפו, כי כמעט כולם השתמשו בעזר המשותף
`answerViaNotebook` כדי "לענות" על שאלה. התיקון:
- 13 קבצי `notebook-*.spec.ts` + `tests/e2e/helpers/notebookAnswer.ts` — נמחקו (בדקו
  מנגנון שלא קיים יותר: ציור, פאן/זום, "שלח למורה", קריאת-כתב-יד).
- `tests/e2e/teacher-misread-log.spec.ts` — נמחק (בדק אך ורק את חוזה הרשת של
  `/read-page`, שהוסר לגמרי).
- `tests/e2e/teacher-reading-precision.spec.ts` — נשארו רק בדיקות התוכן הדטרמיניסטיות
  (גיוון אנלוגיות למשוואות), הוסרו הבדיקות שהיו ספציפיות לדיוק-קריאה/מחברת.
- כ-22 קבצים נוספים — עודכנו משימוש ב-`answerViaNotebook(page, value)` לעזר החדש
  `tests/e2e/helpers/answerQuestion.ts`'s `answerQuestion(page, value)` (ממלא
  `.answer-input`, לוחץ "בדיקה"), כולל כמה תיקוני עזר-משותף שהניחו שכפתור "הבא" קיים
  תמיד (בפועל, תשובה נכונה עכשיו עוברת אוטומטית בלי כפתור).

**באג אמיתי שנתפס ותוקן תוך כדי (לא בדיקה):** `Practice.tsx` הציג את שורת "נכון/לא
נכון" מיד עם הבדיקה, גם כשלשאלה יש שיחת-אבחון קצרה (follow-up) שעוד לא נסגרה —
רגרסיה מהכתיבה-מחדש שהשמיטה את תנאי ה-`revealed` הקיים. תוקן (שורה אחת ב-
`Practice.tsx`, תנאי `(feedback === "correct" || revealed)` נוסף בחזרה), ונתפס על
ידי בדיקה קיימת מתכונת קודמת (`tests/e2e/mistake-diagnosis.spec.ts`).

## Status
`316/317` נכון ל-2026-11-20, ריצה בודדת ונקייה. הכשל היחיד —
`grade8-angles-congruence.spec.ts` › "covers angle questions..." — הוא ה-flake
הסטטיסטי הקיים-מראש והמתועד כבר ב-CLAUDE.md (לא קשור לפיצ'ר הזה).

בדרך לריצה הנקייה נתפסו ותוקנו שני דברים אמיתיים:
1. **באג מוצר** (`Practice.tsx`) — ראו "Regression" למעלה.
2. **הנחת-זמן שגויה בעזר הבדיקה המשותף** (`tests/e2e/helpers/answerQuestion.ts`):
   חיכה ל-`.feedback` להיראות, אבל תשובה שגויה עם שיחת-אבחון פתוחה משאירה את
   `.feedback` מוסתר בכוונה (ראו #1) — תוקן להמתין להשבתת שדה הקלט במקום, שקורה
   בכל מקרה גם כשה-feedback מוסתר.
3. שני קבצי e2e הוסרו בנוסף למה שתוכנן מראש: `server-auto-deploy.spec.ts` (בדק
   אך ורק את `server/` ו-`.github/workflows/deploy-server.yml`, שניהם הוסרו עם
   המחברת — לא נמצא ב-grep הראשוני כי לא ייבא את העזר המשותף).
