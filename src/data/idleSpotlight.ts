/**
 * Indexes the currently-visible-in-viewport primary cards/buttons with CSS custom
 * properties (--spot-i, --spot-n) so a single shared CSS animation (App.css's
 * idle-breathe) can stagger a "breathing glow" across them with negative
 * animation-delay, without any per-frame JS — see docs/features/idle-spotlight/
 * architecture.md.
 *
 * Narrower than playful-redesign's button selector on purpose: this cycle should only
 * visit primary choices (student/grade/topic/level/style cards, "בדיקה"/"יצירה"/etc.),
 * not every small utility icon (🔊/💡/⚙️/🗑/text links) — those would make the cycle
 * long and defeat "gentle".
 *
 * The visit order itself is screen-position order (top row before bottom row,
 * right-to-left within a row), not DOM order — see `sortByScreenPosition` below and
 * docs/features/idle-spotlight-direction-visibility/.
 */
const SELECTOR =
  ".student-card, .grade-card, .topic-card, .level-card, .style-card, " +
  "button:not(.app-version):not(.speak-button):not(.hint-button)" +
  ":not(.link-button):not(.student-card-delete):not(.settings-button)";

/**
 * Orders elements the way an eye scanning the screen would: top row first, and
 * right-to-left within a row (RTL reading order) — not DOM order, which the idle
 * cycle used to rely on and which doesn't always match visual position (see
 * docs/features/idle-spotlight-direction-visibility/product-spec.md).
 *
 * "Row" is a visual grouping, not a layout concept this function can read off
 * CSS (grid/flex) directly — so two elements are the same row when their `top`s
 * are within half of the first element's own height of each other. Half-height is
 * forgiving enough to tolerate small height differences within one real row (e.g. a
 * slightly taller icon) without merging two genuinely different rows, which a typical
 * row-to-row gap comfortably exceeds. Every element on a single screen here is the
 * same kind of card (a uniform grid), so this hasn't needed to handle very
 * mixed-height rows in practice.
 */
function sortByScreenPosition(elements: HTMLElement[]): HTMLElement[] {
  const withRects = elements.map((el) => ({ el, rect: el.getBoundingClientRect() }));
  withRects.sort((a, b) => a.rect.top - b.rect.top);

  const rows: (typeof withRects)[] = [];
  for (const item of withRects) {
    const row = rows.at(-1);
    const rowTop = row?.[0].rect.top;
    if (row && rowTop !== undefined && Math.abs(item.rect.top - rowTop) <= item.rect.height / 2) {
      row.push(item);
    } else {
      rows.push([item]);
    }
  }

  // Right-first within a row, matching RTL reading order.
  rows.forEach((row) => row.sort((a, b) => b.rect.right - a.rect.right));
  return rows.flat().map((item) => item.el);
}

/**
 * Indexes every laid-out (`offsetParent`) matching element by screen position —
 * regardless of intersection status, unlike the old version of this function. App.css's
 * `playful-pop-in` (the one-shot card entrance) now reads --spot-i too, not just the
 * infinite idle-breathe cycle (see its own big comment in App.css) — and a one-shot
 * animation can't tolerate --spot-i arriving late the way idle-breathe always could.
 * `IntersectionObserver` callbacks are asynchronous and not guaranteed within the
 * element's first paint, so a brand-new card used to render one frame with no
 * --spot-i at all (falling back to 0 — no stagger) and then, once the observer
 * reported in and a real index arrived, the entrance *visibly restarted* with the
 * correct delay — found live, as a double-pop glitch, the first time --spot-i drove
 * playful-pop-in's delay. Indexing synchronously from the MutationObserver callback
 * below (not only via the rAF-batched IntersectionObserver path) means every element
 * has its real, final index before the browser ever paints it, so playful-pop-in
 * never has anything to restart.
 *
 * Visibility-based pausing is now a separate concern, tracked by `offscreen` (elements
 * the IntersectionObserver has positively reported as not intersecting) rather than by
 * what this function indexes — a brand-new element defaults to *not* paused (nothing
 * in `offscreen` yet) instead of defaulting to paused-until-proven-visible, which would
 * freeze its entrance invisibly at scale(0.5)/opacity:0 for however long the first
 * intersection callback takes. An element that scrolls back into view has its inline
 * `animationPlayState` cleared, handing control back to the stylesheet's own rules
 * (running by default, or paused by :hover/:focus/:has(dialog) — same mechanism, no
 * conflict).
 */
