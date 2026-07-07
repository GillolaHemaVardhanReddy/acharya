#!/usr/bin/env node
// affected-skills.js — resolves changed files → affected skill names.
//
// Reads .claude/skills-routing.json. Output: one skill name per line, sorted, unique.
//
// Modes (mutually exclusive; first match wins):
//   --staged              files = `git diff --cached --name-only`
//   --range A..B          files = `git diff --name-only A..B`
//   --range A             files = `git diff --name-only A`
//   --last N              files = changes in the last N commits
//   --files f1 f2 ...     files = explicit list
//   --stdin               files = newline-separated list on stdin
//   (no args)             files = `git diff --name-only <skills-sync-sha>..HEAD`
//
// Flags:
//   --json                output JSON array instead of newline list
//   --with-files          also print each file's matched skills (debug)

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = (() => {
  try { return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim(); }
  catch { return process.cwd(); }
})();

const ROUTING_PATH = path.join(REPO_ROOT, '.claude', 'skills-routing.json');
const SYNC_PATH = path.join(REPO_ROOT, '.claude', '.skills-sync');

function loadRouting() {
  if (!fs.existsSync(ROUTING_PATH)) {
    console.error(`affected-skills: routing file missing at ${ROUTING_PATH}`);
    process.exit(2);
  }
  const raw = JSON.parse(fs.readFileSync(ROUTING_PATH, 'utf8'));
  if (!raw.rules || !Array.isArray(raw.rules)) {
    console.error('affected-skills: routing file malformed (missing .rules[])');
    process.exit(2);
  }
  return raw.rules.map(r => ({
    skill: r.skill,
    matchers: (r.globs || []).map(globToRegex),
  }));
}

// Minimal glob-to-regex. Supports: **, *, ? and literal segments. No braces.
function globToRegex(glob) {
  let re = '^';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      // ** matches across directory boundaries
      re += '.*';
      i += 2;
      if (glob[i] === '/') i += 1;
    } else if (c === '*') {
      re += '[^/]*';
      i += 1;
    } else if (c === '?') {
      re += '[^/]';
      i += 1;
    } else if ('.+^$()|[]{}\\'.includes(c)) {
      re += '\\' + c;
      i += 1;
    } else {
      re += c;
      i += 1;
    }
  }
  re += '$';
  return new RegExp(re);
}

function gitFiles(args) {
  try {
    return execSync(`git ${args}`, { encoding: 'utf8', cwd: REPO_ROOT })
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
  } catch (e) {
    console.error(`affected-skills: git command failed: ${e.message}`);
    return [];
  }
}

// A git ref/range only ever contains these chars. Anything else (spaces, ;, |,
// $, backticks, &) is rejected before it reaches the shell — no injection.
function safeRef(s) {
  return typeof s === 'string' && s.length > 0 && /^[A-Za-z0-9._/@^~{}-]+$/.test(s);
}

function readSyncSha() {
  if (!fs.existsSync(SYNC_PATH)) return null;
  const raw = (fs.readFileSync(SYNC_PATH, 'utf8').trim() || '');
  return /^[0-9a-f]{7,40}$/i.test(raw) ? raw : null;
}

function collectFiles(argv) {
  const a = argv.slice(2);
  const has = name => a.indexOf(name) !== -1;
  const arg = name => {
    const i = a.indexOf(name);
    return i === -1 ? null : a[i + 1];
  };

  if (has('--staged')) return gitFiles('diff --cached --name-only');
  if (has('--range')) {
    const r = arg('--range');
    if (!r) return [];
    if (!safeRef(r)) { console.error(`affected-skills: refusing unsafe --range value: ${r}`); process.exit(2); }
    return gitFiles(`diff --name-only ${r}`);
  }
  if (has('--last')) {
    const n = parseInt(arg('--last'), 10);
    return n > 0 ? gitFiles(`diff --name-only HEAD~${n}..HEAD`) : [];
  }
  if (has('--files')) {
    const i = a.indexOf('--files');
    return a.slice(i + 1).filter(s => !s.startsWith('--'));
  }
  if (has('--stdin')) {
    const data = fs.readFileSync(0, 'utf8');
    return data.split('\n').map(s => s.trim()).filter(Boolean);
  }
  // default: skills-sync → HEAD
  const sha = readSyncSha();
  if (!sha) return gitFiles('diff --name-only HEAD~1..HEAD');
  return gitFiles(`diff --name-only ${sha}..HEAD`);
}

function resolveSkills(files, rules) {
  const skills = new Set();
  const perFile = {};
  for (const f of files) {
    perFile[f] = [];
    for (const r of rules) {
      if (r.matchers.some(re => re.test(f))) {
        skills.add(r.skill);
        perFile[f].push(r.skill);
      }
    }
  }
  return { skills: Array.from(skills).sort(), perFile };
}

function main() {
  const rules = loadRouting();
  const files = collectFiles(process.argv);
  const { skills, perFile } = resolveSkills(files, rules);

  const wantJson = process.argv.includes('--json');
  const wantDebug = process.argv.includes('--with-files');

  if (wantDebug) {
    process.stderr.write(`# files considered (${files.length}):\n`);
    for (const f of files) {
      process.stderr.write(`#   ${f}  ->  ${(perFile[f] || []).join(', ') || '(unmapped)'}\n`);
    }
  }

  if (wantJson) {
    process.stdout.write(JSON.stringify(skills) + '\n');
  } else {
    for (const s of skills) process.stdout.write(s + '\n');
  }
}

main();
