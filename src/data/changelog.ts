/**
 * What changed in each version, newest first. Hand-maintained — not derived from git or
 * commit messages, so the wording can speak to a non-programmer (docs/features/version-log).
 *
 * `icon` is a required field, not optional — a single emoji that gives the entry a visual
 * anchor so the log reads as a row of small cards, not a wall of text (the user explicitly
 * asked for "גם עם תמונות וגם עם מלל" — real screenshots would go stale with the questions
 * themselves, so this is the lightweight, always-current equivalent).
 *
 * Starts from the version this file itself shipped in; versions before that aren't
 * reconstructed here. From now on, every `npm run bump:feature`/`bump:fix` adds one new
 * entry at the top of this array, in the same commit as the bump.
 */
export interface ChangelogEntry {
  version: string;
  icon: string;
  description: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.53.2",
    icon: "📌",
    description: "בלוג הגרסאות, כפתור הסגירה נשאר קבוע על המסך גם כשגוללים ברשימה.",
  },
  {
    version: "1.53.1",
    icon: "✨",
    description: "זרקור-המנוחה עובר בין כפתורים לפי הסדר שהעין רואה (מלמעלה למטה, מימין לשמאל), ובולט יותר.",
  },
  {
    version: "1.53.0",
    icon: "🚪",
    description: "כל מסך-תפריט דוהה בעדינות פנימה כשנכנסים אליו.",
  },
  {
    version: "1.52.0",
    icon: "💡",
    description: "חדש: במסך \"ההתקדמות שלי\", נושא שקשה בו לאחרונה מקבל כרטיס עם קישור לתרגול ישיר.",
  },
  {
    version: "1.51.1",
    icon: "🔁",
    description: "תיקון: בנושאים אדפטיביים, שתי שאלות זהות (אותם מספרים) כבר לא יוצאות ברצף.",
  },
  {
    version: "1.51.0",
    icon: "🎯",
    description: "חדש: בורר \"קצב שינוי הקושי\" (אטי/בינוני/מהיר) בדיאלוג ⚙️, לכל תרגול אדפטיבי.",
  },
  {
    version: "1.50.1",
    icon: "🔧",
    description: "תיקון: בדיאלוג \"הוספת תלמיד/ה\", כפתורי הכיתה כבר לא נושמים כולם ביחד.",
  },
  {
    version: "1.50.0",
    icon: "🔗",
    description: "קישורי \"חזרה\" ו\"החלף תלמיד\" מרגישים קלילים יותר, לא נדחסים זה בזה.",
  },
  {
    version: "1.49.0",
    icon: "✨",
    description: "זוהר עדין עובר בין הכפתורים כל כמה שניות, ורקע המסך קצת חי — בלי להפריע, כל עוד לא לוחצים.",
  },
  {
    version: "1.48.1",
    icon: "⌨️",
    description: "תיקון: כותרת מסך התרגול כבר לא נעלמת למעלה כשהמקלדת נפתחת בטלפון.",
  },
  {
    version: "1.48.0",
    icon: "📲",
    description:
      "אפשר להתקין את האפליקציה על מסך הבית (אייפון/אנדרואיד), עם אייקון וכיתוב \"משחקים במספרים\" משלה.",
  },
  {
    version: "1.47.1",
    icon: "🔧",
    description:
      "תיקונים: טקסט כבר לא מסומן בכחול בטעות, כפתור השאלה נשאר במקומו כשהמקלדת נפתחת, ושני כפתורי מסך הסיום ממורכזים יפה.",
  },
  {
    version: "1.47.0",
    icon: "🎮",
    description: "כל הכפתורים והכרטיסים מרגישים יותר כמו משחק — לחיצה אמיתית, קפיצה בכניסה, וכוכב ⭐ על תשובה נכונה.",
  },
  {
    version: "1.46.1",
    icon: "🔧",
    description: "תיקון קטן: כפתור \"ההתקדמות שלי\" נראה עכשיו כמו כפתור אמיתי, לא כמו טקסט תלוש.",
  },
  {
    version: "1.46.0",
    icon: "👤",
    description:
      "אפשר ליצור ולמחוק תלמידים ישירות במסך הבחירה — כל אחד שומר את ההתקדמות שלו בנפרד על המכשיר.",
  },
  {
    version: "1.45.1",
    icon: "🔧",
    description:
      "תיקונים קטנים: גלילה בלוג הגרסאות לא מזיזה יותר את הרקע, מספר הגרסה עבר לפינה, פער קושי בחזקות ושורשים תוקן, ומסך הסיום חוגג יותר.",
  },
  {
    version: "1.45.0",
    icon: "🗂️",
    description: "לוג גרסאות — אפשר לראות כאן, בלחיצה על מספר הגרסה, מה היה בכל גרסה.",
  },
  {
    version: "1.44.0",
    icon: "🎨",
    description: "עיצוב חדש לכל האפליקציה — ממתקייה: צבעים, גופנים וצורות אחרים.",
  },
  {
    version: "1.43.0",
    icon: "🎯",
    description:
      "תרגול בלי מחברת — מקלידים את התשובה הסופית, ומקבלים משוב מיידי ועכשיו גם ניקוד וסטטיסטיקה.",
  },
];
