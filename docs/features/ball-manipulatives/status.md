# ויזואליזציית-כדורים — חיבור, חיסור, והשוואה

ציור-כדורים מונפש בהסבר של שאלת חיבור/חיסור/השוואת-גודל (טווח-יחידות בשלב
זה) — מראה את הפעולה עצמה, לא רק טקסט. חלק מהציור: אם ארוך מדי למסך אחד,
ניווט ימינה-שמאלה, לא גלילה אנכית.

## Progress
- [x] Product spec — product-manager — 2026-11-21 (הורחב 2026-11-21: + חיבור,
      + השוואת-גודל, + ניווט-ימינה-שמאלה לתוכן-ארוך)
- [ ] Design — designer — not started
- [ ] Architecture — tech-lead — not started
- [ ] Implementation — developer — not started
- [ ] Tests — qa — not started

**Current phase:** designer
**Branch:** `feature/ball-manipulatives`
**PR:** not opened yet

## Open questions / blockers
- **Product:** "מי גדול ממי" — נושא-שאלות חדש, או ציור חדש לנושא קיים? לא
  נמצא סגנון-שאלה קיים שמבקש השוואת-גודל. לא חוסם את חיבור/חיסור, רק את חלק-
  ההשוואה.
- **Product:** טווח ה-MVP המדויק בתוך חיבור/חיסור (`add10`/`sub10` בלבד מול
  כולל `sub20`) לא נאמר במספר מפורש — לא חוסם, designer/tech-lead יכולים
  לבחור יחידות-בלבד כברירת-מחדל סבירה.
- **Product/Tech:** היקף מנגנון-הניווט-ימינה-שמאלה — ממוקד לבלוק-ההסבר-הזה
  בלבד, או תשתית-משותפת רחבה-יותר? לא חוסם.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
