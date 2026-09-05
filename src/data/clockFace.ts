import type { Question } from "./curriculum";

/**
 * The picture a "שעון וזמן" question shows — read off `question.id`, not
 * `question.prompt`. Every other diagram extractor in this app (`geometryShape`,
 * `percentStrip`, ...) parses `prompt`, because their prompts are Hebrew sentences that
 * already state the numbers ("שטח מלבן שאורכו 5 ורוחבו 4"). This topic's prompt cannot
 * do that — "איזו שעה מראה השעון?" states no time at all, on purpose: the picture *is*
 * the given information, not a restatement of something already in the text. So the time
 * lives in `id` instead, and this function is `id`'s reader — the same "derive and
 * verify from a field already on the question" principle every other extractor follows,
 * just reading a different field.
 *
 * `id` shapes (an optional trailing `-{digits}` is always allowed and ignored — the
 * written questions below don't have one, the adaptive generator's do, for uniqueness
 * across repeated calls; see adaptiveClock.ts):
 *   easy:     `g2-clock-e{n}-h{H}`                    — hour H, minute 0
 *   medium:   `g2-clock-m{n}-h{H}`                     — hour H, minute 30
 *   hard:     `g2-clock-h{n}-h{H1}m{M1}-h{H2}m{M2}`    — start H1:M1, end H2:M2
 */
export type ClockFaceData =
  | { kind: "single"; hour: number; minute: 0 | 30; caption: string }
  | {
      kind: "duration";
      start: { hour: number; minute: 0 | 30 };
      end: { hour: number; minute: 0 | 30 };
      caption: string;
    };

const HOUR_WORDS = [
  "",
  "אחת",
  "שתיים",
  "שלוש",
  "ארבע",
  "חמש",
  "שש",
  "שבע",
  "שמונה",
  "תשע",
  "עשר",
  "אחת עשרה",
  "שתים עשרה",
];

function hourWord(hour: number): string {
  return HOUR_WORDS[hour] ?? String(hour);
}

function timeCaption(hour: number, minute: 0 | 30): string {
  return minute === 0 ? `השעון מראה ${hourWord(hour)}` : `השעון מראה חצי שעה אחרי ${hourWord(hour)}`;
}

export function clockFace(question: Question): ClockFaceData | null {
  const id = question.id;

  const single = id.match(/^g2-clock-(e|m)[^-]*-h(\d{1,2})(?:-\d+)?$/);
  if (single) {
    const hour = Number(single[2]);
    // Which of the two written tiers this is comes from the id's own prefix, not a
    // guess: `e`/`easy` (minute 0) vs `m`/`medium` (minute 30) right after `clock-`.
    const minute: 0 | 30 = single[1].startsWith("e") ? 0 : 30;
    if (hour < 1 || hour > 12) return null;
    if (question.answer !== hour) return null;
    return { kind: "single", hour, minute, caption: timeCaption(hour, minute) };
  }

  const duration = id.match(/^g2-clock-h[^-]*-h(\d{1,2})m(0|30)-h(\d{1,2})m(0|30)(?:-\d+)?$/);
  if (duration) {
    const [, h1, m1, h2, m2] = duration;
    const start = { hour: Number(h1), minute: Number(m1) as 0 | 30 };
    const end = { hour: Number(h2), minute: Number(m2) as 0 | 30 };
    const elapsed = end.hour * 60 + end.minute - (start.hour * 60 + start.minute);
    const normalizedElapsed = elapsed <= 0 ? elapsed + 12 * 60 : elapsed;
    if (question.answer !== normalizedElapsed) return null;
    return {
      kind: "duration",
      start,
      end,
      caption: `משעה ${hourWord(start.hour)}${start.minute === 30 ? " וחצי" : ""} עד שעה ${hourWord(end.hour)}${end.minute === 30 ? " וחצי" : ""}`,
    };
  }

  return null;
}
