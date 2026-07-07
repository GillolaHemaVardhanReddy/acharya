#!/usr/bin/env node
// acharya installer — copies the packaged .claude/ kit into the current repo.
//
//   npx acharya init [--force] [--dry-run]
//   npx acharya doctor
//   npx acharya --version
//
// Safe by default: refuses to touch an existing .claude/ unless --force, and
// even with --force it never overwrites files that hold YOUR project's state
// (settings.local.json, skills-routing.json, .skills-sync, anything in skills/).
// Host-agnostic: plain git only — works the same on GitHub, GitLab, Bitbucket,
// or a bare remote.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const KIT = path.join(__dirname, '..', '.claude');
const DEST = path.join(process.cwd(), '.claude');
const VERSION = require(path.join(__dirname, '..', 'package.json')).version;

// Why: these carry per-project/per-machine state — the kit must never clobber them.
const PRESERVE = new Set(['settings.local.json', 'skills-routing.json', '.skills-sync']);
const PRESERVE_DIRS = ['skills'];

const args = process.argv.slice(2);
const cmd = args.find(a => !a.startsWith('-'));
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');

function help(code) {
  console.log(`
acharya v${VERSION} — a disciplined multi-agent dev team for Claude Code

Usage:
  npx acharya init             scaffold .claude/ into the current directory
  npx acharya init --dry-run   show what would be written/preserved, write nothing
  npx acharya init --force     overwrite kit files (project state is still preserved)
  npx acharya doctor           health-check an installed kit
  npx acharya --version        print the version

After installing, open Claude Code in your repo and run /acharya-init to adapt
the kit to your stack and generate skills for your codebase.

Docs: https://github.com/GillolaHemaVardhanReddy/acharya
`);
  process.exit(code);
}

if (args.includes('--version') || args.includes('-v')) { console.log(VERSION); process.exit(0); }
if (args.includes('--help') || args.includes('-h') || !cmd) help(cmd ? 0 : 1);

// ---------------------------------------------------------------- init
function init() {
  if (fs.existsSync(DEST) && !force && !dryRun) {
    console.error(
      'A .claude/ directory already exists here.\n' +
      'Re-run with --dry-run to preview, or --force to update the kit files\n' +
      '(your skills/, routing, and local settings are preserved either way).'
    );
    process.exit(1);
  }

  let copied = 0; const skipped = [];
  const would = dryRun ? 'would write' : 'wrote';

  function walk(rel) {
    const from = path.join(KIT, rel);
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      const childRel = rel ? path.join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) {
        const preserveDir = PRESERVE_DIRS.includes(childRel) && fs.existsSync(path.join(DEST, childRel));
        if (!dryRun) fs.mkdirSync(path.join(DEST, childRel), { recursive: true });
        if (preserveDir) { skipped.push(childRel + '/ (yours)'); continue; }
        walk(childRel);
      } else {
        const target = path.join(DEST, childRel);
        if (fs.existsSync(target) && PRESERVE.has(childRel)) { skipped.push(childRel); continue; }
        if (!dryRun) {
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.copyFileSync(path.join(KIT, childRel), target);
        }
        copied++;
      }
    }
  }

  if (!dryRun) fs.mkdirSync(DEST, { recursive: true });
  walk('');

  console.log(`\n${dryRun ? '[dry-run] ' : ''}acharya kit ${dryRun ? 'preview for' : 'installed →'} ${DEST}`);
  console.log(`  ${would} ${copied} file(s)${skipped.length ? `, preserved: ${skipped.join(', ')}` : ''}`);
  if (dryRun) { console.log('\nNothing was written. Re-run without --dry-run to install.\n'); return; }
  console.log(`
Next steps:
  1. Open Claude Code in this repo
  2. Run  /acharya-init  — it detects your stack, prunes unneeded specialists,
     and generates a fresh skills knowledge base for THIS codebase
  3. (optional)  bash .claude/scripts/setup.sh  for git-hook wiring

Heads-up: Acharya is built for complex, multi-feature codebases — on a small
project the workflow is overhead, not help.
`);
}

