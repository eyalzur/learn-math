# בחירת נושא לכיתות ו׳ ו-ח׳ — Tests

## Coverage
`tests/e2e/topics-all-grades.spec.ts`:
- "הנושאים מוצגים ככפתורים לבחירה" →
  `picking Rotem shows grade 6's topics as buttons`
  ו-`picking Omer shows grade 8's topics as buttons`
- "שישה נושאים לכל כיתה, בשמות שבספק" → אותן שתי בדיקות (סופרות ומוודאות שם-שם)
- "שלוש רמות לכל נושא" + "חמש שאלות בכל רמה" →
  `every topic in grade 6 has three levels of five questions`
  ו-`...grade 8...` (עוברות על **כל** ששת הנושאים ושלוש הרמות בכל כיתה)
- "כל שאלה בנושא שייכת לנושא הזה" →
  `a level in grade 6 practises only its own topic` ו-`...grade 8...`
- "כל שלוש הכיתות באותו מסלול ניווט" →
  `all three grades follow the same student → topic → level → practice route`
- ניווט אחורה → `you can walk back from level to topic to student in grades 6 and 8`
- "ההיסטוריה רושמת נושא, רמה וציון גם לרותם ולעומר" →
  `finishing a level records the topic, level and score for Rotem` ו-`...for Omer`
- "כיתה א׳ ממשיכה כמו היום" → `grade 1 still practises ten questions per level`

## בדיקות קיימות שהשתנו, ולמה זה לא "התאמה כדי שיהיה ירוק"

**שמונה בדיקות קיימות נפלו** אחרי המימוש. כולן נפלו מאותן שתי סיבות, ושתיהן הן
**הספק שהשתנה** ולא רגרסיה:

### 1. הניווט של רותם ועומר (6 בדיקות)
העוזר `openLevels()` ב-`students-and-syllabus.spec.ts` וב-`teaching-explanations.spec.ts`
דילג על בחירת הנושא לכיתות ו׳ ו-ח׳:
```
if (studentIndex === 0) await page.locator(".topic-card").nth(topicIndex).click();
```
זו בדיוק ההתנהגות שהפיצ'ר ביטל. התנאי הוסר — **כל** הכיתות עוברות עכשיו דרך נושא.

### 2. עשר שאלות בכל רמה (2 בדיקות)
`every grade offers three levels of ten questions` קיבעה 10 לכל הכיתות, ושלוש
בדיקות ב-`teaching-explanations` רצו בלולאת `for (q = 0; q < 10; q++)`.

ה-product-spec של `students-and-syllabus` **תוקן במפורש** (ראו שם: הקריטריון מסומן
כמוחלף) כך שמספר השאלות הוא תכונה של הכיתה. הבדיקות עודכנו בהתאם:
- הבדיקה הראשונה שמה משתנה `QUESTIONS_PER_LEVEL = [10, 5, 5]` ובודקת גם את המונה
  בכרטיס הרמה וגם את שורת ההתקדמות.
- הלולאות ב-`teaching-explanations` קוראות עכשיו את הסכום **משורת ההתקדמות עצמה**
  (`levelSize()`) במקום לקבע מספר. כך הן לא יישברו שוב בשינוי הבא.

## ויתור מודע על כיסוי, ומה בא במקומו

שלוש הבדיקות ב-`teaching-explanations` שמכריזות "every question in every grade"
**מעולם לא עברו על כל השאלות** — הן עוברות על נושא אחד לכל כיתה. קודם זה כיסה
30 מתוך 90 שאלות; עכשיו זה מכסה 60 מתוך 330.

להריץ דפדפן על כל 330 השאלות היה לוקח דקות ארוכות בכל הרצה. לכן:
- **המסלול בדפדפן** נשאר דגימה — הוא מוודא שההסבר, השלבים והדימוי באמת
  **מרונדרים** במסך, וזה מה שדפדפן צריך לבדוק.
- **הבטחת הרוחב** עברה לבדיקה על הנתונים עצמם, בתוך אותה בדיקה: סריקה של כל 330
  השאלות שמוודאת שלכל אחת יש דימוי באורך סביר ושאין דימוי שחוזר. היא רצה
  במילישניות ו**באמת** מכסה הכל — יותר ממה שהבדיקה הקודמת עשתה.

זה שיפור ולא הרעה, אבל שווה שיהיה כתוב: שם הבדיקה מבטיח יותר ממה שהמסלול בדפדפן
מספק לבדו.

## מה נבדק בשלב המימוש ולא כאן
בדיקה חד-פעמית סרקה את כל 330 השאלות ואימתה שאין **ביטוי אלגברי לא מסומן בגרשיים
אחוריים בתוך משפט עברי** — הטעות שהפכה `3(x + 2)` ל-`3)2 + x(`. היא לא הפכה
לבדיקת e2e קבועה כי `students-and-syllabus.spec.ts` כבר מכיל בדיקה שמוודאת את
ההתנהגות הנכונה בדפדפן (`word problems read right-to-left and their algebra stays
left-to-right`). התיעוד המלא ב-Implementation Notes.

## How to run
`npm run test:e2e`

## Status
✅ 66/66 עוברות נכון ל-2026-08-13 (11 חדשות לפיצ'ר הזה, 8 קיימות עודכנו לספק
המעודכן). `npm run build` ו-`npm run lint` נקיים.
