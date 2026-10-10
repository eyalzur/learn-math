# מחברת: עמודת כפתורים ממוקדת + הצעת הפעולה הבאה

שתי עמודות כפתורים עגולים (זום/ניקוי משמאל-למעלה, בחירת כלי מימין-למטה)
וכפתור שגדל כדי להציע לתלמיד/ה מתי לעבור בין כתיבה להזזת התצוגה.

## Progress
- [x] Product spec — product-manager — 2026-10-10
- [x] Design — designer — 2026-10-10 (שתי עמודות עגולות — זום/ניקוי
  5 כפתורים משמאל-למעלה, כלים 3 כפתורים מימין-למטה; הצעה = גדילה+ברק,
  לא צבע רקע, כדי להישאר נבדלת מ"נבחר"; בורר גודל-כפתורים חדש עם 3
  אפשרויות בלי "כבוי", לא 6 כמו שאר הבוררים — ראו design.md לנימוק)
- [x] Architecture — tech-lead — 2026-10-10 (טבלאות `BUTTON_SIZE_LEVELS`
  ו-`SUGGESTION_SENSITIVITY_LEVELS` חדשות ב-`notebook.ts`; מנגנון ההצעה
  נשען על נקודות קיימות בקוד — `endPointer`, תחילת גרירה, פאד-ניווט —
  בלי פולינג חדש; `data-suggested` נפרד מ-`aria-pressed` לתמיכה במקרה
  "נבחר וגם מוצע". ראו architecture.md, כולל שני נתיבי ה-clearSuggestion
  הנפרדים (גרירה + פאד-ניווט) ב-Implementation Notes)
- [x] Implementation — developer — 2026-10-10 (שני בוררי הגדרה חדשים
  חוברו קצה-לקצה; מנגנון ההצעה אומת בפועל בתצוגה מקדימה — stroke →
  המתנה → כפתור היד פועם, `force:true` נדרש ב-Playwright כי האנימציה
  האינסופית מונעת מ"stable" check רגיל להתייצב; עט/יד מנקים הצעה
  מיידית, מוחק לעולם לא מציע. **שלוש תקלות אמיתיות נמצאו ותוקנו
  בריוויו עצמי**: (1) `.notebook-stage`'s `overflow:hidden` הסתיר את
  כפתור "נקה דף" לגמרי בתצוגה מוטמעת קצרה (~190px) — נפתר בעטיפת
  `.notebook-stage-frame` לא-חתוכה חדשה; (2) אחרי זה, `.notebook-screen`
  היותו flex column גרם ל-`.notebook-toolbar` לנצח בלחיצות למרות
  שהיא "מתחת" — נפתר ב-`z-index:1`; (3) גם אחרי שני אלה, "הסר דף"
  הצטלב עם "נקה דף" כי שתיהן ישבו פיזית בצד שמאל — נפתר בהסרת
  `margin-inline-start:auto` הישן על `.notebook-page-nav` שכבר לא
  נחוץ (קבוצת הכלים שהוא נועד להרחיק ממנה עברה דירה). גם תוקנה
  תקלת CSS חסר לגמרי (שני הבוררים החדשים הוצגו בלי עיצוב כרטיס).
  שני מבחני e2e קיימים עודכנו לשקף את הסדר/המיקום החדש במכוון
  (לא רגרסיה). ראו architecture.md, "Implementation Notes" לפרטים
  המלאים. `429/429` בדיקות, ריצה בודדת ונקייה)
- [ ] Tests — qa — not started

**Current phase:** developer — ממתין ל-qa
**Branch:** `feature/notebook-toolbar-redesign`
**PR:** not opened yet

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
