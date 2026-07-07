#!/usr/bin/env node
// suggest-agent.js — UserPromptSubmit hook. Reads JSON from stdin, scans the
// prompt for workflow keywords, prints a one-line nudge if the prompt looks
// like it belongs to one of the team's slash commands. Stays silent otherwise.
//
// Hook input shape (Claude Code passes JSON on stdin):
//   { "hook_event_name": "UserPromptSubmit", "prompt": "...", "session_id": "..." }

let raw = '';
try {
  raw = require('fs').readFileSync(0, 'utf8');
} catch { process.exit(0); }

let prompt = '';
try {
  const payload = JSON.parse(raw);
  prompt = (payload.prompt || '').toLowerCase();
} catch { process.exit(0); }

if (!prompt) process.exit(0);

// Order matters — first match wins. Specific keywords beat generic.
// No fallback rule — mid-session vague prompts shouldn't spam /triage. The
// SessionStart hook handles fresh-session intake; this hook just nudges
// when an intent is clear but the user forgot the slash command.
const rules = [
  { test: /\b(review|audit|lgtm|look over|check the diff)\b/, suggest: '/review' },
  { test: /\b(bug|broken|error|crash|exception|stack trace|not working|regression)\b/, suggest: '/bug' },
  { test: /\b(new column|new table|alter table|schema change|drop column|add (a |an )?index|migrat\w* (the )?\w*\s?(schema|table|column|migration))\b/, suggest: '/migration' },
  { test: /\b(release notes|changelog|what changed|tag)\b/, suggest: '/release-notes' },
  { test: /\b(extend|add to existing|expand|enhance the existing)\b/, suggest: '/extend' },
  { test: /\b(new feature|implement|build|create|add a)\b/, suggest: '/feature' },
  { test: /\b(commit|stage|push the changes)\b/, suggest: '/commit' },
  { test: /\b(update skills?|sync skills?|skill drift)\b/, suggest: '/update-skills' },
];

for (const r of rules) {
  if (r.test.test(prompt)) {
    const ctx = `(workflow hint: this looks like a job for ${r.suggest} — invoke that slash command for the team-standard flow.)`;
    process.stdout.write(ctx);
    process.exit(0);
  }
}
process.exit(0);
