# זרקור-מנוחה — Architecture

## Overview
שתי שכבות עצמאיות, שתיהן CSS-מונע: (1) זוהר-נשימה שעובר בין כרטיסים/כפתורים
ראשיים, ממוספר ע"י סקריפט-אינדוקס זעיר אחד ב-`App.tsx` שמריץ-מחדש אחרי כל
רינדור; (2) זוהר-רקע ענק דרך `::before` על `#root`, אנימציה-CSS טהורה, בלי
JS בכלל. בלי state חדש, בלי prop חדש, בלי class חדש ברוב הרכיבים.

## Affected Files / Components
- **`src/App.tsx`** — `useEffect` חדש (רץ אחרי כל רינדור, בלי מערך-תלויות)
  שקורא לפונקציה `reindexIdleSpotlight()` (ב-`src/data/idleSpotlight.ts` חדש).
- **`src/data/idleSpotlight.ts`** (חדש) — קובץ-עזר קטן, לא React component:
  פונקציה אחת שסורקת את ה-DOM ומעדכנת custom properties. אין state, אין
  תלות ב-React חוץ מזה שנקראת מ-`useEffect`.
- **`src/App.css`** — קבוצת-סלקטורים חדשה (זרקור-כרטיסים), `@keyframes
  idle-breathe`, חוקי-השהיה (hover/focus/active/`:has()`-דיאלוג), ו-`::before`
  על `#root` לזוהר-הרקע + `@keyframes idle-bg-drift`.
- **שום קובץ `.tsx` אחר לא משתנה.** אין class-names חדשים על כרטיסים/כפתורים
  עצמם — אותו עיקרון כמו playful-redesign.

## Data / State Changes
None — אין state חדש, אין prop. ה-"state" היחיד הוא custom properties CSS
(`--spot-i`, `--spot-n`) שנכתבים ישירות כ-inline style בלי לעבור דרך React.

## Technical Approach

### איזה אלמנטים נכנסים למחזור
**לא** כל מה שplayful-redesign's `button:not(.app-version)` תופס — קבוצה
יותר מצומצמת, רק פעולות ראשיות:
```
.student-card, .grade-card, .topic-card, .level-card, .style-card,
button:not(.app-version):not(.speak-button):not(.hint-button)
  :not(.link-button):not(.student-card-delete):not(.settings-button)
```
**למה לצמצם ביחס לplayful-redesign:** design.md עצמו מדגיש "עדין, לא עמוס" —
מחזור שכולל גם 🔊/💡/⚙️/🗑/קישורי-טקסט יהיה ארוך ומעייף-לעין על מסכים עם הרבה
כפתורי-עזר קטנים (למשל מסך תרגול: כרטיס-שאלה + 🔊 + רמז + בדיקה = היה הופך
ל-4 תורות במקום 1). מצומצם ל"הבחירות המרכזיות" בלבד — פרשנות של tech-lead
לרוח-העיצוב, לא סתירה לקריטריון-הקבלה ("כל כרטיס/כפתור" ב-product-spec
מתייחס ל*סוג* האלמנט, לא לכל כפתור-עזר קטן שקיים אי-שם על המסך).

### אינדוקס דינמי — `src/data/idleSpotlight.ts`
```ts
const SELECTOR =
  ".student-card, .grade-card, .topic-card, .level-card, .style-card, " +
  "button:not(.app-version):not(.speak-button):not(.hint-button)" +
  ":not(.link-button):not(.student-card-delete):not(.settings-button)";

export function reindexIdleSpotlight(): void {
  const visible = [...document.querySelectorAll<HTMLElement>(SELECTOR)].filter(
    (el) => el.offsetParent !== null,
  );
  visible.forEach((el, i) => {
    el.style.setProperty("--spot-i", String(i));
    el.style.setProperty("--spot-n", String(visible.length));
  });
}
```
נקרא מ-`App.tsx` דרך `useEffect(() => { reindexIdleSpotlight(); });` — **בלי**
מערך-תלויות, כך שזה רץ מחדש אחרי כל רינדור (מעבר-מסך, יצירת/מחיקת תלמיד/ה,
כל שינוי) — תמיד משקף את מה שבאמת גלוי עכשיו. זו סריקת-DOM זולה (כמה עשרות
אלמנטים לכל היותר) — לא expensive, לא צריך debounce/throttle.

### האנימציה עצמה — negative animation-delay stagger
טכניקת-CSS מוכרת למחזור-מדורג: כל האלמנטים מקבלים **בדיוק את אותה** אנימציה,
אבל `animation-delay` **שלילי**, כך שכל אחד "כבר באמצע" המחזור-שלו-עצמו מהרגע
הראשון — זה מה שיוצר את הרושם של זרקור-אחד-עובר, בלי לתזמן שום דבר ב-JS:
```css
.student-card, .grade-card, .topic-card, .level-card, .style-card,
button:not(.app-version):not(.speak-button):not(.hint-button)
  :not(.link-button):not(.student-card-delete):not(.settings-button) {
  animation: idle-breathe calc(var(--spot-n, 1) * 1s) ease-in-out infinite;
  animation-delay: calc(var(--spot-i, 0) * -1s);
}

@keyframes idle-breathe {
  0%, 100% { box-shadow: none; }
  12.5% {
    transform: scale(1.025);
    box-shadow: 0 0 0 6px var(--accent-bg), 0 0 18px var(--accent-border);
  }
  25% { transform: scale(1); box-shadow: none; }
}
```
**קירוב מכוון, לא תקלה:** אחוזי-ה-keyframe חייבים להיות מספרים קבועים (CSS לא
תומך ב-`calc()` בתוך בורר-keyframe) — כך ש"משך-הנשימה" בפועל הוא `25% ×
N שניות`, לא בדיוק שנייה אחת קבועה. ל-N=4 (למשל `.grade-list`) זה בדיוק
שנייה אחת. ל-N קטן יותר (2, למסך-תרגול עם שני כפתורים) זה ~0.5 שניות; ל-N
גדול יותר (7, טבלת-נושאים מלאה) זה ~1.75 שניות — עדיין "נשימה עדינה של בערך
שנייה", לא סטייה שתורגש כבעיה, אבל זו קירוב מתועד במפורש, לא התאמה מדויקת
לכל N אפשרי.

