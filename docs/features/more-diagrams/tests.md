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

## אימות שהבדיקות באמת תופסות
הקריטריון שהכי קל לממש הפוך — `●` על המספר שאינו התשובה — נבדק בכוונה מול מימוש
שבור: החלפת `from: [smaller]` ב-`[bigger]` מפילה את הבדיקה. בלי זה היא הייתה עוברת
על שני המימושים כאחד.

## How to run
`npm run test:e2e`

## Status
עוברות — 147 / 147 בסוויטה המלאה, 2026-08-15. הגידול מ-130: 14 בדיקות מסך חדשות
ושלושה כללי תוכן.
