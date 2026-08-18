# כרטיס סגנון — רק כותרת — Architecture

## Overview
הסרת שני `<span>` מ-`StylePicker.tsx` וה-CSS שמשרת אותם בלבד. אין שינוי טיפוסים,
אין שינוי בנתונים.

## Affected Files / Components

| קובץ | מה משתנה |
|---|---|
| `src/components/StylePicker.tsx` | מסירים את `<span className="style-example">` ו-`<span className="style-count">` מתוך `.style-card`. רכיב `Example` והפונקציה שסביבו מוסרים — לא נצרכים עוד מהתצוגה. `onSpeak`/`aria-label` נשארים כפי שהם, כי הם קוראים ל-`style.example.prompt` ישירות ולא דרך `Example`. |
| `src/App.css` | `.style-example`, `.style-example-text`, `.style-example-math`, `.style-count` — מוסרים אם אינם בשימוש במקום אחר (נבדק). |
| `tests/e2e/style-lessons.spec.ts` | שני מבחנים שבדקו את מה שהוסר (`each card shows how many questions...`, `the example on a card is a real question...`) מוחלפים במבחן אחד: `a card shows only its title`. |

## Data / State Changes
אין. `Style.example` נשאר בטיפוס וב-`style.ts` — עדיין נדרש להקראה.

## Technical Approach
שינוי ישיר ב-JSX: מסירים שני אלמנטים מתוך הכרטיס. `Example` (רכיב שמפצל את
שאלת הדוגמה לפי `promptSegments` לבידוד כיווניות) מוסר כי שום דבר לא קורא לו
יותר — ההקראה משתמשת ב-`style.example.prompt` הגולמי, לא ברינדור המפוצל.

## Edge Cases
- **סגנון עם שאלת דוגמה ארוכה** — לא רלוונטי יותר; אין תצוגה שיכולה לגלוש.
- **כיווניות** — הביטוי החשבוני שהיה מוצג (`style-example-math`) הוא בדיוק מה
  שהצריך בידוד LTR; ההסרה מוציאה את הסיכון הזה מהמסך הזה כליל.

## Risks / Tradeoffs
- **מבטל עוגן נגישות שתועד במפורש ב-`style-lessons/design.md`** עבור מיקה,
  שעדיין לומדת לקרוא. נרשם ב-`product-spec.md` כאן ולא הוסתר. ההחלטה של
  המשתמש, שרואה בפועל איך היא משתמשת במסך, גוברת.
- כפתור ההקראה נשאר היחיד שמעביר את תוכן הדוגמה למי שלא קורא עדיין — אם גם
  הוא ייעלם בעתיד, העוגן הזה נעלם לגמרי ושווה לחזור לספק לפני שזה קורה.

## Open Questions
None.
