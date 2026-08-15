# ציורים לשאר הנושאים — Tests

גל ראשון בלבד: שתי הצורות של מיקה. חמש הצורות הנותרות טרם נבנו.

## Coverage

| קריטריון מהספק | בדיקה |
|---|---|
| אין ציור לפני התשובה — ציר | `mika-diagrams.spec.ts` › `no number line before the question is answered` |
| אין ציור לפני התשובה — קופסה | `…no ten-frame before the question is answered` |
| תשובה נכונה אינה מציגה ציור | `…a correct answer shows no picture` |
| הציר עולה משמאל לימין | `…the ticks run left to right and ascend` |
| אי LTR מבודד בתוך עמוד עברי | `…the line is one isolated left-to-right island` |
| חלון של לפחות חמישה סימונים | `…even at the top of the range the window still holds five ticks` |
| **בהשוואה, `●` על המספר שאינו התשובה** | `…a comparison marks the number that was NOT the answer` |
| "נמצא בין" מסמנת שני קצוות | `…a between-question marks both ends` |
| "כמה יחידות" — הבודדות מלאות | `…asking about units fills the loose ones, not the box` |
| "כמה עשרות" — הקופסה מלאה | `…asking about tens fills the box, not the loose ones` |
| קופסה לפני מאונך על `10 + 6` | `…the ten-frame comes before the vertical sum…` |
| עשר הקשות בלי ציור, וההסבר שלם | `…the hard place-value questions get no frame, and still explain themselves` |
| הכיתוב = מה שקורא מסך מקבל | `…each picture's caption is what a screen reader is told` |
| הכיתוב משפט, לא רשימת מספרים | `…the captions are sentences, not lists of numbers` |
| **בדיוק `30` שאלות מפיקות ציר** | `content.spec.ts` › `all thirty counting questions draw their line` |
| **בדיוק `20` מפיקות קופסה** | `content.spec.ts` › `exactly twenty place-value questions draw their box` |
| ציור לעולם אינו סותר את שאלתו | `content.spec.ts` › `no line or box ever disagrees with its own question` |

שני הכללים הסופרים מחשבים את הזכאות **באופן בלתי תלוי** מחמש צורות השאלה שבספק,
ומצליבים מול המודולים. אם השניים אי פעם לא יסכימו — אחד מהם טועה לגבי מה שהובטח,
וזה מה שאומר את זה בקול.

## גל התיקונים

| קריטריון מהספק | בדיקה |
|---|---|
| "רחוק יותר" בלי נקודת מוצא — פסול, בכל 510 השאלות | `content.spec.ts` › `RULES` › `never says how far without saying from what` |
| ...וגם על המסך, לא רק בכיתוב | `mika-diagrams.spec.ts` › `no picture or step tells a child something is far…` |
| **הכיתוב מתאר את ה-`0` שבאמת מצויר** | `content.spec.ts` › `the line's opening sentence describes the ticks that are actually drawn` |
| ...ובזוג שאלות סמוכות על המסך | `mika-diagrams.spec.ts` › `the opening sentence matches whether zero is really on screen` |
| הציר אומר מה הוא ציר, וכמה מוסיף כל צעד | אותה בדיקה — `\`0\`` ו-`מוסיף \`1\`` נדרשים בשורה הראשונה |
| **ריצת ספירה של שלושה, רצופה, אל התשובה** | `content.spec.ts` › `a counting question shows a run into its answer, not a pair of marks` |
| ...ובכיוון הנכון, ונאמרת במילים | `mika-diagrams.spec.ts` › `a counting question shows the run it counted, not two marks` |
| הריצה נחתכת ל-`0`–`20` ומתקצרת | `mika-diagrams.spec.ts` › `the run shortens rather than running off the end of the line` |
| **"נמצא בין" — ריצה וגם הקצה השני** | `mika-diagrams.spec.ts` › `a between-question counts up and still marks the far end` |
| ההשוואות נשארות סימון אחד | `content.spec.ts` › אותו כלל, הענף שאינו ספירה |
| ההסבר קורא לספרות בשמן ובמיקומן | `mika-diagrams.spec.ts` › `the place-value explanation calls the digits by their names` |
| **בדיוק `5` שאלות מפיקות רצועה** | `content.spec.ts` › `exactly five completion questions draw their strip of twenty` |
| הרצועה `20`, וההשלמה היא התשובה | `mika-diagrams.spec.ts` › `the strip of twenty fills what the question starts from…` |
| **אף שאלה אינה מפיקה גם קופסה וגם רצועה**, והכיסוי `25` | `content.spec.ts` › `no question draws both a box and a strip` |
| הכיתוב הדו-שורתי הוא תיאור אחד לקורא מסך | `mika-diagrams.spec.ts` › `each picture's caption is what a screen reader is told` |

### שלוש בדיקות ששונו, ולא בוטלו
כולן נשברו משינוי אמיתי ותקין, וכולן שמרו על הכוונה:
`a between-question marks both ends` ספרה `2` סימונים והיום `4` — היא עדיין מוודאת
שהקצה העליון מסומן, ובנוסף שהריצה נאמרת. `the captions are sentences` חיפשה
`על הציר` ומחפשת `זהו ציר המספרים`. `each picture's caption` משווה עכשיו אחרי נרמול
רווחים, כי שתי שורות מול מחרוזת אחת הן הרנדור ולא התוכן.

### הכלל שנכתב רחב מדי, ותוקן ולא רוככ
הגרסה הראשונה של כלל המרחק אסרה את המילה `רחוק` עצמה, ותפסה שתי שאלות תקינות:
`כמה רגלו רחוקה מהקיר` ו-`נסיעה ברכבת בין שתי ערים רחוקות`. **הכלל היה שגוי, לא
התוכן** — הפסול הוא מרחק **בהשוואה** בלי משהו להשוות אליו (`רחוק יותר`, `פחות
רחוק`), ולא המילה. הכלל צומצם, ועדיין תופס את שני סדרי המילים.

## אימות שהבדיקות באמת תופסות
הקריטריון שהכי קל לממש הפוך — `●` על המספר שאינו התשובה — נבדק בכוונה מול מימוש
שבור: החלפת `from: [smaller]` ב-`[bigger]` מפילה את הבדיקה. בלי זה היא הייתה עוברת
על שני המימושים כאחד.

**גל התיקונים, שני מימושים שבורים בכוונה:**

1. **שורת הכלל שנבחרת מהמסומנים במקום מה-`ticks`** — הטעות שקל ליפול בה, כי היא
   נכונה ברוב השאלות. `ruleLine([...from, to])` במקום `ruleLine(ticks)` הפיל את
   הבדיקה על `g1-numbers-e1` ו-`e9`: שם החלון **מתרחב** ל-`0` כדי להגיע לחמישה
   סימונים, כלומר ה-`0` מצויר בלי שאף מספר מסומן מגיע אליו. שתי שאלות מתוך `30`,
   ובלי הבדיקה הזו הן היו אומרות לילדה שה-`0` מחוץ לתמונה בזמן שהוא מולה.
2. **הסרת הקצה העליון מ"נמצא בין"** — `from: [...run]` במקום `[...run, hi]` הפיל
   את הבדיקה על כל ארבע שאלות ה"בין".

## How to run
`npm run test:e2e`

## Status
עוברות — **157 / 157** בסוויטה המלאה, 2026-08-15. הגידול מ-`147`: שבע בדיקות מסך
חדשות, שלושה כללי תוכן חדשים, וכלל אחד ב-`RULES`.
