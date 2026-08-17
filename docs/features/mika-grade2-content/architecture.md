# תוכן כיתה ב׳ למיקה — Architecture

## Overview
מיקה מקבלת שדה חדש `gradeIds` על ה-`Student` שלה (רשימת כיתות זמינות), לצד `gradeId`
הקיים שנשאר כמו שהוא. כשלתלמיד/ה יש יותר מכיתה אחת, `App.tsx` מציג מסך בחירה חדש
(`GradePicker`) לפני מסך הנושאים; רותם ועומר, שאין להם `gradeIds`, לא רואים שום דבר
חדש. תוכן כיתה ב׳ עצמו יושב בקובץ נתונים חדש, `src/data/grade2.ts`, במבנה זהה ל-
`grade1.ts` הקיים.

## Affected Files / Components

**חדשים:**
- `src/data/grade2.ts` — שני נושאים (`add100`, `sub100`), כל אחד עם שלוש רמות ו-`style`
  לכל שאלה, באותו מבנה בדיוק כמו `grade1.ts` (ראו "Technical Approach").
- `src/components/GradePicker.tsx` — מסך בחירת הכיתה. Props: `grades: Grade[]`,
  `onSelect: (grade: Grade) => void`, `onBack: () => void`, `onHistory?: () => void`
  (אופציונלי, כמו ב-`TopicPicker`, גם אם היום תמיד מועבר).

**משתנים:**
- `src/data/curriculum.ts`:
  - `Grade` מקבל שדה חדש `shortLabel: string` — האות/הכינוי הקצר להצגה על כרטיס
    (`"א"`, `"ב"`, `"ו"`, `"ח"` — ממולא על כל ארבעת אובייקטי ה-`Grade` הקיימים, לא רק
    כיתות א׳/ב׳, כדי לא להשאיר טיפוס חלקי).
  - `Student` מקבל שדה אופציונלי חדש: `gradeIds?: string[]`.
  - נוסף `GRADE_2_TOPICS` (מערך שמות נושאים, כמו `GRADE_1_TOPICS`) ואובייקט `grade2:
    Grade` (`id: "2"`, `label: "כיתה ב׳"`, `shortLabel: "ב"`), ונוסף ל-`grades[]`.
  - שורת `mika` ב-`students[]` מקבלת `gradeIds: ["1", "2"]`. `gradeId: "1"` נשאר בדיוק
    כמו שהוא — הוא עדיין מה שמוצג על כרטיס מיקה ב-`StudentPicker` (שם אין שינוי).
  - פונקציה חדשה `gradeById(id: string): Grade` — מחלצת את הבדיקה שכבר קיימת בתוך
    `gradeOf` לפונקציה נפרדת שאפשר לקרוא לה גם עם id שאינו `student.gradeId`.
  - פונקציה חדשה `availableGrades(student: Student): Grade[]` — `student.gradeIds` אם
    יש, אחרת `[gradeOf(student)]`. זו נקודת הכניסה היחידה ש-`App.tsx` צריך.
  - `gradeOf` עצמו לא משתנה — `StudentPicker.tsx` ממשיך לקרוא לו בדיוק כמו היום.
- `src/data/style.ts`: שתי שורות חדשות ב-`STYLE_META` — `add100: { title: "חיבור" }`,
  `sub100: { title: "חיסור" }` (אותה מוסכמה בדיוק כמו `add10`/`add20`/`sub10`/`sub20`
  הקיימים — שם כללי, בלי ספרות, מבחין רק ב-id).
- `src/App.tsx`: ראו "Technical Approach" — לוגיקת הניתוב.
- `src/App.css`: מחלקות חדשות למסך `GradePicker` (ראו "Technical Approach").

## Data / State Changes

`App()` מקבל state חדש: `const [gradeId, setGradeId] = useState<string | null>(null)`.
זהו ה-id של הכיתה שנבחרה עבור התלמיד/ה הנוכחי/ת, ולא חלק מ-`Screen` — כמו `student`
עצמו, זהו state שקודם ל-`Screen` ולא נגזר ממנו, מאותה סיבה בדיוק: `screen` תמיד "home"
בכל נקודה שבה `gradeId` מתאפס, אז אין סיכון לאי-התאמה בין השניים.

