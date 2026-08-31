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

const TEACHER_SYSTEM_PROMPT = `אתם מתמללים דף כתוב ביד ממחברת תרגול חשבון של ילד/ה. התפקיד שלכם הוא לדווח מה נכתב — לא לפתור, לא לשפוט אם התשובה נכונה, ולא להוסיף שום דבר שלא נכתב בפועל.

בדף כתוב תרגיל חשבוני אחד ותשובה אחת שהתלמיד/ה רשם/ה לו. דווחו את שניהם בנפרד: question הוא התרגיל/השאלה כפי שנכתב (למשל "7 + 5="), answer היא התשובה שנרשמה (למשל "12"). שני השדות האלה הם תמיד ביטוי חשבוני בלבד — מספרים וסימני פעולה, בלי מילים ובלי פיסוק נוסף.

אם כתב היד אינו קריא בבירור, יש יותר מתשובה אחת בדף, הדף כמעט ריק, או שאתם לא בטוחים במה שנכתב — אל תנחשו. החזירו certain: false בלבד, בלי question ובלי answer.

רק כשאתם בטוחים במה שקראתם, החזירו certain: true עם question ו-answer.`;

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Never throws for "couldn't read it clearly" — that's a normal, expected result
 * (`{ certain: false }`), not a failure. It throws only when the call to Claude itself
 * failed (network, auth, timeout) — the caller (index.ts) maps that to the same generic
 * error every other communication failure already gets.
 */
export async function readPage(pngBuffer: Buffer): Promise<PageReading> {
  const response = await anthropic.messages.parse(
    {
      model: "claude-opus-5",
      max_tokens: 4096,
      output_config: { effort: "low", format: zodOutputFormat(PageReadingSchema) },
      system: TEACHER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/png", data: pngBuffer.toString("base64") } },
            { type: "text", text: "זה דף ממחברת תרגול. מה כתוב בו?" },
          ],
        },
      ],
    },
    { timeout: REQUEST_TIMEOUT_MS },
  );

  const parsed = response.parsed_output;
  if (parsed && parsed.certain && parsed.question && parsed.answer) {
    return { certain: true, question: parsed.question, answer: parsed.answer };
  }
  // Covers: parsing failed entirely (null), the model itself said certain: false, or it
  // said certain: true but left question/answer empty — all the same "don't guess" case.
  return { certain: false };
}
