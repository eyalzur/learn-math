import { grade1Topics } from "./grade1";
import { level } from "./level";

export { level };

export interface Question {
  id: string;
  /** Must be one of the owning grade's `topics`. */
  topic: string;
  /** Shown as-is. Either a bare expression ("23 + 45") or a Hebrew word problem. */
  prompt: string;
  answer: number;
  /**
   * Worked steps for questions that cannot be broken down by computing from operands —
   * word problems, equations, geometry. Bare arithmetic leaves this out and gets its
   * steps generated instead.
   */
  steps?: { label: string; math?: string }[];
  /**
   * One sentence tying the maths to something the student already knows, pitched at
   * their age. This is the part that makes a rule stick rather than sound arbitrary,
   * so every question carries one.
   */
  analogy: string;
}

export interface Level {
  id: "easy" | "medium" | "hard";
  title: string;
  description: string;
  questions: Question[];
}

export interface Topic {
  id: string;
  title: string;
  levels: Level[];
}

/**
 * A grade practises either topic by topic or straight from mixed levels.
 *
 * The union is deliberate rather than two optional fields: grades 6 and 8 are still on
 * the mixed shape while their topic content is written, and a discriminated union makes
 * the compiler point at every place that has to handle both instead of letting one path
 * quietly go unhandled.
 */
export type Grade = {
  id: string;
  label: string;
  topics: string[];
} & (
  | { practice: "topics"; topicSets: Topic[] }
  | { practice: "levels"; levels: Level[] }
);

export interface Student {
  id: string;
  name: string;
  gradeId: string;
}

const GRADE_1_TOPICS = [
  "מספרים עד 20",
  "חיבור עד 10",
  "חיסור עד 10",
  "חיבור וחיסור עד 20",
  "עשרות ויחידות",
];

export const students: Student[] = [
  { id: "mika", name: "מיקה", gradeId: "1" },
  { id: "rotem", name: "רותם", gradeId: "6" },
  { id: "omer", name: "עומר", gradeId: "8" },
];


// ---------------------------------------------------------------- כיתה א׳

const grade1: Grade = {
  id: "1",
  label: "כיתה א׳",
  topics: GRADE_1_TOPICS,
  practice: "topics",
  topicSets: grade1Topics,
};

// ---------------------------------------------------------------- כיתה ו׳

const GRADE_6_TOPICS = [
  "שברים פשוטים",
  "שברים עשרוניים",
  "אחוזים",
  "יחס ופרופורציה",
  "שטח והיקף",
  "ממוצע",
];

