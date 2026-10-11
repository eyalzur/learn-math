# מחברת: עמודת כפתורים ממוקדת + הצעת הפעולה הבאה — Tests

## Coverage

Acceptance criteria (product-spec.md) → test (`tests/e2e/notebook-toolbar-redesign.spec.ts`):

- עמודת זום/ניקוי משמאל-למעלה, כל הפעולות ללא אובדן, אייקון בלבד →
  `the zoom/fullscreen/whole-page/clear actions are unified into one top-left column, icon-only, nothing lost`
- עמודת כלים ימין-למטה, שלושה כפתורים, הדרך היחידה לבחור כלי →
  `hand/pen/eraser form one bottom-right column and are the only way to choose a tool`
- בחירת כלי מתנהגת בדיוק כמו היום (עט מצייר, מחק מוחק, יד מזיזה בגרירה) →
  `choosing a tool from the new column behaves exactly as before: pen draws, eraser erases, hand pans by dragging`
- כפתורי הניווט הקיימים לא משתנים ולא זזים →
  `the directional nav pad still works, unchanged by the redesign`
- אין הצעה תוך כדי משיכת קו →
  `nothing is suggested while a stroke is actively being drawn`
- אחרי הרמת אצבע + השהיה, כפתור ה"יד" מוצע →
  `after a pen stroke ends and a pause follows, the hand button is suggested`
- תזוזה אמיתית (גרירה) מנקה את ההצעה מיד →
  `starting a real pan (drag) clears the hand suggestion immediately`
- לחיצה על כפתור ניווט מהפאד הקיים גם מנקה הצעה ממתינה →
  `pressing a nav-pad button also clears a pending hand suggestion`
- בסיום תזוזה, כפתור ה"עט" מוצע →
  `when panning ends, the pen button is suggested`
- לחיצה על הכלי המוצע מנקה את הפעימה ומחליפה כלי כרגיל (הצעה לא חוסמת/לא כופה) →
  `clicking the suggested tool clears the pulse and switches the tool like any ordinary click`
- כפתור מחק לעולם לא מוצע →
  `the eraser is never suggested — an eraser stroke suggests nothing`
- רגישות ההצעה = "כבוי" מכבה את המנגנון בשני הכיוונים →
  `"כבוי" suggestion sensitivity disables the mechanic entirely, in both directions`
- גודל כפתורים: רשימה סגורה של שלוש אפשרויות, בלי "כבוי", ברירת מחדל בינוני →
  `the button-size picker offers three options (no כבוי), בינוני chosen by default, alongside the other settings`
- גודל כפתורים נכנס לתוקף מיד ומשנה בפועל את גודל הכפתורים →
  `choosing a button size takes effect immediately and visibly changes the buttons' size`
- גודל כפתורים נשמר בין סשנים, per-student →
  `the button-size choice survives a reload and belongs to one student`
- רגישות הצעה: שש אפשרויות כולל "כבוי", ברירת מחדל בינוני →
  `the suggestion-sensitivity picker offers six options including כבוי, בינוני chosen by default`
- רגישות הצעה נשמרת בין סשנים, per-student →
  `the suggestion-sensitivity choice survives a reload and belongs to one student`

Not automated: the exact visual treatment of the pulse (scale/glow, not background) and the
precise default delay value — both explicitly design/architecture decisions, not acceptance
criteria (product-spec.md, "משך ההמתנה... הערך המדויק הוא החלטת ארכיטקטורה/עיצוב, לא חלק
מהספק הזה").

## How to run
`npm run test:e2e` (full suite) or `npx playwright test tests/e2e/notebook-toolbar-redesign.spec.ts`
for this feature's file alone.

## Status
**Pass, as of 2026-10-10.** `17/17` in this file; `446/446` in the full suite, single clean
run (`npm run build && npm run lint && npm run test:e2e`).

Two real test-authoring mistakes were caught and fixed before this was green, not product
bugs: (1) the settings gear ("הגדרות") only exists on the topic-list screen, not inside the
notebook practice screen — tests that open settings must do so via `openTopics` before
`enterPractice`, same convention `notebook-nav-settings.spec.ts` already uses; (2) the
opening view starts pinned to the page's own top-left corner, and a manual drag with the יד
tool toward that same corner is clamped to zero movement (same boundary `clampPan()` already
enforces for the nav-pad taps) — every manual-drag test here moves away from that corner, the
same convention `notebook-auto-scroll.spec.ts`'s own manual-pan test uses.
