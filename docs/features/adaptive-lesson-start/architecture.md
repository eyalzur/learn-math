# תרגול אדפטיבי מתחיל לפי היסטוריה, לא מאפס בכל פעם — Architecture

## Overview
נוסף מאגר localStorage חדש ונפרד מ-`progress.ts`, ששומר רמת-קושי אחת לכל צירוף
(תלמיד/ה, כיתה, נושא). נקודת-הכניסה היחידה שמשתנה היא `App.tsx`'s `freshAdaptiveSession`
— מקבלת רמת-פתיחה שמחושבת מהמאגר החדש (או `initialDifficulty` כברירת מחדל) במקום לקבע
אותה תמיד. הכתיבה למאגר קורית **אחרי כל תשובה**, לא רק בסיום/יציאה — זה מכסה את שני
המקרים (סיום מלא, יציאה מוקדמת) בלי שני נתיבי-קוד נפרדים.

## Affected Files / Components
- **`src/data/adaptiveProgress.ts`** (חדש) — מאגר ה-tier השמור: `localStorage`, מפתח
  נפרד (`learn-math:adaptive-tier`), אותו דפוס try/catch מגונן בדיוק כמו `progress.ts`.
  שתי פונקציות: `loadAdaptiveTier(studentId, gradeId, topicId): number | null` ו-
  `saveAdaptiveTier(studentId, gradeId, topicId, difficulty: number): void`.
- **`src/App.tsx`**:
  - `freshAdaptiveSession(topic, startingDifficulty)` — מקבל פרמטר נוסף במקום להניח
    תמיד `adaptive.initialDifficulty`; משתמש בו לבניית `questions` ול-`difficulty`
    הראשוני.
  - `enterTopic(topic)` — לפני קריאה ל-`freshAdaptiveSession`, קורא
    `loadAdaptiveTier(student.id, gradeId, topic.id)`; אם יש ערך, **קולאמפ** אותו לטווח
    `[adaptive.minDifficulty, adaptive.maxDifficulty]` הנוכחי של הנושא (ראו Edge Cases)
    ומעביר אותו; אם אין (`null`), מעביר את `adaptive.initialDifficulty` כמו היום.
  - `handleAdaptiveAnswered(topic, correct)` — מחשב את `difficulty` החדש (אותו חישוב
    שכבר קיים, `adaptive.nextDifficulty(...)`) **פעם אחת**, לפני העדכון של
    `adaptiveSession`; מעביר את הערך הזה גם ל-`setAdaptiveSession` (כמו היום) וגם
    לקריאה חדשה ל-`saveAdaptiveTier(student.id, gradeId, topic.id, difficulty)` — באותו
    מקום, לא בתוך ה-updater של `setAdaptiveSession` עצמו (כתיבה-לצד חוץ מ-state updater
    היא פרקטיקה נכונה יותר כאן, כדי לא להסתכן בקריאה כפולה אם ה-updater ירוץ יותר מפעם
    אחת).
- **לא נוגעים:** `src/data/progress.ts` (מאגר נפרד, לא קשור), `src/data/curriculum.ts`
  (אין שינוי טיפוסים — `AdaptiveConfig`/`Topic` נשארים כמו שהם), כל קובצי
  `src/data/adaptive*.ts` (ה-`generate`/`nextDifficulty` עצמם לא משתנים), `Practice.tsx`
  (אין prop חדש, אין שינוי UI — ראו design.md).

