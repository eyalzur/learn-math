# השיעור הוא הכניסה הדיפולטיבית לנושא — Architecture

## Overview
שני שינויי-קומפוננטה קטנים (`TopicLesson.tsx` מקבל קישור-דילוג,
`TopicPicker.tsx` מאבד את כפתור-ה-📖), ושינוי-חיווט אחד ב-`App.tsx` (כרטיס
מוביל ל-`enterLesson` במקום `enterTopic`). נבנים ומאושרים בנפרד, בסדר הזה —
ראו "תהליך-אישור" למטה.

## Affected Files / Components
- **`src/components/TopicLesson.tsx`** — שורת-הכותרת (`.practice-header`)
  מקבלת כפתור-דילוג חדש ("דלג לתרגול →", `className="link-button"`, קורא
  ל-`onPractice` — אותו prop שכבר קיים), צמוד ל-"← חזרה" הקיים. שום prop
  חדש — `onPractice` כבר מועבר מה-caller.
- **`src/components/TopicPicker.tsx`** — מוחק את `onLesson` prop, את בלוק
  ה-`.lesson-link` (📖), ואת ה-`.topic-row` wrapper שהיה קיים רק כדי להכיל
  את השניים יחד (הכרטיס חוזר לעמוד בעצמו ב-`.topic-grid`, בלי wrapper).
- **`src/App.tsx`** — שני מקומות שמרנדרים `<TopicPicker>` (שורות ~428,
  ~539) מעבירים `onSelect={enterLesson}` במקום `onSelect={enterTopic}`, ולא
  מעבירים `onLesson` יותר (ה-prop נמחק מ-`TopicPicker`). שום שינוי ב-
  `enterTopic`/`enterLesson`/`lessonQuestions` עצמם — `enterLesson` כבר
  קיים ועושה בדיוק את זה; `onPractice={() => enterTopic(topic)}` במסך
  "lesson" הקיים כבר נכון ונשאר כפי שהוא.

## Data / State Changes
אין.

## Technical Approach — תהליך-אישור, לא רק מימוש
בהנחיית המשתמש (2026-11-21, חלה מעכשיו על כל פיצ'ר ויזואלי): לפני חיווט
בתוך `App.tsx`, בונים דמו עצמאי שמייבא את **הקומפוננטות האמיתיות**
(`TopicLesson.tsx`/`TopicPicker.tsx`, אחרי השינוי בהן) עם נתוני-דוגמה
חיצוניים (לא דרך state-machine של האפליקציה) — אותה שיטה שכבר קיימת
ב-`review-ready` skill's "Use real components", רק **לפני** שלב-ה-developer
המלא, לא רק לריוויו שלאחריו:

1. **עכשיו:** משנים את שני קבצי-הקומפוננטה לבדם (`TopicLesson.tsx`,
   `TopicPicker.tsx`) — שינוי אמיתי, לא placeholder. `App.tsx` **לא** נוגע
   בשלב הזה.
2. בונים harness עצמאי (vite config נפרד, root משלו) שמייבא את שתי
   הקומפוננטות + `src/index.css`/`src/App.css` + נתוני-שאלה אמיתיים
   מ-`src/data/*`, מרנדר אותן עם props מדומים (לא דרך `App.tsx`).
3. מפרסמים כ-Artifact, המשתמש מאשר/מעיר.
4. **רק אחרי אישור:** שינוי-החיווט ב-`App.tsx` (השורה האחת למעלה), הסרת
   כפתור-ה-📖 מה-grep-references האחרונים אם יש, הרצת build/lint/e2e מלאה
   על האפליקציה האמיתית, עדכון/כתיבת e2e חדש, commit.

ה"סייקל הארוך בתוך האפליקציה" (build מלא, dev server, e2e) קורה **פעם
אחת**, בסוף, אחרי שההתנהגות כבר מאושרת — לא בכל איטרציה.

## Edge Cases
- נושא לא-`reviewed`: `TopicPicker`'s existing `disabled={!topic.reviewed}`
  לא זז — שום מסלול-קוד חדש לא נוגע בכרטיסים מנוטרלים.
- מסך-השיעור של נושא שאין לו עמוד שני (`questions.length === 1`,
  המקרה של מיקה): כפתור-הדילוג החדש עדיין מופיע (הוא לא תלוי ב-
  `showTierHeadings`/מספר-העמודים) — זהה בכל מסך-שיעור, לא רק בנושאים
  עם כמה tiers.

## Risks / Tradeoffs
- שינוי ה-`onSelect` ב-`App.tsx` משפיע על **כל** נושא `reviewed` בבת-אחת —
  אין מעבר-הדרגתי/flag. זו בדיוק ההחלטה שה-product-spec ביקש ("תמיד
  נראה את השיעור"), לא תופעת-לוואי.
- מחיקת `.topic-row`/`.lesson-link` מ-CSS (`App.css`) תידרש בשלב-4 (אחרי
  אישור) אם הן כבר לא בשימוש בשום מקום אחר — tech-lead/developer מוודאים
  את זה אז, לא טרם.

## Open Questions
None.
