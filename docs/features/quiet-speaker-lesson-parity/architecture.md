# ארכיטקטורה

- `App.css`: `.speak-button` מוגדר מחדש (שקט); `.problem-box-card` הוא `position: relative` והרמקול
  `absolute`; `.box-rtl` מקבל `padding-left`. נוסף `:not(.speak-button)` לכלל ה-"ledge shadow" הגורף
  (`button:not(...)`) — בלעדיו הצל הוורוד גבר בספציפיות. נמחק `.lesson-page-badge`.
- `QuestionScreenTemplate`: הוסר הסלוט `standaloneSpeak` (כבר לא בשימוש).
- `TopicLesson.tsx`: הרמקול עובר ל-`inlineSpeak`, הכותרת `h2.practice-title`, המונה לשורת הכותרת.
- `Practice.tsx`: לא נגע (להקטנת קונפליקט עם PR #126).
