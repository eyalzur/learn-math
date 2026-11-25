import type { Student } from "./curriculum";

/**
 * The avatar a student can pick — a small, friendly, culturally neutral set of animal
 * emoji (docs/features/student-profile-avatar/). No images, no network.
 *
 * Stored as the stable `id`, never as the emoji itself, so a drawing can be swapped later
 * without invalidating anything already saved on a child's device.
 */
export interface Avatar {
  id: string;
  emoji: string;
  /** Short Hebrew name, used only as an accessible label. */
  label: string;
}

export const AVATARS: readonly Avatar[] = [
  { id: "fox", emoji: "🦊", label: "שועל" },
  { id: "panda", emoji: "🐼", label: "פנדה" },
  { id: "frog", emoji: "🐸", label: "צפרדע" },
  { id: "lion", emoji: "🦁", label: "אריה" },
  { id: "octopus", emoji: "🐙", label: "תמנון" },
  { id: "unicorn", emoji: "🦄", label: "חד-קרן" },
  { id: "turtle", emoji: "🐢", label: "צב" },
  { id: "dog", emoji: "🐶", label: "כלב" },
  { id: "cat", emoji: "🐱", label: "חתול" },
  { id: "rabbit", emoji: "🐰", label: "ארנב" },
  { id: "monkey", emoji: "🐵", label: "קוף" },
  { id: "owl", emoji: "🦉", label: "ינשוף" },
];

/** Same simple stable hash as `studentBadge` — only needs to be the same for the same id. */
function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * The avatar to show for a student: their chosen one, or — for a student who never chose
 * (including every student saved before avatars existed) — a default derived from their
 * `id`. Derived, not stored, so there is no migration and the default never changes
 * between visits. An unknown stored id falls back the same way instead of throwing.
 */
export function avatarFor(student: Pick<Student, "id" | "avatar">): Avatar {
  const chosen = AVATARS.find((a) => a.id === student.avatar);
  return chosen ?? AVATARS[hash(student.id) % AVATARS.length];
}
