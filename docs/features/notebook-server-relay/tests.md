# שרת המחברת — שלב א׳ — Tests

## Coverage

| קריטריון קבלה (product-spec.md) | בדיקה |
|---|---|
| קיים שירות שרת שרץ בגוגל קלאוד, נגיש בכתובת קבועה | **לא נבדק ב-Playwright** — פריסה ידנית עדיין לא בוצעה (ראו "מגבלות" למטה). |
| השרת מקבל מטריצה ומחזיר תמונה נאמנה | **לא נבדק ב-Playwright** — נבדק ידנית על ידי ה-developer מול השרת האמיתי (curl, מתועד ב-`architecture.md` → Implementation Notes: `GET /health`, `POST /render-page` תקין, ו-`400` על קלט לא תקין). |
| כפתור "שלח למורה" קיים בסרגל הכלים, במיקום הנכון | `tests/e2e/notebook-server-relay.spec.ts` › `the send-to-teacher button sits in the toolbar, between 'נקה דף' and the page navigation` |
| הכפתור מושבת בדף ריק, פעיל כשיש תוכן | `tests/e2e/notebook-server-relay.spec.ts` › `the button is disabled on an empty page, and enabled once there is something written` |
| לחיצה שולחת ומציגה את התמונה שחזרה מהשרת | `tests/e2e/notebook-server-relay.spec.ts` › `clicking it sends the page and shows the image the server returned` |
| סגירת חלון התמונה חוזרת לאותו דף, ללא שינוי | `tests/e2e/notebook-server-relay.spec.ts` › `closing the image dialog returns to the same page, unchanged` |
| מצב טעינה ברור, בלי לחסום את שאר המחברת | `tests/e2e/notebook-server-relay.spec.ts` › `while sending, the button shows a loading label and the rest of the notebook keeps working` |
| מצב שגיאה ברור, אפשר לנסות שוב | `tests/e2e/notebook-server-relay.spec.ts` › `a failed send shows a clear, non-blocking error and lets you try again` |
| שום דבר אחר במחברת/בתרגול לא משתנה | `tests/e2e/notebook-server-relay.spec.ts` › `leaving the notebook works the same regardless of any of this`, וגם התאמת `tests/e2e/practice-notebook.spec.ts` (ראו למטה) |
| אין תלות/ייבוא הקשורים ל-Anthropic/Claude | `tests/e2e/notebook-server-relay.spec.ts` › `no Anthropic/Claude dependency exists anywhere in the new server or client code` (בדיקה סטטית שסורקת את קבצי המקור, לא Playwright רגיל) |
| אין מפתח/סוד בקוד הלקוח/בריפו | לא נבדק אוטומטית — אין עדיין שום מפתח בנמצא (עדיין לא נוצר מפתח Anthropic), כך שאין מה לחפש. הכלל "לא בדפדפן, לא בריפו" יישאר רלוונטי לבדיקה כשהמפתח יתווסף בפיצ'ר הבא. |

בנוסף, `tests/e2e/practice-notebook.spec.ts` עודכן: הבדיקה הקודמת "the notebook has no submit or export action" קבעה כאינווריאנט שלא יהיה שום כפתור שליחה — נכון לפני הפיצ'ר הזה, שגוי אחריו. שונתה ל"the notebook's only action beyond drawing is the explicit 'send to teacher' button", שמוודאת בדיוק כפתור אחד ("שלח למורה") ושום כפתור ייצוא/הגשה אחר.

## מגבלה מרכזית: אין שרת אמיתי בשום סביבת בדיקה

השרת (`server/`) עדיין לא נפרס בגוגל קלאוד — זו עדיין פעולה ידנית של המשתמש (ראו
Out of Scope ב-product-spec). המשמעות: **אין באפשרות ה-QA הזה לבדוק מקצה-לקצה מול
שרת אמיתי**, לא בסביבת הפיתוח ולא ב-CI.

