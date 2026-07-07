#!/usr/bin/env bash
# post-bash-skills-nudge.sh — PostToolUse hook called after every Bash invocation.
# Reads the hook JSON from stdin, fishes out the command, and if it looks like
# `git push`, prints a one-line reminder. Silent otherwise.

set -euo pipefail

INPUT="$(cat 2>/dev/null || true)"
[[ -z "$INPUT" ]] && exit 0

CMD="$(node -e "
let s='';try{s=require('fs').readFileSync(0,'utf8');}catch(e){}
try{const j=JSON.parse(s);process.stdout.write(((j.tool_input||{}).command)||'');}catch(e){}
" <<<"$INPUT" 2>/dev/null || true)"

if [[ "$CMD" =~ ^git[[:space:]]+push ]]; then
  echo "[skills] tip: push detected — confirm .claude/.skills-sync is at HEAD by running 'bash .claude/scripts/check-skills-sync.sh' or '/update-skills latest'."
fi
exit 0
