#!/usr/bin/env node
/**
 * Gathers the facts a project status is made of. Prints them; decides nothing.
 *
 * The judgement — what matters, what is stuck, what needs the user — belongs to the
 * `/status` skill that reads this output. Keeping the split means the numbers here can be
 * trusted as read off disk rather than remembered, which is the whole point: a status
 * assembled from memory is the one that quietly goes stale.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const FEATURES = join(ROOT, "docs/features");

/** The five pipeline phases, in the order they run. */
const PHASES = ["Product spec", "Design", "Architecture", "Implementation", "Tests"];

const sh = (cmd) => {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

/** One feature's phase checklist and header lines, read off its status.md. */
function readFeature(slug) {
  const path = join(FEATURES, slug, "status.md");
  if (!existsSync(path)) return null;
  const text = readFileSync(path, "utf8");

  const done = PHASES.map((phase) => {
    // "- [x] Design — designer — 2026-08-15" · unchecked boxes are what is still to do.
    const line = text.split("\n").find((l) => l.includes(`] ${phase} —`));
    return { phase, done: line ? line.trimStart().startsWith("- [x]") : false };
  });

  const field = (name) => {
    const m = text.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+)`));
    return m ? m[1].trim() : "";
  };

  // The blockers section, minus the "None." that means there are none.
  const blockersRaw = text.split("## Open questions / blockers")[1]?.split("\n## ")[0] ?? "";
  const blockers = blockersRaw.trim().replace(/^(None\.?|אין\.?)$/m, "").trim();

  return {
    slug,
    title: text.split("\n")[0].replace(/^#\s*/, "").trim(),
    phases: done,
    nextPhase: done.find((p) => !p.done)?.phase ?? null,
    current: field("Current phase"),
    branch: field("Branch"),
    pr: field("PR"),
    blockers,
  };
}

const features = readdirSync(FEATURES, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => readFeature(d.name))
  .filter(Boolean);

console.log("=== FEATURES (from docs/features/*/status.md) ===\n");
for (const f of features) {
  const boxes = f.phases.map((p) => (p.done ? "x" : "-")).join("");
  console.log(`${f.slug}`);
  console.log(`  title    ${f.title}`);
  console.log(`  phases   ${boxes}   (spec design arch impl tests)`);
  console.log(`  next     ${f.nextPhase ?? "— all five done"}`);
  console.log(`  current  ${f.current}`);
  console.log(`  branch   ${f.branch}`);
  console.log(`  pr       ${f.pr}`);
  if (f.blockers) console.log(`  blockers ${f.blockers.split("\n")[0].slice(0, 160)}`);
  console.log("");
}

console.log("=== OPEN WORK NOT IN THE PIPELINE (CLAUDE.md, 'מה פתוח') ===\n");
const claude = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");
const open = claude.split("## מה פתוח")[1]?.split("\n## ")[0] ?? "";
console.log(open.trim() || "(section not found)");

console.log("\n=== GIT ===\n");
console.log("branch          ", sh("git branch --show-current"));
console.log("uncommitted     ", sh("git status --porcelain").split("\n").filter(Boolean).length, "file(s)");
const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
console.log("version         ", version);
console.log("main version    ", sh("git show origin/main:package.json").match(/"version":\s*"([^"]+)"/)?.[1] ?? "?");

/**
 * Open pull requests — the real "what is waiting".
 *
 * Deliberately not "branches not contained in origin/main": this repo squash-merges, so a
 * merged branch's tip is never an ancestor of main and every branch ever created looks
 * unmerged. That listing showed 33 branches, of which two were actually live.
 */
console.log("\nopen pull requests:");
const prs = sh(
  'curl -s -H "Authorization: token $GITHUB_TOKEN" ' +
    '"https://api.github.com/repos/eyalzur/learn-math/pulls?state=open&per_page=20"',
);
try {
  const list = JSON.parse(prs);
  if (!Array.isArray(list)) throw new Error("no access");
  if (list.length === 0) console.log("  (none)");
  for (const pr of list) {
    console.log(`  #${pr.number}  ${pr.title}`);
    console.log(`        ${pr.head.ref} → ${pr.base.ref} · ${pr.mergeable_state ?? "?"}`);
  }
} catch {
  console.log("  (could not reach GitHub — check PRs manually)");
}

console.log("\n=== TEST SUITE ===\n");
const specs = readdirSync(join(ROOT, "tests/e2e")).filter((f) => f.endsWith(".spec.ts"));
let tests = 0;
for (const spec of specs) {
  tests += (readFileSync(join(ROOT, "tests/e2e", spec), "utf8").match(/^test\(/gm) ?? []).length;
}
console.log(`${specs.length} spec files, ~${tests} top-level tests (not run — run npm run test:e2e for truth)`);