הפתרון שנבחר: `playwright.config.ts`'s `webServer` מזריק
`VITE_NOTEBOOK_SERVER_URL=https://notebook-server.invalid` (הכתובת מעולם לא באמת
נפתרת ברשת — `.invalid` שמור ל-RFC 2606 בדיוק לצורך כזה) לכל ריצת הסוויטה. כל
בדיקה שרוצה לדמות תגובת שרת משתמשת ב-`page.route("**/render-page", ...)` ליירט
את הבקשה ולהחזיר תשובה מדומה (הצלחה עם `imageDataUrl` קבוע, או כישלון `500`) —
כך שהכפתור עובר בפועל בדיוק את אותו קוד לקוח (fetch אמיתי, פענוח JSON אמיתי) בלי
תלות ברשת אמיתית או בפריסה שטרם קיימת.

**המשמעות המדויקת של זה:** הבדיקות כאן מוכיחות שהלקוח מציג נכון כל מה שהשרת
(כלשהו) יחזיר לו — לא מוכיחות שהשרת האמיתי מייצר תמונה נאמנה מהמטריצה. את זה
ה-developer בדק ידנית (curl מול השרת בפועל). לאחר שהמשתמש יפרוס את השרת בפועל,
כדאי לבצע בדיקה ידנית חד-פעמית נוספת מול השרת האמיתי (לא Playwright) כדי לוודא
שהתמונה שחוזרת אכן תואמת למה שצויר.

## תגלית תוך כדי כתיבת הבדיקות: תיקון קוד אמיתי, לא רק בדיקה

הבדיקה הראשונה שנכתבה ("disabled on empty page, enabled once written") נכשלה
בעקביות. האבחון: ציור על ה-canvas (`PracticeNotebook.tsx`) משנה את
`currentPage.filledCells` ישירות דרך refs (במכוון — מהירות בזמן גרירה), בלי לקרוא
ל-state setter כלשהו. כפתור "שלח למורה" הוא **הראשון** באפליקציה שה-`disabled`
שלו תלוי בתוכן הדף בזמן רינדור — ובלי מנגנון שמכריח רינדור מחדש בסיום משיכת קו,
הכפתור נשאר במצב מיושן (Stale) גם אחרי שנכתב תוכן אמיתי. זה תוקן (לא כאן, אלא
חזרה ל-`developer` — ראו `architecture.md` להערה המפורטת): נוסף `useReducer` זעיר
שמכריח רינדור מחדש בסיום משיכת קו (`endPointer`), בביטול-משיכה (`undoRecording`,
מקרה הקצה של pinch-cancel), ובניקוי דף (`clearCurrentPage`) — לא בכל `pointermove`
בודד, כדי לא לפגוע בביצועים שהעיצוב המקורי של הרכיב שמר עליהם בכוונה.

**תגלית שנייה, בבדיקה עצמה ולא בקוד המוצר:** אחרי התיקון הזה הבדיקות עדיין נכשלו
— הפעם כי `drawOnCanvas` (helper שהועתק מ-`practice-notebook.spec.ts`) לוחץ במרכז
תיבת-התיחום המלאה של ה-canvas (1200×1600), אך `.notebook-stage` חותך אותו
(`overflow: hidden`) לגובה ה-viewport בפועל (כ-600px בברירת המחדל) — כך שהמרכז
הגאומטרי של האלמנט נמצא הרחק מחוץ לאזור שבאמת נראה על המסך, וקליק שם לא פוגע
בכלום. תוקן ב-`notebook-server-relay.spec.ts` לצייר קרוב לפינה השמאלית-עליונה של
ה-canvas (בטוח בתוך האזור הנראה) במקום במרכז. `practice-notebook.spec.ts`'s
`drawOnCanvas` המקורי לא שונה — הבדיקות שלו לא היו תלויות אף פעם בכך שהציור באמת
נרשם, רק בכך שהאזור לחיץ, ולכן לא נחשף שם באג דומה; לא נגעתי בקובץ ההוא כי זה
מחוץ להיקף הפיצ'ר הזה.

## How to run

```bash
npm run test:e2e
```

## Status

עבר במלואו — **287/287** בדיקות, ריצה נקייה יחידה, 2026-08-29. כולל 8 הבדיקות
החדשות של הפיצ'ר הזה (`notebook-server-relay.spec.ts`) ואת התיקון ל-בדיקה
הקיימת ב-`practice-notebook.spec.ts`.