**developer: תבדקו ויזואלית (לא רק "זה מתקמפל") שהרצף-המדורג אכן נראה כמו
"זרקור עובר אחד-אחד" ולא כמו "כולם מהבהבים ביחד" או "הסדר הפוך" — אם זה נראה
הפוך, הפתרון הוא לשנות את הסימן (`animation-delay: calc(var(--spot-i, 0) *
1s)` בלי המינוס) ולא לשנות את מנגנון-האינדוקס.**

### השהיה — שלוש דרכים, לא אחת
1. **hover/focus/active על האלמנט עצמו** (לא מתנגש עם ledge-press):
```css
.student-card:hover, .student-card:focus, .student-card:active,
/* ...אותו דבר לכל שם-קלאס בקבוצה... */ {
  animation-play-state: paused;
}
```
2. **דיאלוג פתוח — `:has()`** (נתמך Chrome/Safari מודרניים, אותה הנחת-תמיכה
   כמו `interactive-widget=resizes-content` שכבר נוסף ל-`index.html`):
```css
body:has(.create-student-backdrop, .delete-student-backdrop,
          .settings-backdrop, .version-log-backdrop)
  [style*="--spot-i"] {
  animation-play-state: paused;
}
```
3. **`prefers-reduced-motion: reduce`** — מבטל `animation` לגמרי (לא `paused`,
   `none`) על שתי השכבות (זרקור-כרטיסים + זוהר-רקע), אותו דפוס-קוד שכבר קיים
   ב-playful-redesign.

### זוהר-רקע — `::before` על `#root`, בלי JS בכלל
```css
#root::before {
  content: "";
  position: fixed;
  inset: -20% -20% auto auto;
  width: 60vw;
  height: 60vw;
  max-width: 600px;
  max-height: 600px;
  border-radius: 50%;
  background: var(--accent-bg);
  filter: blur(80px);
  z-index: -1;
  pointer-events: none;
  animation: idle-bg-drift 28s ease-in-out infinite;
}

@keyframes idle-bg-drift {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-8%, 6%); }
}
```
`z-index: -1` + `pointer-events: none` כדי שזה לעולם לא יפריע ללחיצות/לא
ייראה מעל תוכן אמיתי. `#root` כבר `position`-לא-מוגדר כברירת-מחדל (`static`)
— `position: fixed` על ה-`::before` לא תלוי ב-`#root` עצמו להיות
`relative`/`absolute`, כך שאין צורך לשנות שום CSS קיים של `#root`.

## Edge Cases
- **מסך עם אלמנט-מועמד אחד בלבד (`N=1`)**: `animation-duration: calc(1 * 1s)
  = 1s` — "נושם" כל שנייה בלי שום אחד אחר "לתורו" — זה בסדר, זה בדיוק מה
  שאמור לקרות (אין למי "להעביר תור").
- **מסך עם אפס אלמנטים-מועמדים** (למשל מסך היסטוריה): `reindexIdleSpotlight`
  פשוט לא מוצא כלום, לא קורה שום דבר — אין branch מיוחד נדרש.
- **מעבר-מסך תוך-כדי נשימה של כרטיס**: ברגע שה-DOM הישן נהרס (ניווט), ה-CSS
  animation שלו נעלם איתו — אין "זיכרון" שצריך לנקות, `reindexIdleSpotlight`
  פשוט בונה מחדש על הכרטיסים החדשים מ-`--spot-i=0`.
- **`button:not(...)` המצומצם עלול לפספס כפתור-ראשי עתידי** שלא קיים עדיין
  בקוד (מישהו מוסיף תכונה חדשה) — זה בסדר: ברירת-המחדל היא *כן* להיכלל
  (הסלקטור הוא "כל button חוץ מרשימת-יוצאים-מהכלל", לא "כל button ברשימת-
  היתר") — רק כפתורי-עזר ידועים מוחרגים במפורש.

## Risks / Tradeoffs
- **קירוב-האחוזים ב-keyframe** (למעלה) — תלוי-N, לא מדויק לכל גודל-מסך. אם
  בפועל זה מרגיש ארוך-מדי במסכים עם הרבה כרטיסים (7+), אפשר לכוונן את אחוז-
  ה-25% כלפי מטה (למשל 15%) — זו כוונון-מספר, לא שינוי-ארכיטקטורה.
- **`:has()`** דורש דפדפן מודרני (Chrome 105+/Safari 15.4+) — באותה קטגוריה
  כמו `interactive-widget` שכבר נוסף; בדפדפן ישן יותר, ה-fallback הוא
  "הזרקור ממשיך לרוץ מתחת לדיאלוג בלי שרואים אותו" — לא שובר כלום, רק מאבד
  את ההשהיה היפה, acceptable degradation.
- **אין בדיקת-ביצועים כמותית** (FPS/CPU בפועל) — רק "CSS בלבד, לא JS-per-
  frame" כעיקרון-תכנון. אם מתברר כבעיה בפועל על מכשיר חלש, זו עבודת-כוונון
  נפרדת (למשל להקטין את מספר-השכבות הפעילות בו-זמנית), לא ידוע-מראש כבעיה.

## Open Questions
None.
