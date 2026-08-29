# פריסה אוטומטית של השרת — Architecture

## Overview
Workflow חדש ורביעי ב-`.github/workflows/`, שרץ על כל push ל-`main`, מזהה בעצמו
אם `server/` השתנה, ואם כן מזדהה מול גוגל קלאוד ב-Workload Identity Federation
(בלי שום סוד מאוחסן) ומריץ `gcloud run deploy --source server/`. הזיהוי־בעצמו
במקום `paths:` filter הוא מה שמאפשר את שלושת המצבים הגלויים שה-design דורש.

## Affected Files / Components

**חדש:**
- `.github/workflows/deploy-server.yml` — כל הלוגיקה. שם ה-workflow בפנים:
  `Deploy server to Cloud Run`. שם הקובץ נבחר להיות אח של `deploy.yml` הקיים
  ומובחן ממנו במבט אחד ברשימת הקבצים.

**משתנה:**
- `server/README.md` — סעיף חדש, `פריסה אוטומטית — הגדרה חד-פעמית`, ממוקם בין
  "הפריסה הנוכחית" ל"פריסה מחדש ל-Google Cloud Run" (סדר שנקבע ב-design.md).
  מכיל את סקריפט ההקמה. הסעיף הידני הקיים **נשאר כפי שהוא** — דרישת product-spec.

**לא משתנה, במפורש:**
- `.github/workflows/deploy.yml`, `tests.yml`, `version-check.yml` — אף אחד מהם.
  קריטריון קבלה: הפריסה הקיימת של האתר לא משתנה בשום צורה.
- `server/` (הקוד עצמו), `package.json` — הפיצ'ר פורס את מה שקיים, לא משנה אותו.

**אין העלאת גרסה.** `scripts/check-version-bump.mjs` מדלג כשה-diff לא נוגע
ב-`src/`, `public/` או `index.html` (שורות 56-61 שם), וזה בדיוק המקרה כאן.
`developer` **לא** מריץ `npm run bump:feature` בפיצ'ר הזה.

## Data / State Changes

אין state באפליקציה. מה שכן נוצר הוא שני מזהים בצד גוגל קלאוד, ששניהם
**נכתבים ישירות ב-YAML ולא נשמרים כ-secret**:

| ערך | תוכן |
|---|---|
| `WIF_PROVIDER` | `projects/864901299725/locations/global/workloadIdentityPools/github/providers/github` |
| `SERVICE_ACCOUNT` | `github-deployer@learn-math-506923.iam.gserviceaccount.com` |

**למה זה לא סוד, ולמה זה חשוב לפיצ'ר הזה:** שניהם מזהים, לא אישורים. הגישה
ניתנת אך ורק לטוקן OIDC שגוגל מאמת שהגיע מהריפו `eyalzur/learn-math` — מי
שמחזיק במחרוזות האלה בלי טוקן כזה לא יכול לעשות איתן דבר. זו אותה הנמקה בדיוק
שבה נכתבה כתובת השרת ב-`deploy.yml` בטקסט גלוי.

**התוצאה המעשית: אין שום צעד של "הדבק ערך בממשק של GitHub".** design.md זיהה
את הצעד הזה כמסוכן ביותר (היחיד שיוצא מהטרמינל לממשק אחר) וכתב לו כלל כתיבה
ייעודי. הארכיטקטורה פותרת אותו טוב יותר — **מבטלת אותו**. כל ההקמה מתרחשת
בטרמינל אחד. ה-product-spec דורש "כולל מה בדיוק להזין ב-GitHub ואיפה"; התשובה
הכנה היא "כלום, ולכן אין מה להזין", וזה מה שהמסמך יגיד.

## Technical Approach

### הזדהות: Workload Identity Federation, לא מפתח סטטי

**ההכרעה: WIF.** לא בגלל שהוא הפרקטיקה המומלצת, אלא בגלל שהטיעון־שכנגד קורס
בבדיקה. הטיעון היה: מפתח JSON סטטי דורש ~3 פקודות ו-WIF דורש ~6, והמשתמש אינו
מתכנת ונכשל היום שלוש פעמים ברצף — אז פשטות מנצחת.

אבל **הכישלונות של היום לא נבעו ממספר הפקודות.** הם נבעו מ-placeholder שהמשתמש
מילא לא נכון (`learn-math` במקום `learn-math-506923`), ומשני תנאים מוקדמים
שלא היו כתובים בשום מקום. שש פקודות שמודבקות כבלוק אחד עם ערכים אמיתיים הן
**פחות** מועדות לכשל מאשר שלוש פקודות עם placeholder — כי אין בהן מה למלא.
העלות של WIF היא בעיה של תיעוד, ו-design.md כבר חייב את הפתרון שלה.