אין שינוי לצורת הנתונים הנשמרת ב-`progress.ts` (`recordPractice`) — `grade.label` ש
נכתב לכל רשומה כבר יהיה `"כיתה ב׳"` כשמיקה תרגלה שם, כי `grade` המחושב ב-`App.tsx`
כבר יצביע על הכיתה הנכונה. `History.tsx` לא מסנן לפי כיתה (בכוונה — ראו design.md).

## Technical Approach

**ב-`App.tsx`**, מיד אחרי הבדיקה הקיימת `if (student === null) return <StudentPicker
.../>;`, לפני החישוב הקיים של `const grade = gradeOf(student)`:

```
const grades = availableGrades(student);

if (grades.length > 1 && gradeId === null) {
  return (
    <GradePicker
      grades={grades}
      onSelect={(g) => setGradeId(g.id)}
      onBack={switchStudent}
      onHistory={() => setScreen({ name: "history" })}
    />
  );
}

const grade = grades.length > 1 ? grades.find((g) => g.id === gradeId)! : grades[0];
```

לתלמיד/ה עם כיתה אחת (`grades.length === 1`, כמו רותם ועומר היום), התנאי הראשון תמיד
`false` — שום מסך חדש לא נכנס לדרכם, ו-`grade` מחושב בדיוק כמו `gradeOf(student)` היום.

**`switchStudent` ו-`selectStudent`** מאפסים גם את `gradeId` (`setGradeId(null)`), כך
שכל מעבר בין תלמידים — או חזרה למי-לומד-היום ובחירת מיקה שוב — מציג את מסך בחירת הכיתה
מחדש, בלי לזכור בחירה קודמת (החלטת design.md המפורשת).

**מסך הנושאים (`screen.name === "home"`)** — שני שינויים ב-props של `TopicPicker`,
מותנים ב-`grades.length > 1`:
- `onBack`: `grades.length > 1 ? () => setGradeId(null) : switchStudent`. מחזיר למסך
  בחירת הכיתה במקום להחליף תלמיד/ה כשיש יותר מכיתה אחת.
- `onHistory`: מועבר רק כש-`grades.length === 1`. כש-`grades.length > 1`, הקישור
  "ההתקדמות שלי" כבר מוצג במסך בחירת הכיתה (כפי ש-`GradePicker` מקבל אותו למעלה) — לא
  משוכפל גם ב-`TopicPicker`.

**`GradePicker.tsx`** עוקב אחרי מבנה `StudentPicker.tsx`/`TopicPicker.tsx` הקיימים —
`grade-header` עם כפתור `link-button` ("← חזרה") וקישור היסטוריה, כותרת `h1`, ורשימת
כרטיסים. כל כרטיס מציג `grade.shortLabel` (אות גדולה) מעל `grade.label` (הטקסט הקיים
כבר), עם מחלקת CSS ייעודית לכל כיתה (`grade-card-1`, `grade-card-2`, ...) לצבע שונה —
**לא** `level-easy`/`level-hard` (ראו הערת design.md: אין לרמז "קל מול מסוכן").

**`grade2.ts`** מעתיק את המבנה של `grade1.ts` שורה-לשורה: `import type { StyledQuestion,
Topic } from "./curriculum"`, `import { level } from "./level"` (בדיוק אותה דרך בטוחה
נגד התלות המעגלית שכבר קרתה — ראו CLAUDE.md). שני נושאים:

```
{ id: "add100", title: "חיבור עד 100", reviewed: true,
  levels: [ level("easy", [...] satisfies readonly StyledQuestion[]),
            level("medium", [...] satisfies readonly StyledQuestion[]),
            level("hard", [...] satisfies readonly StyledQuestion[]) ] }
{ id: "sub100", title: "חיסור עד 100", reviewed: true, levels: [ ... ] }
```

