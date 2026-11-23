/**
 * A fixed visual tag for a student's card — a shape and a color, so a child who can't
 * read yet (see docs/features/stitch-visual-refresh/) can still pick out her own card.
 *
 * Deterministic from the student's own `id`, not random: the same student gets the same
 * tag every time the app loads, never reassigned on a later visit.
 */

const SHAPES = ["⭐", "▲", "◆", "●", "■"] as const;

/** Pastel, distinct from --accent (the app's single pink) so the tag never reads as a
 *  "selected" or "hover" state. */
const COLORS = ["#8a7fd1", "#2f9e73", "#c98a1f", "#2f8fc9", "#d1634f"] as const;

export interface StudentBadge {
  glyph: string;
  color: string;
}

/** Simple, stable string hash — not cryptographic, just needs to be the same for the
 *  same id every time. */
function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function studentBadge(id: string): StudentBadge {
  const h = hash(id);
  // Two independent indices (not one combined lookup) so the shape and the color vary
  // separately — up to SHAPES.length * COLORS.length distinct tags, not just SHAPES.length.
  return {
    glyph: SHAPES[h % SHAPES.length],
    color: COLORS[Math.floor(h / SHAPES.length) % COLORS.length],
  };
}
