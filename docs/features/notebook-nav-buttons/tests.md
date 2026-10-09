# כפתורי ניווט במחברת — פאד כיוונים — Tests

## Coverage
מיפוי קריטריוני הקבלה (product-spec.md) → בדיקות ב-
`tests/e2e/notebook-nav-buttons.spec.ts`:

- ארבעה כפתורים לצד כפתורי הזום, רגיל ומסך-מלא → `four directional
  buttons sit beside the existing zoom controls, embedded` +
  `the four directional buttons are also present in fullscreen`
- לחיצה מזיזה צעד קבוע, לא רציף → `one press pans a fixed step — two
  presses move exactly twice as far as one`
- לא עוברת גבול הדף + כפתור בקצה מושתק → `the view opens pinned to the
  page's top — up and left start disabled, down and right don't` +
  `panning repeatedly in one direction stops at the page edge and
  disables that button, without erroring`
- כפתורי הזום הקיימים ממשיכים לעבוד → `the existing zoom buttons still
  work exactly as before`
- המינימפ ממשיך לשקף מיקום → `the minimap reflects the new position
  after a pan-button press`
- נגישות מקלדת → `a directional button can be activated from the
  keyboard, not just a pointer`
- מרחבי, לא היפוך RTL (design.md) → `the right button sits physically
  to the right of the left button, regardless of the page's RTL
  direction`
- אשכול נפרד מניווט-בין-דפים (design.md) → `pressing the pan buttons
  never changes which notebook page is shown`
- **עדכון (2026-10-09):** החזקה ממשיכה להזיז לבד → `holding a
  directional button down keeps panning on its own, not just one step
  per press` + `a quick tap still pans exactly one step, not two —
  releasing after a hold doesn't double-fire`

## How to run
`npm run test:e2e`

## Status
עבר — `406/406`, ריצה בודדת ונקייה (2026-10-09), אחרי תוספת
ההחזקה-לגלילה-רציפה (שתי בדיקות חדשות מעל ה-`404` המקוריות).
`grade8-angles-congruence.spec.ts` (ה-flake הקיים-מראש המתועד
ב-CLAUDE.md) לא קשור לפיצ'ר הזה בכל מקרה.
