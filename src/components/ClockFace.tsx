import type { ReactElement } from "react";
import type { ClockFaceData } from "../data/clockFace";

const SIZE = 140;
const SMALL_SIZE = 100;
const CENTER = SIZE / 2;
const SMALL_CENTER = SMALL_SIZE / 2;
const RADIUS = SIZE / 2 - 8;
const SMALL_RADIUS = SMALL_SIZE / 2 - 6;

/** `minute === 0` points the minute hand straight up (12); `minute === 30` points it
 *  straight down (6) — the only two positions this topic ever draws. */
function minuteAngle(minute: 0 | 30): number {
  return minute === 0 ? 0 : 180;
}

/** The hour hand moves continuously, not in twelve jumps: at a half hour it sits exactly
 *  halfway between the two numbers it's passing between — the same "true proportion, not
 *  a simplification" call already made for the Pythagoras triangle in `more-diagrams`,
 *  and the actual skill "עד דיוק חצי שעה" is testing. */
function hourAngle(hour: number, minute: 0 | 30): number {
  return (hour % 12) * 30 + (minute === 30 ? 15 : 0);
}

function tickMarks(center: number, radius: number): ReactElement[] {
  return Array.from({ length: 12 }, (_, i) => {
    const angle = ((i * 30 - 90) * Math.PI) / 180;
    const outer = radius;
    const inner = radius - 8;
    const x1 = center + outer * Math.cos(angle);
    const y1 = center + outer * Math.sin(angle);
    const x2 = center + inner * Math.cos(angle);
    const y2 = center + inner * Math.sin(angle);
    return <line key={i} className="clock-tick" x1={x1} y1={y1} x2={x2} y2={y2} />;
  });
}

function Hand({
  center,
  angle,
  length,
  className,
}: {
  center: number;
  angle: number;
  length: number;
  className: string;
}) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const x = center + length * Math.cos(rad);
  const y = center + length * Math.sin(rad);
  return <line className={className} x1={center} y1={center} x2={x} y2={y} />;
}

function Dial({ hour, minute, size, center, radius }: { hour: number; minute: 0 | 30; size: number; center: number; radius: number }) {
  return (
    <svg className="clock-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle className="clock-rim" cx={center} cy={center} r={radius} />
      {tickMarks(center, radius)}
      <Hand center={center} angle={hourAngle(hour, minute)} length={radius * 0.5} className="clock-hand clock-hand-hour" />
      <Hand center={center} angle={minuteAngle(minute)} length={radius * 0.78} className="clock-hand clock-hand-minute" />
      <circle className="clock-pivot" cx={center} cy={center} r={3} />
    </svg>
  );
}

interface ClockFaceProps {
  data: ClockFaceData;
  /** Read out by a screen reader in place of the picture. */
  label: string;
}

/** A single analog clock, or two side by side for a duration question — see
 *  docs/features/grade2-clock/design.md for why this is the one diagram in the app that
 *  renders next to the question itself, not only inside the explanation. */
export function ClockFace({ data, label }: ClockFaceProps) {
  if (data.kind === "single") {
    return (
      <div className="clock-face" role="img" aria-label={label}>
        <Dial hour={data.hour} minute={data.minute} size={SIZE} center={CENTER} radius={RADIUS} />
      </div>
    );
  }
  return (
    <div className="clock-face clock-pair" role="img" aria-label={label}>
      <div className="clock-pair-item">
        <Dial hour={data.start.hour} minute={data.start.minute} size={SMALL_SIZE} center={SMALL_CENTER} radius={SMALL_RADIUS} />
        <span className="clock-pair-caption">התחלה</span>
      </div>
      <div className="clock-pair-item">
        <Dial hour={data.end.hour} minute={data.end.minute} size={SMALL_SIZE} center={SMALL_CENTER} radius={SMALL_RADIUS} />
        <span className="clock-pair-caption">סיום</span>
      </div>
    </div>
  );
}
