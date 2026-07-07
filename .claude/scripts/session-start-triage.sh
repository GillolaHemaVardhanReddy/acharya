#!/usr/bin/env bash
# session-start-triage.sh — SessionStart hook. Injects a one-time instruction
# at the top of each new session telling Claude to run the triage flow on the
# user's first ambiguous prompt.
#
# Only fires on fresh starts (not on resumes), to avoid re-triaging mid-task.

set -euo pipefail

INPUT="$(cat 2>/dev/null || true)"

SOURCE="$(node -e "
let s='';try{s=require('fs').readFileSync(0,'utf8');}catch(e){}
try{const j=JSON.parse(s);process.stdout.write(j.source||'');}catch(e){}
" <<<"$INPUT" 2>/dev/null || true)"

# Only run on fresh start; skip on resume/clear (user is continuing prior work)
if [[ "$SOURCE" != "startup" ]] && [[ -n "$SOURCE" ]]; then
  exit 0
fi

cat <<'EOF'
[team-intake]
On the user's FIRST message in this session, if the message is NOT a slash command and the intent is not unambiguous (e.g. continuing prior work, an explicit instruction like "rename X to Y"), invoke the /triage slash command before doing any other work. This routes the user to the correct specialist flow (/feature, /bug, /extend, /migration, /review, /commit, /update-skills, /release-notes) and asks the relevant clarifying questions.

You may skip /triage when:
- The user already used a slash command (they self-routed)
- The user's intent is fully concrete and small ("fix this typo on line 42", "rename foo to bar in this file") — handle inline
- The user is continuing or resuming a clearly-defined prior task
EOF
