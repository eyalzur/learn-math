import { isHebrewPrompt, promptSegments } from "../data/curriculum";
import type { Style } from "../data/style";
import { speechSupported } from "../data/speech";

interface StylePickerProps {
  /** The topic being drilled — shown as the heading. */
  heading: string;
  subheading: string;
  styles: Style[];
  onSelect: (style: Style) => void;
  onBack: () => void;
  /** Read the example aloud. Absent when this student has read-aloud off. */
  onSpeak?: (text: string) => void;
}

/**
 * The example question, rendered exactly the way the practice screen renders a prompt.
 *
 * Not a nicety: a mixed Hebrew-and-arithmetic string handed to the browser's bidi
 * algorithm renders backwards, and this app has shipped that bug three times. The rule
 * that came out of it is that Hebrew text and an arithmetic expression are always two
 * separate elements — so the example goes through the same split and the same isolation,
 * rather than through a `<span>` that happens to look fine on the questions we checked.
 */
function Example({ prompt }: { prompt: string }) {
  if (!isHebrewPrompt(prompt)) {
    return <span className="style-example-math">{prompt}</span>;
  }
  return (
    <span className="style-example-text">
      {promptSegments(prompt).map((segment, i) =>
        segment.kind === "math" ? (
          <span key={i} className="style-example-math">
            {segment.value}
          </span>
        ) : (
          <span key={i}>{segment.value}</span>
        ),
      )}
    </span>
  );
}

/**
 * Picking which kind of exercise to practise — what the teacher taught today.
 *
 * Mika is seven and still learning to read, and unlike the three levels these have no
 * natural order to colour-code. So the card carries a **real question from the style**,
 * and that is the label: a question looks different from another question long before it
 * can be read, it is more exact than any name, and it is what was on the board today.
 */
export function StylePicker({
  heading,
  subheading,
  styles,
  onSelect,
  onBack,
  onSpeak,
}: StylePickerProps) {
  const canSpeak = onSpeak !== undefined && speechSupported();

  return (
    <div className="grade-home">
      <div className="grade-header">
        <button className="link-button" onClick={onBack}>
          ← חזרה
        </button>
        <span className="greeting">{subheading}</span>
      </div>

      <h1>{heading}</h1>

      <p className="subtitle">על מה המורה לימד/ה היום?</p>
      <div className="style-grid">
        {styles.map((style) => (
          <div key={style.id} className="style-row">
            <button className="style-card" onClick={() => onSelect(style)}>
              <span className="style-title">{style.title}</span>
              <span className="style-example">
                <Example prompt={style.example.prompt} />
              </span>
              <span className="style-count">{style.questions.length} שאלות</span>
            </button>
            {canSpeak && (
              /* Beside the card, never inside it: a button within a button is invalid
                 HTML, and nesting them would also make tapping the speaker ambiguous
                 with choosing the lesson. */
              <button
                type="button"
                className="style-speak"
                aria-label={`להקריא: ${style.example.prompt.replace(/`/g, "")}`}
                onClick={() => onSpeak(style.example.prompt)}
              >
                <span aria-hidden="true">🔊</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
