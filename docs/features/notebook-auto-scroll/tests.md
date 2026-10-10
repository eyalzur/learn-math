# גלילה אוטומטית במחברת לפי כיוון הכתיבה — Tests

**עדכון סבב ב׳ (2026-09-26) — מסמך זה נכתב מחדש.** המנגנון הרציף של סבב א׳ בוטל
לגמרי, ולכן כל שנים-עשר הבדיקות שבדקו אותו (`tests/e2e/notebook-auto-scroll.spec.ts`
המקורי) הוחלפו בקובץ חדש שבודק את הקפיצה הבדידה של סבב ב׳. שום בדיקה מהקובץ
הישן לא נשארה — היא בדקה התנהגות שכבר לא קיימת.

## Coverage
מיפוי קריטריוני הקבלה מ-product-spec.md, "Acceptance Criteria — סבב ב׳" ↔ בדיקות
ב-`tests/e2e/notebook-auto-scroll.spec.ts`:

- "תוך כדי משיכת קו בפועל התצוגה אינה זזה בשום שלב" → `the view never moves while
  a stroke is actively being drawn, even near the edge`
- "קו שמסתיים רחוק מימין... קפיצה ימינה" → `a stroke that ends clearly to the
  right of the last one jumps the view right, after it's lifted`
- אותו דבר לשמאל/מעלה/מטה → `...jumps the view left`, `...jumps the view down`,
  `...jumps the view up` (שלוש בדיקות נפרדות, כל אחת פותחת בתנועה לכיוון ההפוך
  קודם — ראו הערה למטה על קצה הדף ההתחלתי)
- "שילוב של שני צירים בו-זמנית" → `a stroke far away on both axes at once jumps
  the view diagonally, in one motion`
- "קו שמסתיים קרוב לקודם... לא גורם לקפיצה" → `a second (and third) stroke
  landing close to the last one never jumps — a multi-stroke character`
- "הקפיצה לא דוחפת מעבר לגבול הדף" → `repeated strokes that keep moving the same
  way eventually stop at the page's own edge`
- "גלילה/זום ידניים מקבלים עדיפות מלאה" (חצי הגרירה — ראו הערה למטה לגבי צביטה) →
  `panning manually with the הזזה tool moves the view by exactly the drag, no
  extra jump added`
- "ההגדרה הופכת לבורר עוצמה... כבוי כאחת האפשרויות... ברירת מחדל" → `the
  settings dialog offers six jump strengths, off first, medium chosen by default`
- "כבוי = ההתנהגות זהה למה שהיה לפני הפיצ'ר כולו" → `choosing "כבוי" means no
  stroke, however far from the last one, ever jumps the view`
- תוקף מיידי בלי רענון, per-student, נשמר בין סשנים (Interaction Flow) → `a
  change applies to the very next stroke, with no reload`, `the choice survives
  a reload`, `each student keeps their own choice`

**לא הודגם באוטומציה, במפורש:** עדיפות מול **צביטת שתי-אצבעות** — כמו בסבב א׳
וב-`notebook-hold-to-zoom.spec.ts`, Playwright's `page.mouse` לא מריץ שני מגעים
בו-זמנית באמת. בדיקה ידנית: פינץ' בין שתי כתיבות אמור להתנהג בדיוק כמו היום,
בלי שהקפיצה מתערבת.

**"פועל בכל רמת זום" (מסבב א׳, נשאר בתוקף כקריטריון אך לא לובש בדיקה ייעודית
כאן:** המנגנון פועל על `panZoomRef` הנוכחי בכל רמה, ואינו תלוי בזום — כל
הבדיקות למעלה כבר רצות בזום הפתיחה (`70%`), ותרגום לרמת זום אחרת הוא אותו
מסלול קוד בדיוק (ראו architecture.md). בדיקה נפרדת לכל רמת זום הייתה בודקת את
אותו קוד פעמיים.

**ניואנס אמיתי שהתגלה תוך כדי כתיבת הבדיקות (לא רק תוך כדי המימוש):** אחרי
שהתצוגה כבר קפצה, אותה קואורדינטת-מסך כבר לא מייצגת את אותה קואורדינטת-דף.
שלוש בדיקות (ימין/שמאל, מעלה/מטה) בונות על זה במפורש: כדי לבדוק "קפיצה שמאלה",
קודם גוללים ימינה כדי לפנות מקום — בדיוק כמו ש-`notebook-hold-to-zoom.spec.ts`
כבר עושה לבדיקות הזום שלו, מהסיבה הזהה: התצוגה הפותחת כבר יושבת בדיוק בקצה
הדף (פינה שמאלית-עליונה), כך שאין "עוד יותר שמאלה/למעלה" לחשוף מהמצב ההתחלתי.

## How to run
```bash
npm run build && npm run lint && npm run test:e2e
```

## Status
✅ ירוק — `400/400` עוברות, ריצה בודדת ונקייה (2026-09-26): `386` הבסיס +
`14` חדשות בקובץ הזה (מחליפות את `12` בדיקות סבב א׳ שהוסרו — נטו `+2`).
`build`/`lint` ירוקים. הפעם, ללא צורך בתיקוני-לוואי לקבצי בדיקה אחרים — שמות
המחלקות של הבורר החדש (`.auto-scroll-option` וכו') נבחרו מראש נפרדים משל
זום-ההחזקה (`.hold-zoom-option`), בדיוק כדי למנוע את התקלה שקרתה בסבב א׳ (ראו
architecture.md, Risks/Tradeoffs).
