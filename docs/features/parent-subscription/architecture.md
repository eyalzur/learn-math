# מנוי הורים — Architecture

## Overview
האפליקציה נשארת סטטית ב-GitHub Pages ו-offline-first: הכל נכתב קודם ל-`localStorage`, ושכבת סנכרון ברקע מעלה לענן. הענן: **Firebase** (Auth + Firestore + Cloud Messaging) באותו פרויקט GCP (`learn-math-506923`). תשלום מאחורי ממשק `BillingProvider`, עם מימוש "ניסיון בלבד" בשלבים 1–3.

## Affected Files / Components
חדשים:
- `src/data/pricing.ts` — מקור יחיד: `{ trialDays: 7, firstMonthNis: 10, laterMonthNis: 30, maxParents: 2, maxChildren: 3 }`.
- `src/data/cloud/firebase.ts` — אתחול, טעינה עצלה (לא נכנס לחבילה הראשית של הילד).
- `src/data/cloud/sync.ts` — תור סנכרון: קורא `learn-math:history`, `learn-math:interrupted-session`, `learn-math:users` ומעלה שינויים; לא חוסם.
- `src/data/cloud/household.ts` — יצירת משק בית, חיבור ילד עם קוד, מגבלות 2/3.
- `src/data/cloud/billing.ts` — `BillingProvider` + `TrialOnlyProvider`; ספק אמיתי בשלב 4.
- `src/components/parents/` — `ParentsHome`, `ChildDrawer`, `ScheduleScreen`, `ReminderScreen`, `SubscriptionScreen`, `ConnectionsScreen`, `ConnectChild`.
- `functions/` — Cloud Functions: שליחת תזכורת (FCM), תזמון, הנפקת קוד חיבור, אימות מנוי.
- `firestore.rules` — כללי אבטחה.
- `tests/e2e/parent-*.spec.ts` — עם Firebase emulator.

משתנים: `src/App.tsx` (מסך "הורים" מאחורי שער ההורה), `src/data/lessonAllowance.ts` (מנוי פעיל פותח הכל), `src/components/StudentPicker.tsx` (כפתור), `public/` (service worker להתראות), `playwright.config.ts`.

## Data / State Changes
Firestore (כל מסמך תחת `households/{hid}`):
- `households/{hid}` — `{ createdAt, subscription: { status: trial|active|expired, trialEndsAt, nextBillingAt, provider } }`
- `…/members/{uid}` — `{ role: parent, joinedAt }` (עד 2)
- `…/children/{cid}` — `{ name, gradeId, avatar, deviceTokens[] }` (עד 3)
- `…/children/{cid}/history/{id}` — תרגול בודד (אותו מבנה כמו `progress.ts`)
- `…/children/{cid}/schedule` — `{ days[0-6], time }`
- `…/children/{cid}/inbox/{id}` — תזכורות
- `connectCodes/{code}` — קוד 4 ספרות, תוקף 10 דקות, חד-פעמי.
מקומי: מפתח חדש `learn-math:cloud` = `{ householdId, childId, syncedUntil }`.

## Technical Approach
1. **מקור האמת מקומי.** כל שמירה קיימת ממשיכה כמו היום; `sync.ts` מאזין לשינוי ועושה debounce. כישלון = ניסיון חוזר בהמשך. אף מסך לא `await` לרשת.
2. **הורה:** התחברות Firebase Auth (המלצה: גוגל + קישור במייל). יצירת משק בית ← מסמך + Trial.
3. **ילד:** קוד 4 ספרות מ-Cloud Function; המכשיר מקבל התחברות אנונימית שקשורה ל-`childId`, כך שאין סיסמה לילד.
4. **כללי אבטחה:** הורה קורא ומשנה רק את משק הבית שלו; ילד כותב רק ל-`children/{cid}/history` שלו, ולא קורא כלום של אחרים. מגבלות 2/3 נאכפות בשרת (Function), לא רק ב-UI.
5. **התראות:** הילד נרשם ל-FCM (PWA). Function מתוזמנת שולחת לפי `schedule`. באייפון נדרשת התקנה למסך הבית (כבר יש PWA).
6. **מנוי:** `lessonAllowance` קורא `subscription.status` מקומית (מטמון); בלי רשת — המצב האחרון הידוע. פג = חזרה למכסה החינמית הקיימת.
7. **העלאה ראשונה:** אחרי הסכמת הורה, העלאת ההיסטוריה המקומית כפעולה חד-פעמית, עם סימון `syncedUntil`.

## Staging
| שלב | תוכן | קבצים עיקריים |
|---|---|---|
| 1 | Firebase, כניסת הורה, משק בית, קוד חיבור, סנכרון היסטוריה, ניסיון | `cloud/*`, `pricing.ts`, `firestore.rules`, `ConnectionsScreen` |
| 2 | מסך הורים: בית + מגירת ילד | `components/parents/*` |
| 3 | לוח זמנים + תזכורות + FCM | `functions/`, service worker |
| 4 | תשלום אמיתי, חשבוניות | `billing.ts`, webhook Function |
כל שלב ב-PR משלו; שלב 1 לא משנה שום מסך של הילד.

## Edge Cases
- ילד ללא רשת שבועות: הסנכרון תופס מהמקום האחרון; אין אובדן.
- שני מכשירים לאותו ילד: מזהה תרגול ייחודי (uuid) למניעת כפילות.
- קוד חיבור שפג או נוחש: הגבלת ניסיונות לכל משק בית.
- מחיקת ילד: מחיקת ההיסטוריה בענן (זכות מחיקה).
- ספרות הקוד והמחירים: `direction: ltr` + `unicode-bidi: isolate`.
- הפסקה במנוי באמצע תרגול: לא מפסיקים תרגול שכבר התחיל.

## Risks / Tradeoffs
- **ספק:** Firebase נבחר כי Auth+DB+Push בשירות אחד וקיים כבר פרויקט GCP; Supabase זול ופתוח אבל Push נפרד; Cloud Run לבד = לבנות הכל. חיסרון: נעילה לספק, וחיוב לפי קריאות.
- **פרטיות קטינים:** מידע על ילדים בענן — לבדוק מדיניות פרטיות, הסכמה, אזור שרת (`europe-west`/`me-west1`) ומחיקה לפי חוק הגנת הפרטיות. לא להתחיל שלב 1 בלי זה.
- **תשלום ישראלי:** חשבוניות/מע"מ דורשות ספק מקומי; נבחר רק בשלב 4.
- **iOS Push:** מוגבל ל-PWA מותקן.
- **משקל חבילה:** Firebase נטען עצלות כדי לא להאט את הילד.

## Open Questions
המלצות (לא הוכרעו):
1. ספק תשלום — המלצה: ספק ישראלי (Cardcom/Tranzila) בשלב 4.
2. התחברות — גוגל + קישור במייל.
3. מחיר חודש 2 — 30 ₪ או 10 ₪?
4. מכסה קיימת — נשארת כמדרגה חינמית, מנוי פותח הכל.
5. נתונים קיימים — העלאה בהסכמה.
6. פרטיות/משפטי — חובה לפני שלב 1; האם יש יועץ?
7. פרויקט Firebase — המשתמש צריך ליצור/לאשר חשבון ותשלום (Blaze); Claude לא יוצר חשבונות.