## Data / State Changes
- **מאגר חדש:** `Record<string, number>` תחת מפתח `learn-math:adaptive-tier` ב-
  `localStorage`. מפתח כל רשומה הוא `` `${studentId}:${gradeId}:${topicId}` `` — צירוף
  משולש, לא רק `topicId`: בדקתי בקוד (`curriculum.ts`) שמזהי-נושא (`numbers`, `add10`,
  `percent`, וכו') הם ייחודיים **היום** בלבד בתוך כל קובץ-כיתה בנפרד, לא namespaced
  בפועל — אין שום דבר שמבטיח שזה יישאר כך (נושא עתידי בכיתה חדשה יכול בהחלט לבחור מזהה
  שכבר קיים בכיתה אחרת), ו-`Student` יכול "לתרגל בכל כיתה" (הערה קיימת בטיפוס). כולל
  `gradeId` עולה כמעט בחינם ומונע התנגשות עתידית — אותו עיקרון שכבר נבחר ב-
  `rememberMenuPosition` (`{ gradeId, topic: { id: topic.id, kind } }`).
- **אין שינוי** ל-`PracticeRecord`/`progress.ts` — אלו שני מאגרים נפרדים ולא תלויים זה
  בזה. רשומות ישנות לא נקראות, לא נכתבות, לא מתורגמות.
- **אין שינוי טיפוסים** ב-`curriculum.ts` — `AdaptiveConfig`/`Topic` נשארים זהים.

## Technical Approach
1. **קריאה (תחילת תרגול):** `enterTopic` קורא ל-`loadAdaptiveTier` לפני בניית הסשן.
   ערך `null` (אין רשומה — ביקור ראשון, או היסטוריה-ישנה-מלפני-הפיצ'ר) → משתמשים ב-
   `adaptive.initialDifficulty`, בדיוק כמו היום. ערך קיים → **קולאמפ** ל-
   `[minDifficulty, maxDifficulty]` הנוכחיים (ראו Edge Cases, "תוכן שהשתנה") ומשתמשים
   בו כרמת-הפתיחה.
2. **כתיבה (כל תשובה):** `handleAdaptiveAnswered` כבר מחשב `difficulty` חדש בכל תשובה
   (`adaptive.nextDifficulty(...)`) — זה לא משתנה. התוספת: אחרי החישוב, לפני/לצד
   העדכון הקיים של ה-state, קריאה אחת ל-`saveAdaptiveTier` עם הערך החדש. **אין** כתיבה
   נפרדת ב-`finish()` או ב-`onExit`: מכיוון שכל תשובה כבר כותבת, הרמה-האחרונה-שנשמרה
   היא **תמיד** הרמה שהייתה פעילה כש"סיימו או עזבו" — בלי צורך בשני נתיבי-קוד נפרדים
   שצריך לזכור לסנכרן. אם התלמיד/ה עזב/ה **בלי לענות אפילו שאלה אחת**, שום דבר לא נכתב
   ושום דבר לא משתנה — הערך השמור הקודם (אם יש) נשאר תקף, וזה נכון: שום "רמה חדשה" לא
   הושגה בביקור הזה.
3. **קולאמפ, לא אמון עיוור בערך שמור:** `loadAdaptiveTier`'s ערך מוגבל ל-
   `[minDifficulty, maxDifficulty]` **של הקריאה הנוכחית** ל-`enterTopic`, לא נשמר
   כפי-שהוא. זה מגן על מקרה שבו טווח הקושי של נושא משתנה בין גרסאות (tech-lead/developer
   עתידי שמכוונן את `minDifficulty`/`maxDifficulty`) — ערך שמור שכבר לא בטווח לא יקרוס
   ולא "יתקע" מעבר לקצה החדש.

## Edge Cases
- **ביקור ראשון (אין רשומה שמורה):** `loadAdaptiveTier` מחזיר `null` → `initialDifficulty`,
  בדיוק כמו היום. לא שונה.
- **היסטוריה ישנה מלפני הפיצ'ר:** `PracticeRecord`s ישנים לא נקראים בכלל על ידי המנגנון
  הזה (מאגר נפרד) — מתנהג זהה ל"אין היסטוריה" מבחינת רמת-הפתיחה, בהתאם לקריטריון הקבלה
  המפורש בספק.
- **תוכן שהשתנה (`minDifficulty`/`maxDifficulty` זזו בין גרסאות):** קולאמפ בקריאה (סעיף
  3 למעלה) מונע ערך-מחוץ-לטווח.
- **יציאה בלי לענות שאלה:** שום כתיבה לא קורית, הערך הקודם (אם קיים) נשאר. ראו סעיף 2.
- **כמה דפדפנים/מכשירים לאותו תלמיד/ה:** `localStorage` הוא per-browser — **מגבלה קיימת
  כבר היום** לכל `progress.ts`/`preferences.ts` (היסטוריה, הגדרות קול/זום/ניווט) — לא
  מגבלה חדשה שהפיצ'ר הזה מוסיף, ולכן לא טופלה כאן בנפרד.
- **`localStorage` חסום/לא זמין (מצב פרטי וכו׳):** אותו דפוס try/catch-ו-החזר-ריק
  שכבר קיים ב-`progress.ts`'s `readAll()` — קריאה כושלת מתנהגת כ"אין רשומה שמורה"
  (נופל בחזרה ל-`initialDifficulty`), כתיבה כושלת נבלעת בשקט. אין קריסה, אין שגיאה
  גלויה לתלמיד/ה.

## Risks / Tradeoffs
- **כתיבה בכל תשובה, לא רק בסיום** — חריגה קלה מהמינימום שdesign.md ציין ("בסיום או
  ביציאה"), בכוונה: זה פשוט יותר (נתיב-קוד אחד, לא שניים שצריך לזכור לסנכרן) ועמיד יותר
  (מכסה גם רענון-דף-אגרסיבי/קריסת-דפדפן שלא עובר דרך `onExit`/`finish` בכלל). העלות:
  כתיבת `localStorage` נוספת בכל תשובה, לא רק בסוף תרגול — תקציב-זמן-ריצה זניח (אותו
  payload-גודל כמו שאר ההגדרות הקיימות שנכתבות באותה תדירות-אירוע, למשל הקראה/זום).
- **מפתח משולש (`studentId:gradeId:topicId`) מגן מפני התנגשות שלא קיימת היום** — עלות-
  אפס בפועל (המפתחות הקיימים כבר ייחודיים), ביטוח זול מול נושא עתידי שישתמש במזהה שכבר
  תפוס בכיתה אחרת.
- **"רמה 3" יכולה לשנות משמעות בין גרסאות** אם tech-lead עתידי משנה את מבנה-הרמות של
  נושא (למשל, מוסיף/מוריד tier) — קולאמפ-לטווח מונע קריסה/חריגה, אבל לא מבטיח ש"רמה 3
  הישנה" שווה-ערך תחושתית ל"רמה 3 החדשה". זה סיכון מוכר ומתועד, לא נפתר כאן — דומה
  לאופן שבו שינוי תוכן נושא תמיד יכול לשנות את התחושה שלו, גם בלי הפיצ'ר הזה.

## Open Questions
None.

## Implementation Notes
מומש כמתוכנן, בלי סטיות אמיתיות.

- `src/data/adaptiveProgress.ts` (חדש) — `loadAdaptiveTier`/`saveAdaptiveTier`, אותו
  דפוס try/catch מגונן בדיוק כמו `progress.ts`'s `readAll()`.
- `src/App.tsx`: `freshAdaptiveSession` מקבל `startingDifficulty` כפרמטר שני.
  `enterTopic` טוען וקולאמפ את הערך השמור (אם קיים) לפני בניית הסשן. `handleAdaptiveAnswered`
  חושב את `difficulty` החדש **פעם אחת**, קורא ל-`saveAdaptiveTier` עם הערך, ואז מזין את
  אותו ערך ל-`setAdaptiveSession` — לא קורא ל-storage מתוך ה-updater עצמו. שינתה גם את
  ה-signature של הפונקציה: במקום לקרוא ל-`adaptiveSession.streak`/`.difficulty` מתוך
  ה-`prev` של ה-updater, הם נקראים ישירות מה-closure החיצוני (יש רק תשובה אחת בכל פעם,
  אותה הנחה ש-`Practice.tsx`'s תגובה הקיימת כבר מניחה).
- **תיקון קומנטרי קיים:** `finish()` נשא הערה שגויה-כעת ("No difficulty carries between
  visits") שנותרה מלפני הפיצ'ר הזה — תוקנה כדי לא להטעות קורא עתידי.
- `build`/`lint` נקיים. גרסה `1.41.0 → 1.42.0`.

**אימות ידני** (סקריפט Playwright זמני מול שרת-dev אמיתי, לא מוקאפ-בלבד לבדיקה הזו —
רק `/read-page` ממוקק, אותו דפוס כמו ה-e2e tests הקיימים): מיקה, כיתה ב׳, `חיבור עד
1000`.
1. ביקור ראשון: שאלה ראשונה היא `80 + 10` — בלי מעבר-עשרה, רמה קלה. תקין, בלי שינוי.
2. תשובות נכונות ברצף (10): הרמה השמורה (`localStorage['learn-math:adaptive-tier']`)
   עולה בפועל ל-`{ "mika:2:add100": 8 }`.
3. יציאה ב"← חזרה" (לא סיום מלא) וכניסה חזרה לאותו נושא: השאלה הראשונה היא `745 + 88`
   (מעבר-עשרה ברור) — **לא** `80-ish` כמו ביקור ראשון. הרמה השמורה לא השתנתה רק מכניסה
   חוזרת (נשארת `8` עד שתשובה חדשה נענית).
4. כניסה לנושא **אחר** (`חיסור עד 1000`) לאותה תלמידה: שאלה ראשונה `20 − 10` — רמה קלה
   עצמאית, לא "קפצה" מהרמה-8 של `add100`. ה-storage הסופי מאשר: מפתח אחד בלבד
   (`mika:2:add100`), אין ערך ל-`sub100` עד שתענה בו שאלה בפועל.

כל ארבעת הבדיקות עברו.
