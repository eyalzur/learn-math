# שיעור על סגנון תרגיל — Tests

## Coverage

| קריטריון מהספק | בדיקה |
|---|---|
| נושא רב-סגנוני שואל על סגנון ולא על רמה | `style-lessons.spec.ts` › `a topic with several styles asks which style, not which level` |
| נושא חד-סגנוני נשאר בדיוק כפי שהוא | `…a topic with one style is untouched and never shows the new screen` |
| כיתה שטרם סווגה ממשיכה לפי רמות | `…a grade that has not been classified still practises by level` |
| **בשום מסלול לא בוחרים פעמיים** | `…every one of Mika's topics lands somewhere, and never on both` |
| מספר השאלות מוצג לפני הכניסה, ונכון | `…each card shows how many questions the lesson holds, before entering it` |
| שיעור קצר אינו מסומן כחריג | `…a short lesson is shown as a lesson, not flagged as a short one` |
| הדוגמה היא שאלה אמיתית מאותו סגנון | `…the example on a card is a real question from that very style` |
| **הדוגמה החשבונית נקראת שמאל-ימין** | `…an arithmetic example reads left to right inside the right-to-left page` |
| השיעור מכיל את כל הסגנון, ונקרא בשמו | `…the lesson holds the whole style, and is titled with it` |
| **השאלות מטפסות מהקלה לקשה** | `…the questions climb, so the hardest is not the first one met` · `content.spec.ts` › `a lesson's questions climb from easy to hard` |
| חזרה סימטרית — מסגנון לסגנונות | `…leaving a lesson returns to the styles, not to the levels` |
| …ומרמה לרמות | `…leaving a level still returns to the levels` |
| ההיסטוריה מציגה `נושא · סגנון` | `…history says which style was practised, not just which topic` |
| ההקראה לכל כרטיס, ורק כשהיא מופעלת | `…a child who cannot read gets the example spoken, one button per card` |
| **כל `style` בנתונים שמו ידוע, וכל שם בשימוש** | `content.spec.ts` › `every style id in the data has a name, and every name is used` |
| הספירות: `150` · `15` · `13` · `3+` לכל סגנון | `content.spec.ts` › `grade one is fully classified, and every style is big enough to be a lesson` |

## הכלל שמחליף את מה שהקומפיילר אינו עושה
`grade1.ts` **בכוונה אינו מייבא** את מזהי הסגנונות מ-`style.ts` — ייבוא קבועים לקובץ
נתונים הוא הקשת המעגלית שכבר הפילה את האפליקציה למסך לבן ש-TypeScript לא תפס.

המחיר הוא ששגיאת כתיב במזהה אינה נתפסת בקומפילציה, והכלל **הדו-כיווני** הוא מה שקונה
את זה בחזרה: מזהה בלי שם נתפס בכיוון אחד, ושם שאיש אינו משתמש בו — כלומר שינוי שם
שנעשה בצד אחד בלבד — בכיוון השני. כלל חד-כיווני היה מפספס את המקרה השני לגמרי.

## אימות שהבדיקות באמת תופסות
**המיון מהקלה לקשה** הוא הקריטריון שקל לממש הפוך בלי להבחין, כי רוב הסגנונות יושבים
בתוך רמה אחת ואצלם כל סדר נראה תקין. הוא נבדק מול מימוש שבור בכוונה — היפוך המעבר
ל-`hard → medium → easy` — **והפיל את הבדיקה על חמישה סגנונות**: `before`, `after`,
`bigger`, `sub20` ו-`before` שוב על גבול נוסף.

הבדיקה גם סופרת כמה סגנונות **פרושים על יותר מרמה אחת** ונכשלת אם אין אף אחד: בלי
סגנון כזה היא הייתה עוברת על כל מימוש שהוא, ולא בודקת דבר.

