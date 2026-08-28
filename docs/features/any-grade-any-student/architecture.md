# כל כיתה לכל תלמיד/ה — Architecture

## Overview
מסירים את ההגבלה הקיימת בין תלמיד/ה לכיתות זמינות (`Student.gradeIds`/
`availableGrades`) ומחליפים אותה בשימוש ישיר בקבוע הגלובלי `grades` — כל הכיתות,
לכולם. מחליפים את מנגנון "זכור כיתה אחרונה" הקיים (`GRADE_STORAGE_KEY`) במנגנון רחב
יותר, "זכור מיקום תפריט אחרון", שכולל גם איזה נושא ואיזה מסך-ביניים (סגנון/רמה)
בתוכו, לכל תלמיד/ה בנפרד.

## Affected Files / Components
- **`src/data/curriculum.ts`** — מסירים את `Student.gradeIds`, את `gradeOf()`, ואת
  `availableGrades()` (כולם הופכים למתים ברגע שכל תלמיד/ה רואה את כל הכיתות — אין
  קורא נוסף להם מלבד זה לזה, ראו "Risks" למטה). `Student.gradeId` **נשאר** — הוא עדיין
  משמש את `StudentPicker.tsx` להציג את "הכיתה הרגילה" של כל תלמיד/ה על הכרטיס שלו/ה.
  מסירים את `gradeIds: ["1", "2"]` מרשומת מיקה (`gradeId: "1"` נשאר).
