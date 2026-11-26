#!/usr/bin/env node
// Installs the knowledge-base kit into another app's repo.
//   node kb-kit/install.mjs /path/to/other-app
// Copies tools, agents and skills from THIS repo (single source of truth — no second copy to drift),
// creates an empty kb/ with a generic _types.md, and prints the two manual steps left.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "..");
const target = path.resolve(process.argv[2] ?? "");
if (!process.argv[2] || !fs.existsSync(target)) { console.error("usage: node kb-kit/install.mjs <existing app repo dir>"); process.exit(1); }

const copy = (rel, from = src) => {
  const to = path.join(target, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(path.join(from, rel), to, { recursive: true });
};
for (const f of ["lib.mjs", "kb.mjs", "kb.test.mjs", "README.md"]) copy(`kb/tools/${f}`);
for (const f of ["kb-query.md", "kb-ingest.md"]) copy(`.claude/agents/${f}`);
for (const s of ["kb-ask", "kb-add"]) copy(`.claude/skills/${s}`);
const types = path.join(target, "kb/_types.md");
if (!fs.existsSync(types)) { fs.mkdirSync(path.dirname(types), { recursive: true }); fs.copyFileSync(path.join(here, "template/_types.md"), types); }
fs.mkdirSync(path.join(target, "kb/decisions"), { recursive: true });

console.log(`installed into ${target}

Two manual steps:
  1. package.json:  npm i -D yaml   and add scripts
       "kb": "node kb/tools/kb.mjs", "kb:test": "node --test kb/tools/kb.test.mjs"
  2. CI: run  npm run kb:test && npm run kb -- lint  (see .github/workflows/tests.yml, job "kb")
Then: edit kb/_types.md (name, language, directories) and run  /kb-add  on your docs.`);