**האכיפה של `style` כשדה חובה** נבדקה באותה דרך בשלב המימוש — הסרת `style` משאלה אחת
מפילה את הקומפילציה ומצביעה על השאלה בשמה.

## מה שונה בבדיקות קיימות, ולמה

**התחזית הייתה `15` קבצים; בפועל נגעו `5`.** הארכיטקטורה ספרה `33` שימושים
ב-`.level-card` ב-`15` קבצים ואמרה מפורשות שהמספר המדויק יגיע מהרצה ולא מהערכה —
וטוב שכך. רוב השימושים נוגעים בכיתות ו׳ ו-ח׳, שאין להן סגנונות, או בשני הנושאים
החד-סגנוניים של מיקה, שמסכם לא זז. **ספירת אתרי קריאה אינה ספירת בדיקות שנשברות.**

חמשת הקבצים שכן:

- **`mika-diagrams.spec.ts`** — `22` קריאות. ה-helper עבר מ-`open(page, topic, levelIdx)`
  ל-`open(page, topic, styleTitle)`, וכל בדיקה **נקראת עכשיו על שם סוג התרגיל שהיא
  עוסקת בו** במקום על רמה שמעולם לא היה לה עניין בה. זה שיפור ולא רק תיקון.
- **`clearer-explanations.spec.ts`** — ה-helper מקבל מספר (רמה) או מחרוזת (סגנון), כך
  שכל אתר קריאה מצהיר באיזה מסך הוא עובר.
- **`fraction-diagram.spec.ts`** — אתר אחד.
- **`mistake-diagnosis.spec.ts`** — כל הקובץ נשען על כך שהשאלה הראשונה היא
  `בא אחרי 12`; הוא הולך אליה עכשיו בשמה, וזה מוסבר למטה.
- **`mistake-explanation.spec.ts`** — הכניסה, וגם החזרה אחרי סיבוב ראשון.

**שתי בדיקות שינו משמעות ולא רק ניווט, וזה מכוון:**

1. **`the hard place-value questions get no frame`** כיוונה לרמה הקשה, שהכילה **שני**
   סוגי שאלות: הפרש בין ספרות והשלמה ל-`20`. השנייה **קיבלה ציור בגל הקודם** (רצועת
   העשרים), ולכן הבדיקה מכוונת עכשיו לסגנון `איזו ספרה גדולה יותר` בלבד — כלומר
   בדיוק לשאלות שעליהן היא נכתבה.
2. **`borrowing questions show no vertical`** נשענה על כך שהרמה הקשה **כולה** פריטה,
   ולקחה את השאלה הראשונה. שיעור מטפס מהקצה הקל, ולכן היא הולכת עכשיו אל `15 − 8`
   בשמה. הישענות על "הראשונה במקרה מתאימה" הייתה שבירה גם קודם.

**ושתי בדיקות שהיו קשורות למספר שרירותי:** `the conversation does not change the score`
בדקה `0 מתוך 10` כי לרמה היו עשר שאלות, ולשיעור יש שמונה; `the next question is
reachable mid-conversation` בדקה `שאלה 2` כי היא התחילה מהראשונה. **שתיהן קוראות
עכשיו את המצב מהמסך במקום לנקוב במספר** — האחת את סך השאלות, השנייה את המונה לפני
ואחרי. זה מה שהן באמת בדקו מלכתחילה.

## How to run
`npm run test:e2e`

## Status
**`174` בדיקות ב-`17` קבצים**, 2026-08-15. הגידול מ-`157`: `14` בדיקות מסך חדשות
ו-`3` כללי תוכן.

הרצה מלאה אחרונה עברה על כל הקבצים שנגעו בהם, וכל קובץ נבדק גם בנפרד אחרי התיקון:
`style-lessons` `14/14` · `mika-diagrams` `20/20` · `clearer-explanations` `10/10` ·
`mistake-diagnosis` + `mistake-explanation` `29/29` · `perfect-score-message` `3/3` ·
`content` `20/20`.
