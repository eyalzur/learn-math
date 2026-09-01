import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

/**
 * Acceptance criteria under test (docs/features/notebook-server-relay/product-spec.md).
 *
 * Everything this file used to check about the client UI — the toolbar, the "📝 מחברת"
 * toggle, the image-relay confirmation dialog, "← חזרה לתרגול" — described a screen that
 * docs/features/notebook-default-practice/ replaced outright: the notebook is now always
 * present (no toggle), there is no separate question screen to return to, and /read-page no
 * longer returns an image to the client at all. Those tests are gone, not patched — see
 * notebook-default-practice.spec.ts for the current merged screen's coverage.
 *
 * What's left, and still true regardless of any of that: the one server-infrastructure
 * boundary a client-side e2e test can actually check.
 *  - "קיים שירות שרת שרץ בגוגל קלאוד..." and "השרת מקבל בקשה... ומחזיר תמונה נאמנה" were
 *    never covered here either — deployment and PNG fidelity are manual/server-side checks
 *    (see server/README.md and server/src/renderMatrix.ts).
 */

const CLIENT_FILES = ["src/lib/notebookServer.ts", "src/components/PracticeNotebook.tsx", "src/components/Practice.tsx"];
const ANTHROPIC_SDK_USAGE = /@anthropic-ai\/sdk|api\.anthropic\.com|ANTHROPIC_API_KEY/;

test("no client-side code imports the Anthropic SDK or calls their API directly — that stays server-only", () => {
  for (const relativePath of CLIENT_FILES) {
    const content = readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
    expect(content, `${relativePath} should not use the Anthropic SDK/API directly`).not.toMatch(ANTHROPIC_SDK_USAGE);
  }
});
