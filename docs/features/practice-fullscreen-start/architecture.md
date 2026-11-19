# פתיחת שאלה במסך מלא כברירת מחדל — Architecture

## Overview
שינוי של שני ערכי `useState` ראשוניים ב-`Practice.tsx`, מ-`false` ל-`true`.
שום רכיב, prop, או מסך חדש.

## Affected Files / Components
- **`src/components/Practice.tsx`** — שתי השורות:
  ```ts
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenWanted, setFullscreenWanted] = useState(false);
  ```
  הופכות ל-`useState(true)` בשתיהן.

## Data / State Changes
אין. `fullscreen`/`fullscreenWanted` כבר קיימים; רק הערך ההתחלתי שלהם משתנה.
שום `localStorage`/`props` חדשים — זו לא הגדרה פר-תלמיד/ה (ראו Out of Scope
ב-product-spec.md).

## Technical Approach
`Practice` אף פעם לא מקבל `key` משתנה (ראו ההערה ב-`App.tsx` ליד `settingsOpen`
— "Neither `<TopicPicker>` ולא `<Practice>` below is ever given a changing
`key`") — הוא ממורכב/ מפורק מהעץ כש-`screen.name !== "practice"` ומורכב מחדש
כשחוזרים ל-practice, כי הרינדור ב-`App.tsx` הוא `if (screen.name ===
"practice") return <Practice .../>` ולא רינדור מותנה-תצוגה (conditional
display) בתוך עץ קבוע. המשמעות: `useState(true)` מתאפס מחדש בכל כניסה חדשה
לתרגול (יציאה לרשימת נושאים וחזרה, בחירת נושא/רמה אחרים) — בדיוק ההגדרה של
"פתיחת שאלה" ב-product-spec.md — אבל **לא** מתאפס בין שאלה לשאלה *בתוך* אותו
תרגול, כי שם זו אותה instance ושאלה הבאה (`next()`) כבר שומרת על
`fullscreenWanted` הקיים בכוונה (ראו הציטוט למטה) — בדיוק ההתנהגות הקיימת
ש-Acceptance Criteria מצפה שלא תשתנה.

`next()` כבר מריץ `setFullscreen(fullscreenWanted)` בכל מעבר שאלה — זה הקוד
שאחראי ל"מסך מלא נשאר לשאלה הבאה" (`docs/features/notebook-toolbar-actions/`).
שינוי הערך ההתחלתי בלבד לא פוגע במנגנון הזה: ברגע שהתלמיד/ה יוצא/ת ממסך מלא
באמצע תרגול (✕), `fullscreenWanted` יורד ל-`false` כרגיל, ו-`next()` ימשיך
לכבד את זה לשאלות הבאות באותו תרגול.

## Edge Cases
- **יציאה זמנית קיימת (טופס תיקון, תוצאה סופית וכו׳):** לא נוגעים בלוגיקה
  שמורידה את `fullscreen` זמנית (effects קיימים) — רק בערך שממנו היא מתחילה.
- **מעבר ישיר בין שני תרגולים בלי לעבור דרך רשימת הנושאים** (אם קיים נתיב
  כזה): כל עוד זה גורם ל-`Practice` להתרכב מחדש (unmount+mount, לא רק שינוי
  `lesson` prop על אותו instance), ה-`useState(true)` מתאפס כצפוי. אם יתגלה
  נתיב שמחליף `lesson` בלי unmount (`setScreen` לאותו `screen.name ===
  "practice"` עם `lesson` חדש על instance קיים), מסך מלא לא יתאפס אוטומטית —
  אין כזה נתיב היום (`finish`/`onFinish`/`enterTopic` כולם עוברים דרך שינוי
  `screen.name`), ולכן לא טופל כאן.

## Risks / Tradeoffs
- **בלי הגדרה אישית.** נבחר בכוונה ב-product-spec.md (Out of Scope) — שינוי
  ברירת מחדל גורף, לא מתג חדש בדיאלוג ⚙️. אם יתברר שמישהו מהשלושה מעדיף את
  ההתנהגות הישנה, זה דורש פיצ'ר המשך (הגדרה פר-תלמיד/ה), לא כלול כאן.

## Open Questions
None.

## Implementation Notes
בדיוק כפי שתוכנן — שני `useState(false)` ב-`src/components/Practice.tsx`
הפכו ל-`useState(true)` (`fullscreen`, `fullscreenWanted`), בלי שינוי נוסף.
`npm run bump:feature` → `1.42.0 → 1.43.0`. `npm run build` ו-`npm run lint`
נקיים.
