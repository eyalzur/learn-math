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
 * Indexes only elements that are both laid out (`offsetParent`) and currently
 * intersecting the viewport (per `inViewport`) — an element scrolled off-screen (a
 * long topic list, for instance) gets its animation explicitly paused instead of
 * continuing to animate unseen, so the browser isn't doing animation work for
 * something nobody can look at. An element that scrolls back into view has its inline
 * `animationPlayState` cleared, handing control back to the stylesheet's own rules
 * (running by default, or paused by :hover/:focus/:has(dialog) — same mechanism, no
 * conflict).
 */
function reindex(inViewport: ReadonlySet<Element>): void {
  const all = [...document.querySelectorAll<HTMLElement>(SELECTOR)].filter(
    (el) => el.offsetParent !== null,
  );
  const visible = sortByScreenPosition(all.filter((el) => inViewport.has(el)));
  const offscreen = all.filter((el) => !inViewport.has(el));

  visible.forEach((el, i) => {
    el.style.setProperty("--spot-i", String(i));
    el.style.setProperty("--spot-n", String(visible.length));
    el.style.animationPlayState = "";
  });
  offscreen.forEach((el) => {
    el.style.animationPlayState = "paused";
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
 * The IntersectionObserver matters for a different reason: a screen whose cards
 * overflow one viewport (a long topic list) still had every card indexed and
 * animating even while scrolled out of view, before this — reported live as
 * unnecessary animation work for elements nobody can see. Re-observing happens on
 * every DOM mutation too, so a newly-appeared element gets tracked without a second
 * wiring path.
 *
 * Both observers' callbacks batch onto a single animation frame, so a burst of
 * mutations or intersection changes from one state change reindexes once, not once
 * per record.
 */
export function startIdleSpotlightObserver(): () => void {
  const inViewport = new Set<Element>();
  let frame: number | null = null;
  const scheduleReindex = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      reindex(inViewport);
    });
  };

  const intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) inViewport.add(entry.target);
      else inViewport.delete(entry.target);
    }
    scheduleReindex();
  });

  const observeAllMatches = () => {
    document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => intersectionObserver.observe(el));
  };

  const mutationObserver = new MutationObserver(() => {
    observeAllMatches();
    scheduleReindex();
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });

  observeAllMatches();
  scheduleReindex();

  return () => {
    intersectionObserver.disconnect();
    mutationObserver.disconnect();
    if (frame !== null) cancelAnimationFrame(frame);
  };
}
