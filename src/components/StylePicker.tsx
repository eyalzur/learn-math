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
 * Picking which kind of exercise to practise — what the teacher taught today.
 *
 * The card shows only the style's name; the example question that used to sit under it
 * is still readable aloud through the speaker button beside the card, via
 * `style.example.prompt` directly.
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
