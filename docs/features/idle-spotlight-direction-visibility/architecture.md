# זרקור-מנוחה — סדר לפי מיקום-מסך, ובולטות גבוהה יותר — Architecture

## Overview
שני שינויים נקודתיים על גבי המנגנון הקיים (`src/data/idleSpotlight.ts`,
`src/App.css`): פונקציית-מיון חדשה שרצה בתוך `reindex()` לפני שה-`--spot-i`
נקבע, וערכים גדולים יותר בתוך `@keyframes idle-breathe` הקיים. שום דבר אחר
במנגנון (observers, pause-logic, viewport-awareness) לא זז.

## Affected Files / Components
- **`src/data/idleSpotlight.ts`** — פונקציית `sortByScreenPosition` חדשה
  (שורות־top, ימין־לפני־שמאל בתוך שורה), נקראת בתוך `reindex()` על `visible`
  לפני ה-`forEach` שקובע `--spot-i`. docstring הקובץ מתעדכן — הוא כרגע לא
  מזכיר כלל סדר-מיון (ה-`--spot-i` נקבע כיום פשוט לפי סדר `querySelectorAll`,
  שהוא סדר-ה-DOM).
- **`src/App.css`** — `@keyframes idle-breathe`'s `12.5%` step (שורה ~897):
  `0 0 0 9px` → `0 0 0 13px`, `0 0 26px` → `0 0 38px`. שום דבר אחר
  ב-keyframe, ב-`animation-delay`, או בנוסחת-המחזור לא משתנה.

## Data / State Changes
אין. `--spot-i`/`--spot-n` נשארים אותם custom properties בדיוק — רק *הסדר*
שבו האלמנטים ממוספרים לפניהם משתנה.

## Technical Approach

### מיון לפי מיקום-מסך
```ts
function sortByScreenPosition(elements: HTMLElement[]): HTMLElement[] {
  const withRects = elements.map((el) => ({ el, rect: el.getBoundingClientRect() }));
  // קיבוץ לשורות: אלמנט מצטרף לשורה הקודמת אם ה-top שלו בטווח חצי-מגובה-השורה
  // מה-top הממוצע שלה — "חצי-גובה" כסף שעמיד בפני הבדלי-גובה קטנים בין כרטיסים
  // (למשל אייקון שונה) בלי לאחד שתי שורות אמיתיות שגובה-שורה-טיפוסי מפריד
  // ביניהן.
  withRects.sort((a, b) => a.rect.top - b.rect.top);
  const rows: (typeof withRects)[] = [];
  for (const item of withRects) {
    const row = rows.at(-1);
    const rowTop = row?.[0].rect.top;
    if (row && rowTop !== undefined && Math.abs(item.rect.top - rowTop) <= item.rect.height / 2) {
      row.push(item);
    } else {
      rows.push([item]);
    }
  }
  // בתוך כל שורה: ימני-קודם (right גבוה יותר = קודם, תואם RTL).
  rows.forEach((row) => row.sort((a, b) => b.rect.right - a.rect.right));
  return rows.flat().map((item) => item.el);
}
```
`reindex()` קורא לה פעם אחת על `visible` (הרשימה שכבר מסוננת
ל-offsetParent+inViewport), לפני ה-`forEach` שמגדיר `--spot-i`/`--spot-n`:
```ts
const visible = sortByScreenPosition(all.filter((el) => inViewport.has(el)));
```
(`offscreen` לא צריך מיון — הוא ממילא רק מקבל `animationPlayState = "paused"`,
לא `--spot-i`.)

### עוצמת-הדגשה
שינוי-ערכים בלבד בתוך ה-keyframe הקיים — אין צורך בשום קוד נוסף, שני ה-CSS
rules (כרטיסים, וה-button-only rule) כבר חולקים את אותו `@keyframes
idle-breathe`.