const grade6: Grade = {
  id: "6",
  label: "כיתה ו׳",
  topics: GRADE_6_TOPICS,
  practice: "levels",
  levels: [
    level("easy", [
      { id: "g6-e1", topic: "שברים פשוטים", prompt: "כמה זה חצי מ-20?", answer: 10, steps: [{ label: "חצי זה לחלק לשני חלקים שווים" }, { label: "20 ÷ 2 = 10" }], analogy: "20 שקל שמתחלקים שווה בשווה בין שניים - כל אחד מקבל 10" },
      { id: "g6-e2", topic: "שברים פשוטים", prompt: "כמה זה רבע מ-40?", answer: 10, steps: [{ label: "רבע זה לחלק לארבעה חלקים שווים" }, { label: "40 ÷ 4 = 10" }], analogy: "פיצה של 40 פרוסות שמחלקים לארבעה חברים" },
      { id: "g6-e3", topic: "שברים פשוטים", prompt: "כמה זה שליש מ-30?", answer: 10, steps: [{ label: "שליש זה לחלק לשלושה חלקים שווים" }, { label: "30 ÷ 3 = 10" }], analogy: "30 גולות שמתחלקות שווה בשווה בין שלושה" },
      { id: "g6-e4", topic: "שברים עשרוניים", prompt: "0.5 + 0.3", answer: 0.8, steps: [{ label: "מחברים עשירית לעשירית" }, { label: "0.5 + 0.3 = 0.8" }], analogy: "חצי שקל ועוד 30 אגורות" },
      { id: "g6-e5", topic: "שברים עשרוניים", prompt: "1.2 + 2.5", answer: 3.7, steps: [{ label: "קודם השלמים: 1 + 2 = 3" }, { label: "אחר כך העשרוני: 0.2 + 0.5 = 0.7" }, { label: "ביחד: 3.7" }], analogy: "מטר ו-20 ס״מ ועוד 2 מטר וחצי" },
      { id: "g6-e6", topic: "אחוזים", prompt: "כמה זה 10% מ-200?", answer: 20, steps: [{ label: "10% זה עשירית מהמספר" }, { label: "200 ÷ 10 = 20" }], analogy: "הנחה של 10% על מוצר ב-200 שקל - כמה חוסכים" },
      { id: "g6-e7", topic: "אחוזים", prompt: "כמה זה 50% מ-60?", answer: 30, steps: [{ label: "50% זה בדיוק חצי" }, { label: "60 ÷ 2 = 30" }], analogy: "חצי מהכיתה של 60 תלמידים" },
      { id: "g6-e8", topic: "שטח והיקף", prompt: "שטח מלבן שאורכו 5 ורוחבו 4", answer: 20, steps: [{ label: "שטח מלבן זה אורך כפול רוחב" }, { label: "5 × 4 = 20" }], analogy: "כמה ריצפות של מטר על מטר נכנסות בחדר 5 על 4" },
      { id: "g6-e9", topic: "שטח והיקף", prompt: "היקף ריבוע שצלעו 6", answer: 24, steps: [{ label: "היקף זה סכום כל הצלעות" }, { label: "לריבוע ארבע צלעות שוות: 6 × 4 = 24" }], analogy: "גדר סביב חצר מרובעת שכל צלע שלה 6 מטר" },
      { id: "g6-e10", topic: "ממוצע", prompt: "הממוצע של 4 ושל 8", answer: 6, steps: [{ label: "ממוצע זה לחבר הכל ולחלק בכמות" }, { label: "4 + 8 = 12" }, { label: "12 ÷ 2 = 6" }], analogy: "שני מבחנים, 4 ו-8 - מה הציון ה״ממוצע״" },
    ]),
    level("medium", [
      { id: "g6-m1", topic: "שברים פשוטים", prompt: "כמה זה שלושה רבעים מ-100?", answer: 75, steps: [{ label: "קודם מוצאים רבע אחד: 100 ÷ 4 = 25" }, { label: "ואז שלושה כאלה: 25 × 3 = 75" }], analogy: "קיבלת 75 מתוך 100 במבחן - זה בדיוק שלושה רבעים" },
      { id: "g6-m2", topic: "שברים פשוטים", prompt: "כמה זה שתי חמישיות מ-50?", answer: 20, steps: [{ label: "קודם חמישית אחת: 50 ÷ 5 = 10" }, { label: "ואז שתיים כאלה: 10 × 2 = 20" }], analogy: "50 שקל שמחלקים לחמישה חלקים, ולוקחים שניים מהם" },
      { id: "g6-m3", topic: "שברים עשרוניים", prompt: "2.4 × 10", answer: 24, steps: [{ label: "כפל ב-10 מזיז את הנקודה מקום אחד ימינה" }, { label: "2.4 × 10 = 24" }], analogy: "2.4 מטר של בד, פי 10" },
      { id: "g6-m4", topic: "שברים עשרוניים", prompt: "7.5 − 2.5", answer: 5, steps: [{ label: "קודם השלמים: 7 − 2 = 5" }, { label: "החצאים מתבטלים: 0.5 − 0.5 = 0" }, { label: "נשאר: 5" }], analogy: "היו לך 7 שקלים וחצי, הוצאת 2 וחצי" },
      { id: "g6-m5", topic: "אחוזים", prompt: "כמה זה 25% מ-80?", answer: 20, steps: [{ label: "25% זה בדיוק רבע" }, { label: "80 ÷ 4 = 20" }], analogy: "הנחה של רבע על חולצה ב-80 שקל" },
      { id: "g6-m6", topic: "אחוזים", prompt: "כמה זה 20% מ-150?", answer: 30, steps: [{ label: "קודם 10%: 150 ÷ 10 = 15" }, { label: "20% זה פי שניים: 15 × 2 = 30" }], analogy: "טיפ של 20% על חשבון של 150 שקל" },
      { id: "g6-m7", topic: "יחס ופרופורציה", prompt: "היחס הוא 2 ל-3. אם החלק הראשון הוא 10, כמה השני?", answer: 15, steps: [{ label: "ביחס 2 ל-3, החלק הראשון הוא 10" }, { label: "פי כמה גדל?", math: "10 ÷ 2 = 5" }, { label: "אז גם השני גדל פי 5: 3 × 5 = 15" }], analogy: "מתכון ביחס 2 ל-3 - על כל 2 כוסות קמח, 3 כוסות מים" },
      { id: "g6-m8", topic: "שטח והיקף", prompt: "שטח משולש שבסיסו 10 וגובהו 6", answer: 30, steps: [{ label: "שטח משולש זה בסיס כפול גובה, חלקי 2" }, { label: "10 × 6 = 60" }, { label: "60 ÷ 2 = 30" }], analogy: "משולש הוא בדיוק חצי מהמלבן שמקיף אותו" },
      { id: "g6-m9", topic: "שטח והיקף", prompt: "היקף מלבן שאורכו 8 ורוחבו 3", answer: 22, steps: [{ label: "היקף מלבן זה פעמיים האורך ועוד פעמיים הרוחב" }, { label: "האורכים:", math: "8 + 8 = 16" }, { label: "הרוחבים:", math: "3 + 3 = 6" }, { label: "16 + 6 = 22" }], analogy: "גדר סביב חצר של 8 על 3 - שתי צלעות ארוכות ושתי קצרות" },
      { id: "g6-m10", topic: "ממוצע", prompt: "הממוצע של 10, 20 ו-30", answer: 20, steps: [{ label: "מחברים הכל: 10 + 20 + 30 = 60" }, { label: "מחלקים בכמות: 60 ÷ 3 = 20" }], analogy: "שלושה מבחנים - 10, 20 ו-30" },
    ]),
    level("hard", [
      { id: "g6-h1", topic: "שברים פשוטים", prompt: "כמה זה שני שלישים מ-90?", answer: 60, steps: [{ label: "קודם שליש אחד: 90 ÷ 3 = 30" }, { label: "ואז שניים כאלה: 30 × 2 = 60" }], analogy: "90 שקל שמחלקים לשלושה, ולוקחים שניים מהחלקים" },
      { id: "g6-h2", topic: "שברים עשרוניים", prompt: "0.25 × 80", answer: 20, steps: [{ label: "0.25 זה בדיוק רבע" }, { label: "80 ÷ 4 = 20" }], analogy: "רבע מ-80 - כמו לחלק 80 שקל לארבעה" },
      { id: "g6-h3", topic: "שברים עשרוניים", prompt: "1.5 × 4", answer: 6, steps: [{ label: "קודם השלמים: 1 × 4 = 4" }, { label: "אחר כך החצאים: 0.5 × 4 = 2" }, { label: "ביחד: 4 + 2 = 6" }], analogy: "ארבע בקבוקים של מטר וחצי כל אחד" },
      { id: "g6-h4", topic: "אחוזים", prompt: "מחיר 200 שקלים בהנחה של 15%. כמה שקלים ההנחה?", answer: 30, steps: [{ label: "קודם 10%: 200 ÷ 10 = 20" }, { label: "ואז 5%, שזה חצי מזה: 10" }, { label: "ביחד: 20 + 10 = 30" }], analogy: "שלט ב-200 שקל עם מדבקת 15% הנחה - כמה יורד מהמחיר" },
      { id: "g6-h5", topic: "אחוזים", prompt: "מחיר 80 שקלים עלה ב-25%. מה המחיר החדש?", answer: 100, steps: [{ label: "קודם כמה זה 25%: 80 ÷ 4 = 20" }, { label: "מוסיפים למחיר המקורי: 80 + 20 = 100" }], analogy: "מחיר של 80 שקל שעלה ברבע" },
      { id: "g6-h6", topic: "יחס ופרופורציה", prompt: "היחס הוא 3 ל-5 והסך הכל 40. כמה בחלק הגדול?", answer: 25, steps: [{ label: "סך החלקים: 3 + 5 = 8" }, { label: "שווי חלק אחד: 40 ÷ 8 = 5" }, { label: "החלק הגדול: 5 × 5 = 25" }], analogy: "40 גולות שמתחלקות בין שניים ביחס 3 ל-5" },
      { id: "g6-h7", topic: "שטח והיקף", prompt: "שטח מלבן הוא 12 ורוחבו 3. מה האורך?", answer: 4, steps: [{ label: "שטח זה אורך כפול רוחב, אז מחלקים חזרה" }, { label: "12 ÷ 3 = 4" }], analogy: "שטיח בשטח 12 שרוחבו 3 - כמה הוא ארוך" },
      { id: "g6-h8", topic: "שטח והיקף", prompt: "היקף מעגל שרדיוסו 10, כאשר פאי שווה 3", answer: 60, steps: [{ label: "היקף מעגל זה 2 כפול פאי כפול הרדיוס" }, { label: "2 × 10 = 20" }, { label: "20 × 3 = 60" }], analogy: "גדר סביב בריכה עגולה ברדיוס 10" },
      { id: "g6-h9", topic: "ממוצע", prompt: "הממוצע של 5 מספרים הוא 12. מה הסכום שלהם?", answer: 60, steps: [{ label: "ממוצע זה הסכום חלקי הכמות, אז הסכום זה ממוצע כפול כמות" }, { label: "12 × 5 = 60" }], analogy: "חמישה מבחנים בממוצע 12 - כמה נקודות צברת בסך הכל" },
      { id: "g6-h10", topic: "שברים פשוטים", prompt: "כמה שלמים יש בשלושה רבעים ועוד רבע?", answer: 1, steps: [{ label: "שלושה רבעים ועוד רבע זה ארבעה רבעים" }, { label: "ארבעה רבעים זה שלם אחד", math: "1" }], analogy: "שלוש רבעי פיצה ועוד רבע - זו פיצה שלמה" },
    ]),
  ],
};

