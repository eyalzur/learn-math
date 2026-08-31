/**
 * Asks Claude to transcribe a notebook page — not solve it, not grade it, just report what
 * was written. Pure-ish: takes a PNG buffer, returns a PageReading, no Express/HTTP here —
 * same separation renderMatrix.ts already keeps from index.ts.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PageReadingSchema, type PageReading } from "./pageReading.js";
import "./anthropicAuth.js"; // sets ANTHROPIC_IDENTITY_TOKEN_FILE as a side effect

// Constructed once and reused: the SDK re-reads the identity token file and refreshes its
// own Anthropic access token on its own (see server/README.md) — nothing here needs to be
// per-request.
const anthropic = new Anthropic();

/**
 * `expectedPrompt` is the exercise text the student was actually given (e.g. "7 + 5" or a
 * Hebrew word problem) — never the correct answer. It grounds the reading (the model isn't
 * left to re-guess what exercise this even is from handwriting alone), without handing the
 * model a known-correct value to grade against — that judgment stays entirely with the
 * app's own local, instant check (see src/components/Practice.tsx), never with the model.
 */
function teacherSystemPrompt(expectedPrompt: string): string {
  return `אתם "המורה" — קוראים דף עבודה כתוב ביד ממחברת תרגול חשבון. התלמיד/ה עבד/ה על התרגיל: ${expectedPrompt}. תפקידכם לדווח מה נעשה בדף, לא לפתור את התרגיל בעצמכם ולא לקבוע אם התשובה הסופית נכונה — אין לכם את התשובה הנכונה, ואתם לא צריכים אותה.

דווחו:
1. processReflection — משפט קצר אחד בעברית פשוטה שמתאר מה התלמיד/ה עשה/תה, כאילו אתם מסבירים למישהו שלא ראה את הדף. סמנו כל ביטוי חשבוני בגרשיים אחוריים, למשל: "ראיתי שחישבת \`7 + 5\` וקיבלת \`12\`."
2. errorPointer — רק אם אתם רואים שלב בתהליך הכתוב שאינו עקבי עם השלב שלפניו (למשל: שורה לא נובעת חשבונית מהשורה הקודמת, פעולה שהוחסרה) — משפט קצר שמצביע איפה זה קרה, לא מה התוצאה הנכונה הייתה צריכה להיות. אם התהליך עקבי מתחילתו ועד סופו — השמיטו שדה זה לגמרי, אל תמציאו טעות.
3. finalAnswer — התשובה הסופית שהתלמיד/ה כתב/ה, כמספר בלבד.

אם כתב היד אינו קריא, יש יותר מפתרון אחד, הדף כמעט ריק, או שאין שורת תשובה סופית ברורה — אל תנחשו. החזירו certain: false בלבד.`;
}

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Never throws for "couldn't read it clearly" — that's a normal, expected result
 * (`{ certain: false }`), not a failure. It throws only when the call to Claude itself
 * failed (network, auth, timeout) — the caller (index.ts) maps that to the same generic
 * error every other communication failure already gets.
 */
export async function readPage(pngBuffer: Buffer, expectedPrompt: string): Promise<PageReading> {
  const response = await anthropic.messages.parse(
    {
      model: "claude-opus-5",
      max_tokens: 4096,
      output_config: { effort: "low", format: zodOutputFormat(PageReadingSchema) },
      system: teacherSystemPrompt(expectedPrompt),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/png", data: pngBuffer.toString("base64") } },
            { type: "text", text: "זה דף ממחברת תרגול. תארו מה נעשה בו." },
          ],
        },
      ],
    },
    { timeout: REQUEST_TIMEOUT_MS },
  );

  const parsed = response.parsed_output;
  if (parsed && parsed.certain && parsed.processReflection && Number.isFinite(parsed.finalAnswer)) {
    return {
      certain: true,
      processReflection: parsed.processReflection,
      ...(parsed.errorPointer ? { errorPointer: parsed.errorPointer } : {}),
      finalAnswer: parsed.finalAnswer as number,
    };
  }
  // Covers: parsing failed entirely (null), the model itself said certain: false, or it
  // said certain: true but left processReflection/finalAnswer empty — all the same "don't
  // guess" case.
  return { certain: false };
}
