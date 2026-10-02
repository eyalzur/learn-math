# כפתורי "שלח למורה" ו"הבא" מחוץ לסרגל הכלים — Architecture

## Overview
`PracticeNotebook` מפסיק לרנדר את `primaryAction` בתוך `.notebook-toolbar` ומרנדר אותו
בשורה נפרדת מיד אחריו (אותו קומפוננטה, אותו prop). ב-`Practice` נוסף state שזוכר שהתלמיד/ה
ביקש/ה מסך מלא, ו-`next()` משחזר אותו.

## Affected Files / Components
- `src/components/PracticeNotebook.tsx` — מוציא את `<button className="notebook-send-btn">`
  מתוך `div.notebook-toolbar` ומציב אותו בתוך `div.notebook-action-row` חדש, אחי של הסרגל,
  מיד אחריו (ולפני `notebook-max-pages-note`). מעדכן את ההערה על "prev/next stay right after
  שלח למורה" (כבר לא נכון).
- `src/components/Practice.tsx` — state `fullscreenWanted` ושינוי `next()` (ראו להלן).
- `src/App.css` — `.notebook-action-row` חדש (שורה קבועה, `flex-shrink: 0`, padding), ו-`.notebook-send-btn`
  מוגדל: `width: 100%`, `min-height: 48px`, צבע ראשי (`--accent` או הצבע הראשי הקיים), `font-size: 18px`,
  אפור כש-`:disabled`. מסיר `flex-shrink`/`white-space` שהיו נחוצים לסרגל.
- `package.json` (+ lock) — `npm run bump:feature`.
- בדיקות קיימות שמוצאות את הכפתור לפי שם/טקסט (`tests/e2e/helpers/notebookAnswer.ts` ועוד)
  ממשיכות לעבוד כי הטקסט והתפקיד זהים; רק בדיקה שמניחה מיקום בתוך הסרגל תיכשל — ל-QA.

## Data / State Changes
`Practice.tsx`: `const [fullscreenWanted, setFullscreenWanted] = useState(false);`
- `onToggleFullscreen`: `setFullscreen(f => { setFullscreenWanted(!f) ... })` — נכתב כך שאין
  side effect בתוך updater: מחשבים `const turnOn = !fullscreen; setFullscreen(turnOn); setFullscreenWanted(turnOn);`.
- ה-✕ ב-`topSlot`: `setFullscreen(false); setFullscreenWanted(false);`.
- האפקט על `feedback !== null` ו-`openCorrection`: נשארים `setFullscreen(false)` בלבד — לא נוגעים ב-`fullscreenWanted`.
- `next()`: אחרי `setIndex(i => i + 1)` מוסיף `setFullscreen(fullscreenWanted)`. בשאלה האחרונה
  (`onFinish`) לא נוגעים.

## Technical Approach
1. העברת הכפתור ב-JSX ובשורת CSS חדשה (בלי לשנות את הלוגיקה של `primaryAction`).
2. הוספת `fullscreenWanted` כמתואר. מכיוון ש-`Practice` כבר מחזיק `fullscreen`, אין צורך
   ב-context או ב-`localStorage`; הזיכרון הוא לתרגול הנוכחי (הקומפוננטה נטענת מחדש בין תרגולים).
3. סדר הרנדר בתוך `notebook-screen`: topSlot, topbar, stage, statusSlot, toolbar, **action-row**,
   max-pages-note, דיאלוג מחיקה. ב-`.notebook-screen.fullscreen` (flex column) שורת הפעולה
   נשארת בתחתית בלי עבודת CSS נוספת.
4. `notebook-page-nav` הראשון (◀ ▶) כבר צמוד לקבוצת הכלים אחרי הוצאת הכפתור; לא צריך שינוי.

## Edge Cases
- **פתיחת טופס תיקון** (`openCorrection`) יורד ממסך מלא; הבא ← חוזר, כי `fullscreenWanted` לא נמחק.
- **ירידה ממסך מלא בעקבות תוצאה** ולחיצה ידנית על ⤢ בזמן התוצאה (אם אפשרי): מדליקה
  `fullscreenWanted`, לא פוגעת.
- **שאלה אחרונה:** "סיום" קורא ל-`onFinish`, ללא שינוי.
- **גובה נמוך:** `.notebook-send-btn` קבוע ב-`min-height` מתון כדי לא לגזול את משטח הכתיבה.
- **RTL:** אין טקסט מעורב; הכפתור ברוחב מלא, אין שינוי בכיוון.
- **ARIA:** נשאר אותו `button` עם טקסט גלוי, ללא `aria-label`.

## Risks / Tradeoffs
- בדיקות e2e שמחפשות את הכפתור דרך `.notebook-toolbar` ישברו; הסיכון נמוך כי רוב הבדיקות
  משתמשות ב-`getByRole`.
- לא נבחר `Fullscreen API` או `localStorage`: מסך מלא כאן הוא `position: fixed` (מתועד), והזיכרון
  נדרש רק בין שאלות.
- נבחרה שורה נוספת קבועה במקום להרחיב את הסרגל; המחיר: שורה אנכית אחת נוספת בטלפון בנוף.

## Open Questions
None.
