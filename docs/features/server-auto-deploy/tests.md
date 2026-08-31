# פריסה אוטומטית של השרת — Tests

12 בדיקות ב-`tests/e2e/server-auto-deploy.spec.ts`.

**למה הן לא בדיקות Playwright רגילות:** לפיצ'ר הזה אין מסך — הוא workflow של
GitHub Actions וסעיף תיעוד. הבדיקות קוראות את הקבצים האמיתיים מהדיסק ומאמתות את
מה שה-spec הבטיח. הן יושבות ב-`tests/e2e/` **כדי שירוצו ב-CI בפועל** דרך
`npm run test:e2e`; תקדים קיים: `notebook-server-relay.spec.ts` ו-`content.spec.ts`
כבר מכילות בדיקות סטטיות ללא דפדפן.

**ה-YAML נפרס, לא נבדק בביטוי רגולרי.** הבדיקה החשובה ביותר כאן היא ש**אין**
`paths:` filter — והקובץ עצמו מכיל הערה שמסבירה למה אין. ביטוי רגולרי שמחפש
`paths:` היה מוצא את ההערה ונכשל מהסיבה הלא נכונה. לכן נוסף `yaml` כ-
devDependency: שאלת המבנה, לא הטקסט.

## Coverage

| קריטריון קבלה (product-spec.md) | בדיקה |
|---|---|
| פריסה מופעלת כשקוד השרת מגיע ל-`main` | `deploying is triggered by code reaching main` |
| כל push מייצר ריצה גלויה (אין `paths:` filter) | `every push to main produces a run — there is no paths filter to silence it` |
| אפשר להפעיל פריסה ידנית מדף ה-Actions | `a deploy can be started by hand, without pushing code` |
| שלושת מצבי הריצה קיימים וגלויים | `all three run outcomes exist, each reporting to the run's own summary page` |
| כשלון גלוי ומכוון לפעולה | `a failed deploy says what to check, and points at the setup section` |
| הזדהות תקינה מול גוגל | `the job can mint the OIDC token its authentication depends on` |
| ריצות מקבילות לא דורסות זו את זו | `concurrent deploys queue rather than cancel each other` |
| שום סוד לא נכנס לריפו | `no secret of any kind lives in the workflow` |
| הפריסה הקיימת של האתר לא משתנה | `the site's deploy to GitHub Pages still behaves exactly as it did` |
| תיעוד ההגדרה קיים + נאמר מראש שעד אז ייכשל | `the setup the user must perform is documented, and says so before it is needed` |
| הוראות עם ערכים אמיתיים, בלי placeholders | `the setup instructions contain real values, never placeholders to fill in` |
| תיעוד הפריסה הידנית נשאר | `the manual deploy route is still documented alongside the automatic one` |
| כל דיפלוי מפין במפורש את חשבון השירות (רוויזיה 2026-08-31) | `every deploy pins the runtime service account explicitly, not implicit carry-over` |
| דוגמת הפריסה הידנית גם היא מפינה את חשבון השירות (רוויזיה 2026-08-31) | `the manual deploy example also pins the runtime service account` |

### הערה על "הפריסה הקיימת של האתר לא משתנה"
נבדק כ**התנהגות ולא כבייטים**. checksum על `deploy.yml` היה נכשל בכל עריכה
לגיטימית עתידית — הקובץ נערך לגיטימית ממש לאחרונה (PR #55, הוספת
`VITE_NOTEBOOK_SERVER_URL`) — ולא היה אומר דבר על מה שבאמת חשוב. במקום זה נבדק
שהוא עדיין נורה על push ל-`main`, עדיין מכיל את שני ה-jobs שלו, עדיין מעלה
ומפרסם artifact של Pages, ו**לא צמח לו אחריות לפרוס את השרת** (`gcloud run
deploy` אינו מופיע בו).

## הבדיקות אומתו מול מוטציות