- **`src/App.tsx`** — השינוי המרכזי:
  - הimport `availableGrades` מוחלף ב-`grades` (מיובא ישירות, כמו שכבר עושה
    `StudentPicker.tsx`), ומוסיפים `gradeById`.
  - הבלוק `const grades = availableGrades(student);` מוסר — משתמשים ב-`grades`
    המיובא ישירות.
  - השער `if (grades.length > 1 && gradeId === null) return <GradePicker .../>`
    מתפשט ל-`if (gradeId === null) return <GradePicker .../>` — `grades.length > 1`
    תמיד `true` מעכשיו (4 כיתות קבועות), אז זה לא עוד תנאי אמיתי.
  - כל ארבעת המופעים של `grades.length > 1 ? X : Y` (בשני הבלוקים שמרנדרים
    `TopicPicker`, לכל אחד `onBack` ו-`backLabel`) מתפשטים ל-`X` בלבד
    (`onBack={() => chooseGrade(null)}`, `backLabel="← חזרה"`) — הענף `Y`
    (`switchStudent`, `"← החלף תלמיד"`) הפך לבלתי-נגיש דרך הנתיב הזה. `switchStudent`
    עצמו **נשאר** — הוא עדיין ה-`onBack` היחיד של `GradePicker` עצמו.
  - `loadGradeId`/`rememberGradeId`/`GRADE_STORAGE_KEY` מוסרים, ומוחלפים ב-
    `loadMenuPosition`/`rememberMenuPosition`/`MENU_POSITION_STORAGE_KEY` (ראו "Data /
    State Changes"). זה איפוס חד-פעמי ולא בעייתי של localStorage — לא מדובר בנתוני
    למידה, רק בנוחות ניווט.
  - `selectStudent` ו-שני ה-`useState` initializers (`gradeId`, `screen`) קוראים
    לפונקציית עזר חדשה `resolveScreen(studentId, gradeId)` (ראו למטה) כדי לקבוע את
    מסך ההתחלה בעומק הנכון, במקום תמיד `{ name: "home" }`.
  - `enterTopic` שומר מיקום (`rememberMenuPosition`) ברגע שנכנסים לנושא — כולל נושא
    אדפטיבי (שנשמר בעומק "בית" בלבד, כי אין לו מסך ביניים).
  - שני מקומות שכבר קוראים ל-`setScreen({ name: "home" })` בתור "חזרה" ממסך
    סגנונות/רמות (`onBack` של הבלוקים `levels`/`styles`) גם מנקים את המיקום השמור
    לרמת "בית" (בלי נושא).
  - `chooseGrade` שומר מיקום חדש (`{ gradeId }`, בלי נושא) בכל פעם שנבחרת כיתה — כולל
    כש-`id` הוא `null` (חזרה לבחירת כיתה מנקה גם את הכיתה השמורה, בדיוק כמו היום).

## Data / State Changes

### `curriculum.ts`
```ts
export interface Student {
  id: string;
  name: string;
  gradeId: string; // עדיין קיים — "הכיתה הרגילה" להצגה ב-StudentPicker בלבד
  // gradeIds מוסר
}
```
`gradeOf`, `availableGrades` מוסרים לגמרי. שאר `curriculum.ts` (כולל `grades`,
`gradeById`) לא משתנה.

### `App.tsx` — סכימת האחסון החדשה
מחליפה את `GRADE_STORAGE_KEY` (מפה פשוטה `studentId → gradeId`) במפה עשירה יותר:

```ts
const MENU_POSITION_STORAGE_KEY = "learn-math:menu-position";

interface MenuPosition {
  gradeId: string;
  /** נוכח רק כשהתלמיד/ה הגיע/ה עמוק יותר מרשימת הנושאים של הכיתה. */
  topic?: { id: string; kind: "styles" | "levels" };
}

function loadMenuPosition(studentId: string): MenuPosition | null { /* try/catch כמו הפונקציות הקיימות */ }
function rememberMenuPosition(studentId: string, position: MenuPosition | null): void { /* try/catch */ }
```
מפתח יחיד ב-localStorage, מפה `Record<string, MenuPosition>` — אותו דפוס אחסון בדיוק
כמו `GRADE_STORAGE_KEY` הקיים היום (מפה `studentId → ...`), רק עם value עשיר יותר.

### פונקציית עזר חדשה — `resolveScreen`
```ts
function resolveScreen(studentId: string, gradeId: string | null): Screen {
  if (gradeId === null) return { name: "home" }; // השער העליון כבר יראה GradePicker
  const position = loadMenuPosition(studentId);
  if (!position || position.gradeId !== gradeId || !position.topic) return { name: "home" };
  let grade;
  try { grade = gradeById(gradeId); } catch { return { name: "home" }; }
  const topic = grade.topicSets.find((t) => t.id === position.topic!.id);
  if (!topic || topic.adaptive) return { name: "home" };
  if (position.topic.kind === "styles" && hasStyleLessons(topic)) return { name: "styles", topic };
  if (position.topic.kind === "levels" && !hasStyleLessons(topic)) return { name: "levels", topic };
  return { name: "home" };
}
```
משמשת בשני מקומות: ב-`useState` הראשוני של `screen` (כשיש כבר תלמיד/ה שמור/ה
בטעינת האפליקציה), וב-`selectStudent` (כשבוחרים תלמיד/ה מהמסך הראשון).

## Technical Approach
1. **זמינות כיתות** — `grades` המיובא הוא כבר הרשימה המלאה; שום קוד לא צריך "לדעת"
   מי התלמיד/ה כדי להחליט אילו כיתות להציג. זה כל השינוי בזמינות עצמה.
2. **שמירת מיקום** קורית בשלוש נקודות בלבד ב-`App.tsx`: `chooseGrade` (כיתה נבחרה,
   או בוטלה), `enterTopic` (נושא נבחר — כולל המקרה האדפטיבי), וה-`onBack` של מסכי
   `levels`/`styles` (חזרה לרשימת נושאים). בכל מקום אחר (תרגול, תוצאה, שיעור,
   היסטוריה) — אין קריאה חדשה, כי אלה לא ניתנים לשחזור.
3. **שחזור מיקום** קורה רק בשתי נקודות: טעינת האפליקציה (אם כבר יש תלמיד/ה שמור/ה),
   ובחירת תלמיד/ה מהמסך הראשון. שתיהן קוראות ל-`resolveScreen` באותו אופן.
4. **נפילה בטוחה** — `resolveScreen` בודקת כל שכבה (כיתה קיימת → נושא קיים באותה
   כיתה → הנושא עדיין לא אדפטיבי → סוג המסך (סגנון/רמה) עדיין תואם למה שהנושא תומך
   בו היום) ונופלת ל-`{ name: "home" }` ברגע שאחת מהן נכשלת. אף פעם לא זורקת.

## Edge Cases
- **localStorage לא זמין/זורק** (מצב פרטי בדפדפן) — `loadMenuPosition`/
  `rememberMenuPosition` עוטפות ב-`try`/`catch` בדיוק כמו `loadStudent`/
  `rememberStudent` הקיימות היום; כשלון שקט, לא קורס.
- **תלמיד/ה בלי שום מיקום שמור** (ראשון-פעם, או שהמפתח הישן `GRADE_STORAGE_KEY`
  עדיין קיים אבל לא נקרא עוד) — `loadMenuPosition` מחזירה `null`, `resolveScreen`
  מחזירה `{ name: "home" }`, והשער העליון (`gradeId === null`) מציג `GradePicker`.
- **נושא שהומר לאדפטיבי אחרי ששמרו עליו מיקום "styles"/"levels"** (בדיוק המצב שקרה
  בפועל בפיצ'ר `mika-adaptive-difficulty`) — `resolveScreen` בודקת `topic.adaptive`
  ונופלת ל-"בית". שום קוד לא מניח שהנושא עדיין באותה צורה.
- **נושא/כיתה שהוסרו לגמרי** — `grade.topicSets.find` מחזיר `undefined`, נופלים
  ל-"בית"; `gradeById` זורקת בתוך `try`/`catch`, נופלים גם כן.
- **שני תלמידים לסירוגין** — המיקום נשמר תחת `studentId` נפרד בתוך אותה מפה, בדיוק
  כמו ש-`GRADE_STORAGE_KEY` כבר עושה היום; החלפת תלמיד/ה (`switchStudent`) לא נוגעת
  במיקום השמור של אף תלמיד/ה, כולל זה שעוזבים.

## Risks / Tradeoffs
- **`gradeOf`/`availableGrades` נמחקים לגמרי, לא מסומנים כ-deprecated** — נבדק: אין
  קורא נוסף מלבדם זה לזה ומ-`App.tsx`, ואין קריאה מטסטים. השארתם כקוד מת היה סותר את
  התרבות ההנדסית של הפרויקט (מוחקים קוד שבטוח לא בשימוש, לא משאירים "למקרה").
- **איפוס חד-פעמי של "כיתה אחרונה" הקיימת** — מפתח ה-localStorage משתנה
  (`GRADE_STORAGE_KEY` → `MENU_POSITION_STORAGE_KEY`), כך שמכשיר עם היסטוריית דפדפן
  קיימת "ישכח" את הכיתה האחרונה פעם אחת ויתחיל מ-`GradePicker`. לא נזק אמיתי — זו
  בדיוק חוויית "תלמיד/ה חדש/ה" התקנית, וזה נתון ניווט בלבד, לא היסטוריית תרגול.
- **פישוט הענפים המתים סביב `grades.length > 1`** — שינוי אמיתי בהתנהגות (לא רק
  ניקוי), אבל הענף שמוסר (`switchStudent` כ-`onBack` מרשימת נושאים) כבר לא ניתן
  להגעה ברגע שלכולם יש `4` כיתות — זו לא תוספת סיכון, זו הסרת קוד שכבר לא רץ.

## Open Questions
None.