// ---------------------------------------------------------------- כיתה ח׳

const GRADE_8_TOPICS = [
  "ביטויים אלגבריים",
  "משוואות",
  "חזקות ושורשים",
  "משפט פיתגורס",
  "פונקציה קווית",
  "בעיות מילוליות",
];

const grade8: Grade = {
  id: "8",
  label: "כיתה ח׳",
  topics: GRADE_8_TOPICS,
  practice: "levels",
  levels: [
    level("easy", [
      { id: "g8-e1", topic: "משוואות", prompt: "x + 7 = 12", answer: 5, steps: [{ label: "מעבירים את ה-7 לצד השני ומשנים סימן" }, { label: "x = 12 − 7" }, { label: "x = 5" }], analogy: "חסכת סכום כלשהו, קיבלת עוד 7 שקל ועכשיו יש לך 12" },
      { id: "g8-e2", topic: "משוואות", prompt: "3x = 15", answer: 5, steps: [{ label: "מחלקים את שני האגפים ב-3" }, { label: "x = 15 ÷ 3" }, { label: "x = 5" }], analogy: "3 כרטיסים באותו מחיר עלו 15 שקל" },
      { id: "g8-e3", topic: "משוואות", prompt: "x − 6 = 10", answer: 16, steps: [{ label: "מעבירים את ה-6 לצד השני ומשנים סימן" }, { label: "x = 10 + 6" }, { label: "x = 16" }], analogy: "הוצאת 6 שקל ונשארו לך 10" },
      { id: "g8-e4", topic: "חזקות ושורשים", prompt: "2³", answer: 8, steps: [{ label: "חזקה זה כמה פעמים מכפילים את המספר בעצמו" }, { label: "2 × 2 × 2 = 8" }], analogy: "קופסה שכל צלע שלה 2 - כמה קוביות נכנסות בה" },
      { id: "g8-e5", topic: "חזקות ושורשים", prompt: "5²", answer: 25, steps: [{ label: "5 בריבוע זה 5 כפול 5" }, { label: "5 × 5 = 25" }], analogy: "ריבוע של 5 על 5" },
      { id: "g8-e6", topic: "חזקות ושורשים", prompt: "√49", answer: 7, steps: [{ label: "שורש זה השאלה ההפוכה של חזקה" }, { label: "איזה מספר כפול עצמו נותן 49?" }, { label: "מכפלה שנותנת 49:", math: "7 × 7 = 49" }, { label: "אז השורש הוא", math: "7" }], analogy: "ריבוע ששטחו 49 - כמה אורך הצלע שלו" },
      { id: "g8-e7", topic: "ביטויים אלגבריים", prompt: "כמה זה `2x + 3` כאשר `x` שווה 4?", answer: 11, steps: [{ label: "מציבים 4 במקום x" }, { label: "2 × 4 = 8" }, { label: "8 + 3 = 11" }], analogy: "כרטיס עולה 2 שקל ליחידה ועוד 3 שקל דמי טיפול, עבור 4 יחידות" },
      { id: "g8-e8", topic: "ביטויים אלגבריים", prompt: "כמה זה `x² + 1` כאשר `x` שווה 2?", answer: 5, steps: [{ label: "מציבים 2 במקום x" }, { label: "2² = 4" }, { label: "4 + 1 = 5" }], analogy: "שטח ריבוע בצלע 2, ועוד מרצפת אחת" },
      { id: "g8-e9", topic: "ביטויים אלגבריים", prompt: "כנסו איברים: `3x + 5x`. מה המקדם של `x`?", answer: 8, steps: [{ label: "אפשר לחבר רק איברים מאותו סוג" }, { label: "3 שקיות ועוד 5 שקיות זה 8 שקיות" }, { label: "3x + 5x = 8x" }], analogy: "3 שקיות של תפוחים ועוד 5 שקיות - סך הכל 8 שקיות" },
      { id: "g8-e10", topic: "משפט פיתגורס", prompt: "במשולש ישר זווית הניצבים הם 3 ו-4. מה אורך היתר?", answer: 5, steps: [{ label: "במשולש ישר זווית: היתר בריבוע שווה לסכום ריבועי הניצבים" }, { label: "3² + 4² = 9 + 16 = 25" }, { label: "√25 = 5" }], analogy: "מדרגות שגובהן 3 ורוחבן 4 - כמה ארוך המעקה שמחבר ביניהן" },
    ]),
    level("medium", [
      { id: "g8-m1", topic: "משוואות", prompt: "2x + 5 = 17", answer: 6, steps: [{ label: "מעבירים את ה-5: 2x = 17 − 5 = 12" }, { label: "מחלקים ב-2: x = 6" }], analogy: "קנית 2 כרטיסים ושילמת עוד 5 שקל דמי טיפול, בסך הכל 17" },
      { id: "g8-m2", topic: "משוואות", prompt: "4x − 3 = 21", answer: 6, steps: [{ label: "מעבירים את ה-3: 4x = 21 + 3 = 24" }, { label: "מחלקים ב-4: x = 6" }], analogy: "4 שעות עבודה פחות 3 שקל קנס, ונשארו 21" },
      { id: "g8-m3", topic: "משוואות", prompt: "5x + 2 = 3x + 10", answer: 4, steps: [{ label: "מעבירים את ה-x לצד אחד: 5x − 3x = 2x" }, { label: "ואת המספרים לשני: 10 − 2 = 8" }, { label: "נשאר:", math: "2x = 8" }, { label: "מחלקים ב-2:", math: "x = 4" }], analogy: "שתי הצעות מחיר שיוצאות אותו דבר - באיזו כמות זה קורה" },
      { id: "g8-m4", topic: "חזקות ושורשים", prompt: "2³ × 2²", answer: 32, steps: [{ label: "בכפל חזקות עם אותו בסיס מחברים את המעריכים" }, { label: "2³ × 2² = 2⁵" }, { label: "2⁵ = 32" }], analogy: "מכפילים פי 8 ואז פי 4" },
      { id: "g8-m5", topic: "חזקות ושורשים", prompt: "√81", answer: 9, steps: [{ label: "איזה מספר כפול עצמו נותן 81?" }, { label: "מכפלה שנותנת 81:", math: "9 × 9 = 81" }, { label: "אז השורש הוא", math: "9" }], analogy: "ריבוע ששטחו 81" },
      { id: "g8-m6", topic: "ביטויים אלגבריים", prompt: "פתחו סוגריים: `3(x + 2)`. מה המספר החופשי?", answer: 6, steps: [{ label: "כופלים את ה-3 בכל אחד מהאיברים בסוגריים" }, { label: "כופלים את המשתנה:", math: "3 × x = 3x" }, { label: "וכופלים את המספר:", math: "3 × 2 = 6" }, { label: "אחרי הפתיחה:", math: "3(x + 2) = 3x + 6" }, { label: "המספר החופשי הוא", math: "6" }], analogy: "3 חבילות שבכל אחת פריט ועוד 2 מתנות" },
      { id: "g8-m7", topic: "משפט פיתגורס", prompt: "במשולש ישר זווית הניצבים הם 6 ו-8. מה אורך היתר?", answer: 10, steps: [{ label: "היתר בריבוע שווה לסכום ריבועי הניצבים" }, { label: "6² + 8² = 36 + 64 = 100" }, { label: "√100 = 10" }], analogy: "מסך טלוויזיה 6 על 8 - כמה אינטש האלכסון" },
      { id: "g8-m8", topic: "פונקציה קווית", prompt: "בפונקציה `y = 2x + 1`, כמה `y` כאשר `x` שווה 3?", answer: 7, steps: [{ label: "מציבים 3 במקום x" }, { label: "2 × 3 = 6" }, { label: "6 + 1 = 7" }], analogy: "חבילת גלישה: 2 ג״ב לכל חודש ועוד 1 ג״ב מתנה, אחרי 3 חודשים" },
      { id: "g8-m9", topic: "פונקציה קווית", prompt: "מה השיפוע של הישר `y = 3x − 4`?", answer: 3, steps: [{ label: "בצורה y = mx + b, השיפוע הוא המספר שליד ה-x" }, { label: "בפונקציה", math: "y = 3x − 4" }, { label: "המספר שליד x הוא", math: "3" }], analogy: "כמה עולה כל שעת עבודה - זה מה שהשיפוע אומר" },
      { id: "g8-m10", topic: "בעיות מילוליות", prompt: "מחיר עלה מ-40 ל-50 שקלים. בכמה אחוזים הוא עלה?", answer: 25, steps: [{ label: "קודם כמה עלה: 50 − 40 = 10" }, { label: "ביחס למחיר המקורי: 10 ÷ 40 = 0.25" }, { label: "0.25 זה 25%" }], analogy: "מחיר שעלה מ-40 ל-50 שקל - בכמה אחוז" },
    ]),
    level("hard", [
      { id: "g8-h1", topic: "משוואות", prompt: "3(x + 4) = 27", answer: 5, steps: [{ label: "מחלקים את שני האגפים ב-3: x + 4 = 9" }, { label: "מעבירים את ה-4: x = 9 − 4" }, { label: "x = 5" }], analogy: "3 חבילות שבכל אחת פריט ועוד 4 מתנות, בסך הכל 27" },
      { id: "g8-h2", topic: "משוואות", prompt: "2(x − 3) + 4 = 10", answer: 6, steps: [{ label: "מעבירים את ה-4: 2(x − 3) = 6" }, { label: "מחלקים ב-2: x − 3 = 3" }, { label: "x = 6" }], analogy: "קנית פריטים בהנחה של 3 שקל ליחידה, זוג כאלה ועוד 4 שקל - בסך הכל 10" },
      { id: "g8-h3", topic: "חזקות ושורשים", prompt: "(2³)²", answer: 64, steps: [{ label: "בהעלאת חזקה בחזקה מכפילים את המעריכים" }, { label: "(2³)² = 2⁶" }, { label: "2⁶ = 64" }], analogy: "קופסה של 8 קוביות, ואז 8 קופסאות כאלה" },
      { id: "g8-h4", topic: "חזקות ושורשים", prompt: "√144", answer: 12, steps: [{ label: "איזה מספר כפול עצמו נותן 144?" }, { label: "מכפלה שנותנת 144:", math: "12 × 12 = 144" }, { label: "אז השורש הוא", math: "12" }], analogy: "ריבוע ששטחו 144" },
      { id: "g8-h5", topic: "ביטויים אלגבריים", prompt: "כמה זה `2x² − 5` כאשר `x` שווה 3?", answer: 13, steps: [{ label: "מציבים 3 במקום x" }, { label: "קודם החזקה:", math: "3² = 9" }, { label: "ואז הכפל:", math: "2 × 9 = 18" }, { label: "18 − 5 = 13" }], analogy: "שטח של שני ריבועים בצלע 3, פחות 5" },
      { id: "g8-h6", topic: "משפט פיתגורס", prompt: "במשולש ישר זווית היתר הוא 13 וניצב אחד הוא 5. מה הניצב השני?", answer: 12, steps: [{ label: "הניצב בריבוע שווה להיתר בריבוע פחות הניצב האחר בריבוע" }, { label: "13² − 5² = 169 − 25 = 144" }, { label: "√144 = 12" }], analogy: "סולם באורך 13 שנשען על קיר, והרגל שלו 5 מהקיר - כמה גבוה הוא מגיע" },
      { id: "g8-h7", topic: "פונקציה קווית", prompt: "בפונקציה `y = −2x + 10`, כמה `x` כאשר `y` שווה 0?", answer: 5, steps: [{ label: "מציבים אפס במקום y:", math: "0 = −2x + 10" }, { label: "מעבירים: 2x = 10" }, { label: "x = 5" }], analogy: "מיכל מים שמתרוקן - מתי הוא מגיע לאפס" },
      { id: "g8-h8", topic: "פונקציה קווית", prompt: "הישר `y = 4x + 2` עובר בנקודה שבה `y` שווה 14. כמה `x`?", answer: 3, steps: [{ label: "מציבים 14 במקום y:", math: "14 = 4x + 2" }, { label: "מעבירים: 4x = 12" }, { label: "x = 3" }], analogy: "חיסכון שמתחיל ב-2 שקל וגדל ב-4 כל שבוע - מתי יגיע ל-14" },
      { id: "g8-h9", topic: "בעיות מילוליות", prompt: "אוטובוס נסע 180 קילומטר ב-3 שעות. מה המהירות הממוצעת?", answer: 60, steps: [{ label: "מהירות זה מרחק חלקי זמן" }, { label: "180 ÷ 3 = 60" }], analogy: "נסיעה של 180 ק״מ שלקחה 3 שעות" },
      { id: "g8-h10", topic: "בעיות מילוליות", prompt: "סכום שני מספרים הוא 20 וההפרש ביניהם 4. מה המספר הגדול?", answer: 12, steps: [{ label: "אם מורידים את ההפרש, השאר מתחלק שווה: 20 − 4 = 16" }, { label: "המספר הקטן:", math: "16 ÷ 2 = 8" }, { label: "הגדול: 8 + 4 = 12" }], analogy: "שני חברים חילקו 20 שקל, ולאחד יש 4 יותר" },
    ]),
  ],
};

