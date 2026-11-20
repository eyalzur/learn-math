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
