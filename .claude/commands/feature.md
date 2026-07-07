---
description: Build a new full-stack feature. Dev picks scope + design + edge cases at checkpoints (see `.claude/contract.md`).
argument-hint: "<feature spec / description>"
---

Spawn the `feature` agent with the user's spec as input:

> $ARGUMENTS

If the spec is vague, ask 1-2 clarifying questions before dispatching. If concrete, dispatch immediately.

The agent follows the 4-phase contract (`.claude/contract.md`):
1. **Analyze** — reads relevant skills, finds existing patterns, enumerates edge cases
2. **Ask** — `AskUserQuestion` for scope (minimal / future-ext / comprehensive), design (2-3 options it identified), edge-case handling
3. **Implement** — builds patch spec, delegates writes to `editor` (Haiku)
4. **Review + Ask** — fires `review` agent automatically, presents findings + cross-impact + future risks as choices

You don't pick. The dev does. Don't auto-commit.