## Edge Cases
- **ביצועי-מיון בכל reindex**: `getBoundingClientRect()` ל-N אלמנטים (בפועל
  2–20 בכל מסך קיים באפליקציה הזו — אין אף מסך עם עשרות כרטיסים) ומיון
  `O(N log N)` — זניח, ואותו reindex כבר רץ רק פעם אחת לפריים (debounced דרך
  `requestAnimationFrame` הקיים, ראו startIdleSpotlightObserver's תיעוד). לא
  נדרש caching/memoization נוסף.
- **שני אלמנטים עם `top` זהה בדיוק** (למשל שני כרטיסים ב-flex-row אחד
  רגיל) — חפיפה-מלאה, מצטרפים לאותה שורה בוודאות (`Math.abs(0) <=
  height/2`), וממוינים נכון לפי `right`. אין התנהגות-גבול מיוחדת נדרשת.
- **שורה אחת בלבד על המסך** (הרוב המכריע של המסכים הקיימים היום — כל מסכי
  הכרטיסים הם שורה-אחת ברוחבי-מסך רגילים): `rows` מכיל פריט בודד, הקוד
  מתנהג זהה-בפועל למיון-לפי-`right`-בלבד — שקול למיון-DOM-הקיים רק כשסדר-ה-
  DOM כבר תואם ימין-לשמאל-ויזואלי (המצב השכיח). אין רגרסיה חזותית צפויה
  במסכים האלה.
- **אלמנט עם `offsetParent === null` בדיוק ברגע המיון** (למשל נעלם תוך-כדי
  reindex) — כבר מסונן החוצה קודם ב-`reindex()`'s `all` filter, לא מגיע
  ל-`sortByScreenPosition` בכלל.

## Risks / Tradeoffs
- **קיבוץ-לשורות מבוסס סף-יחסי (חצי-גובה), לא סף-פיקסלים קבוע** — עמיד יותר
  לגדלי-כרטיסים שונים בין מסכים (כרטיס-תלמיד גדול מול כפתור-קטן), אבל
  משמעותו שאלמנטים בגבהים-שונים-מאוד-אך-עדיין-"אותה שורה חזותית בערך" (למשל
  כרטיס גבוה לצד כפתור נמוך, חופפים אנכית חלקית) עלולים להיחתך לשתי שורות
  נפרדות אם הפער עובר את הסף. באפליקציה הזו כל הכרטיסים-באותו-מסך הם מאותו
  סוג/גובה (grid אחיד), כך שזה לא מצב ממשי כרגע — מתועד כהנחה, לא מאומת לכל
  מסך עתידי.
- **לא נוגעים ב-`:nth-child`-overrides הקיימים** (0.05s/0.1s/0.15s ל-
  nth-child 2/3/4 ב-App.css) — אלה היסט-זעיר לפירוק-תיקו כש-`--spot-i`
  מזדמן-שווה בין שני אלמנטים סמוכים (ראו architecture.md המקורי). נכון
  גם אחרי הרוויזיה הזו, כי הם פועלים על *תוצאת*-המיון (סדר-ה-DOM לאחר
  reindex), לא על סדר-המיון עצמו.

## Open Questions
None.

## Implementation Notes

Built exactly as planned, no deviations.

- `src/data/idleSpotlight.ts`: added `sortByScreenPosition` exactly as architecture.md
  specified; `reindex()`'s `visible` is now `sortByScreenPosition(all.filter(...))`
  instead of the plain filter. Module docstring updated to mention visit order is
  screen-position, not DOM order.
- `src/App.css`'s `@keyframes idle-breathe` 12.5% step: `9px`/`26px` → `13px`/`38px`.
  Nothing else in the keyframe, the `animation-delay` formulas, or the pause rules
  touched.
- Version bumped `1.50.1 → 1.50.2` (`npm run bump:fix`) + changelog entry.
- `npm run build` and `npm run lint` clean. Visual verification (dev server,
  `npm run test:e2e`) deliberately deferred — port 5173 was occupied by an unrelated PR's
  background test run at implementation time; see status.md for when that happened.