export const grades: Grade[] = [grade1, grade6, grade8];

export function gradeOf(student: Student): Grade {
  const grade = grades.find((g) => g.id === student.gradeId);
  if (!grade) throw new Error(`No grade "${student.gradeId}" for student "${student.id}"`);
  return grade;
}

/**
 * Word problems must render RTL and bare expressions LTR. Getting this backwards is how
 * "2 + 3 =" once shipped reversed, so the direction follows the content rather than a
 * blanket rule on the container.
 */
export function isHebrewPrompt(prompt: string): boolean {
  return /[֐-׿]/.test(prompt);
}

export interface PromptSegment {
  kind: "text" | "math";
  value: string;
}

/**
 * Splits a prompt on `backticks` into Hebrew prose and algebraic runs.
 *
 * An expression sitting inside an RTL sentence gets mangled by the bidi algorithm —
 * "3(x + 2)" renders as "3)2 + x(", with the brackets mirrored and the terms reordered.
 * Marking the maths lets each run be isolated in its own LTR element, which is the only
 * reliable fix; no amount of styling on the surrounding paragraph corrects it.
 */
export function promptSegments(prompt: string): PromptSegment[] {
  return prompt
    .split(/`([^`]*)`/)
    .map((value, i): PromptSegment => ({ kind: i % 2 === 1 ? "math" : "text", value }))
    .filter((segment) => segment.value !== "");
}