בדיקה שעוברת אינה מוכיחה דבר עד שהוכח שהיא יכולה להיכשל. שלוש מוטציות הוחדרו
ל-workflow, וכל אחת נתפסה על ידי **בדיקה אחת בדיוק** (11 עברו, 1 נכשלה):

| המוטציה | נתפסה |
|---|---|
| הוספת `paths: ['server/**']` — ה"אופטימיזציה" שהכי סביר שמישהו יעשה בעתיד | ✅ |
| היפוך `cancel-in-progress` ל-`true` | ✅ |
| מחיקת `id-token: write` | ✅ |

הדיוק הזה (בדיקה אחת לכל מוטציה, לא חמש) הוא מה שהופך כישלון עתידי לניתן
לאבחון מיידי.

## מה הבדיקות האלה **אינן** מאמתות

**ה-workflow מעולם לא רץ, ולא יכול לרוץ עדיין.** הוא דורש הגדרה חד-פעמית בחשבון
הגוגל קלאוד של המשתמש, שאיש מלבדו אינו יכול לבצע. לכן שלושת הדברים הבאים
**לא נבדקו ואין לדווח עליהם כעוברים**:

1. שההזדהות מול גוגל (Workload Identity Federation) אכן מצליחה.
2. שחמשת ה-roles שהוענקו ל-service account מספיקים לפריסה מקוד מקור.
3. שפקודת `gcloud run deploy` אכן מצליחה בהקשר של CI.

מה שכן ידוע: אותה פקודת פריסה עצמה הורצה ידנית בהצלחה ב-2026-08-29, וההגדרות
נכתבו לפי התיעוד של גוגל. זה מבסס סבירות, לא אימות.

**הבדיקה האמיתית הראשונה** היא הריצה הידנית שהמסמך מנחה את המשתמש לבצע מיד
אחרי ההקמה: **Actions → Deploy server to Cloud Run → Run workflow**. ריצה ידנית
תמיד מנסה לפרוס בפועל (ולא מדלגת), ולכן היא בודקת את כל השרשרת — הזדהות,
הרשאות, ופריסה — ולא רק את החלק שכבר ידוע כעובד.

## How to run

```bash
npm run test:e2e
```

## Status

**299/299 עברו** — ריצה נקייה יחידה, 2026-08-29. כולל 12 הבדיקות של הפיצ'ר הזה
ו-287 הקיימות, שאף אחת מהן לא נשברה.

## רוויזיה — 2026-08-31: תיקון לתקרית אמיתית בפרודקשן

נוספו שתי בדיקות (ראו Coverage למעלה) שנועדו לתפוס בדיוק את מה שקרה בפועל:
פריסה אוטומטית ש"הצליחה" (ירוקה) בזמן שאיפסה בשקט את חשבון השירות של
`notebook-server`, וכל קריאה אמיתית ל-Claude נכשלה עד שהמשתמש תיקן ידנית.
שתיהן נכתבות באותה שיטה שהקובץ כבר משתמש בה (פירוק YAML אמיתי, לא ביטוי
רגולרי) — אחת על ה-workflow עצמו, אחת על דוגמת הפריסה הידנית ב-
`server/README.md` (אותה פקודה בדיוק שהמקור לתקרית היה העתקה שלה בלי הדגל).

**סטטוס:** `307/307` עברו — ריצה נקייה יחידה, 2026-08-31 (`npm run build &&
npm run lint && npm run test:e2e`). כולל שתי הבדיקות החדשות ו-305 הקיימות.

**חשוב:** בניגוד לרוב הבדיקות בפרויקט הזה, התיקון שהבדיקות האלה שומרות עליו
**כבר אומת מול המצב האמיתי בפרודקשן**, לא רק בתיאוריה — המשתמש תיקן את
השירות החי ידנית (חשבון שירות + ארבעת משתני הסביבה) ודיווח (2026-08-31)
ש-"שלח למורה" עובד בפועל מול Claude אמיתי. הבדיקות כאן מגנות על **הדיפלוי
הבא**, לא על המצב הנוכחי שכבר עובד.
