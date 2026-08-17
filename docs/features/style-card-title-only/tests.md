# כרטיס סגנון — רק כותרת — Tests

## Coverage
| קריטריון מהספק | בדיקה |
|---|---|
| כרטיס מציג רק כותרת, אין דוגמה ואין מונה | `style-lessons.spec.ts` › `each card shows only its title — no example, no question count` |
| שיעור קצר (`4` שאלות) נראה כמו כל שיעור אחר | `style-lessons.spec.ts` › `a short lesson is shown as a lesson, not flagged as a short one` (עודכן: מזהה כרטיסים לפי כותרת, לא לפי מונה שהוסר) |
| לחיצה על כרטיס עדיין פותחת שיעור מהסגנון הנכון | `style-lessons.spec.ts` › `entering a style produces questions of that same kind` (עודכן משם קודם, בלי הבדיקה על הדוגמה שהוסרה) |
| כפתור ההקראה ממשיך לעבוד ללא שינוי | `style-lessons.spec.ts` › `a child who cannot read gets the example spoken, one button per card` (לא שונה — לא תלוי בתצוגה שהוסרה) |

**בדיקה אחת הוסרה ולא הוחלפה:** `an arithmetic example reads left to right inside
the right-to-left page` בדקה כיווניות בתוך `.style-example-math`, אלמנט שכבר
לא קיים במסך הזה. הסיכון שהיא שמרה עליו (ביטוי חשבוני הפוך בתוך משפט עברי)
עדיין מכוסה במסכים אחרים שבהם אכן מוצג חשבון — למשל
`students-and-syllabus.spec.ts` › `a Hebrew sentence keeps its own direction
while the maths inside stays LTR`.

## שגיאה שתפסתי בבדיקה הראשונה שכתבתי, לפני שהסתמכתי עליה
הסדר שכתבתי לכותרות (`...מה גדול יותר, מה קטן יותר, מה נמצא באמצע`) לא תאם את
מה שבאמת מוצג (`...מה גדול יותר, מה נמצא באמצע, מה קטן יותר`) — ריצה מול
האפליקציה תפסה את זה מיד.

## How to run
`npm run test:e2e`

## Status
עוברות — **182 / 182** בסוויטה המלאה, ריצה בודדת ונקייה, 2026-08-17.
