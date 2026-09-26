# גלילה אוטומטית במחברת לפי כיוון הכתיבה — Tests

## Coverage
מיפוי קריטריוני הקבלה מ-product-spec.md ↔ בדיקות ב-`tests/e2e/notebook-auto-scroll.spec.ts`:

- "כשהכתיבה מתקרבת לקצה הימני... נע ימינה" → `writing that keeps moving toward the right
  edge pans the view further right`
- "כשהכתיבה מתקרבת לקצה השמאלי... נע שמאלה" → `writing that keeps moving toward the left
  edge pans the view further left`
- "התנועה... לא קופצת/רועדת בעקבות תזוזה קטנה מקומית" → `a small reversal while still near
  the same edge doesn't flip the pan direction back`
- "לא דוחפת את התצוגה מעבר לגבול הדף עצמו" → `holding near the edge for a while never keeps
  pushing the view past the page's own boundary`
- "גלילה/זום... ביד מקבלים עדיפות" (חצי הגרירה — ראו הערה למטה לגבי צביטה) →
  `dragging with the הזזה tool near the edge pans by exactly the manual drag, not more`
- "קיימת הגדרה... מאחורי אותו כפתור הגדרות, ברירת מחדל מופעל" → `the settings dialog offers
  the setting after the hold-to-zoom row, on by default`
- "כשהמעקב האוטומטי כבוי, ההתנהגות זהה לחלוטין להיום" → `turning the setting off means
  writing near an edge changes nothing at all`
- תוקף מיידי, בלי רענון (מ-Interaction Flow) → `turning the setting back on applies to the
  very next stroke, with no reload`
- נשמר בין סשנים (מ-Interaction Flow) → `the choice survives a reload`
- per-student (מ-Interaction Flow, וקריטריון "לכל תלמיד/ה בנפרד") → `each student keeps
  their own choice`
- "פועל בכל רמת זום... כולל זום ידני וזום ההחזקה הזמני" → שתי בדיקות: `still follows after a
  manual zoom-in, not only at the opening zoom` ו-`still follows while the temporary
  hold-to-zoom view is active`

**לא הודגם באוטומציה, במפורש:** עדיפות מול **צביטת שתי-אצבעות** (רק חצי-גרירה מהקריטריון
נבדק). כמו ב-`notebook-hold-to-zoom.spec.ts`, ה-API של Playwright (`page.mouse`) לא מריץ שני
מגעים בו-זמנית באמת — אותה מגבלה מתועדת שם, לא חדשה כאן. בדיקה ידנית: פינץ' תוך כדי כתיבה
קרוב לקצה אמור להתנהג בדיוק כמו היום, בלי שהמעקב האוטומטי מתערב.

## תיקוני-לוואי לקבצי בדיקה קיימים (לא חלק מהספק של הפיצ'ר הזה)
הוספת שורה שנייה בעלת `role="switch"` לאותו דיאלוג הגדרות (המתג החדש, לצד מתג ההקראה
הקיים) שברה ריצה נקייה של הסוויטה המלאה: כמה בדיקות קיימות בקבצים אחרים פנו ל-switch
"הראשון/היחיד" בלי לציין שם (`getByRole("switch")` בלי `name`, או `.read-aloud-switch` בלי
היקף), בהנחה סמויה שיש רק מתג אחד בדיאלוג. ברגע שיש שניים, ה-locator הופך דו-משמעי
(strict-mode violation ב-Playwright), לא בגלל שההתנהגות שהם בודקים נשברה בפועל.

תוקן ב-3 קבצים, בדיוק אותו סוג תיקון בכל אחד — היקוף ה-locator לפי `name`/role, בלי לשנות
שום assertion על ההתנהגות עצמה:
- `tests/e2e/notebook-hold-to-zoom.spec.ts` — "opening the settings shows both settings..."
- `tests/e2e/read-aloud-questions.spec.ts` — `toggleReadAloud`/`readAloudState` (המשותפים
  לכמה בדיקות), ובדיקת "a browser with no speech engine..." (שהניחה "אין switch בכלל" כהוכחה
  ל"אין שורת הקראה", הנחה שכבר לא נכונה).
- `tests/e2e/style-lessons.spec.ts` — "a child who cannot read gets the example spoken..."

זה בדיוק אותו סוג תיקון-לוואי שכבר תועד ב-`notebook-hold-to-zoom`'s own QA notes (סבב ו׳):
"שני קבצי בדיקות אחרים דרשו תיקון ניווט" — תופעה חוזרת כשתוספת ל-UI משותף (דיאלוג
ההגדרות) פוגשת בדיקות קיימות שהניחו יחידות (uniqueness) שלא הובטחה במפורש.

## How to run
```bash
npm run build && npm run lint && npm run test:e2e
```

## Status
✅ ירוק — `398/398` עוברות, ריצה בודדת ונקייה (2026-09-26): `386` הקיימות (כולל תיקון
ה-flake ב-`grade8-angles-congruence` שמוזג היום) + `12` חדשות בקובץ הזה, ואפס כשלים.
`build`/`lint` ירוקים.
