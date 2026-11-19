/**
 * What changed in each version, newest first. Hand-maintained — not derived from git or
 * commit messages, so the wording can speak to a non-programmer (docs/features/version-log).
 *
 * Starts from the version this file itself shipped in; versions before that aren't
 * reconstructed here. From now on, every `npm run bump:feature`/`bump:fix` adds one new
 * entry at the top of this array, in the same commit as the bump.
 */
export interface ChangelogEntry {
  version: string;
  description: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.43.0",
    description: "לוג גרסאות — אפשר לראות כאן מה היה בכל גרסה.",
  },
];
