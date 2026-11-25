# מסכים שמתאימים למסך בלי גלילה — Architecture

## Overview
שינוי CSS+מבנה-DOM מצומצם בשלושה מקומות — לא רה-דיזיין. שני מקרים
(`TopicPicker`, `StudentPicker`) מתוקנים בדחיסת ריווח קיים (padding/gap). מקרה
אחד (`History`) מקבל כותרת-קבועה + אזור-תוכן-גולל-בפנים, בדיוק הדפדוף שכבר
קיים ב-`VersionLog.tsx`. **כל שלושת התיקונים נוסו בפועל** (עריכה זמנית +
מדידת Playwright אמיתית מול שרת-dev, לא רק חשבון על הנייר) לפני כתיבת המסמך
הזה, ואז הוחזרו למצבם המקורי כדי ש-`developer` יישם אותם מהתחלה לפי המספרים
המדויקים כאן.

**הערה תפעולית קריטית לשלב הפיתוח/בדיקות:** הפרויקט רץ עם worktree-ים
מקבילים (סשנים אחרים של Claude יכולים לעבוד על בראנצ'ים אחרים באותו זמן).
`playwright.config.ts` מגדיר `reuseExistingServer: !process.env.CI` — אם יש
כבר שרת-dev אחר שתפס את פורט `5173` (worktree אחר, סשן אחר), הבדיקות שלכם
**ישתמשו בטעות באותו שרת**, וימדדו קוד שאינו הקוד שלכם, בלי שום שגיאה
גלויה. **לפני שסומכים על מדידה — לוודא**: לפתוח `.app-version-number`
בעמוד ולהשוות למספר הגרסה ב-`package.json` של ה-worktree הנוכחי (או כל
סימן מבחין אחר). אם לא תואם — להרים שרת-dev עצמאי על פורט פנוי
(`npm run dev -- --port <אחר> --strictPort`) ולהפנות את הבדיקה אליו דרך
`test.use({ baseURL: "http://localhost:<אחר>" })`, בלי לגעת ב-
`playwright.config.ts` המשותף. זה בדיוק מה שקרה בפועל בשלב הזה (שרת dev
אחר, worktree `feature/ask-before-disabling-autoread`, תפס את `5173` תוך
כדי העבודה) — ה-`qa` בשלב הבא חייב לבדוק את זה בעצמו, לא להניח שה-dev-server
שה-CI/הרצה המקומית מרימים הוא בהכרח שלו.

## Affected Files / Components
- `src/App.css` — שלושה אזורי CSS: `.topic-picker`/`.topic-grid`/`.topic-card`,
  `.student-picker` (כלל חדש, ראו למטה)/`.student-list`/`.student-card`,
  ו-`.history`/`.history-body` (מחלקה חדשה).
- `src/components/History.tsx` — עטיפת ה-JSX הקיים (קבוצת הסטטיסטיקות +
  הרשימה + מצב-ריק) ב-`<div className="history-body">` חדש. שום prop,
  import, או לוגיקה לא משתנים.
- `src/components/TopicPicker.tsx`, `src/components/StudentPicker.tsx` — **לא
  משתנים בכלל.** זה תיקון CSS בלבד; שום JSX לא זז.
- `tests/e2e/*.spec.ts` — נבדק: שום בדיקה קיימת לא מניחה מבנה-DOM מדויק
  שהשינויים האלה שוברים (ראו Edge Cases).

## Data / State Changes
אין. שום state, prop, או טיפוס לא משתנה.

## Technical Approach

### 1. `TopicPicker` — דחיסת ריווח
שלושה כללי CSS קיימים ב-`src/App.css`, ערכים מדויקים:

| כלל | היום | אחרי |
|---|---|---|
| `.topic-picker` padding | `32px 24px` | `18px 24px` |
| `.topic-grid` gap | `14px` | `8px` |
| `.topic-card` padding | `22px 20px` | `10px 20px` |

**אומת בפועל:** כיתה ח׳ (7 נושאים, המקרה הגרוע ביותר) — `scrollHeight` עובר
מ-`798px` (חריגה `134px`) ל-`664px` (`0` חריגה, עם `~115px` שוליים אמיתיים
מתחת לכרטיס האחרון). כיתה א׳/ב׳ (5 נושאים) מקבלת שוליים נדיבים יותר
(`~226px`) מהשוליים הקטנים (`~68px`) שהיו להם קודם — כיוון טוב, לא רע.
אף שינוי לא נוגע ב-font-size, line-height, או תוכן — רק ברווח הלבן סביב
אותו תוכן בדיוק.

### 2. `StudentPicker` — דחיסת ריווח, בכלל CSS **נפרד** מ-`.grade-home`
הכלל הקיים `.student-picker, .grade-home { padding: 32px 24px; }` משותף
בין `StudentPicker` ל-`StylePicker`/`LevelPicker` (`.grade-home`) — **אסור**
לשנות אותו ישירות, כי זה ישנה גם את שני המסכים שכבר תקינים (design.md אסר
את זה במפורש). הפתרון: כלל **חדש ונפרד** אחרי הכלל הקיים, שעוקף אותו רק
ל-`.student-picker` (אותה סלקטיביות, מנצח לפי סדר ב-cascade):

```css
.student-picker,
.grade-home {
  padding: 32px 24px;
}

.student-picker {
  padding: 10px 24px;
}
```

ושני כללים נוספים:

| כלל | היום | אחרי |
|---|---|---|
| `.student-list` gap | `14px` | `6px` |
| `.student-card` padding | `20px 24px` | `6px 24px` |

**אומת בפועל:** 3 תלמידים (המצב האמיתי) — שוליים גדולים (`~217px`, לעומת
`~58px` לפני השינוי — גם כאן, רק טוב יותר). 4 תלמידים — מתאים (`0` חריגה).
**5 תלמידים — מתאים בדיוק (`0` חריגה, בלי שוליים).** מעבר ל-5 — לא נבדק
ולא נתמך (ראו Risks).

**זה המקסימום הסביר בלי שינוי-מבנה.** ניסיתי לדחוס עוד (padding/gap
קטנים אפילו יותר) כדי להגיע ל-6 תלמידים בלי חריגה — זה בלתי אפשרי בלי
לרדת ל-padding כמעט אפסי על כרטיס עם 3 שורות טקסט (באדג׳, שם, כיתה),
שכבר פוגע בנוחות המגע. 5 תלמידים עם `0` שוליים הוא ה"תקרה" הממשית של
הגישה הזו — ראו Risks/Tradeoffs.

### 3. `History` — כותרת קבועה + אזור-גלילה-פנימי חסום
מעתיקים את התבנית הקיימת של `VersionLog.tsx` (`.version-log-dialog`
fixed-header + `.version-log-scroll` גולל בפנים) למסך `History`, שאינו
דיאלוג אבל יכול לקבל את אותה טכניקה בדיוק: גובה חסום + `flex-column` +
ילד-גולל עם `flex:1`.

**`src/App.css`, הכלל הקיים `.history` מתעבה:**
```css
.history {
  padding: 32px 24px; /* ללא שינוי */
  height: 100svh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-body {
  flex: 1;
  min-height: 0; /* בלעדיו flex child מסרב להתכווץ מתחת לגובה-התוכן הטבעי
                    שלו, ו-overflow-y:auto לעיל לא היה "נדלק" בכלל — אותה
                    הערה קיימת כבר ב-App.css ל-.version-log-scroll */
  overflow-y: auto;
  overscroll-behavior: contain; /* לא "לדלוף" גלילה למסך שמתחת, כמו
                                    .version-log-scroll */
}
```

**`src/components/History.tsx`:** עוטפים את הבלוק הקיים (מצב-ריק, או
`.history-stats-group`+`.history-list`) ב-`<div className="history-body">`.
הכותרת (`.grade-header`, `<h1>`, ורשימת `.stuck-topics` אם קיימת) נשארת
**מחוץ** לעטיפה הזו — ללא שינוי, ללא מחלקה נוספת, פשוט לפני ה-`<div
className="history-body">` החדש ב-JSX, ונשארת קבועה/גלויה תמיד כחלק
מה-flex-column שאינו גולל.

**אומת בפועל (25 רשומות מוזרקות):**
- `document.documentElement.scrollHeight` = `664` = viewport. **העמוד כולו
  לא גולל.**
- `.history-body` עצמו: `scrollHeight=2985`, `clientHeight=494` — התוכן
  האמיתי גדול בהרבה מהאזור המוקצה לו, וגולל **בפנים**, בדיוק כמתוכנן.
- גלילה בפועל של `.history-body` (`scrollBy(0, 500)`) — ה-`.grade-header`
  נשאר **באותו bounding rect בדיוק** (`top`,`bottom` לא זזים), ו-
  `window.scrollY` נשאר `0`. הכותרת לא זזה, לא משנה כמה גוללים בפנים.
- מצב ריק (`records.length === 0`): ללא שינוי, `0` חריגה כקודם — העטיפה
  החדשה לא משנה שום דבר כשאין הרבה תוכן.

## Edge Cases
- **"נושאים תקועים" (`.stuck-topics`) מוצג תנאי, מעל ה-body.** כשהוא מופיע
  הוא פשוט תופס עוד שטח בחלק הקבוע (הלא-גולל), ו-`.history-body` מקבל אוטומטית
  פחות שטח (`flex:1` מחשב את מה שנשאר) — **שום קוד נוסף לא נדרש**, זה
  ההתנהגות הנכונה מאליה של flexbox. אומת: אין תלות בכמה פריטי `.stuck-topics`
  יש.
- **בדיקות e2e קיימות שבודקות `History`** (`topics-and-progress.spec.ts`,
  `struggle-diagnosis.spec.ts`, `review-status.spec.ts`) בודקות רק קלאסים
  (`.history h1`, `.history-empty`, `.history-row`, `.stuck-topic-card`) —
  לא יחס-הורה-ישיר. העטיפה החדשה מוסיפה רמת-קינון אחת, לא משנה אף קלאס
  קיים ולא מוחקת אף אחד — נבדק שאין אף `.history >` combinator בקוד או
  בבדיקות. **לא אמורה להישבר בדיקה קיימת.**
- **`.student-picker`/`.grade-home` היו כלל משותף אחד.** הפתרון (כלל נפרד
  שמנצח ב-cascade) תלוי בכך ש-`developer` ישמור את הכלל החדש **אחרי** הכלל
  המשותף הקיים ב-`App.css` (סדר-מקור קובע בין שני selectors בעלי
  specificity שווה). אם מישהו יזיז את זה בעתיד לפני הכלל המשותף, ה-override
  מתבטל בשקט (לא שגיאת build) — שווה הערת-קוד במקום (`developer` יכתוב
  אותה).
- **אנימציית `idle-breathe`/`playful-pop-in` על כרטיסים משפיעה על
  `getBoundingClientRect` אבל לא על `offsetHeight`/שטף הלייאאוט.** כל
  המדידות כאן (וכל מדידה עתידית ב-`qa`) חייבות למדוד אחרי שהאנימציה
  מתאזנת (`waitForTimeout` קצר, או להשתמש ב-`offsetHeight` ללייאאוט
  ו-`document.documentElement.scrollHeight`/`window.innerHeight` לעמוד
  כולו — שניהם לא מושפעים מ-transform חזותי).
- **`min-height: 100svh` על `#root`** (ב-`src/index.css`) הוא **רצפה**, לא
  תקרה — אם תוכן טבעי עולה על גובה-viewport, המסך גדל ואמיתי ולא "נדבק"
  לגובה ה-viewport. זה מה שמאפשר למדידה (`scrollHeight`) לשקף נאמנה אם יש
  חריגה אמיתית. `History` לבדו מקבל `height:100svh` **קבוע** (לא
  `min-height`) כדי להפוך את ה"רצפה" ל"תקרה" — בלעדי זה, ה-flex-column
  הפנימי לא היה יכול לדעת כמה שטח "לחלק" ל-`flex:1`.

## Risks / Tradeoffs
- **`StudentPicker` מתאים בדיוק עד 5 תלמידים, לא יותר.** נוסה במפורש (ראו
  Technical Approach #2): דחיסה נוספת מעבר לערכים שנבחרו דורשת padding
  כמעט-אפסי שפוגע בנוחות המגע על כרטיס עם 3 שורות טקסט. אם המשפחה תוסיף
  תלמיד/ה שישי/ת בעתיד, המסך יחרוג שוב — זה מתועד כ-Out of Scope
  ב-design.md ("צמיחה בלתי-מוגבלת של תלמידים"), לא נס תר כאן.
- **`History`'s `height: 100svh` + `overflow: hidden` הוא שינוי-מבנה
  אמיתי, לא רק דחיסת ריווח** (שלא כמו שני התיקונים האחרים). זה הסיכון
  הטכני הגדול ביותר בפיצ'ר הזה — אם יש הנחה סמויה במקום אחר בקוד
  שה-`.history` div גדל חופשי (לדוגמה, בדיקת `scrollIntoView` עתידית, או
  מדידת-גובה אחרת שמסתמכת על `.history` עצמו "מלא"), היא תישבר. נבדק: שום
  בדיקה/קוד קיים לא תלוי בזה היום.
- **5 תלמידים בדיוק `0` שוליים** — זה גבול דק, בדיוק כמו שהיה ל-7 נושאים
  לפני התיקון. תוספת עתידית קטנה (שם ארוך שנשבר לשתי שורות, באדג׳ גדול
  יותר) יכולה לשבור את זה מחדש בלי התראה. לא נוסף כאן buffer נוסף כי
  "4 תלמידים עם שוליים אמיתיים, 5 בדיוק" הוא פשרה מכוונת — לדחוס עוד היה
  פוגע בנוחות-המגע לכל הטווח, לא רק לקצה.
- **לא נבנה פתרון ל"יותר מ-5 תלמידים" או "יותר מ-7 נושאים".** זו החלטה
  מכוונת, לא פער — ראו Out of Scope ב-design.md. אם זה יקרה בפועל, הפתרון
  הנכון הוא אותה טכניקה מ-`History` (אזור-גלילה-פנימי חסום), לא דחיסה נוספת.

## Open Questions
None.
