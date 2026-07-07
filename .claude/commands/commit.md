---
description: Draft a conventional commit message + Affected-skills footer, confirm, commit.
argument-hint: "[optional type override: feat | fix | refactor | ...]"
---

1. Run `git status --short` + `git diff --cached`. If nothing staged, tell the dev and stop.
2. Compute affected skills: `node .claude/scripts/affected-skills.js --staged`.
3. Draft message:
   - Format: `<type>(<scope>): <subject>` + optional 1-3 line body + `Affected-skills: <csv>` footer
   - Type: from $ARGUMENTS if given, else infer from the diff
   - Scope: the dominant skill from step 2
   - Subject: imperative, ≤72 chars, no trailing period
4. Show the draft. Ask: yes / no / edit.
5. On yes: `git commit -m "<message via heredoc>"`. On edit: take the dev's revision. On no: stop.
6. After commit succeeds: report new short SHA.

Forbidden: don't add Claude attribution lines; don't use `--amend`; don't use `--no-verify` unless the dev explicitly asks.
