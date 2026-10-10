# הגדרת מהירות כפתורי הניווט במחברת — Tests

## Coverage
מיפוי קריטריוני הקבלה (product-spec.md) → בדיקות ב-
`tests/e2e/notebook-nav-settings.spec.ts`:

- בורר אחד, רשימה סגורה, שש אפשרויות, ברירת מחדל אמצעית → `opening the
  settings shows the pan-speed picker alongside the other two, six
  options, בינוני chosen by default`
- לא בדרך של הילד/ה (לא מוצג לפני פתיחת ⚙️) → `the practice-choice screen
  shows no pan-speed options before the settings are opened`
- נכנס לתוקף מיד, הדיאלוג לא נסגר → `choosing a level marks it immediately
  and leaves the dialog open`
- משפיע על הקשה בודדת → `a faster level moves the view further with a
  single press than a slower one`
- "כבוי" מבטל רק את ההחזקה, לא את הכפתורים עצמם → `choosing "כבוי" means
  holding a directional button down still moves only the one step the
  press itself made`
- דרגה פעילה ממשיכה להתנהג כמו לפני שהגדרה זו קיימה (regression) →
  `a level other than כבוי keeps repeating on a hold, same as before this
  setting existed`
- משפיע על קצב ההחזקה → `a faster level repeats more during the same hold
  duration than a slower one`
- נשמר בין סשנים → `the choice survives a reload`
- per-student → `each student keeps their own pan speed`

לא נבדק אוטומטית: הערכים המדויקים (70px/160ms וכו', ראו architecture.md)
— הבדיקות משוות דרגות זו לזו ("מהיר יותר מאטי"), לא מול מספרים קבועים,
מהטעם שכבר מתועד ב-notebook-hold-to-zoom.spec.ts ("הסקאלה כוונה כבר
פעמיים... 'חלש יותר הוא חלש יותר' היא ההבטחה, לא כל ערך בודד").

## How to run
`npm run test:e2e`

## Status
עבר — `415/415`, ריצה בודדת ונקייה (2026-10-09): `406` הבדיקות הקיימות
מ-PR #78 ועוד `9` בדיקות חדשות כאן. `0` כשלים, אין סימן ל-flake המתועד
(`grade8-angles-congruence.spec.ts`) בריצה הזו בכלל.

**הערה תפעולית:** ריצה ראשונה נדרשה לבוטל ולהתחיל מחדש — פקודת bash
שגויה (`&` לרקע בטעות) הפעילה ריצת Playwright שנייה שחפפה עם ריצת
`npm run test:e2e` התקנית, מה שבדיוק מפר את כלל "ריצה בודדת ונקייה" שכבר
מתועד ב-CLAUDE.md. שתי הריצות וה-dev server הנלווה נהרגו (`pkill`), ו-
`415/415` הוא תוצאת הריצה הנקייה שבאה אחריהן — לא התוצאה המזוהמת.