function reindex(offscreen: ReadonlySet<Element>): void {
  const all = [...document.querySelectorAll<HTMLElement>(SELECTOR)].filter(
    (el) => el.offsetParent !== null,
  );
  const ordered = sortByScreenPosition(all);

  ordered.forEach((el, i) => {
    el.style.setProperty("--spot-i", String(i));
    el.style.setProperty("--spot-n", String(ordered.length));
    el.style.animationPlayState = offscreen.has(el) ? "paused" : "";
  });
}

/**
 * Keeps the index live for the app's whole lifetime via a MutationObserver plus an
 * IntersectionObserver, instead of relying on App's own render cycle or a one-time
 * scan.
 *
 * The MutationObserver matters because a dialog whose open/closed state lives in a
 * descendant component (e.g. StudentPicker's `createOpen`, not App's own state) never
 * causes App itself to re-render — found live: a reindex placed in App's own
 * render-cycle effect never fired when such a dialog opened, so every element inside
 * it (the create-student dialog's own .grade-card buttons) was left with no --spot-i
 * at all, defaulting the `calc(var(--spot-i, 0) * -1s)` delay to the same 0s for all
 * of them — "all breathing together" instead of staggered, reported live. A
 * MutationObserver on the whole document doesn't care which component's state
 * changed; any DOM mutation anywhere re-observes new elements and reindexes.
 *
 * Since playful-pop-in also reads --spot-i now (see reindex()'s own comment), a
 * genuinely new, not-yet-indexed card needs its real index *synchronously*, before
 * first paint — but the mutation callback above fires on every DOM change anywhere in
 * the app, not just a new card mounting (typing a digit on the number pad, checking an
 * answer, a hint appearing — all childList mutations somewhere in the tree). Running
 * the full querySelectorAll-and-getBoundingClientRect pass synchronously on *every one
 * of those* (not just rAF-batched, as it used to be) was tried first and found live to
 * force layout far more often than the feature needs — a long correct-answer streak on
 * the number-pad screen got visibly less reliable (an occasional dropped digit), and a
 * separate screen-fade-in animation sometimes read as already-finished a frame too
 * soon, from the same extra forced layout work landing mid-transition. `hasUnindexed`
 * below is a cheap check (no layout forced, just an inline-style read) that's false for
 * all those ordinary mutations once the screen has already been indexed once — only a
 * truly new, real card skips it and pays for the synchronous pass.
 *
 * The IntersectionObserver matters for a different reason: a screen whose cards
 * overflow one viewport (a long topic list) still had every card indexed and
 * animating even while scrolled out of view, before this — reported live as
 * unnecessary animation work for elements nobody can see. Re-observing happens on
 * every DOM mutation too, so a newly-appeared element gets tracked without a second
 * wiring path. Its own callback still goes through the rAF-batched path — it only
 * ever touches play/pause, never the index, so batching it costs nothing.
 */
export function startIdleSpotlightObserver(): () => void {
  const offscreen = new Set<Element>();
  let frame: number | null = null;
  const scheduleReindex = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      reindex(offscreen);
    });
  };

  const hasUnindexed = () =>
    [...document.querySelectorAll<HTMLElement>(SELECTOR)].some(
      (el) => el.offsetParent !== null && el.style.getPropertyValue("--spot-i") === "",
    );

  const intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) offscreen.delete(entry.target);
      else offscreen.add(entry.target);
    }
    scheduleReindex();
  });

  const observeAllMatches = () => {
    document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => intersectionObserver.observe(el));
  };

  const mutationObserver = new MutationObserver(() => {
    observeAllMatches();
    if (hasUnindexed()) reindex(offscreen);
    scheduleReindex();
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });

  observeAllMatches();
  reindex(offscreen);

  return () => {
    intersectionObserver.disconnect();
    mutationObserver.disconnect();
    if (frame !== null) cancelAnimationFrame(frame);
  };
}
