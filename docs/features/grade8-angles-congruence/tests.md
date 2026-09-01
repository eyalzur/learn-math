# זוויות וחפיפת משולשים — Tests

## Coverage

Map of `product-spec.md`'s Acceptance Criteria → test:

- "קיים נושא חדש ... נבחר מרשימת הנושאים של עומר יחד עם ששת הנושאים הקיימים" →
  `tests/e2e/grade8-angles-congruence.spec.ts` › `appears in Omer's grade-8 topic list
  alongside the six existing topics`. Also covered generically by
  `tests/e2e/topics-all-grades.spec.ts`'s `picking grade 8's student shows that grade's
  six topics` — updated to seven, same test, same file.
- "שלוש רמות קושי, כמו כל נושא אחר בכיתה ח׳" →
  `grade8-angles-congruence.spec.ts` › `has three difficulty levels, and a level starts a
  normal practice`.
- תת-תחום זוויות (השלמה, זווית חיצונית, סכום זוויות, ישרים מקבילים) →
  `grade8-angles-congruence.spec.ts` › `covers angle questions — straight-angle
  completion, triangle angle sum, exterior angle, and parallel lines`.
- תת-תחום חפיפת משולשים →
  `grade8-angles-congruence.spec.ts` › `covers congruent-triangle questions — a missing
  side or angle from a stated congruence`.
- תת-תחום משולש שווה-שוקיים (כולל תיכון=גובה) →
  `grade8-angles-congruence.spec.ts` › `covers isosceles-triangle questions — equal base
  angles, and the median that is also a height`.
- "לכל שאלה יש `prompt`, שני `hints`, `steps`, ו-`analogy`" →
  `grade8-angles-congruence.spec.ts` › `every question has a prompt, two hints, and —
  after a wrong answer — steps and an analogy`.
- "זמין מתרגול רגיל ... ומופיע בהיסטוריה" →
  `grade8-angles-congruence.spec.ts` › `a finished practice records the topic, level and
  score in history`.
- כיווניות (RTL) של `∡A`, `∡B`, שמות נקודות וכו' — לא בדיקת מסך נפרדת: זו טענה על
  `unicode-bidi: isolate`/`direction: ltr` שכבר מכוסה, לכל האפליקציה, על ידי
  `tests/e2e/content.spec.ts`'s `"marks algebra sitting inside a Hebrew sentence"`, שרץ
  על כל שאלה כולל שלושים אלה. לא נבנתה בדיקת מסך חדשה לזה — התוכן כבר עובר דרך אותו
  מנגנון קיים ובדוק.
- "5 הצורות הדיאגרמה החדשות מוצגות" — **לא נבדק ויזואלית בכוונה.** design.md לא קובע
  class name/selector קונקרטי (זו החלטת tech-lead/developer), ו-QA לא קורא את קוד
  ה-implementation כדי לגלות אותו. הכיסוי העקיף הקיים: "every question has a prompt...
  steps and an analogy" מוודא שקופסת ההסבר ("איך פותרים?") נפתחת אחרי טעות עם שלבים
  ואנלוגיה — התוכן שדיאגרמה מצטרפת אליו. `content.spec.ts`'s `"no diagram ever disagrees
  with its own question"` (כלל כללי, לא ספציפי לנושא הזה) הוא מקום טבעי להוסיף אליו
  בדיקה ל-`angleShape` בעתיד, אם מישהו ירצה לכסות את זה ברמת הנתונים.

## How to run
`npm run test:e2e`

## Status
ירוק — 2026-09-01. הרצה בודדת ונקייה: **`319/319`** עוברות (כולל שבע הבדיקות החדשות
כאן, ועדכון `tests/e2e/topics-all-grades.spec.ts` לרשימת שבעת הנושאים). `npm run build`
ו-`npm run lint` ירוקים גם הם.