מה שנשאר אחרי שהעלות מתכווצת הוא ההפרש האמיתי: מפתח JSON סטטי הוא אישור
ארוך־טווח שיושב ב-GitHub לנצח, שדליפתו נותנת גישה עומדת לפרויקט, ושאיש לא
יזכור להחליף. WIF לא מייצר סוד בכלל. הכלל ב-CLAUDE.md ("מפתח לעולם לא בריפו")
נכתב על מפתח Anthropic, אבל הרוח שלו חלה כאן ישירות.

`developer` מממש עם שני ה-actions הרשמיים של גוגל,
`google-github-actions/auth@v2` ואחריו `google-github-actions/setup-gcloud@v2`.
ה-job **חייב** `permissions: id-token: write` — בלעדיו אין טוקן OIDC בכלל
וההזדהות נכשלת בשגיאה שלא מסבירה את עצמה. זו הנקודה שהכי קל לפספס בקובץ הזה.

### שלושת המצבים: זיהוי שינוי בתוך ה-workflow, לא `paths:` filter

`paths:` filter היה הדרך המקובלת, והוא **נפסל במפורש** ב-design: הוא לא מייצר
ריצה כלל, ולכן "לא נפרס" ו"נשבר לפני שהתחיל" נראים זהים — כלום. המנגנון:

1. ה-workflow רץ על **כל** push ל-`main` (בלי `paths:`), וגם על
   `workflow_dispatch`.
2. `actions/checkout@v5` עם `fetch-depth: 0` — הבדיקה משווה שני commits, ושיבוט
   רדוד לא מכיל את הקודם שבהם.
3. צעד `id: changed` מריץ
   `git diff --quiet ${{ github.event.before }} ${{ github.sha }} -- server/`
   וכותב `changed=true/false` ל-`$GITHUB_OUTPUT`.
4. כל שאר הצעדים תלויים ב-`if: steps.changed.outputs.changed == 'true'`.
5. אם `false` — צעד יחיד מדפיס
   `no changes under server/ — nothing to deploy` ל-log **ול-
   `$GITHUB_STEP_SUMMARY`**, והריצה נגמרת ירוקה תוך שניות.

**`$GITHUB_STEP_SUMMARY` ולא רק ה-log:** מה שנכתב לשם מוצג בגוף עמוד הריצה, בלי
לפתוח את הלוג ובלי לגלול בו. עבור משתמש שאינו מתכנת זה ההבדל בין "רואה" לבין
"תיאורטית יכול למצוא". זו תוספת מימוש שמשרתת את כוונת ה-design (שהמצב יהיה
גלוי), לא סטייה ממנה.

**שני מקרים שבהם `github.event.before` לא שמיש**, ובשניהם ההכרעה היא **לפרוס**:
- `workflow_dispatch` — אין `before` בכלל. פריסה ידנית מפורשת היא בדיוק הבקשה
  לפרוס בלי קשר לשינויים; דילוג היה הופך את הכפתור לחסר תועלת.
- push ראשון או force-push — `before` הוא
  `0000000000000000000000000000000000000000`. `git diff` מולו ייכשל.
- הכלל: **בספק, פורסים.** פריסה מיותרת עולה שתי דקות; דילוג שגוי מחזיר בדיוק את
  הבאג שהפיצ'ר בא לפתור (שרת מיושן בלי שאיש ידע).

### הפריסה עצמה

`gcloud run deploy notebook-server --source server/ --region me-west1
--allow-unauthenticated --quiet`. אותה פקודה שהמשתמש הריץ ידנית והצליחה, עם
`--quiet` שמונע שאלות אינטראקטיביות (ב-CI אין מי שיענה `y`, והריצה הייתה
נתקעת עד timeout).

הכתובת נשלפת אחרי הפריסה עם
`gcloud run services describe notebook-server --region me-west1
--format='value(status.url)'` ונכתבת כ-`deployed: <URL>` ל-log ול-step summary.

### בלוק ההכוונה בכשל

צעד אחרון עם `if: failure()` שמדפיס את הטקסט המדויק מ-design.md. `if: failure()`
ולא `always()` — כדי שהוא ירוץ אחרי הפלט של `gcloud`, בסוף, ורק כשיש כשל.
נכתב גם ל-step summary, מאותה סיבה.

### סקריפט ההקמה החד-פעמית (ב-`server/README.md`)

בלוק אחד, מודבק ל-Cloud Shell, ערכים אמיתיים בלבד:

1. `gcloud services enable iamcredentials.googleapis.com` — בלעדיו WIF לא עובד.
2. יצירת service account `github-deployer`.
3. הענקת חמישה roles לאותו SA: `roles/run.admin`,
   `roles/cloudbuild.builds.editor`, `roles/artifactregistry.writer`,
   `roles/storage.admin`, `roles/iam.serviceAccountUser`. (`storage.admin` נדרש
   כי `--source` מעלה את הקוד ל-bucket `run-sources-*` — זה בדיוק המשטח שבו
   נכשלה הפריסה הידנית היום.)
