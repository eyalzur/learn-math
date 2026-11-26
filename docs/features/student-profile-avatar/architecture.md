# פרופיל תלמיד ואווטר — ארכיטקטורה

## קבצים
- `src/data/avatars.ts` (חדש) — `AVATARS` (12: `{id, emoji, label}`), `avatarFor(student)`:
  אם `student.avatar` מזהה ידוע — הוא; אחרת האש של `student.id` מודולו 12. מזהה לא מוכר
  (נתון פגום/אווטר שהוסר) נופל לברירת המחדל, לא נזרק.
- `src/data/curriculum.ts` — `Student.avatar?: string` (אופציונלי = תואם לאחור).
- `src/data/userStore.ts` — `create(name, gradeId, avatar?)` ו-`setAvatar(id, avatar)`. רשומות
  ישנות בלי שדה נקראות כרגיל.
- `src/components/ProfileChip.tsx` (חדש) — כפתור הצ'יפ.
- `src/components/ProfileDrawer.tsx` (חדש) — המגירה: פוקוס-טראפ, Escape, backdrop, החזרת
  פוקוס, `extras?: ReactNode` (נקודת הרחבה).
- `src/components/AvatarPicker.tsx` (חדש) — רשת הכפתורים, משותפת למגירה ולדיאלוג היצירה.
- `TopicPicker`, `GradePicker` — prop אופציונלי `onOpenProfile` + `student`-avatar לצ'יפ.
- `CreateStudentDialog`, `StudentPicker` — בחירה אופציונלית; כרטיס עם האווטר.
- `App.tsx` — `profileOpen` state (כמו `settingsOpen`: חי ב-App כי מסכי-אחים משתפים אותו),
  `changeAvatar`, ניווט להיסטוריה/החלפת תלמיד שסוגרים את המגירה.
- `App.css` — סגנונות `.profile-*`.

## נקודת הרחבה ל-#129 (שיעורים שנותרו)
`ProfileDrawer` מקבל `extras?: ReactNode`, שמרונדר בקופסה `.profile-extras` בין הראש לבחירת
האווטר, ולא מרונדר בכלל אם ריק. #129 יעביר שם את צ'יפ/שורת "שיעורים שנותרו" מ-`App.tsx` בלי
לגעת במבנה המגירה. אין תלות בקוד של #129.

## קצוות
- שני התלמידים באותו `id`-האש: מקבלים אותו אווטר — מקובל (אפשר לבחור).
- מחיקת תלמיד: האווטר חלק מהרשומה — נמחק איתה.
- `setAvatar` מעדכן גם את `students` וגם את `student` הנוכחי ב-App.
- מגירה פתוחה + מעבר מסך (היסטוריה/החלפה): נסגרת באותה פעולה.
- RTL: `inset-inline-start`; מספרים באלמנט נפרד `dir="ltr"` + `unicode-bidi: isolate`.
- היסטוריה במגירה: `historyFor(student.id)` (קיים), 3 אחרונים לפי תאריך.

## סיכונים
הצ'יפ מוסיף גובה לכותרת (40px מול ~24px). נבדק מול `no-scroll-screens.spec.ts`
(TopicPicker עם 7 נושאים); אם נשבר — מצמצמים padding הכותרת במסך הבית.
