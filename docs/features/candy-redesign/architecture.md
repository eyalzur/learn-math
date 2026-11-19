# עיצוב חדש — ממתקייה (סגול כהה) — Architecture

## Overview
שינוי ממוקד בלבד ב-CSS ובטעינת גופנים: ערכי `:root` הקיימים ב-`src/index.css` מקבלים
ערכים חדשים (קבועים, בלי בלוק `prefers-color-scheme: dark` נפרד), גופנים חדשים
נטענים ב-`index.html`, וכמה סלקטורים ספציפיים ב-`src/App.css` מקבלים `border-radius`
גדול יותר או מסגרת/פינה חדשה. אין שינוי ב-React, ב-state, או בלוגיקה.

## Affected Files / Components

- **`index.html`** — מרחיבים את ה-`<link>` הקיים ל-Google Fonts (שטוען כבר
  `Playpen Sans Hebrew`) כך שיבקש גם `Varela+Round` ו-`Rubik:wght@400;500;600;700`
  באותה בקשה (אותם שני `preconnect` קיימים, בלי תגיות חדשות). התגובה הקיימת מעל
  ה-`<link>` ("Only used for `.notebook-teacher-mark` ... the first external font this
  app loads") הופכת לא מדויקת ברגע שמוסיפים גופנים נוספים — developer צריך לעדכן
  אותה, לא להשאיר תגובה שגויה בקוד.
- **`src/index.css`** — ה-`:root` היחיד (הסרה מלאה של בלוק
  `@media (prefers-color-scheme: dark)`):
  - 9 הטוקנים שהוחלט עליהם ב-design.md מקבלים את הערכים החדשים (טבלת הצבעים שם).
  - טוקנים קיימים שה-design **לא** נגע בהם במפורש אבל שהיום שונים בין light ל-dark
    (`--notebook-question-ink`, `--social-bg`, `--shadow`) — **ממשיכים עם הערך
    שהיה שייך היום ל-dark mode**, לא ל-light mode, כי הרקע הקבוע החדש הוא כהה.
    ראו "Edge Cases" למטה.
  - `#social .button-icon { filter: invert(1) brightness(2); }` (כיום רק בתוך בלוק
    ה-dark) עובר לכלל קבוע, בלי תנאי — האייקונים האלה תמיד היו צריכים את ההיפוך הזה
    על רקע כהה, והרקע תמיד כהה מעכשיו.
  - `--heading` הופך ל-`"Varela Round", system-ui, 'Segoe UI', Roboto, sans-serif`.
  - `--sans` הופך ל-`"Rubik", system-ui, 'Segoe UI', Roboto, sans-serif`.
- **`src/App.css`** — שינויים ממוקדים, לא sweep גורף על כל `border-radius` בקובץ:
  - `border-radius: 12px` → `20px` ב: `.student-card`, `.topic-card`, `.level-card`,
    `.read-aloud-setting`, `.hold-zoom-setting`, `.auto-scroll-setting`,
    `.pan-speed-setting`.
  - `border-radius: 14px` → `20px` ב-`.settings-dialog`.
  - `.notebook-send-btn` (כפתור "שלח למורה"/"הבא" — הכפתור הראשי היחיד שה-design
    קרא לו "פיל"): `border-radius: 12px` → `999px`, כך שהוא תואם ויזואלית לכפתורי
    האפשרויות שכבר פיל (`.hold-zoom-option` וכו׳, שכבר `999px` היום).
  - `.notebook-stage` מקבל `outline: 2px dotted var(--accent); outline-offset: -2px;`
    — זו המסגרת המנוקדת סביב אזור הכתיבה שה-design תיאר. **לא** `border` — ראו
    "Technical Approach".
  - שאר עשרות ה-`border-radius` בקובץ (אייקונים קטנים, כפתורי ניווט עגולים,
    badges וכו׳) **לא** נוגעים — מחוץ להיקף שה-design הגדיר ("כרטיסים/כפתורים
    מרכזיים"), ושינוי שלהם היה sweep לא ממוקד.

## Data / State Changes
אין. אין state, prop, או טיפוס חדש — שינוי CSS/HTML טהור.

## Technical Approach
**מסגרת המחברת כ-`outline`, לא `border`:** `.notebook-stage` הוא
`position: absolute; inset: 0` בתוך `.notebook-stage-frame`, בלי `box-sizing:
border-box` על האלמנט הזה (יש `box-sizing: border-box` רק על `#root`, לא גלובלי).
הוספת `border` על אלמנט `inset:0` תגדיל את הקופסה שלו ב-2×עובי-המסגרת ותדרוס את
המדידה שכמה בדיקות e2e ותיאור הקוד עצמו מתעדים כ"אותו גודל בדיוק" (ראו ההערה מעל
`.notebook-stage-frame`). `outline` לא משפיע על גודל/פריסה בכלל ולא נחתך
ע״י `overflow: hidden` של האלמנט עצמו — `outline-offset: -2px` מצייר אותו קצת
לפנים כך שהוא בתוך הגבול הנראה, בלי לגעת במידות. זו הדרך הבטוחה להשיג "מסגרת
מנוקדת סביב אזור הכתיבה" בלי side effect על הפיזיקה של הדף (pan/zoom/clamp).

**גופנים:** בקשת ה-Google Fonts הקיימת ב-`index.html` מתרחבת לכלול את שתי המשפחות
הנוספות באותה קריאת `css2` (לא `<link>` שני) — אותם `preconnect` כבר קיימים ומספיקים.
`--heading`/`--sans` הם המשתנים שכל האפליקציה כבר נשענת עליהם (`h1`, `h2` ב-
`index.css`, ועוד סלקטורים ב-`App.css` שמפנים ל-`var(--sans)`) — עדכון שני
המשתנים האלה בלבד מספיק כדי שהגופנים החדשים יחולו על כל האפליקציה, בלי לגעת בכל
סלקטור בנפרד.

**ביטול ה-light/dark media query:** כל הערכים שהיו בתוך הבלוק עוברים (אלה שהוחלט
עליהם במפורש) או נשארים כערך ה-dark הקיים (אלה שלא הוחלט עליהם במפורש — ראו Edge
Cases) ישירות לתוך ה-`:root` הבסיסי, והבלוק כולו נמחק. אין עוד שני מצבים — יש רק
את הערכים האלה.

## Edge Cases

- **דף המחברת וצבע הדיו כבר "עוקבים" אחרי הטוקנים — זה לא תקלה, זו ההתנהגות הנכונה.**
  design.md הניח ש"משטח הנייר/הדיו" קבועים ולבנים ולא מושפעים מהעיצוב. בפועל, בדיקת
  הקוד (`src/App.css` `.notebook-stack { background: var(--bg); ... }` ו-
  `PracticeNotebook.tsx`'s `inkColor()` שקורא ל-`--text-h`) מראה שהדף **כן** נצבע
  לפי `--bg` והדיו **כן** נצבע לפי `--text-h` — זה בדיוק המנגנון שכבר עובד נכון
  היום במצב dark (דף כהה, דיו בהיר). עם הערכים החדשים (`--bg` סגול כהה, `--text-h`
  לבן-לבנדרי) זה ממשיך לעבוד נכון בלי שום שינוי קוד — התיקון הוא בתיעוד/בהבנה, לא
  בקוד. `.notebook-grid` (קווי הרשת) מתעדכן לערך הלבנדרי שה-design בחר, וגם זה
  כבר עובד אוטומטית.
- **טוקנים שלא ברשימת ה-9:** `--notebook-question-ink` (הטקסט הכתוב-על-הדף של
  השאלה עצמה), `--social-bg`, ו-`--shadow` נשארים בערך ה-dark-mode הקיים שלהם
  (`#8fb8e8`, `rgba(47,48,58,0.5)`, וצמד ה-shadow הכהה) כי הרקע הקבוע החדש הוא כהה
  — המשך עם ערך ה-light הישן (המיועד לרקע לבן) היה שובר ניגודיות.
- **`.problem-box` אינו "תיבה" ויזואלית היום בפועל** — אין לו `background`/`border`
  משלו, רק `display:flex` לפריסה; "הצבע" שהמשתמש רואה הוא `.problem-text`'s
  `color: var(--text-h)` ישירות על רקע העמוד. אין צורך בשום שינוי radius/border
  כאן — השינוי החזותי מגיע כולו מעדכון הטוקנים.
- פונטים חדשים שלא נטענו עד כה (`Varela Round`, `Rubik`) — `font-synthesis: none`
  כבר מוגדר ב-`:root` (`index.css`), כך שאם גופן נכשל בטעינה (רשת איטית) הטקסט
  יחזור ל-fallback המוגדר ב-`--heading`/`--sans` ולא "יסונתז" משהו מוזר — אין
  צורך בטיפול נוסף.

## Risks / Tradeoffs
- בחרנו **לא** לעשות sweep גורף על כל עשרות ה-`border-radius` ב-`App.css` — רק על
  הסלקטורים שה-design קרא להם במפורש "כרטיסים/כפתורים מרכזיים". יתרון: שינוי
  ממוקד, קל לבדוק ול-review; חיסרון: כמה אלמנטים קטנים (למשל כפתורי ניווט עגולים
  קיימים, badges) יישארו בפינות החדות הישנות — נראה עקבי מספיק, לא "תקלה" בכוונה.
- מחיקת בלוק ה-`prefers-color-scheme: dark` מסירה את **המנגנון** להבחנה
  light/dark, לא רק את הערכים — אם בעתיד ירצו להחזיר הבחנה כזו (למשל לתמה אחרת),
  יהיה צריך לכתוב את הבלוק מחדש מאפס; שום דבר לא נשאר "רדום" לשימוש חוזר. זו
  החלטת המוצר המפורשת (עיצוב אחיד קבוע), אז זה תקין.

## Open Questions
None.

## Implementation Notes
נבנה כפי שתוכנן, עם תיקון אחד שהתגלה תוך כדי אימות חי בדפדפן:

- **`index.html`** — הורחב ה-`<link>` הקיים ל-Google Fonts לבקש גם `Varela+Round`
  ו-`Rubik:wght@400;500;600;700` באותה בקשה; עודכנה התגובה שהייתה טוענת ש-Playpen
  Sans Hebrew הוא "הגופן החיצוני הראשון".
- **`src/index.css`** — `:root` יחיד עם כל הערכים החדשים מ-design.md, הטוקנים
  שלא הוחלטו במפורש (`--notebook-question-ink`, `--social-bg`, `--shadow`) נשארו
  בערך ה-dark-mode הישן שלהם, ובלוק `@media (prefers-color-scheme: dark)` הוסר
  כליל (כולל `#social .button-icon`'s filter, שעבר לכלל קבוע).
- **`src/App.css`** — `border-radius: 12px → 20px` ב-7 הסלקטורים שתוכננו
  (`.student-card`, `.topic-card`, `.level-card`, `.settings-dialog` [היה 14px],
  `.read-aloud-setting`, `.hold-zoom-setting`/`.auto-scroll-setting`,
  `.pan-speed-setting`), ו-`.notebook-send-btn` הפך לפיל (`999px`).

**סטייה מהתכנון, שהתגלתה באימות חי:** architecture.md תכנן `outline: 2px dotted
var(--accent); outline-offset: -2px;` על `.notebook-stage` כדי להימנע משינוי גודל
הקופסה. בפועל, ב-Chrome, אלמנט עם `overflow: hidden` **על עצמו** פשוט לא מצייר את
ה-outline שלו בכלל — אומת חי (גם עם `outline: 8px solid red` בלי offset, שום דבר
לא נצבע). הפתרון: `border: 2px dotted var(--accent);` רגיל, יחד עם
`box-sizing: border-box` מפורש על אותו סלקטור — כך שהוספת ה-border לא משנה את
גודל הקופסה הכוללת (רק מצמצמת את השטח הפנימי הנראה ב-2px מכל צד), בלי לגעת
ב-`inset: 0` או בחישובי pan/zoom. אומת חי בדפדפן אחרי התיקון: המסגרת המנוקדת
מופיעה בבירור סביב כל אזור הכתיבה.

אומת חי: מסך בחירת תלמיד/ה, מסך בחירת כיתה/נושא, מסך תרגול + מחברת (כולל המסגרת
המנוקדת), ודיאלוג ⚙️ ההגדרות — כולם מציגים את הרקע הסגול הכהה, הגופנים החדשים,
והפינות המעוגלות. אין שגיאות קונסול.

`npm run build` ו-`npm run lint` נקיים. `npm run bump:feature` →
`1.42.0 → 1.43.0`.
