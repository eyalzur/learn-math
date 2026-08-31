# מחברת כמצב התרגול היחיד — Tests

## Coverage

כל הבדיקות ב-`tests/e2e/notebook-default-practice.spec.ts`, אלא אם צוין אחרת.

| קריטריון קבלה (product-spec.md / design.md) | בדיקה |
|---|---|
| אין שדה טקסט; המחברת זמינה מרגע שהשאלה נטענת, בלי צעד "פתיחה" | `the notebook is ready to write in the moment a question loads` |
| כפתור השליחה מנוטרל על דף ריק, מופעל כשיש תוכן | `the send button is disabled on an empty page, and enables once something is written` |
| הפעולה יזומה במפורש — כתיבה בלבד לא שולחת כלום | `sending only happens on an explicit click` |
| שיקוף תהליך + בדיקת התוצאה הסופית דרך הזרימה הקיימת; המורה לא שופטת | `a correct final answer shows the teacher's reflection and the existing correct feedback, with no judgment from the teacher itself` |
| תשובה שגויה עדיין מריצה את זרימת האבחון/הסבר הקיימת ללא שינוי | `a wrong final answer still runs the existing diagnosis/explanation flow, unchanged, alongside the teacher's reflection` |
| הצבעת טעות מוצגת כשורה שנייה, נפרדת, אחרי שיקוף התהליך | `an error pointer from the teacher appears as a second, separate line after the process reflection` |
| קריאה לא ודאית נאמרת בפירוש, בלי שיפוט, בלי הגבלת נסיונות | `an uncertain reading says so plainly, gives no verdict, and lets the student write again with no limit` |
| כישלון תקשורת → שגיאה ברורה, אפשר לנסות שוב, המחברת ממשיכה לעבוד | `a failed call to the teacher shows a clear, non-technical error and lets you try again` |
| פסקת המורה ניתנת להקראה במלואה (שיקוף + הצבעת טעות), כמו כל כפתור הקראה אחר | `reading the teacher's note aloud speaks the reflection and error pointer, and toggles like every other speak button` |
| בלי מנוע קול — אין כפתור הקראה בפסקת המורה | `with no speech engine, the teacher panel has no read-aloud button at all` |
| אחרי מענה, הפעולה הראשית הופכת ל"הבא"/"סיום", לא לשליחה חוזרת | `once answered, the notebook's primary action becomes moving on, not sending again` |
| דף חדש נפתח אוטומטית לכל שאלה (architecture.md) | `moving to the next question opens a fresh, empty page` |
| מנגנון המחברת עצמו (דף חדש/הסרה/ניווט) ממשיך לעבוד | `a new page can be added, an existing one removed (never the last), and pages can be navigated` |
| שאלת ההמשך של `diagnose()` נשארת שדה מוקלד, לא עוברת למחברת | מכוסה עקיפות: `a wrong final answer...` ובדיקות `mistake-diagnosis.spec.ts` הקיימות (`answerFollowUp` עדיין מקליד/ה) |
| בלי מפתח/סוד Anthropic בקוד הלקוח | `notebook-server-relay.spec.ts` — `no client-side code imports the Anthropic SDK...` (לא שוכפל כאן) |

לא מכוסה, ולא ניתן ב-e2e מול שרת מדומה (כבר תועד כך ב-`notebook-teacher-understanding`):
"התיאור נאמן למה שבאמת נכתב בדף" — הבטחה על מה ש-Claude בפועל עושה.

## שינוי בסוויטה הקיימת

