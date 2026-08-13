#!/usr/bin/env node
/**
 * Fails a pull request that changes the app but forgets to raise the version.
 *
 *   node scripts/check-version-bump.mjs <base-ref> <head-ref>
 *
 * This is the layer that actually holds. Writing the rule into a skill file only raises
 * the odds someone remembers it — the status docs in this repo went stale for exactly that
 * reason and had to be repaired by hand. A check that fails the PR does not forget.
 *
 * What it can and cannot do: it verifies that *a* bump happened and that it matches the
 * branch prefix. It cannot tell whether a change is really a feature or really a fix — a
 * fix pushed on a `feature/` branch will pass. That judgement stays human; the check only
 * guarantees it was made rather than skipped.
 */
import { execFileSync } from "node:child_process";

const [baseRef, headRef] = process.argv.slice(2);

/** Skips rather than fails: a false red blocks a merge for no reason. */
function skip(reason) {
  console.log(`skipping version check — ${reason}`);
  process.exit(0);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function versionAt(ref) {
  const pkg = JSON.parse(git("show", `${ref}:package.json`));
  const parts = String(pkg.version).split(".");
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) {
    fail(`version at ${ref} is "${pkg.version}", expected major.middle.minor`);
  }
  const [major, middle, minor] = parts.map(Number);
  return { major, middle, minor, text: pkg.version };
}

if (!baseRef || !headRef) skip("no base or head ref was passed (fork PR?)");

const base = `origin/${baseRef}`;

// Only changes a user could actually see require a bump. A docs-only PR that raised the
// number would be announcing an app change that never happened — the number has to keep
// meaning something.
const changed = git("diff", "--name-only", `${base}...HEAD`).split("\n").filter(Boolean);
const touchesApp = changed.some(
  (f) => f.startsWith("src/") || f.startsWith("public/") || f === "index.html",
);
if (!touchesApp) skip("this PR does not touch src/, public/ or index.html");

const before = versionAt(base);
const after = versionAt("HEAD");

if (after.major !== before.major) {
  console.log(`major changed: ${before.text} -> ${after.text} (manual, accepted)`);
  process.exit(0);
}

const prefix = headRef.split("/")[0];

if (prefix === "feature") {
  const ok = after.middle === before.middle + 1 && after.minor === 0;
  if (!ok) {
    fail(
      `a feature branch must raise middle by one and reset minor.\n` +
        `  ${base}: ${before.text}\n  HEAD: ${after.text}\n` +
        `  expected: ${before.major}.${before.middle + 1}.0\n` +
        `  run: npm run bump:feature`,
    );
  }
} else if (prefix === "fix") {
  const ok = after.middle === before.middle && after.minor === before.minor + 1;
  if (!ok) {
    fail(
      `a fix branch must raise minor by one.\n` +
        `  ${base}: ${before.text}\n  HEAD: ${after.text}\n` +
        `  expected: ${before.major}.${before.middle}.${before.minor + 1}\n` +
        `  run: npm run bump:fix`,
    );
  }
} else {
  skip(`branch "${headRef}" is neither feature/* nor fix/*`);
}

console.log(`version bump ok: ${before.text} -> ${after.text}`);
