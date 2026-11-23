# ויזואליזציית-כדורים — חיבור, חיסור (והשוואה — נדחתה לסבב-המשך)

ציור-כדורים מונפש בהסבר של שאלת חיבור/חיסור/השוואת-גודל (טווח-יחידות בשלב
זה) — מראה את הפעולה עצמה, לא רק טקסט. חלק מהציור: אם ארוך מדי למסך אחד,
ניווט ימינה-שמאלה, לא גלילה אנכית.

## Progress
- [x] Product spec — product-manager — 2026-11-21 (הורחב 2026-11-21: + חיבור,
      + השוואת-גודל, + ניווט-ימינה-שמאלה לתוכן-ארוך)
- [x] Design — designer — 2026-11-22 (הוכרע: מלא/מוקווקו כמו TenFrame, מיקום
      מרחבי תואם ל-LTR של הביטוי, "מי גדול ממי" נדחה לסבב-המשך)
- [x] Architecture — tech-lead — 2026-11-22 (CSS transition בלבד, לא
      keyframes/ספרייה; גילוי אמיתי: סטייל add10/sub10 כולל אופרנדים
      דו-ספרתיים — ballDiagram חוסם אותם בבדיקת-גבול מפורשת, לא בבדיקת-style)
- [x] Implementation — developer — 2026-11-22 (src/data/ballDiagram.ts +
      src/components/BallDiagram.tsx, wired into questionExplanation.ts/
      QuestionExplanation.tsx; build+lint clean; גרסה עודכנה פעמיים —
      ראו הערה למטה)
- [x] Tests — qa — 2026-11-23 (tests/e2e/ball-manipulatives.spec.ts, 14/14;
      סוויטה מלאה 375/379, הכשל היחיד שלא flake-ידוע תוקן — ראו tests.md)

**Current phase:** done — מוזג ל-`main`
**Branch:** `feature/ball-manipulatives`
**PR:** [#112](https://github.com/eyalzur/learn-math/pull/112) — מוזג 2026-11-23

**הערת-גרסה:** `npm run bump:feature` רץ פעמיים על הבראנץ' הזה, לא בגלל חריגה
מהכלל "bump אחת לבראנץ'" — `main` עצמו התקדם ל-`1.54.0` (מיזוג #111,
hebrew-math-tts) **אחרי** שהבראנץ' הזה כבר בומפ ל-`1.54.0` משלו, מה שיצר
התנגשות-גרסה אמיתית (לא רק קונפליקט-מיזוג טריוויאלי). הפתרון תאם את הכלל
הקיים ב-git-workflow.md ("אם ה-check נכשל... התיקון הוא להחזיר את package.json
בעבודת-יד למספר הצפוי"): אחרי מיזוג `main` מחדש, `package.json` תוקן ביד
ל-`1.55.0` (main's `1.54.0` middle+1), ולא הופעל `bump:feature` שוב.

## Open questions / blockers
None — "מי גדול ממי" הוכרע ב-design.md כ-Out of Scope לסבב הזה (לא Open
Question עוד): הוא נדחה בכוונה לפיצ'ר-המשך נפרד שיכלול גם תוכן-שאלות חדש; לא
חוסם חיבור/חיסור. היקף ה-MVP (`add10`/`sub10`, יחידות בלבד) ומנגנון-הניווט
ימינה-שמאלה (לא בנוי בפועל בהיקף הזה — הטווח הנוכחי תמיד נכנס במסך אחד) גם
הוכרעו ב-design.md. architecture.md מצא שהגבול האמיתי חייב להיות על ערכי
האופרנדים (≤9), לא על שם ה-style — מתועד שם, לא חוסם.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
