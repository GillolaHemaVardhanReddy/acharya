#!/usr/bin/env node
// acharya installer — copies the packaged .claude/ kit into the current repo.
//
//   npx acharya init [--force]
//
// Safe by default: refuses to touch an existing .claude/ unless --force, and
// even with --force it never overwrites files that hold YOUR project's state
// (settings.local.json, skills-routing.json, .skills-sync, anything in skills/).

const fs = require('fs');
const path = require('path');

const KIT = path.join(__dirname, '..', '.claude');
const DEST = path.join(process.cwd(), '.claude');

// Why: these carry per-project/per-machine state — the kit must never clobber them.
const PRESERVE = new Set(['settings.local.json', 'skills-routing.json', '.skills-sync']);
const PRESERVE_DIRS = ['skills'];

const args = process.argv.slice(2);
const cmd = args.find(a => !a.startsWith('-'));
const force = args.includes('--force');

if (args.includes('--help') || args.includes('-h') || !cmd) {
  console.log(`
acharya — a disciplined multi-agent dev team for Claude Code

Usage:
  npx acharya init            scaffold .claude/ into the current directory
  npx acharya init --force    overwrite kit files (project state is still preserved)

After installing, open Claude Code in your repo and run /acharya-init to adapt
the kit to your stack and generate skills for your codebase.

Docs: https://github.com/GillolaHemaVardhanReddy/acharya
`);
  process.exit(cmd ? 0 : 1);
}

if (cmd !== 'init') {
  console.error(`Unknown command "${cmd}". Try: npx acharya init`);
  process.exit(1);
}

if (fs.existsSync(DEST) && !force) {
  console.error(
    'A .claude/ directory already exists here.\n' +
    'Re-run with --force to update the kit files (your skills/, routing, and\n' +
    'local settings are preserved either way).'
  );
  process.exit(1);
}

let copied = 0, skipped = [];
function walk(rel) {
  const from = path.join(KIT, rel);
  const to = path.join(DEST, rel);
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const childRel = rel ? path.join(rel, entry.name) : entry.name;
    if (entry.isDirectory()) {
      const preserveDir = PRESERVE_DIRS.includes(childRel) && fs.existsSync(path.join(DEST, childRel));
      fs.mkdirSync(path.join(DEST, childRel), { recursive: true });
      if (preserveDir) { skipped.push(childRel + '/ (yours)'); continue; }
      walk(childRel);
    } else {
      const target = path.join(DEST, childRel);
      if (fs.existsSync(target) && PRESERVE.has(childRel)) { skipped.push(childRel); continue; }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(KIT, childRel), target);
      copied++;
    }
  }
}

fs.mkdirSync(DEST, { recursive: true });
walk('');

console.log(`\nacharya kit installed → ${DEST}`);
console.log(`  ${copied} file(s) written${skipped.length ? `, preserved: ${skipped.join(', ')}` : ''}`);
console.log(`
Next steps:
  1. Open Claude Code in this repo
  2. Run  /acharya-init  — it detects your stack, prunes unneeded specialists,
     and generates a fresh skills knowledge base for THIS codebase
  3. (optional)  bash .claude/scripts/setup.sh  for git-hook wiring

Heads-up: Acharya is built for complex, multi-feature codebases — on a small
project the workflow is overhead, not help.
`);
