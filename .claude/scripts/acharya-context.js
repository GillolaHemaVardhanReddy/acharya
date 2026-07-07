#!/usr/bin/env node
// acharya-context.js — SessionStart hook. Resolves .claude/identity.md against
// .claude/acharya.config.json and prints it so the persona ("Acharya", the
// address term, the stack, the guild roster) loads at the top of every session.
//
// This is what makes the kit self-contained: identity travels INSIDE .claude/,
// so copying the folder alone into a new repo is enough. No root CLAUDE.md
// required. Stays silent (exit 0, no output) if config/identity are missing.

const fs = require('fs');
const path = require('path');

// Resolve .claude/ relative to this script (scripts/ -> ..).
const CLAUDE_DIR = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(CLAUDE_DIR, 'acharya.config.json');
const IDENTITY_PATH = path.join(CLAUDE_DIR, 'identity.md');
const AGENTS_DIR = path.join(CLAUDE_DIR, 'agents');

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

const config = readJson(CONFIG_PATH);
if (!config || !fs.existsSync(IDENTITY_PATH)) process.exit(0);

const a = config.assistant || {};
const proj = config.project || {};
const datastores = Array.isArray(config.datastores) ? config.datastores : [];

const assistantName = a.name || 'Acharya';
const addressTerm = a.addressTerm || 'Boss';
const projectName = proj.name || 'this project';
const projectKind = proj.kind || '';

// Build the human-readable stack line from config.
const stackBits = [];
if (proj.backend) stackBits.push(`${proj.backend} backend`);
if (proj.frontend) stackBits.push(`${proj.frontend} frontend`);
if (datastores.length) stackBits.push(`datastores — ${datastores.join(', ')}`);
const stack = stackBits.join('; ') || 'see .claude/acharya.config.json';

// Build the guild roster from config, but only for agents that actually exist
// as files (so a pruned project shows an accurate roster).
const agentDefs = config.agents || {};
const rows = ['| Routing id | Codename | Charter |', '|---|---|---|'];
for (const [id, def] of Object.entries(agentDefs)) {
  if (!fs.existsSync(path.join(AGENTS_DIR, `${id}.md`))) continue;
  const name = (def && def.codename) || id;
  const epithet = (def && def.epithet) || '';
  rows.push(`| \`${id}\` | **${name}** | ${epithet} |`);
}
const guildTable = rows.length > 2 ? rows.join('\n') : '(no agents installed)';

const identity = fs.readFileSync(IDENTITY_PATH, 'utf8')
  // Drop the leading HTML editor-note comment from the injected output.
  .replace(/^<!--[\s\S]*?-->\s*/, '')
  .replace(/\{\{ASSISTANT_NAME\}\}/g, assistantName)
  .replace(/\{\{ADDRESS_TERM\}\}/g, addressTerm)
  .replace(/\{\{PROJECT_NAME\}\}/g, projectName)
  .replace(/\{\{PROJECT_KIND\}\}/g, projectKind)
  .replace(/\{\{STACK\}\}/g, stack)
  .replace(/\{\{GUILD_TABLE\}\}/g, guildTable);

process.stdout.write(identity);
process.exit(0);
