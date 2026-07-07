#!/usr/bin/env bash
# setup.sh — one-time per-dev installer for the Acharya kit (this project's Claude workflow).
# Idempotent. Run from anywhere inside the repo.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "[setup] ERROR: must run inside a git repo" >&2; exit 1
}
cd "$REPO_ROOT"

echo "[setup] repo: $REPO_ROOT"

# 1. Point git at .githooks/ if the project ships hooks there
if [[ -d .githooks ]]; then
  CURRENT_HOOKSPATH="$(git config --get core.hooksPath || true)"
  if [[ "$CURRENT_HOOKSPATH" != ".githooks" ]]; then
    git config core.hooksPath .githooks
    echo "[setup] git config core.hooksPath = .githooks"
  else
    echo "[setup] core.hooksPath already set"
  fi
  chmod +x .githooks/* 2>/dev/null || true
  echo "[setup] .githooks/* marked executable"
else
  echo "[setup] no .githooks/ directory — skipping hooksPath (add one if you want commit-msg enforcement)"
fi

# 2. chmod the .claude/scripts/
if [[ -d .claude/scripts ]]; then
  chmod +x .claude/scripts/*.sh .claude/scripts/*.js 2>/dev/null || true
  echo "[setup] .claude/scripts/* marked executable"
fi

# 3. Verify node
if ! command -v node >/dev/null 2>&1; then
  echo "[setup] WARN: node not found. Some commands will not work." >&2
else
  if [[ -f .nvmrc ]]; then
    WANT="$(cat .nvmrc)"
    HAVE="$(node -v | sed 's/^v//' | cut -d. -f1)"
    if [[ "$HAVE" != "$WANT" ]]; then
      echo "[setup] WARN: node v$HAVE; .nvmrc requests v$WANT. Use 'nvm use' if you have nvm." >&2
    fi
  fi
fi

# 4. Seed .skills-sync if missing
if [[ ! -f .claude/.skills-sync ]]; then
  HEAD="$(git rev-parse HEAD)"
  echo "$HEAD" > .claude/.skills-sync
  echo "[setup] seeded .claude/.skills-sync with HEAD ($HEAD)"
fi

# 5. Sanity-check routing
if [[ ! -f .claude/skills-routing.json ]]; then
  echo "[setup] WARN: .claude/skills-routing.json missing — /update-skills will not work" >&2
fi

cat <<'EOF'

[setup] Done.

Quick commands:
  /acharya-init          — adopt the kit into THIS repo (run once, first)
  /feature <spec>        — full-stack feature build
  /bug <report>          — minimal-scope bug fix
  /extend <change>       — extend existing surface
  /migration <change>    — DB schema migration (per project's stores)
  /review                — logical+technical+security review of current diff
  /commit                — drafts conventional-commit + Affected-skills footer
  /update-skills [args]  — keep .claude/skills/ in sync with code
  /release-notes <range> — changelog grouped by skill

Commit format:
  <type>(<scope>): <subject>
  - type: feat|fix|refactor|docs|chore|perf|test|hotfix
  - scope: usually the affected skill name

See .claude/contract.md for the full contract.
EOF
