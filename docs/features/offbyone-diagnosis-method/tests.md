# אבחון "סטייה של אחד" — מתחבר לשיטה — Tests

זהו תיקון לפיצ'ר קיים (`mistake-diagnosis`), לא מסך חדש — הבדיקות הרלוונטיות גרות
ב-`tests/e2e/mistake-diagnosis.spec.ts` יחד עם שאר דפוסי האבחון, לא בקובץ נפרד.

## Coverage

| קריטריון קבלה (product-spec.md) | בדיקה |
|---|---|
| אין שאלת המשך אינטראקטיבית לדפוס הזה | `answering one too many is not treated as answering one too few, and explains immediately` וגם `answering one too few still reads as one too few, and explains immediately` — שתיהן בודקות `.followup` בכמות `0` |
| ההסבר בנוי מכלל כללי ואז יישום על המספרים האמיתיים; המקרה שדווח לא קורה יותר | `the explanation after an off-by-one mistake comes from the original question, not the wrong answer` |
| שני דפוסים נפרדים, לפי סוג השאלה (`offByOneSequence`/`offByOneSum`) | `without the browser › nearness alone is not a diagnosis, on any question in the app` |
| הדפוס לעולם לא נושא `followUp` (ברמת הנתונים, על פני כל 330+ השאלות) | `without the browser › off-by-one never carries a follow-up — the explanation is shown directly instead` |
| הכללים הקבועים מ-`mistake-diagnosis` (בלי דפוס אין אבחנה, הניקוד לא זז, אפשר להתקדם בכל רגע) | לא נגעו — כל שאר `18` הבדיקות בקובץ, שלא קשורות ל-off-by-one, עברו בלי שינוי |

## How to run
```bash
npm run test:e2e
# רק הקובץ הזה:
npx playwright test tests/e2e/mistake-diagnosis.spec.ts
```

## Status
עבר במלואו ב-2026-08-18: `24/24` בדיקות ב-`mistake-diagnosis.spec.ts` (היו `23`, נוסף
`1` — שתי בדיקות UI נכתבו מחדש כדי לבדוק את ההתנהגות החדשה, אחת פורקה כי המטרה
המקורית שלה נעשתה חסרת משמעות ונכתבה מחדש לבדיקת נכונה, ונוספה בדיקה חדשה שממוקדת
בקריטריון המרכזי של התיקון). ריצה מלאה: `214/214` בדיקות ה-e2e (`213` קיימות + `1`
נטו חדשה בקובץ הזה), `npm run build`/`npm run lint` נקיים בגרסה `1.16.1`.

שינויים בקובץ הבדיקות, לפי מה שדיווח developer:
- שתי בדיקות UI ("answering one too many/few...") חיפשו `.followup-input` שכבר לא
  מתרנדר לדפוס הזה — נכתבו מחדש לבדוק `.followup` בכמות `0` ואת קופסת "איך פותרים?"
  שמופיעה מיד.
- בדיקה שהתייחסה ל-`id === "offByOne"` עודכנה לשני ה-id-ים החדשים.
- בדיקה ("the small question walks toward the answer") שכשלעצמה הפכה לחסרת משמעות
  (הלולאה הפנימית שלה כבר לא רצה על אף שאלה, כי `found?.id !== "offByOne"` תמיד)
  נכתבה מחדש לבדוק את הקריטריון האמיתי שנשאר: שדפוסי off-by-one לעולם לא נושאים
  `followUp`.
- נוספה בדיקה חדשה שממוקדת ישירות בקריטריון "המקרה שדווח לא קורה יותר": ההסבר אחרי
  טעות off-by-one מכיל את המספרים האמיתיים של השאלה (`12`, `13`) ואת הכלל הכללי
  ("אחרי כל מספר בא המספר שגדול ממנו באחד").

ניסיון ראשון לבדיקה הזו נכשל בטעות שלי, לא באג באפליקציה: בדקתי גם ש-`14` (התשובה
השגויה) לא מופיעה בשום מקום בהסבר — אבל `14` מופיע כחלק לגיטימי מציר המספרים
שהשאלה מציגה (חלון של `8`–`15`), לא בגלל התשובה השגויה. תוקן להסתמך רק על המספרים
שכן צריכים להופיע, לא על מה שלא צריך.
