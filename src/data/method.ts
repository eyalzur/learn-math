import type { Question } from "./curriculum";
import { bareExpression } from "./expression";

/**
 * The sentence a teacher opens with: how to approach this *kind* of exercise.
 *
 * This is the layer the data never had a field for. Steps describe this exercise, the
 * analogy ties it to life — nothing described the type. The user's own words, looking at
 * `0.5 + 0.3`: "חיבור עושים במאונך... זה סוג של הסבר מילולי", and that sentence goes in
 * verbatim below.
 *
 * Sentences are keyed to the question's *form*, computed from the operands — never to the
 * topic alone. "חיבור וחיסור עד 20" holds four forms, and a sentence about addition shown
 * over a subtraction would teach the wrong thing at the most sensitive moment. A question
 * whose form we cannot recognize gets no sentence at all, for the same reason.
 *
 * Type-only import of `Question`; consumed only by the practice screen. Same cycle guard
 * as `diagnose.ts` and `fractionDiagram.ts`.
 */
export function methodSentence(question: Question): string | null {
  const topic = question.topic;

  // One concept sentence, true for every form in the topic — including the word problems.
  if (topic === "עשרות ויחידות") {
    return "הספרה השמאלית סופרת קופסאות מלאות של עשר, והימנית את הבודדים שבחוץ";
  }

  const expr = bareExpression(question.prompt);
  if (!expr) return null;
  const { a, op, b } = expr;

  if (topic === "חיבור עד 10" && op === "+") {
    return "כשמחברים, מתחילים מהמספר הגדול וסופרים קדימה";
  }

  if (topic === "חיסור עד 10" && op === "-") {
    return "כשמחסרים, מתחילים מהמספר הראשון וסופרים אחורה";
  }

  if (topic === "חיבור וחיסור עד 20" && Number.isInteger(a) && Number.isInteger(b)) {
    if (op === "+") {
      return (a % 10) + (b % 10) < 10
        ? "מספר כמו `12` הוא עשרת ויחידות. מחברים את היחידות, והעשרת נשארת במקום"
        : "קודם משלימים לעשר, ואחר כך מוסיפים את מה שנשאר";
    }
    if (op === "-") {
      return a % 10 < b % 10
        ? "כשאי אפשר לחסר בבת אחת, יורדים קודם לעשר, ואחר כך מחסרים את מה שנשאר"
        : "מספר כמו `18` הוא עשרת ויחידות. מחסרים את היחידות, והעשרת נשארת במקום";
    }
  }

  if (topic === "שברים עשרוניים") {
    // The user gave this sentence, then corrected his own ending: "רק צריך לשים לב
    // לנקודה" says to be careful without saying *what to do*, and what to do is the
    // whole method — "הכי חשוב בכל תרגיל במאונך זה שהנקודות יהיו אחת מתחת לשניה".
    // Multiplication and division wait for a later wave; a wrong sentence is worse
    // than none.
    if (op === "+") {
      return "חיבור עושים במאונך, קודם מימין לנקודה, בדיוק כמו במספרים שלמים. הכי חשוב — שהנקודות יהיו אחת בדיוק מתחת לשנייה";
    }
    if (op === "-") {
      return "חיסור עושים במאונך, קודם מימין לנקודה, בדיוק כמו במספרים שלמים. הכי חשוב — שהנקודות יהיו אחת בדיוק מתחת לשנייה";
    }
  }

  return null;
}
