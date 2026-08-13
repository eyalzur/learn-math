# בחירת נושא והתקדמות אישית — Architecture

## Overview
`Grade` הופך לאיחוד מבחין בין תרגול לפי נושא לתרגול לפי רמות; תוכן כיתה א' עובר
לקובץ משלו; ונוסף מודול היסטוריה מעל `localStorage`.

## Affected Files / Components
- **`src/data/grade1.ts`** (חדש) — 5 נושאים × 3 רמות × 10 שאלות.
- **`src/data/level.ts`** (חדש) — `LEVEL_META` ו-`level()`.
- **`src/data/progress.ts`** (חדש) — רשומות תרגול.
- **`src/data/curriculum.ts`** — `Topic` ו-`Grade` כאיחוד.
- **`src/components/TopicPicker.tsx`**, **`LevelPicker.tsx`**, **`History.tsx`** (חדשים);
  `GradeHome.tsx` נמחק.
- **`src/App.tsx`** — ניווט בשישה מצבים; **`src/App.css`**.

## Data / State Changes
```ts
export type Grade = { id; label; topics: string[] } & (
  | { practice: "topics"; topicSets: Topic[] }
  | { practice: "levels"; levels: Level[] }
);
```
איחוד מבחין ולא שני שדות אופציונליים: כיתות ו' ו-ח' עדיין על המבנה המעורב, והקומפיילר
מצביע על כל מקום שחייב לטפל בשניהם במקום לאפשר לענף אחד להישכח בשקט.

רשומת היסטוריה: `{ at, studentId, gradeLabel, topicTitle, levelTitle, correct, total }`.
`topicTitle` ריק לכיתות שעדיין מתרגלות מרמות מעורבות.

## Technical Approach
`App.tsx` מחזיק את התלמיד/ה בנפרד מהמסך הפתוח, ובוחר את המסך הראשון לפי
`grade.practice`. הרשומה נכתבת ב-`onFinish` לפני המעבר למסך התוצאה, כך שגם יציאה
מיידית מהתוצאה לא מאבדת אותה.

כל גישה ל-`localStorage` עטופה ב-`try/catch` ומחזירה ריק בכישלון.

## Edge Cases
- **`localStorage` חסום** — האפליקציה עובדת, רק בלי לזכור.
- **JSON פגום בהיסטוריה** — נבדק שהוא מערך, אחרת מוחזר ריק.
- **היסטוריה ריקה** — מסך ייעודי ולא רשימה ריקה.
- **ציון 0** — נרשם ככל תרגול אחר; אי-רישום היה מסתיר בדיוק את מה שחשוב לראות.

## Risks / Tradeoffs
- שתי צורות ניווט חיות במקביל עד שכיתות ו' ו-ח' יוסבו. זה מכוון: 360 שאלות נוספות
  הן עבודה שלא ראוי לדחוף לתוך אותו שינוי, והאיחוד המבחין מונע שהמצב הזמני יישכח.
- ההיסטוריה מקומית למכשיר. סנכרון בין מכשירים דורש שרת - מחוץ ל-scope ולאילוץ
  "בלי שירותים בתשלום".

## Open Questions
None.

## Implementation Notes
**באג טעינה מעגלי.** `grade1.ts` קרא ל-`level()` מ-`curriculum.ts`, ש-`curriculum.ts`
מייבא ממנו בחזרה - והאפליקציה קרסה בטעינה עם
`Cannot access 'LEVEL_META' before initialization`. מסך לבן, כל 32 הבדיקות ב-timeout.
התיקון: חילוץ `level()` ל-`src/data/level.ts` שאין לו תלות ריצה בשניהם. ה-TypeScript
לא תפס את זה - זו שגיאת סדר אתחול בזמן ריצה בלבד.

**נסיגת ניסוח שתוקנה.** בגרסה ראשונה כפתור החזרה במסך הראשון אמר `← חזרה`, אבל שם
הוא מחליף תלמיד. הוחזר ל-`← החלף תלמיד` במסך הראשון בלבד.

התוכן: 150 שאלות, 15 מגירות של 10 בדיוק, ו-150 דימויים ייחודיים.
