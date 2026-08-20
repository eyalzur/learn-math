# פתיחת סוגריים בביטויים אלגבריים — Tests

## Coverage
כל שישה המקומות שהמוצר כיסה נבדקים דרך `tests/e2e/content.spec.ts`, ולא דרך
מסך — זה שינוי תוכן טהור בתוך אובייקטי `Question` קיימים, אז הבדיקה הישירה
מול הנתונים היא הדרך הכנה, בדיוק כמו כל שאר `content.spec.ts` (ראו ההערה
בראש הקובץ).

- **הביטוי הפתוח והמכונס המלא מוצג בכל שאלת "פתחו סוגריים"** (גם `openBrackets`
  האדפטיבי וגם `g8-expressions-m1`/`m2`/`m6`/`m7`) → RULE חדש ב-`RULES`:
  `"an 'opening brackets' question shows the full expanded expression and defines
  מקדם/מספר חופשי"`. רץ אוטומטית גם על כל 330 השאלות הכתובות (דרך `everyQuestion`)
  וגם על מדגם של כל חמש רמות הקושי של המחולל (דרך
  `"every generated question, across all twelve levels-as-practice topics, passes
  every content rule"`).
- **שני צעדי הכפל מוצגים בנפרד** — נבדק באותו RULE: מחפש את המחרוזת המלאה
  `"Ax + AB"` בתוך ה-steps המנורמלים (`explainQuestion(q).steps`), שקיימת רק אם
  שני שלבי הכפל הובילו אליה.
- **הגדרת "מקדם" ו"מספר חופשי" באחד הרמזים** — אותו RULE בודק ששני הרמזים
  ביחד מכילים את שתי המילים.
- **`combineLikeTerms` מגדיר "מקדם" ברמז הראשון** → בדיקה נפרדת (לא RULE,
  כי גרסת grade8.ts המקבילה נשארה מכוונות מחוץ להיקף — ראו architecture.md):
  `"every generated 'combine like terms' question defines מקדם in its first hint"`,
  דוגמת 200 שאלות מהמחולל בדיפיקלטי 2.
- **אותה תשובה נכונה כמו היום** — נבדק דרך `"every question sits under the topic
  it claims"` ושאר בדיקות ה-collection הקיימות, שממשיכות לעבור בלי שינוי כי
  `prompt`/`answer`/`analogy` לא נגעו בהם.

בנוסף, אומת ידנית מול הדפדפן (Playwright, לא חלק מהסוויטה האוטומטית) ששני
הדפוסים אכן מוצגים נכון על המסך החי — כולל RTL/LTR — לפני שהבדיקות נכתבו
כ-content rules: מסך "פתחו סוגריים: `5(x + 7)`" הציג את `5x + 35` בשלבים
ואת הגדרת "מקדם"/"המספר החופשי" ברמז, ומסך "כנסו איברים" הציג את הגדרת
"מקדם" ברמז הראשון.

## How to run
`npm run test:e2e`

## Status
עבר, 2026-08-20 — סוויטת ה-e2e המלאה (`npm run test:e2e`), ריצה בודדת נקייה:
**237/237 עברו**, כולל 35/35 ב-`content.spec.ts` (כולל שתי הבדיקות החדשות).
`npm run build` ו-`npm run lint` נקיים.

**תיקון שנתפס תוך כדי כתיבת הבדיקות:** hint 2 המקורי (מפיתוח) כתב את התשובה
עצמה (`answer`) כמספר מוחשי, ורוץ אל הכלל הקיים "keeps its hints to exactly
two, without giving the answer away" — נתפס מיד עם הרצת הבדיקה החדשה. תוקן ב-
`src/data/adaptiveExpressions.ts` וב-`src/data/grade8.ts` (hint 2 חוזר לצורת
נוסחה עם המספרים הנתונים בלבד, בלי התשובה עצמה); `design.md` עודכן בהתאם.
לא הורצה כאן סוויטת ה-e2e המלאה (`playwright test`, כל הקבצים) — רק
`content.spec.ts` ישירות, שבודק את כל התוכן הרלוונטי בלי דפדפן. סוויטת
ה-e2e המלאה תרוץ פעם אחת, נקייה, כחלק מסגירת ה-PR.
