# פתיחת שאלה במסך מלא כברירת מחדל — Architecture

## Overview
שינוי של שני ערכי `useState` ראשוניים ב-`Practice.tsx`, מ-`false` ל-`true`.
שום רכיב, prop, או מסך חדש.

## Affected Files / Components
- **`src/components/Practice.tsx`** — שתי השורות:
  ```ts
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenWanted, setFullscreenWanted] = useState(false);
  ```
  הופכות ל-`useState(true)` בשתיהן.

## Data / State Changes
אין. `fullscreen`/`fullscreenWanted` כבר קיימים; רק הערך ההתחלתי שלהם משתנה.
שום `localStorage`/`props` חדשים — זו לא הגדרה פר-תלמיד/ה (ראו Out of Scope
ב-product-spec.md).

## Technical Approach
`Practice` אף פעם לא מקבל `key` משתנה (ראו ההערה ב-`App.tsx` ליד `settingsOpen`
— "Neither `<TopicPicker>` ולא `<Practice>` below is ever given a changing
`key`") — הוא ממורכב/ מפורק מהעץ כש-`screen.name !== "practice"` ומורכב מחדש
כשחוזרים ל-practice, כי הרינדור ב-`App.tsx` הוא `if (screen.name ===
"practice") return <Practice .../>` ולא רינדור מותנה-תצוגה (conditional
display) בתוך עץ קבוע. המשמעות: `useState(true)` מתאפס מחדש בכל כניסה חדשה
לתרגול (יציאה לרשימת נושאים וחזרה, בחירת נושא/רמה אחרים) — בדיוק ההגדרה של
"פתיחת שאלה" ב-product-spec.md — אבל **לא** מתאפס בין שאלה לשאלה *בתוך* אותו
תרגול, כי שם זו אותה instance ושאלה הבאה (`next()`) כבר שומרת על
`fullscreenWanted` הקיים בכוונה (ראו הציטוט למטה) — בדיוק ההתנהגות הקיימת
ש-Acceptance Criteria מצפה שלא תשתנה.

`next()` כבר מריץ `setFullscreen(fullscreenWanted)` בכל מעבר שאלה — זה הקוד
שאחראי ל"מסך מלא נשאר לשאלה הבאה" (`docs/features/notebook-toolbar-actions/`).
שינוי הערך ההתחלתי בלבד לא פוגע במנגנון הזה: ברגע שהתלמיד/ה יוצא/ת ממסך מלא
באמצע תרגול (✕), `fullscreenWanted` יורד ל-`false` כרגיל, ו-`next()` ימשיך
לכבד את זה לשאלות הבאות באותו תרגול.

## Edge Cases
- **יציאה זמנית קיימת (טופס תיקון, תוצאה סופית וכו׳):** לא נוגעים בלוגיקה
  שמורידה את `fullscreen` זמנית (effects קיימים) — רק בערך שממנו היא מתחילה.
- **מעבר ישיר בין שני תרגולים בלי לעבור דרך רשימת הנושאים** (אם קיים נתיב
  כזה): כל עוד זה גורם ל-`Practice` להתרכב מחדש (unmount+mount, לא רק שינוי
  `lesson` prop על אותו instance), ה-`useState(true)` מתאפס כצפוי. אם יתגלה
  נתיב שמחליף `lesson` בלי unmount (`setScreen` לאותו `screen.name ===
  "practice"` עם `lesson` חדש על instance קיים), מסך מלא לא יתאפס אוטומטית —
  אין כזה נתיב היום (`finish`/`onFinish`/`enterTopic` כולם עוברים דרך שינוי
  `screen.name`), ולכן לא טופל כאן.

## Risks / Tradeoffs
- **בלי הגדרה אישית.** נבחר בכוונה ב-product-spec.md (Out of Scope) — שינוי
  ברירת מחדל גורף, לא מתג חדש בדיאלוג ⚙️. אם יתברר שמישהו מהשלושה מעדיף את
  ההתנהגות הישנה, זה דורש פיצ'ר המשך (הגדרה פר-תלמיד/ה), לא כלול כאן.

## Open Questions
None.

## Implementation Notes
השינוי המקורי בוצע בדיוק כפי שתוכנן — שני `useState(false)` ב-
`src/components/Practice.tsx` הפכו ל-`useState(true)`. אבל QA (ריצת הסוויטה
המלאה) חשף שני דברים נוספים שלא היו ב-architecture.md המקורי:

**1. באג אמיתי בקוד — פינה שהחזרה ממסך מלא יכולה להשאיר את דף המחברת
מחוץ לתחום הנראה, בלתי-נגיש.** מצב `prevFullscreen` ב-`PracticeNotebook.tsx`
עושה `applyTransform()` בלבד כשעוברים מסך-מלא↔רגיל, בכוונה (לא מחשב panX
מחדש, כדי לא "לקפוץ" את מיקום התלמיד/ה — `docs/features/notebook-usability-fixes/`,
"סבב רוויזיה א׳"). זה היה בטוח כל עוד הכניסה הראשונה לתרגול תמיד הייתה
ב-stage המוטבע (הקטן), כך ש-`anchorPanX` תמיד חושב קודם מול הרוחב האמיתי.
עכשיו, כשתרגול חדש **נפתח כבר** במסך מלא, `anchorPanX` במאונט הראשוני
מחושב מול הרוחב הרחב של מסך מלא — ואם התלמיד/ה יוצא/ת ממסך מלא **לפני**
כל שינוי עמוד (שהיה מפעיל חישוב מחדש), ה-panX הזה נשאר תקף רק לרוחב הישן,
ואילו ה-stage כבר הצטמצם. לדף שנפתח מעוגן-ימינה (שאלה בעברית, כמו
"צורות וגופים"), זה מזיז את העמוד כולו מחוץ לאזור הנראה של ה-stage המוטבע —
בלתי נגיש בלי זום-אאוט ידני. אומת חי בדפדפן (לא רק ב-Playwright).

**התיקון:** ב-`PracticeNotebook.tsx`, אפקט ה-`prevFullscreen` מפעיל עכשיו
`clampPan` מול מידות ה-stage **החדש** לפני `applyTransform()`, במקום רק
`applyTransform()`. `clampPan` רק מושך פנימה panX שכבר יצא מהתחום — לא
"קופץ" למיקום אחר כשה-pan כבר בתחום התקף לגודל החדש, ולכן לא פוגע בעיקרון
"בלי קפיצה" של הגלגול האמצעי — רק מתקן את המקרה שבאמת יצא מהתחום.

**2. ריפוד רחב בסוויטת ה-e2e.** עשרות בדיקות קיימות הניחו שתרגול נפתח
במצב רגיל (לא מסך מלא) — כפתור חזרה, כפתור רמז, `.progress` וכו' כולם
חיים בכותרת הרגילה שמוסתרת במסך מלא. 29 קבצי בדיקה תוקנו (לא נגעו ב-`src/`
מעבר לתיקון שלמעלה): בכל מקום שבדיקה צריכה לקיים אלמנט שמוסתר במסך מלא,
נוסף קליק יציאה (`.notebook-fullscreen-exit`) באותה נקודה שבה תלמיד/ה
אמיתי/ת היה/הייתה צריך/ה לעשות את זה. בדיקות שכבר בדקו מסך מלא במפורש
(ונהגו ללחוץ "⤢" כדי להיכנס אליו) פשוט איבדו את אותה לחיצה המיותרת, עם
הערה שמסבירה שזו כבר ברירת המחדל.

**גילוי נלווה:** `grade8-angles-congruence.spec.ts` › "covers angle
questions..." נכשל גם על `main` נקי (אומת ב-worktree נפרד) — כשל
סטטיסטי/תוכן קיים-מראש, לא קשור לפיצ'ר הזה כלל. לא טופל כאן (מחוץ ל-scope),
מתועד ב-tests.md.

`npm run bump:feature` → `1.42.0 → 1.43.0`. `npm run build` ו-`npm run lint`
נקיים.
