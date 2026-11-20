/**
 * Indexes the currently-visible primary cards/buttons with CSS custom properties
 * (--spot-i, --spot-n) so a single shared CSS animation (App.css's idle-breathe) can
 * stagger a "breathing glow" across them with negative animation-delay, without any
 * per-frame JS — see docs/features/idle-spotlight/architecture.md.
 *
 * Narrower than playful-redesign's button selector on purpose: this cycle should only
 * visit primary choices (student/grade/topic/level/style cards, "בדיקה"/"יצירה"/etc.),
 * not every small utility icon (🔊/💡/⚙️/🗑/text links) — those would make the cycle
 * long and defeat "gentle".
 */
const SELECTOR =
  ".student-card, .grade-card, .topic-card, .level-card, .style-card, " +
  "button:not(.app-version):not(.speak-button):not(.hint-button)" +
  ":not(.link-button):not(.student-card-delete):not(.settings-button)";

export function reindexIdleSpotlight(): void {
  const visible = [...document.querySelectorAll<HTMLElement>(SELECTOR)].filter(
    (el) => el.offsetParent !== null,
  );
  visible.forEach((el, i) => {
    el.style.setProperty("--spot-i", String(i));
    el.style.setProperty("--spot-n", String(visible.length));
  });
}
