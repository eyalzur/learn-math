# traps

* [אותיות סופיות בעברית שוברות חיפוש מחרוזות](/traps/hebrew-final-letters.md) - בלון אינו תת-מחרוזת של בלונים (נ סופית מול רגילה) — חיפוש מחרוזות על עברית שביר.
* [האתר החי למטה בלי שקוד נגע בו — Pages כבוי בהגדרות](/traps/github-pages-disabled.md) - workflow הפריסה נכשל ב-404: Settings → Pages → Source חייב להיות GitHub Actions. הגדרה שרק בעל החשבון משנה.
* [כיווניות (RTL) בחשבון — הבאג החוזר](/traps/rtl-math-direction.md) - עמוד עברי הוא RTL אבל חשבון חייב להיקרא שמאל-ימין; נשבר שלוש פעמים. טקסט וביטוי תמיד אלמנטים נפרדים.
* [ריצות בדיקה מקבילות אינן מדידה](/traps/parallel-test-runs.md) - reuseExistingServer + workers מרובים = תחרות על שרת אחד. מריצים פעם אחת עם --workers=1.
* [תלות מעגלית בין קבצי נתונים — מסך לבן](/traps/circular-data-imports.md) - grade1.ts קרא ל-level() מ-curriculum.ts שמייבא אותו בחזרה; TypeScript לא תופס. level() יושב ב-level.ts.
* [StrictMode + Math.random() בנושא אדפטיבי — פלייקי רק ב-dev](/traps/strictmode-random-flaky.md) - כשל e2e לא-עקבי בנושא אדפטיבי הוא כנראה תקלת dev של React StrictMode, לא רגרסיה באתר החי.
