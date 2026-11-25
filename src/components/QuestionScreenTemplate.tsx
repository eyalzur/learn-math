import type { ReactNode } from "react";

interface QuestionScreenTemplateProps {
  /** Back/exit action — every question screen has exactly one. */
  onBack: () => void;
  /** A second header link beside the back button — only `TopicLesson`'s
   *  "דלג לתרגול →" uses this today. */
  headerSecondaryAction?: ReactNode;
  /** The header's right-aligned secondary text — a progress counter or a grade label;
   *  the template doesn't care which, it's always just one short line. */
  headerRightLabel: string;

  /** The screen's title. `TopicLesson` composes its own trailing page-badge span
   *  inside this node exactly as it does today — the template has no opinion on that. */
  title: ReactNode;

  /** Speak button rendered above the problem box, not inside it — `TopicLesson`'s
   *  current placement only. See `inlineSpeak` below for the other placement. */
  standaloneSpeak?: ReactNode;

  /** Anything shown above the problem box but below the title/standalone-speak —
   *  today only `Practice`'s `QuantityDots` illustration. */
  aboveProblem?: ReactNode;

  /** The question text itself. Always present. */
  problemText: ReactNode;
  /** Picks the box's LTR/RTL handling — the one piece of real shared logic here.
   *  A Hebrew word problem reads right-to-left with the input below it; a bare
   *  arithmetic expression reads left-to-right beside it. Never guess this from the
   *  text's own characters — callers already derive it correctly (`isHebrewPrompt`). */
  isWordProblem: boolean;
  /** Speak button rendered inside the problem box, beside the text — `Practice`'s
   *  current placement only. See `standaloneSpeak` above for the other placement. */
  inlineSpeak?: ReactNode;

  /** Diagrams tied to this question (clock face, angle shape, ...) — identical source
   *  and placement on both current screens. */
  diagrams?: ReactNode;

  /** Proof-of-extensibility slot for a future per-question animation. Nothing renders
   *  here on either current screen — it exists so adding one later means extending
   *  this template once, not every screen that uses it. */
  animation?: ReactNode;

  /**
   * Everything after the diagrams/animation: answer area, feedback, hints,
   * explanation, page actions — deliberately NOT individual named slots.
   *
   * `Practice.tsx` and `TopicLesson.tsx` each already order this content
   * differently (Practice shows its wrong-answer explanation before its hints;
   * TopicLesson shows its always-visible hints before its explanation), and forcing
   * both through the same fixed slots would change one of their existing orders —
   * exactly what this refactor isn't supposed to do. Each screen keeps composing
   * this part itself and hands the result here, unchanged from what it renders today.
   */
  children?: ReactNode;
}

/**
 * The shared shape every question-style screen in this app is built from — header,
 * title, problem box (with its LTR/RTL direction logic), diagrams — so that a future
 * screen reuses this instead of re-deriving it, and so a future optional piece (the
 * `animation` slot above) is added once here rather than hunted down per screen.
 *
 * Deliberately stops short of owning the answer-area/feedback/hints/explanation content
 * (see `children`'s own doc comment) — those stay real per-screen differences, not
 * papered over by a one-size-fits-all slot. See
 * docs/features/question-screen-template/ for the full reasoning.
 */
export function QuestionScreenTemplate({
  onBack,
  headerSecondaryAction,
  headerRightLabel,
  title,
  standaloneSpeak,
  aboveProblem,
  problemText,
  isWordProblem,
  inlineSpeak,
  diagrams,
  animation,
  children,
}: QuestionScreenTemplateProps) {
  return (
    <div className="practice">
      <div className="practice-header">
        <button className="link-button" onClick={onBack}>
          ← חזרה
        </button>
        {headerSecondaryAction}
        <span className="progress">{headerRightLabel}</span>
      </div>
      {title}
      {standaloneSpeak}
      {aboveProblem}
      <div className={`problem-box problem-box-card ${isWordProblem ? "box-rtl" : "box-ltr"}`}>
        <span className={`problem-text ${isWordProblem ? "prompt-rtl" : "prompt-ltr"}`}>{problemText}</span>
        {inlineSpeak}
      </div>
      {diagrams}
      {animation}
      {children}
    </div>
  );
}
