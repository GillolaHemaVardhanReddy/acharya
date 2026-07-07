#!/usr/bin/env bash
# check-skills-sync.sh — used by .githooks/pre-push and /update-skills.
# Exits 0 if .skills-sync is at HEAD, 1 if behind (and prints which skills
# are stale). No side-effects.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
SYNC_FILE="$REPO_ROOT/.claude/.skills-sync"
ROUTING="$REPO_ROOT/.claude/skills-routing.json"

if [[ ! -f "$SYNC_FILE" ]]; then
  echo "[skills-sync] WARN: $SYNC_FILE missing; treating as fully stale" >&2
  exit 1
fi
if [[ ! -f "$ROUTING" ]]; then
  echo "[skills-sync] ERROR: $ROUTING missing" >&2
  exit 2
fi

SYNC_SHA="$(tr -d '[:space:]' < "$SYNC_FILE")"
HEAD_SHA="$(git rev-parse HEAD)"

if [[ "$SYNC_SHA" == "$HEAD_SHA" ]]; then
  echo "[skills-sync] in sync at $HEAD_SHA"
  exit 0
fi

# Quick check: any commits between sync and HEAD?
if ! git rev-parse --verify "$SYNC_SHA" >/dev/null 2>&1; then
  echo "[skills-sync] WARN: .skills-sync points at unknown SHA $SYNC_SHA; treating as fully stale" >&2
  exit 1
fi

AFFECTED=$(node "$REPO_ROOT/.claude/scripts/affected-skills.js" --range "$SYNC_SHA..$HEAD_SHA" 2>/dev/null || true)

if [[ -z "$AFFECTED" ]]; then
  # Commits exist but nothing touched a skill-owned file — just bump silently
  echo "$HEAD_SHA" > "$SYNC_FILE"
  echo "[skills-sync] no skill-owned files changed since $SYNC_SHA; bumped marker to $HEAD_SHA"
  exit 0
fi

echo "[skills-sync] STALE: skills behind HEAD ($SYNC_SHA -> $HEAD_SHA):"
echo "$AFFECTED" | sed 's/^/  - /'
exit 1
