# לוג גרסאות — Architecture

## Overview
תיאורי הגרסאות חיים ברשימה סטטית חדשה ב-`src/data/`. רכיב חדש `VersionLog`
מציג אותה כדיאלוג מודאלי (אותה אנטומיה כמו `SettingsDialog`, class names
נפרדים משלו). `StudentPicker` מחזיק את מצב open/closed שלו לבד — אף מסך אחר
לא צריך לפתוח את הדיאלוג הזה, אז אין סיבה להרים את ה-state ל-`App.tsx`.

## Affected Files / Components
- **`src/data/changelog.ts`** (חדש) — `ChangelogEntry` (`version`, `description`) +
  מערך `CHANGELOG` סדור חדש-לישן. שורה ראשונה: הגרסה שבה הפיצ'ר הזה נכנס.
  קובץ נתונים טהור, בלי imports — אותו עיקרון כמו `src/data/version.ts` (לא
  לוקח חלק בתלות מעגלית).
- **`src/components/VersionLog.tsx`** (חדש) — דיאלוג מודאלי. `props: { open:
  boolean; onClose: () => void }`. קורא ל-`CHANGELOG` ול-`APP_VERSION`
  (מ-`src/data/version.ts`) ישירות — אין צורך להעביר אותם כ-props מ-`App.tsx`
  כי שום מסך אחר לא צריך אותם.
- **`src/components/StudentPicker.tsx`** — `.app-version` (`<p>`) הופך ל-
  `<button>`; `useState` מקומי ל-`versionLogOpen`; מרנדר `<VersionLog
  open={versionLogOpen} onClose={() => setVersionLogOpen(false)} />`.
- **`src/App.css`** — ארבע מחלקות חדשות (`.version-log-backdrop`,
  `.version-log-dialog`, `.version-log-title`, `.version-log-entry` +
  `.version-log-version`/`.version-log-today`/`.version-log-description`),
  בעלות אותם ערכים כמו `.settings-backdrop`/`.settings-dialog`/`.settings-title`
  — לא שיתוף המחלקות עצמן, בהמשך לעיקרון הקיים בקובץ (ראו ההערה מעל
  `.settings-backdrop`: "sharing one class would tie every future tweak of one
  dialog to the other"). `.app-version` עצמה מקבלת `cursor: pointer` וכמה
  reset properties כדי שכפתור ייראה זהה לפסקה הקיימת (`background: none;
  border: none; padding: 0; font: inherit;` וכו').
- **`docs/features/version-log/architecture.md`** — המסמך הזה.

## Data / State Changes
```ts
// src/data/changelog.ts
export interface ChangelogEntry {
  version: string;
  description: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.5.0", // יעודכן בפועל ל-developer לפי תוצאת bump:feature
    description: "לוג גרסאות — אפשר לראות כאן מה היה בכל גרסה.",
  },
];
```
`VersionLog` לא מחזיק state משלו מעבר ל-`open`/`onClose` שמגיעים מההורה — אותו
דפוס כמו `SettingsDialog`.

## Technical Approach
- `VersionLog` מרנדר `null` כש-`open === false` (כמו `SettingsDialog`).
- הרשימה היא `CHANGELOG.map(...)`, בלי מיון בזמן ריצה — הקובץ עצמו **הוא**
  המקור הסדור (חדש למעלה), כך שאין לוגיקת מיון שיכולה להישבר.
- שורה שה-`version` שלה שווה ל-`APP_VERSION` (מ-`src/data/version.ts`) מקבלת
  `<span className="version-log-today">(היום)</span>` לצד המספר. השוואת
  מחרוזות פשוטה — שני הצדדים מגיעים מ-`package.json` באותו build, אז אין
  בעיית פורמט.
- מספר הגרסה בכל שורה עובר ב-`<span className="version-log-version">` נפרד
  מהתיאור — ראו Accessibility/RTL notes ב-design.md.
- **כלל עבודה קדימה (לא קוד, אלא תהליך):** מכאן ואילך, כל פעם שה-`developer`
  של פיצ'ר/תיקון עתידי מריץ `npm run bump:feature`/`bump:fix`, הוא גם מוסיף
  שורה אחת בראש `CHANGELOG` (`version` = המספר החדש מ-`package.json` אחרי
  ה-bump, `description` = שורה-שתיים בעברית של מה השתנה) — **באותו commit**
  שמריץ את ה-bump, לא כשלב נפרד. זה לא מוסף ל-skill `developer` הכללי כקוד
  (הוא לא תלוי בפיצ'ר הזה) — זה חלק מ"סיימתי את ה-bump" לכל פיצ'ר הבא, בדיוק
  כמו הרמת מספר הגרסה עצמה כבר נחשבת חלק מהגמר. התיעוד המחייב את זה נמצא
  ב-product-spec.md של הפיצ'ר הזה; כדאי שסבב ריוויו הבא על הפיצ'ר הזה יוסיף
  גם תזכורת קצרה בהערת-ה-docstring של `scripts/bump-version.mjs` (שורה אחת,
  לא שינוי התנהגות הסקריפט) שמפנה ל-`src/data/changelog.ts` — זה המקום
  הטבעי שמפתח/ת עתידי/ת יקרא/תקרא בו ממילא לפני/אחרי ההרצה.

## Edge Cases
- **רק שורה אחת ב-`CHANGELOG`** (היום שהפיצ'ר הזה נכנס): מוצגת שורה בודדת,
  לא מסך ריק — נכון מעצם זה שה-`map` פשוט מרנדר כמה שורות יש.
- **`APP_VERSION` לא תואם לאף שורה** (לא אמור לקרות אם הכלל התהליכי לעיל
  נשמר, אבל אם מישהו עשה `bump` בלי להוסיף שורה): הרשימה עדיין מוצגת, רק בלי
  תג "(היום)" על אף שורה — לא קריסה, לא מסך שגיאה.
- **רשימה ארוכה**: `.version-log-dialog` עם `overflow-y: auto` + `max-height`,
  אותו דפוס כמו `.settings-dialog` — גוללת בלי לשבור את הפריסה.

## Risks / Tradeoffs
- **תחזוקה ידנית, לא אוטומטית מ-git/commit messages.** נבחר בכוונה (ראו
  Out of Scope ב-product-spec.md) — שליפה אוטומטית מהיסטוריית git מצריכה
  build step שקורא git בזמן build (אפשרי עם Vite, כבר נעשה למספר הגרסה
  עצמו ב-`vite.config.ts`), אבל הופכת את התיאור לכותרת commit/PR טכנית
  שלא נכתבה בהכרח בשביל משתמש לא-מתכנת. קובץ נתונים ידני נותן שליטה מלאה על
  הניסוח בעברית, במחיר שמישהו (ה-`developer` העתידי) צריך לזכור להוסיף שורה —
  זה הסיכון האמיתי כאן, וה"כלל עבודה קדימה" לעיל הוא ההתמודדות איתו.
- **אין הגבלת אורך לרשימה.** מספר הגרסאות צפוי להישאר קטן (עשרות, לא מאות)
  בקנה מידה של הפרויקט הזה — לא נראה כיום מצדיק pagination.

## Open Questions
None.