// ---------------------------------------------------------------- doctor
function doctor() {
  const results = [];
  const ok = (m) => results.push(['ok', m]);
  const warn = (m) => results.push(['warn', m]);
  const bad = (m) => results.push(['fail', m]);

  const major = parseInt(process.versions.node.split('.')[0], 10);
  major >= 18 ? ok(`node ${process.versions.node}`) : bad(`node ${process.versions.node} — kit scripts need >= 18`);

  if (!fs.existsSync(DEST)) { bad('.claude/ not found here — run: npx acharya init'); report(); return; }

  for (const f of ['identity.md', 'contract.md', 'acharya.config.json', 'settings.json']) {
    fs.existsSync(path.join(DEST, f)) ? ok(f) : bad(`${f} missing`);
  }
  for (const d of ['agents', 'commands', 'scripts']) {
    const p = path.join(DEST, d);
    fs.existsSync(p) && fs.readdirSync(p).length
      ? ok(`${d}/ (${fs.readdirSync(p).length} files)`)
      : bad(`${d}/ missing or empty`);
  }

  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(DEST, 'acharya.config.json'), 'utf8'));
    JSON.stringify(cfg.project || {}).includes('YOUR PROJECT NAME')
      ? warn('acharya.config.json still has template placeholders — run /acharya-init')
      : ok(`config: project "${cfg.project && cfg.project.name}"`);
  } catch { bad('acharya.config.json is not valid JSON'); }

  try {
    const routing = JSON.parse(fs.readFileSync(path.join(DEST, 'skills-routing.json'), 'utf8'));
    const n = (routing.rules || []).length;
    n ? ok(`skills-routing.json (${n} rule${n === 1 ? '' : 's'})`) : warn('skills-routing.json has no rules yet — /acharya-init generates them');
  } catch { warn('skills-routing.json missing or invalid — /update-skills will not work'); }

  const skillsDir = path.join(DEST, 'skills');
  const skills = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter(d => d.isDirectory()).length : 0;
  skills ? ok(`skills/ (${skills} skill${skills === 1 ? '' : 's'})`) : warn('skills/ is empty — run /acharya-init to generate the knowledge base');

  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    const syncPath = path.join(DEST, '.skills-sync');
    if (fs.existsSync(syncPath)) {
      const sha = fs.readFileSync(syncPath, 'utf8').trim();
      try {
        const behind = execSync(`git rev-list --count ${sha}..HEAD`, { stdio: 'pipe', encoding: 'utf8' }).trim();
        behind === '0' ? ok('skills in sync with HEAD') : warn(`skills are ${behind} commit(s) behind HEAD — run /update-skills`);
      } catch { warn('.skills-sync points at an unknown commit — reseed via bash .claude/scripts/setup.sh'); }
    } else warn('.skills-sync missing — seed via bash .claude/scripts/setup.sh');
  } catch { warn('not a git repo — drift checks and /commit footers need git'); }

  report();

  function report() {
    const icon = { ok: '  ✓', warn: '  !', fail: '  ✗' };
    console.log(`\nacharya doctor v${VERSION}\n`);
    for (const [level, msg] of results) console.log(`${icon[level]} ${msg}`);
    const fails = results.filter(r => r[0] === 'fail').length;
    const warns = results.filter(r => r[0] === 'warn').length;
    console.log(`\n${fails ? `${fails} problem(s), ` : ''}${warns} warning(s)${!fails && !warns ? ' — all healthy' : ''}\n`);
    process.exit(fails ? 1 : 0);
  }
}

if (cmd === 'init') init();
else if (cmd === 'doctor') doctor();
else { console.error(`Unknown command "${cmd}". Try: npx acharya init | doctor`); process.exit(1); }
