import type { Question } from "./curriculum";
import { explainQuestion } from "./explain";
import { fractionDiagram } from "./fractionDiagram";
import { methodSentence } from "./method";
import { verticalSum } from "./verticalSum";
import { numberLine } from "./numberLine";
import { tenFrame } from "./tenFrame";
import { twentyStrip } from "./twentyStrip";
import { geometryShape } from "./geometryShape";
import { pythagorasTriangle } from "./pythagorasTriangle";
import { percentStrip } from "./percentStrip";
import { ratioStrips } from "./ratioStrips";
import { linearGraph } from "./linearGraph";
import { angleShape } from "./angleShape";
import { clockFace } from "./clockFace";
import { explanationToSpeechParts, speechParts } from "./speech";

/**
 * Every diagram/explanation extractor run once for a question, bundled together.
 *
 * Two screens need the exact same set — Practice.tsx's wrong-answer panel, and the
 * lesson screen (docs/features/topic-lesson) — and computing it in two places is how the
 * two quietly drift (a new diagram wired into one, forgotten in the other). One function,
 * one bundle, both screens read from it.
 */
export interface ExplanationBundle {
  method: ReturnType<typeof methodSentence>;
  explanation: ReturnType<typeof explainQuestion>;
  diagram: ReturnType<typeof fractionDiagram>;
  frame: ReturnType<typeof tenFrame>;
  strip: ReturnType<typeof twentyStrip>;
  vertical: ReturnType<typeof verticalSum>;
  line: ReturnType<typeof numberLine>;
  geometry: ReturnType<typeof geometryShape>;
  pythagoras: ReturnType<typeof pythagorasTriangle>;
  percent: ReturnType<typeof percentStrip>;
  ratio: ReturnType<typeof ratioStrips>;
  linear: ReturnType<typeof linearGraph>;
  angle: ReturnType<typeof angleShape>;
  /** Unlike every other field here, rendered next to the question itself, not only
   *  inside `QuestionExplanation` — see docs/features/grade2-clock/design.md. Computed
   *  here anyway so `Practice.tsx` and `TopicLesson.tsx` share one lookup, the same
   *  reason this whole bundle exists. */
  clock: ReturnType<typeof clockFace>;
}

export function buildExplanation(question: Question): ExplanationBundle {
  return {
    method: methodSentence(question),
    explanation: explainQuestion(question),
    diagram: fractionDiagram(question),
    frame: tenFrame(question),
    strip: twentyStrip(question),
    vertical: verticalSum(question),
    line: numberLine(question),
    geometry: geometryShape(question),
    pythagoras: pythagorasTriangle(question),
    percent: percentStrip(question),
    ratio: ratioStrips(question),
    linear: linearGraph(question),
    angle: angleShape(question),
    clock: clockFace(question),
  };
}

/**
 * The bundle's own content as speech units — everything a "read me the explanation"
 * button says, in the order `QuestionExplanation` renders it. Deliberately excludes
 * anything diagnosis-specific (a wrong-answer conversation) — that stays in Practice.tsx,
 * the only screen with a diagnosis to read.
 */
export function explanationSpeechParts(bundle: ExplanationBundle): string[] {
  if (!bundle.explanation) return [];
  return [
    ...(bundle.method ? speechParts([bundle.method]) : []),
    ...(bundle.diagram ? speechParts([bundle.diagram.caption]) : []),
    ...(bundle.frame ? speechParts([bundle.frame.caption]) : []),
    ...(bundle.strip ? speechParts([bundle.strip.caption]) : []),
    ...(bundle.vertical ? speechParts([bundle.vertical.caption]) : []),
    // Already an array of lines: the rule, then this question. Separate parts so a
    // listener gets a pause between them rather than twenty words in one breath.
    ...(bundle.line ? speechParts(bundle.line.caption) : []),
    ...(bundle.geometry ? speechParts([bundle.geometry.caption]) : []),
    ...(bundle.pythagoras ? speechParts([bundle.pythagoras.caption]) : []),
    ...(bundle.percent ? speechParts([bundle.percent.caption]) : []),
    ...(bundle.ratio ? speechParts(bundle.ratio.caption) : []),
    ...(bundle.linear ? speechParts([bundle.linear.caption]) : []),
    ...(bundle.angle ? speechParts([bundle.angle.caption]) : []),
    ...explanationToSpeechParts(bundle.explanation),
  ];
}
