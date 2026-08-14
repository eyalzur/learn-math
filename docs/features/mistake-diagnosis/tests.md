# אבחון הטעות ושיחה עליה — Tests

`tests/e2e/mistake-diagnosis.spec.ts` — 14 בדיקות.

הציר של הקובץ הוא המקרה שדווח: "איזה מספר בא אחרי `12`?" נענה `3`. כיתה א׳, הנושא
הראשון, רמה **בינונית**. `999999` משמש כתשובה שאין לה אבחנה, כמו בבדיקות הוותיקות.

## Coverage

### שהאבחנה תהיה אמיתית
| קריטריון | בדיקה |
|---|---|
| המסך אומר מה הייתה הטעות | `the mistake itself is named, not only the correct answer` |
| המקרה שדווח נתפס | אותה בדיקה — נדרש ש**שני** המספרים יופיעו במשפט |
| בלי דפוס אין אבחנה | `an answer matching no pattern gets today's screen…` |
| התשובה הנכונה אינה טעות | `an answer nothing describes is left alone` |

הבדיקה הראשונה דורשת גם `2` וגם `12`. אזכור של אחד מהם בלבד אינו אומר דבר על
הטעות — "`12`" לבדו מסופק על ידי כל משפט שמזכיר את השאלה.

### שתהיה שיחה ולא הכרזה
| קריטריון | בדיקה |
|---|---|
| נשאלת שאלה שאפשר לענות עליה | `a question is asked that the student can answer…` |
| השאלה אינה חזרה על המקורית | אותה בדיקה — משווה מול טקסט השאלה שנכשלה |
| האפליקציה מגיבה למה שנענה | `the app responds to what was actually answered` |
| תשובה שגויה אינה סתימת פה | `a wrong answer in the conversation still says what the right one was` |

`the app responds…` עונה פעם נכון ופעם שגוי ודורש **שתי תגובות שונות**. בלי
ההשוואה הזו, מסך שמדפיס את אותו משפט תמיד היה עובר.

### שאי אפשר להיתקע
| קריטריון | בדיקה |
|---|---|
| ההסבר מוסתר עד שנענתה השאלה | `the worked explanation waits until the small question is dealt with` |
| אפשר לבקש לראות בלי לענות | `asking to see the answer reveals it without answering anything` |
| אפשר להתקדם בכל רגע | `the next question is reachable mid-conversation, without answering` |

### שלא נשבר מה שעבד
| קריטריון | בדיקה |
|---|---|
| הניקוד אינו משתנה | `the conversation does not change the score` |
| תשובה נכונה כמו היום | `a correct answer behaves exactly as before…` |

בדיקת הניקוד עוברת עשר שאלות שלמות ומאמתת `0 מתוך 10` במסך הסיכום, אחרי שהשאלה
הראשונה נכשלה, נדונה ו**תוקנה** בשיחה.

### כיווניות
| קריטריון | בדיקה |
|---|---|
| מספרי האבחנה מבודדים | `numbers in the diagnosis sit in their own left-to-right run` |
| הביטוי בשאלה הקטנה מבודד | `the small question's expression is isolated too` |

נבדק `unicode-bidi` בפועל ולא רק `direction`, כי כיוון לבדו אינו מספיק — זו בדיוק
התקלה השנייה מתוך השלוש שרשומות ב-CLAUDE.md. במשפט "קראת `2` במקום `12`" היפוך
בין שני המספרים הופך אותו לשקר.

### מה שהדפדפן לא יכול להגיע אליו
`a mistake is diagnosed in grade 8 content, not only grade 1` נבדק **מול הנתונים**
ולא במסך, כי כל הנושאים של רותם ועומר עדיין ממתינים לאישור ומסך התרגול לא נפתח.
זו גם הקריאה הישרה של הקריאון — הוא טענה על כללי האבחון, לא על המסך.

## שהבדיקות יכולות להאדים

`the worked explanation waits…` אומתה במוטציה: הוסר התנאי שמסתיר את קופסת ההסבר,
והבדיקה נכשלה. כלל שלא ראו אותו אדום הוא הבטחה, לא בדיקה.

## How to run
`npm run test:e2e`

## Status
✅ עובר — **89 בדיקות** נכון ל-2026-08-14, מתוכן 14 חדשות. `npm run build` ו-
`npm run lint` נקיים.

**75 הבדיקות הוותיקות לא שונו כלל.** הן עונות `999999`, שאינו תופס באף דפוס, ולכן
הן ממשיכות לרוץ במסלול הלא-מאובחן — שהוא לפי הספק זהה להיום. זו לא הצלחה מקרית
אלא תוצאה ישירה של ההכרעה "בלי דפוס, המסך של היום".

**באג אחד נתפס לפני שנכתבה עליו בדיקה,** בשלב הפיתוח: הזיהוי של "התעלמות מהעשרות"
כפי שתוכנן לא תפס את המקרה שדווח בכלל. הפירוט ב-`architecture.md` תחת
Implementation Notes.
