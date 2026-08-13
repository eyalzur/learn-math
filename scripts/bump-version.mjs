#!/usr/bin/env node
/**
 * Bumps the version in package.json — the single source of truth.
 *
 *   node scripts/bump-version.mjs feature   # middle + 1, minor -> 0
 *   node scripts/bump-version.mjs fix       # minor + 1
 *
 * It only edits the file: no git commit, no tag. The change rides along in whatever commit
 * the current phase was already making, so the number and the code it describes can never
 * ship apart.
 *
 * There is no `major` argument on purpose. Major is a deliberate human decision, and a
 * script that knows how to raise it is a script someone eventually runs by accident.
 */
import { readFileSync, writeFileSync } from "node:fs";

const KIND = process.argv[2];
const PACKAGE_JSON = new URL("../package.json", import.meta.url);

if (KIND !== "feature" && KIND !== "fix") {
  console.error("usage: node scripts/bump-version.mjs <feature|fix>");
  console.error("       major is edited by hand, on purpose.");
  process.exit(1);
}

const raw = readFileSync(PACKAGE_JSON, "utf8");
const pkg = JSON.parse(raw);
const parts = String(pkg.version).split(".");

if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) {
  console.error(`package.json version is "${pkg.version}", expected major.middle.minor`);
  process.exit(1);
}

const [major, middle, minor] = parts.map(Number);
const next =
  KIND === "feature" ? `${major}.${middle + 1}.0` : `${major}.${middle}.${minor + 1}`;

// Rewrite the version in place rather than re-serialising the whole object, so npm's own
// key order and formatting survive untouched.
writeFileSync(
  PACKAGE_JSON,
  raw.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${next}"`),
);

console.log(`${pkg.version} -> ${next}`);
