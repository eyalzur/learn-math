// Central feedback layer for the two cloud apps (kids + parents). Every press, success and
// failure goes through here — no ad-hoc vibrate/sound/animation calls in screens.
// Visual motion lives in cloud.css (tokens mirrored in `motion` below). Spec: /INTERACTIONS.md.
// Sound is a placeholder: no audio files exist yet, and it is OFF by default.

export type Level = 'small' | 'medium' | 'big';

// Motion tokens, ms. Mirror of the --dur-* variables in cloud.css — change both together.
export const motion = { instant: 80, fast: 150, base: 250, slow: 400, celebrate: 900 } as const;

// User settings. Haptics on by default (silently no-op where unsupported, e.g. iPhone Safari).
// Sound slots are named but unwired until the user supplies files.
export const feedbackSettings = { haptics: true, sound: false };

export const SOUND_SLOTS = ['tap', 'success', 'fail'] as const;
type Slot = (typeof SOUND_SLOTS)[number];

export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function vibrate(pattern: number | number[]) {
  if (!feedbackSettings.haptics || typeof navigator === 'undefined') return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Unsupported device or blocked by the browser — the visual feedback still runs.
  }
}

// Placeholder: will play the file for `slot` once the user supplies it. Off by default.
function play(slot: Slot) {
  if (!feedbackSettings.sound) return;
  void slot;
}

let lastTapAt = 0;
const DEBOUNCE_MS = 60; // ignore repeat feedback within 60ms (double-fire guard)

export const feedback = {
  // Light acknowledgement for any press. Fires on touch-DOWN, same frame as the visual pressed state.
  tap() {
    const now = performance.now();
    if (now - lastTapAt < DEBOUNCE_MS) return;
    lastTapAt = now;
    vibrate(8);
    play('tap');
  },
  // Small: one short pulse. Medium/big: a short pattern. Bigger events feel bigger.
  success(level: Level = 'small') {
    vibrate(level === 'small' ? [10] : level === 'medium' ? [12, 40, 12] : [15, 60, 15, 60, 30]);
    play('success');
  },
  // Soft failure: one gentle pulse, never a buzz pattern.
  fail() {
    vibrate([20]);
    play('fail');
  },
};

// Kids' topic picker is rendered inside `.cloud-kids-scope` (ChildApp.tsx), so its selectors are scoped too.
const TAP_SELECTOR =
  '.cloud-btn, .cloud-kid, .cloud-link, .cloud-tabs button, ' +
  '.cloud-kids-scope .topic-card, .cloud-kids-scope .settings-button, .cloud-kids-scope .lessons-chip, .cloud-kids-scope .link-button';
let installed = false;

// Attach ONE document-level listener. Idempotent. Called from the cloud apps' effects, never at
// import time, so the live app (which imports KidsApp but does not mount it) gets no listener.
export function installFeedback() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target instanceof Element ? event.target.closest(TAP_SELECTOR) : null;
      if (target && !(target as HTMLButtonElement).disabled) feedback.tap();
    },
    { passive: true },
  );
}
