export type Operation = "+" | "-" | "×" | "÷";

export interface Problem {
  a: number;
  b: number;
  op: Operation;
}

export interface ExerciseSet {
  id: string;
  title: string;
  description: string;
  level: "קל" | "בינוני" | "קשה";
  problems: Problem[];
}

export function answerOf(problem: Problem): number {
  switch (problem.op) {
    case "+":
      return problem.a + problem.b;
    case "-":
      return problem.a - problem.b;
    case "×":
      return problem.a * problem.b;
    case "÷":
      return problem.a / problem.b;
  }
}

export const exerciseSets: ExerciseSet[] = [
  {
    id: "add-10",
    title: "חיבור עד 10",
    description: "תרגילי חיבור פשוטים עם מספרים עד 10",
    level: "קל",
    problems: [
      { a: 2, b: 3, op: "+" },
      { a: 5, b: 4, op: "+" },
      { a: 1, b: 6, op: "+" },
      { a: 7, b: 2, op: "+" },
      { a: 3, b: 3, op: "+" },
      { a: 4, b: 5, op: "+" },
      { a: 6, b: 1, op: "+" },
      { a: 8, b: 2, op: "+" },
      { a: 0, b: 9, op: "+" },
      { a: 5, b: 5, op: "+" },
    ],
  },
  {
    id: "sub-20",
    title: "חיסור עד 20",
    description: "תרגילי חיסור עם מספרים עד 20",
    level: "קל",
    problems: [
      { a: 10, b: 4, op: "-" },
      { a: 15, b: 7, op: "-" },
      { a: 20, b: 12, op: "-" },
      { a: 9, b: 3, op: "-" },
      { a: 18, b: 9, op: "-" },
      { a: 14, b: 6, op: "-" },
      { a: 11, b: 5, op: "-" },
      { a: 17, b: 8, op: "-" },
      { a: 13, b: 4, op: "-" },
      { a: 20, b: 0, op: "-" },
    ],
  },
  {
    id: "add-100",
    title: "חיבור עד 100",
    description: "תרגילי חיבור עם מספרים דו-ספרתיים",
    level: "בינוני",
    problems: [
      { a: 23, b: 45, op: "+" },
      { a: 67, b: 18, op: "+" },
      { a: 34, b: 29, op: "+" },
      { a: 51, b: 37, op: "+" },
      { a: 12, b: 88, op: "+" },
      { a: 76, b: 15, op: "+" },
      { a: 40, b: 40, op: "+" },
      { a: 59, b: 33, op: "+" },
      { a: 27, b: 64, op: "+" },
      { a: 81, b: 9, op: "+" },
    ],
  },
  {
    id: "mult-table",
    title: "לוח הכפל",
    description: "תרגול לוח הכפל מ-1 עד 10",
    level: "בינוני",
    problems: [
      { a: 3, b: 4, op: "×" },
      { a: 5, b: 6, op: "×" },
      { a: 7, b: 2, op: "×" },
      { a: 8, b: 3, op: "×" },
      { a: 9, b: 9, op: "×" },
      { a: 4, b: 7, op: "×" },
      { a: 6, b: 6, op: "×" },
      { a: 2, b: 10, op: "×" },
      { a: 5, b: 8, op: "×" },
      { a: 10, b: 10, op: "×" },
    ],
  },
  {
    id: "div-simple",
    title: "חילוק פשוט",
    description: "תרגילי חילוק עם תוצאה שלמה",
    level: "קשה",
    problems: [
      { a: 12, b: 3, op: "÷" },
      { a: 20, b: 4, op: "÷" },
      { a: 45, b: 9, op: "÷" },
      { a: 18, b: 2, op: "÷" },
      { a: 36, b: 6, op: "÷" },
      { a: 63, b: 7, op: "÷" },
      { a: 50, b: 5, op: "÷" },
      { a: 27, b: 3, op: "÷" },
      { a: 80, b: 8, op: "÷" },
      { a: 32, b: 4, op: "÷" },
    ],
  },
  {
    id: "mixed",
    title: "תרגיל מעורב",
    description: "שילוב של חיבור, חיסור, כפל וחילוק",
    level: "קשה",
    problems: [
      { a: 14, b: 6, op: "+" },
      { a: 30, b: 12, op: "-" },
      { a: 8, b: 7, op: "×" },
      { a: 42, b: 6, op: "÷" },
      { a: 25, b: 19, op: "+" },
      { a: 50, b: 23, op: "-" },
      { a: 9, b: 6, op: "×" },
      { a: 56, b: 8, op: "÷" },
      { a: 33, b: 17, op: "+" },
      { a: 100, b: 45, op: "-" },
    ],
  },
];
