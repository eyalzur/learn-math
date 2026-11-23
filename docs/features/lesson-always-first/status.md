# השיעור הוא הכניסה הדיפולטיבית לנושא

בחירת נושא נכנסת קודם לשיעור הקיים (לא ישר לתרגול), עם דרך-דילוג מיידית וברורה
לתרגול מכל עמוד. כפתור ה-📖 הנפרד מוסר.

## Progress
- [x] Product spec — product-manager — 2026-11-21
- [x] Design — designer — 2026-11-21
- [x] Architecture — tech-lead — 2026-11-21
- [x] Implementation — developer — 2026-11-22. מוק אושר ("א', נראה לי טוב"),
      `App.tsx` חווט (`onSelect={enterLesson}` בשני המקומות)
- [x] Tests — qa — 2026-11-23, 362/364 (שני הכשלים — `grade8-angles-congruence.spec.ts`
      — ה-flake הקיים-מראש, לא קשור)

**Current phase:** done — מוזג ל-`main`
**Branch:** `feature/lesson-always-first`
**PR:** https://github.com/eyalzur/learn-math/pull/113 — מוזג 2026-11-23

**מוק שאושר:** https://claude.ai/artifact/K9Bdi3rpUqxNCyBjStLA1h — `TopicLesson.tsx`
ו-`TopicPicker.tsx` הודגמו כאן עם נתונים אמיתיים (כיתה ו׳) לפני החיווט ל-`App.tsx`.

**היקף-הבדיקות שהתברר גדול משוער:** חיווט `enterLesson` במקום `enterTopic` שינה
את מסך-הנחיתה של **כל** כרטיס-נושא באפליקציה, כולל במקביליות שלא עברו דרך
`.topic-card` הישיר (`getByText`, כפתורי-נושא ישירים, עזרי-כניסה-חוזרת
באמצע-בדיקה) — 39 אתרי-כניסה שונים ב-15 קבצי-בדיקה נדרשו תיקון (לא רק 31
שזוהו בסבב הראשון), כולל כאלה שהתגלו רק אחרי מיזוג `main` (קבצים חדשים
ממוזגים שמעולם לא נבדקו מול המנגנון הזה). כל אחד קיבל `await page.getByRole(
"button", { name: "דלג לתרגול →" }).click()` מיד אחרי כניסה-לנושא.

## Open questions / blockers
None.

## Docs
- [Product spec](./product-spec.md)
- [Design](./design.md)
- [Architecture](./architecture.md)
- [Tests](./tests.md)
