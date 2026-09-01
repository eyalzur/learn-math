import type { ExplanationBundle } from "../data/questionExplanation";
import { segmented } from "./segmented";
import { NumberLine } from "./NumberLine";
import { TenFrame } from "./TenFrame";
import { TwentyStrip } from "./TwentyStrip";
import { FractionCircle } from "./FractionCircle";
import { GeometryShape } from "./GeometryShape";
import { PythagorasTriangle } from "./PythagorasTriangle";
import { PercentStrip } from "./PercentStrip";
import { RatioStrips } from "./RatioStrips";
import { LinearGraph } from "./LinearGraph";
import { AngleShape } from "./AngleShape";

interface QuestionExplanationProps {
  bundle: ExplanationBundle;
  /** The 🔊 button in the header — omitted entirely when speech isn't offered here, same
   *  as every other speak button in the app (gated on `speechSupported()` by the caller). */
  speak?: { active: boolean; onToggle: () => void };
}

/**
 * "How is this solved?" — method sentence, every diagram this question's data can draw,
 * the worked steps, and the analogy. Moved out of Practice.tsx so the lesson screen
 * (docs/features/topic-lesson) can show the identical panel without a wrong answer ever
 * having happened, and so a diagram wired into one screen can't be forgotten in the other.
 */
export function QuestionExplanation({ bundle, speak }: QuestionExplanationProps) {
  const {
    explanation,
    method,
    diagram,
    frame,
    strip,
    vertical,
    line,
    geometry,
    pythagoras,
    percent,
    ratio,
    linear,
    angle,
  } = bundle;
  if (explanation === null) return null;

  return (
    <div className="explanation">
      <div className="explanation-header">
        <h3>איך פותרים?</h3>
        {speak && (
          <button
            type="button"
            className="speak-button"
            onClick={speak.onToggle}
            aria-label={speak.active ? "עצרו את ההקראה" : "הקריאו לי את ההסבר"}
          >
            {speak.active ? "⏹" : "🔊"}
          </button>
        )}
      </div>
      {method && <p className="explanation-method">{segmented(method)}</p>}
      {diagram && (
        <figure className="fraction-figure">
          <FractionCircle diagram={diagram} label={diagram.caption.replace(/`/g, "")} />
          <figcaption className="fraction-caption">{segmented(diagram.caption)}</figcaption>
        </figure>
      )}
      {frame && (
        <figure className="ten-frame-figure">
          <TenFrame frame={frame} label={frame.caption.replace(/`/g, "")} />
          <figcaption className="figure-caption">{segmented(frame.caption)}</figcaption>
        </figure>
      )}
      {strip && (
        <figure className="twenty-strip-figure">
          <TwentyStrip strip={strip} label={strip.caption.replace(/`/g, "")} />
          <figcaption className="figure-caption">{segmented(strip.caption)}</figcaption>
        </figure>
      )}
      {vertical && (
        <figure className="vertical-figure">
          {/* One LTR island. Rows arrive pre-padded from the data module, so the
              alignment lives where a test can read it off a string — never in CSS,
              and never at the mercy of the page's bidi algorithm. */}
          <div className="vertical-sum" role="img" aria-label={vertical.caption.replace(/`/g, "")}>
            {vertical.carries && (
              <div className="vs-carries" aria-hidden="true">
                {vertical.carries}
              </div>
            )}
            <div className="vs-row" aria-hidden="true">
              {vertical.top}
            </div>
            <div className="vs-row" aria-hidden="true">
              {vertical.bottom}
            </div>
            <div className="vs-row vs-result" aria-hidden="true">
              {vertical.result}
            </div>
          </div>
          <figcaption className="vertical-caption">{segmented(vertical.caption)}</figcaption>
        </figure>
      )}
      {line && (
        <figure className="number-line-figure">
          {/* One aria-label because it is one picture, even though the caption is
              two lines and is spoken as two parts. */}
          <NumberLine line={line} label={line.caption.join(" ").replace(/`/g, "")} />
          <figcaption className="figure-caption">
            {line.caption.map((part, i) => (
              <span key={i} className="caption-line">
                {segmented(part)}
              </span>
            ))}
          </figcaption>
        </figure>
      )}
      {geometry && (
        <figure className="geometry-figure">
          <GeometryShape shape={geometry} label={geometry.caption.replace(/`/g, "")} />
          <figcaption className="figure-caption">{segmented(geometry.caption)}</figcaption>
        </figure>
      )}
      {pythagoras && (
        <figure className="pythagoras-figure">
          <PythagorasTriangle triangle={pythagoras} label={pythagoras.caption.replace(/`/g, "")} />
          <figcaption className="figure-caption">{segmented(pythagoras.caption)}</figcaption>
        </figure>
      )}
      {percent && (
        <figure className="percent-figure">
          <PercentStrip strip={percent} label={percent.caption.replace(/`/g, "")} />
          <figcaption className="figure-caption">{segmented(percent.caption)}</figcaption>
        </figure>
      )}
      {ratio && (
        <figure className="ratio-figure">
          {/* One aria-label because it is one picture, even though the caption is two
              lines and is spoken as two parts — same reasoning as the number line. */}
          <RatioStrips strips={ratio} label={ratio.caption.join(" ").replace(/`/g, "")} />
          <figcaption className="figure-caption">
            {ratio.caption.map((part, i) => (
              <span key={i} className="caption-line">
                {segmented(part)}
              </span>
            ))}
          </figcaption>
        </figure>
      )}
      {linear && (
        <figure className="linear-figure">
          <LinearGraph graph={linear} label={linear.caption.replace(/`/g, "")} />
          <figcaption className="figure-caption">{segmented(linear.caption)}</figcaption>
        </figure>
      )}
      {angle && (
        <figure className="angle-figure">
          <AngleShape shape={angle} label={angle.caption.replace(/`/g, "")} />
          <figcaption className="figure-caption">{segmented(angle.caption)}</figcaption>
        </figure>
      )}
      {explanation.steps.map((step, i) => (
        <p key={i} className="explanation-step">
          {/* Same isolation every other text field gets — a step label can carry a
              backtick-marked number (e.g. "`10%` זה `10/100`") exactly like a hint
              can, and without this it renders the backticks themselves instead of
              isolating the number they mark. */}
          <span>{segmented(step.label)}</span>
          {step.math && <span className="explanation-math">{step.math}</span>}
        </p>
      ))}
      <p className="explanation-analogy">💡 {explanation.analogy}</p>
    </div>
  );
}