4. יצירת workload identity pool בשם `github`.
5. יצירת OIDC provider בשם `github` בתוך ה-pool, עם
   `--attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository"`
   ו-`--attribute-condition="assertion.repository=='eyalzur/learn-math'"`.
   **התנאי הזה הוא מה שהופך את זה לבטוח** — בלעדיו כל ריפו ב-GitHub כולו יכול
   להתחזות. גוגל גם מסרב ליצור provider בלי attribute condition.
6. `roles/iam.workloadIdentityUser` ל-`principalSet://...
   /attribute.repository/eyalzur/learn-math` על ה-SA.

לכל צעד — מה אמור לחזור, לפי כלל 2 ב-design.md. במסמך גם ייכתב במפורש שהודעת
`already exists` בהרצה חוזרת אינה כשל, כדי שהרצה שנייה אחרי תיקון לא תיראה
שבורה.

## Edge Cases

- **הפריסה רצה לפני שההקמה בוצעה.** יקרה בוודאות: מיזוג ה-PR הזה נוגע רק
  ב-`.github/` ו-`server/README.md`, כלומר `server/` **לא** משתנה, ולכן הריצה
  הראשונה תסתיים ירוקה ב-`nothing to deploy` — היא כלל לא תנסה להזדהות. הכשל
  האדום הראשון יגיע רק במיזוג הבא שנוגע בקוד השרת. אז יופיע בלוק ההכוונה,
  שסיבה 1 בו ("the permission expired or was removed") מכסה גם "מעולם לא הוקם",
  והסעיף שאליו הוא מפנה נפתח במשפט שאומר בדיוק את זה.
- **`server/` השתנה אבל ה-build נשבר.** `gcloud run deploy` נכשל, הריצה אדומה,
  סיבה 3 בבלוק. **Cloud Run ממשיך להגיש את הגרסה הקודמת** — פריסה כושלת לא
  מורידה שירות חי. שווה שיהיה כתוב, כי החשש הטבעי הוא ההפך.
- **שני מיזוגים צמודים.** `concurrency: group: deploy-server` עם
  **`cancel-in-progress: false`** — בניגוד ל-`deploy.yml` שמבטל ריצה קודמת.
  ההבדל מכוון: פרסום ל-Pages הוא העלאת snapshot שלם ואידמפוטנטי, אז ביטול
  קודם בטוח. פריסה ל-Cloud Run היא build ואז החלפת traffic; ביטול באמצע יכול
  להשאיר build תלוי ומצב לא ברור. עדיף להמתין בתור.
- **push ל-`main` שנוגע רק ב-`server/README.md`.** ייחשב כשינוי ב-`server/`
  ויפרוס מחדש בלי צורך. מקובל: לא מזיק, והחלופה (רשימת exclusions) מוסיפה דרך
  חדשה לדלג בטעות על פריסה אמיתית — בדיוק הכשל שאנחנו מונעים.
- **הריצה ירוקה אבל השרת לא באמת עודכן.** לא ייתכן בשקט: `gcloud run deploy`
  מחזיר קוד יציאה שאינו אפס בכל כשל, וזה מכשיל את הצעד.

## Risks / Tradeoffs

- **ריצה על כל push ל-`main`.** הקנס: ריצה של שניות בכל מיזוג, גם כשאין קשר
  לשרת. נקנה במודע תמורת יכולת ההבחנה בין "לא נפרס" ל"נשבר" — ראו design.md.
- **הקמה חד-פעמית שאיני יכול לבצע.** דורשת את חשבון גוגל קלאוד של המשתמש. עד
  שתבוצע, הפיצ'ר קיים בקוד ולא פועל. זה מובנה ב-product-spec ובמסמך, אבל שווה
  לומר בפירוש: **המיזוג של ה-PR הזה אינו "הפיצ'ר עובד"** — הוא "הפיצ'ר מוכן
  ומחכה לצעד של המשתמש".
- **חמישה roles ל-service account אחד.** רחב יותר מהמינימום התיאורטי. הצטמצמות
  אמיתית הייתה דורשת מיפוי הרשאות מדויק לכל שלב ב-`--source`, וכל טעות שם
  מתגלה רק ככשל פריסה עמום. ה-SA מוגבל לפרויקט הזה ונגיש רק לריפו הזה; זו
  הפשרה הנכונה בשלב הזה, ולא הזמנה להרחיב אותה בעתיד.
- **`--allow-unauthenticated` נשמר.** לא החלטה של הפיצ'ר הזה — זה המצב הקיים,
  מנומק ב-`server/README.md`. **אבל:** כשיתווסף endpoint שקורא ל-Claude, פריסה
  אוטומטית תעלה אותו לאוויר בלי צעד ידני שמזכיר את זה. ההגנה מפני שימוש לרעה
  צריכה להיות במקום **לפני** אותו מיזוג, לא אחריו.
- **מה שלא נעשה:** אין rollback אוטומטי, אין בדיקת בריאות אחרי פריסה, ואין
  התראה מעבר לריצה אדומה. הכל Out of Scope מפורש. בדיקת `/health` אחרי פריסה
  היא התוספת הטבעית הבאה אם יתברר שצריך.

## Open Questions
None.