כל שאלה מקבלת `style: "add100"` / `"sub100"` (זהה ל-id הנושא, בדיוק כמו `add10`/`sub10`
הקיימים) — **לא** ניסוח מרובה-סגנונות: לנושא יש סגנון יחיד אחד, בדיוק כמו "חיבור עד 10"
היום. `stylesOf` על נושא כזה מחזיר מערך באורך 1, ש-`hasStyleLessons` (הדורש 2+) פוסל —
כלומר הנושא ממשיך למסך הרמות (`LevelPicker`) הרגיל, לא למסך סגנונות. **אין צורך בשום
שינוי ב-`insideTopic()` או ב-`hasStyleLessons`** — ההתנהגות הזו כבר קיימת ועובדת בדיוק
ככה עבור "חיבור עד 10"/"חיסור עד 10".

**חישוב הסבר (`explain.ts`) לא דורש שום שינוי.** נבדק ישירות בקוד: `explainAddition`
ו-`explainSubtraction` כבר מטפלים בשני ספרות בשני האגפים (פיצול עשרות/יחידות,
כולל "מעבר עשרה" — למשל `72 − 8` נופל לענף שמוריד קודם ליחידה עגולה ואז את השאר). שאלות
כמו `47 + 8` יכולות פשוט להשמיט `steps` (בדיוק כמו רוב שאלות `grade1.ts`) ולתת לחישוב
האוטומטי לעבוד — אין צורך בכתיבת `steps` ידניים לרוב השאלות.

## Edge Cases

- **בדיקת התוכן הקיימת ל"כיתה אחת מסווגת"** (`tests/e2e/content.spec.ts`, "grade one is
  fully classified...") מסננת במפורש ל-`gradeId === "1"` בלבד — היא **לא** תישבר
  ותמשיך לעבור בלי שינוי, אבל גם לא תכסה את כיתה ב׳ החדשה. אין כרגע בדיקה מקבילה
  שאוכפת גודל/סיווג של כיתה ב׳ — זו עבודה של `qa`, לא נכתבת כאן.
- **שאר כללי `content.spec.ts`** (analogy, רמזים, כיווניות וכו׳) רצים על `grades`
  באופן גנרי — ברגע שכיתה ב׳ נכנסת ל-`grades[]`, כל הכללים האלה חלים עליה אוטומטית
  בלי לגעת בקובץ הבדיקות.
- **תלמיד/ה עם `gradeIds` ריק (`[]`)** — לא אמור לקרות (מיקה מקבלת `["1","2"]` בקוד,
  לא נתון דינמי), אבל `availableGrades` עם מערך ריק תיתן `grades.length === 0` ותשבור
  את `grades.find(...)!`. לא נדרש טיפול הגנתי בזמן ריצה — זה יתפוס ב-TypeScript/בבדיקה
  אם מישהו יכתוב את זה לא נכון, לא בקלט משתמש.
- **סדר הכרטיסים** ב-`GradePicker` — `grades` מגיע כבר בסדר `gradeIds` (["1","2"]), אז
  כיתה א׳ תמיד משמאל/ימין עקבי לפי סדר ה-array, לא צריך מיון נוסף.

## Risks / Tradeoffs

- **`gradeIds` אופציונלי במקום מבנה כללי לכל התלמידים** — נבחר בכוונה (ראו product-spec
  Out of Scope): מוסיף שדה יחיד, לא נוגע ברותם/עומר בכלל, ולא בונה מנגנון גנרי שאף אחד
  עוד לא ביקש. המחיר: אם בעתיד גם רותם/עומר יזדקקו לזה, `gradeOf`/`StudentPicker`
  יצטרכו התאמה דומה — מקובל, כי היום זה לא נדרש.
- **`shortLabel` נוסף לכל ארבע הכיתות, לא רק לשתיים שמופיעות ב-picker** — קצת עבודה
  מיותרת היום, אבל נמנע מטיפוס חלקי (`shortLabel?`) שהיה מזמין שכחה בעתיד אם picker
  דומה יתווסף לכיתה אחרת.

## Open Questions
None.
