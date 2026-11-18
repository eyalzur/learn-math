# אבחון קשיים לאורך זמן — Architecture

## Overview
פונקציה חדשה (`stuckTopicsFor`) קוראת את `historyFor(studentId)` הקיים,
מקבצת לפי `topicTitle`, ומחזירה רשימת נושאים "תקועים" — כל אחד כבר פותר
(resolved) לאובייקט `Topic` אמיתי ול-`gradeId`, כדי ש-`History.tsx` לא
יצטרך לחפש בעצמו. `App.tsx` מעביר ל-`History` קולבק חדש שמפעיל בדיוק את
אותה לוגיקת-כניסה-לנושא הקיימת (`enterTopic`), רק עם `gradeId` מפורש
במקום להסתמך על ה-state הנוכחי — כי ה"היסטוריה" נגישה גם לפני שנבחרה
כיתה בכלל, וגם יכולה להצביע על כיתה **אחרת** מזו שנבחרה כרגע (תלמיד/ה עם
כמה כיתות, "כל כיתה לכל תלמיד/ה").

## Affected Files / Components
- **`src/data/struggleDiagnosis.ts`** (חדש) — `stuckTopicsFor(studentId)`
  וקבועי הסף (`STUCK_MIN_PRACTICES`, `STUCK_SCORE_THRESHOLD`).
- **`src/components/History.tsx`** — קורא ל-`stuckTopicsFor`, מרנדר כרטיס
  לכל תוצאה מעל `.history-list` הקיימת, מקבל prop חדש להפעלת "לתרגל עכשיו".
- **`src/App.tsx`**:
  - `enterTopic` (סביב שורה 238) מתפצל: הגוף הקיים עובר לפונקציה חדשה
    `enterTopicInGrade(topic, forGradeId)` שמקבלת `gradeId` כפרמטר במקום
    לקרוא אותו מ-closure; `enterTopic(topic)` הופכת לעטיפה דקה
    (`enterTopicInGrade(topic, gradeId!)`) ששומרת על ההתנהגות הקיימת
    לכל קורא קיים שלה (כרטיסי נושא תמיד נלחצים אחרי שכיתה כבר נבחרה).
  - קולבק חדש, `startStuckTopic(topic, forGradeId)`: `setGradeId(forGradeId)`
    ואז `enterTopicInGrade(topic, forGradeId)` — ה-id המפורש, לא ה-state
    (שעוד לא התעדכן באותו tick), הוא מה שקובע איזה tier/remembered-position
    נטענים.
  - מועבר ל-`<History onStartTopic={startStuckTopic} .../>` בשתי נקודות
    הרינדור הקיימות של המסך (שורה ~327, לפני ואחרי בחירת כיתה).

## Data / State Changes
אין שדה state חדש. `stuckTopicsFor` היא פונקציה טהורה שקוראת מ-
`localStorage` דרך `historyFor` הקיים — אותו דפוס בדיוק כמו `preferences.ts`
קורא מעל `localStorage` משלו.

```ts
export interface StuckTopic {
  topic: Topic;
  gradeId: string;
  topicTitle: string; // לנוחות הצגה, זהה ל-topic.title
}
export function stuckTopicsFor(studentId: string): StuckTopic[]
```

## Technical Approach
1. **קיבוץ**: `historyFor(studentId)` כבר מחזיר "החדש ביותר קודם". עוברים
   על הרשימה פעם אחת, שומרים לכל `topicTitle` עד 3 הרשומות הראשונות
   שנתקלים בהן (=3 התרגולים האחרונים של אותו נושא), ושומרים את סדר
   הופעת-הנושא-הראשונה (לשימור "העדכני קודם" ברמת-הנושא, כפי ש-design.md
   דורש).
2. **קביעת "תקוע"**: נושא עם פחות מ-`STUCK_MIN_PRACTICES` (3) רשומות —
   מדולג. נושא עם 3 ומעלה — תקוע אם ורק אם **שלושת** הרשומות שנאספו (לא
   כל ההיסטוריה שלו, רק 3 האחרונות) עומדות כולן ב-
   `correct / total < STUCK_SCORE_THRESHOLD` (0.7).
3. **פתרון (resolve) ל-Topic אמיתי**: לכל נושא תקוע, מחפשים
   `grades.find(g => g.label === record.gradeLabel)` ואז
   `grade.topicSets.find(t => t.title === record.topicTitle)`. לא נמצא
   (תוכן שהשתנה מאז) → הנושא הזה פשוט מדולג (לא קורס, לא מוצג) — ראו
   Edge Cases.
4. **הצגה ב-`History.tsx`**: `stuckTopicsFor(student.id)` נקרא פעם אחת
   ברינדור הקומפוננטה (היא כבר "נטענת מחדש" בכל פעם שנכנסים למסך, בדיוק
   כמו `historyFor` עצמו — אין צורך ב-`useEffect`/state נוסף). לכל פריט:
   כרטיס עם הטקסט מ-design.md וכפתור שקורא
   `onStartTopic(item.topic, item.gradeId)`.
5. **`enterTopicInGrade`**: אותו גוף בדיוק של `enterTopic` היום (שמירת
   מיקום-תפריט, חישוב `startingDifficulty` מ-`loadAdaptiveTier`, בניית
   מסך "practice" או ניווט ל-`insideTopic`), רק מחליפים כל הופעה של
   ה-closure `gradeId` בפרמטר `forGradeId`.

## Edge Cases
- **הכיתה/הנושא כבר לא קיימים** (שינוי תוכן אחרי שהרשומה נשמרה): הפריט
  הזה מדולג בשקט ב-`stuckTopicsFor` (לא זורק, לא מציג כרטיס שבור) — אותה
  גישה כמו `preferences.ts`'s "ברירת מחדל אם הערך לא תקף".
- **תלמיד/ה עם כמה כיתות ("כל כיתה לכל תלמיד/ה")**: נושא תקוע יכול להגיע
  מכיתה שונה מזו שנבחרה כרגע (או מבלי שנבחרה כיתה בכלל — מסך ההיסטוריה
  נגיש גם לפני כן). `startStuckTopic` קובע את ה-`gradeId` במפורש, לא
  מניח שזה מה שכבר נבחר.
- **אותו שם נושא בשתי כיתות שונות**: `historyFor` כולל `gradeLabel` לכל
  רשומה, אז הקיבוץ-וההתאמה הם תמיד (נושא, כיתה) ביחד, לא לפי שם נושא
  לבד — שני "שברים" בכיתות שונות לא יתערבבו לרצף אחד.
- **מסך ריק (אין היסטוריה בכלל)**: `historyFor` כבר מחזיר `[]`, אז
  `stuckTopicsFor` מחזיר `[]` וה-UI לא מוסיף כלום — זהה למצב הקיים היום.

## Risks / Tradeoffs
- **לא נשמר/נשכח (cache)** — `stuckTopicsFor` רץ מחדש בכל כניסה למסך,
  קריאה פשוטה על כל ההיסטוריה. בהיקף הנתונים הזה (תרגולים בודדים,
  לא אלפים) זה זניח; לא הוצדק להוסיף cache.
- **הסף (3/70%) קבוע בקוד, לא ניתן לכיוון** — בכוונה, per product-spec.md
  Out of Scope.

## Open Questions
None.
