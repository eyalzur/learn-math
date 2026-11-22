# ויזואליזציית-כדורים — חיבור, חיסור, והשוואה

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
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** developer
**Branch:** `feature/ball-manipulatives`
**PR:** not opened yet

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
