# פאד הניווט במחברת: לצד שמאל, כבוי כברירת מחדל, ונגיש מהדף עצמו — Tests

## Coverage

מיפוי בין קריטריוני הקבלה ב-`product-spec.md` לבדיקות ב-
`tests/e2e/notebook-nav-buttons-visibility.spec.ts`:

### ברירת מחדל וכיבוי/הדלקה
- "לא מופיע ולא נגיש בשום צורה" → `the nav pad is absent by default — not
  just hidden, not reachable at all`
- "כיבוי הפאד לא מבטל אף יכולת אחרת" → `other ways to move the view keep
  working while the pad is off`
- "הגדרה נפרדת ממהירות הניווט" → `the settings dialog offers a separate
  nav-pad-visible toggle, off by default, alongside the existing pan-speed
  setting`
- "נכנס לתוקף מיד" → `turning the toggle on takes effect immediately and
  leaves the dialog open`
- "נפרד משאר ההגדרות" (ללא השפעה הדדית) → `toggling the pan-speed setting
  does not change the nav-pad-visible toggle, and vice versa`
- "נשמר בין סשנים, נפרד לכל תלמיד/ה" → `the choice survives a reload and
  belongs to one student`, `each student keeps their own nav-pad-visible
  choice`

### מיקום
- "יושב בצד שמאל... גם רגיל וגם מסך-מלא" → `turning the pad on makes it
  appear, positioned on the left side of the writing area`, `the pad's
  position holds in fullscreen too`

### גישה להגדרות מתוך מסך התרגול
- "דרך לפתוח ⚙️ מתוך מסך התרגול, מוטמע וגם מסך-מלא" → `a settings button
  exists on the practice screen itself, embedded and in fullscreen`
- "אותו דיאלוג בדיוק" → `opening settings from the practice screen shows
  the exact same dialog — every other setting too`
- "מה שכתוב בדף לא נפגע" → `opening and closing settings from the practice
  screen does not lose what was drawn`
- "הדלקה מתוך נקודת הכניסה החדשה גם עובדת" → `turning the pad on from the
  practice screen's own settings button makes it appear after closing`

## Collateral fixes to pre-existing tests

שינוי ברירת המחדל (פאד כבוי) ו-`aria-label` משותף ("הגדרות") לשני כפתורים
שונים שברו הנחות בכמה קבצי בדיקה ישנים — לא שינוי בהתנהגות שלהם, רק
עדכון ה-setup כדי שימשיך לשקף את המציאות החדשה:

- `tests/e2e/notebook-nav-buttons.spec.ts` — `openLevel()` עכשיו מדליק
  את הפאד לפני כניסה לתרגול (כל הקובץ עוסק בפאד עצמו).
- `tests/e2e/notebook-nav-settings.spec.ts` — נוסף `turnOnNavPad()` לפני
  הבדיקות שבאמת לוחצות על כפתורי כיוון; תוקן סלקטור דו-משמעי
  (`.read-aloud-setting` תפס גם את הבלוק החדש).
- `tests/e2e/notebook-toolbar-redesign.spec.ts` — אותו `turnOnNavPad()`
  לפני הבדיקות שנוגעות בפאד.
- `tests/e2e/notebook-auto-scroll.spec.ts`,
  `tests/e2e/notebook-hold-to-zoom.spec.ts` — רק תוקן `backToTopics()`
  (ראה למטה), ברירת-המחדל-כבויה לא נגעה בתוכן הבדיקות עצמן בקבצים האלה.
- **`backToTopics()` בכל חמשת הקבצים הנ"ל** — האות ליציאה ממסך התרגול
  חזרה לרשימת הנושאים עבר מ"קיים כפתור בשם הגדרות" (שכבר לא ייחודי למסך
  הנושאים, כי יש עכשיו כפתור שני באותו שם בתוך מסך התרגול) ל-`.topic-grid`
  (מחלקה שקיימת רק במסך הנושאים).

## Geometry fix during this phase

הקצאת הפאד ל-`inset-inline-end` (צד שמאל) יצרה חפיפה אמיתית עם עמודת הזום
על ה-stage המוטמע הקצר (~190px בתצוגת הבדיקה הסטנדרטית) — שתיהן עוגנו
בפינות שונות של אותו צד הפיזי, אבל עמודת הזום (עד 240px) חרגה על פני כל
גובה ה-stage ונחתה בדיוק על הפאד. תוקן ב-`src/App.css` ע"י העברת הפאד
לעגינה עליונה, לצד עמודת הזום (לא מתחתיה) — אותו עיקרון "לצד, לא ערימה"
שכבר שימש לתיקון זהה עבור `.notebook-tool-controls` ב-PR #80. ראה ההערה
המעודכנת ב-`design.md`. אומת ישירות (לא רק הסקת-CSS) מול שרת פיתוח חי:
מדידת `boundingBox()` של שני האלמנטים (אין חפיפה, גם מוטמע וגם מסך-מלא)
ו-`document.elementFromPoint()` על מרכז כל כפתור זום ("הקטן") ופאד ("הזז
למעלה") — כל אחד מגיע עכשיו בדיוק ליעד שלו.

## How to run
`npm run test:e2e` (או ממוקד: `npx playwright test tests/e2e/notebook-nav-buttons-visibility.spec.ts`)

## Status
נכון ל-2026-10-11: כל 13 הבדיקות החדשות עוברות. הסט המושפע המלא (82
בדיקות על פני 6 קבצים: `notebook-hold-to-zoom.spec.ts`,
`notebook-auto-scroll.spec.ts`, `notebook-nav-buttons.spec.ts`,
`notebook-nav-settings.spec.ts`, `notebook-toolbar-redesign.spec.ts`,
`notebook-nav-buttons-visibility.spec.ts`) עובר נקי, ריצה בודדת. הסוויטה
המלאה (`npm run build && npm run lint && npm run test:e2e`) רצה כריצה
נקייה אחת כדי לאשר שאין פגיעה רוחבית.