הסרת שדה התשובה המוקלד (`.answer-input`) וכפתור "📝 מחברת" משפיעה על **23 מתוך 29**
קובצי e2e שהיו קיימים — לא רק אלה שעוסקים במחברת, אלא כל בדיקה שהשתמשה בהקלדת
תשובה כאמצעי להגיע למסך תוצאה לצורך בדיקה לא-קשורה (רמזים, הקראה, דיאגרמות, קושי
מסתגל וכו'). כולם עודכנו להשתמש ב-helper משותף חדש,
`tests/e2e/helpers/notebookAnswer.ts` (`answerViaNotebook`/`answerUncertainly`/
`mockTeacherCommunicationFailure`), שמדמה כתיבה במחברת + מוק ל-`/read-page` במקום
הקלדה.

**שני קבצים נמחקו**, לא תוקנו: `practice-notebook.spec.ts` (הנחתו — שהמחברת לא
משפיעה על נכון/שגוי, ושהיא נפתחת/נסגרת בנפרד ממסך השאלה — הפוכה מהפיצ'ר הזה
במפורש) ו-`notebook-teacher-understanding.spec.ts` (הדיאלוג עם שתי השורות הקבועות
וחוזה `question`/`answer`/`imageDataUrl` לא קיימים יותר). ההתנהגויות שלהם שעדיין
נכונות נבדקות מחדש כאן, מול המסך החדש. **קובץ אחד צומצם**:
`notebook-server-relay.spec.ts` נשאר עם בדיקה יחידה שעוד תקפה (בלי תלות ב-Anthropic
SDK בקוד הלקוח) — שאר תוכנו תיאר UI (טולבר, דיאלוג התמונה) שכבר לא קיים.

**שני באגים אמיתיים נמצאו ותוקנו תוך כדי הרצת הסוויטה** (מתועדים גם ב-
`architecture.md` § Implementation Notes):
1. כפתור "שלח למורה" נשאר מנוטרל אחרי ציור — ה-`useReducer` שהודיע על שינוי תוכן
   היה מקומי ל-`PracticeNotebook`, בזמן ש-`primaryAction.disabled` מחושב עכשיו
   בהורה (`Practice.tsx`). תוקן להודיע דרך ה-`onPagesChange` הקיים.
2. הזום הראשוני של המחברת (`zoom:1`, מרכוז לפי הנחת רוחב-viewport-מלא) לא התאים
   למחברת המוטמעת (צרה בהרבה מאז שהיא כבר לא `position:fixed;inset:0` בורח
   מ-720px של `#root`) — הקנבס יצא כמעט לגמרי מחוץ לאזור הנראה. תוקן ל-
   `computeFitTransform` (כבר קיים, משמש את כפתור "הצג את כל הדף במסך אחד").

**שלושה תיקוני בדיקות נוספים**, לא בקוד האפליקציה:
- רגקס לא מעוגן (`/הבא|סיום/`) וגם מחרוזת רגילה (`"הבא"`, שגם היא substring match
  ב-Playwright) תפסו בטעות את כפתור ניווט הדפים של המחברת ("דף הבא ▶") — אפשרי
  רק עכשיו שהמסכים מוזגו לאחד. תוקן לעגן (`/^(הבא|סיום)$/`) או `exact:true`,
  ב-4 קבצים (`clearer-explanations`, `style-lessons`, `mistake-diagnosis`,
  `mika-diagrams`).
- `answerViaNotebook`/`answerUncertainly` עצמן ממתינות עכשיו לתוצאה (`.teacher-reading`
  / הודעת אי-ודאות) לפני שהן חוזרות — שליחה למורה עוברת `await` אמיתי (גם כשמדומה),
  בניגוד לשדה הטקסט הישן שהתעדכן סינכרונית באותו handler.

## איך מריצים
```bash
npm run build && npm run lint && npm run test:e2e
```

## Status
**300/300 עוברות, ריצה בודדת ונקייה** (2026-08-31). `npm run build`/`npm run lint`
נקיים בלקוח ובשרת. גרסה `1.25.0`.

הערה על `fraction-diagram.spec.ts` ("every slice carries what one part is worth",
"questions the circle cannot describe get no circle..."): נצפו ככשלים חד-פעמיים
בריצות ביניים, **לא** בריצה הסופית הנקייה — אומת כתלוי-אקראיות (עומק החיפוש של
השאלה הרצויה בתוך 6-8 ניסיונות, לא קשור לפיצ'ר הזה) על ידי הרצה חוזרת מספר פעמים
ברצף, ללא שינוי קוד, שהראתה הצלחה/כישלון לסירוגין. קדם למיזוג, לא נוצר על ידו.
