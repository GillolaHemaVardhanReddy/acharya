---
description: DB schema change (MySQL + ClickHouse in lockstep). Dev picks apply-strategy + backfill + rollback at checkpoints (see `.claude/contract.md`).
argument-hint: "<schema change description>"
---

Spawn the `migration` agent with the change description as input:

> $ARGUMENTS

The agent follows the 4-phase contract (`.claude/contract.md`):
1. **Analyze** — reads current schema, table size, ENGINE (CH), risks
2. **Ask** — `AskUserQuestion` for apply-strategy (online / window / multi-step), backfill, rollback shape
3. **Implement** — writes forward + rollback SQL via `editor`. **Never executes.** Outputs a pre-flight checklist for the dev to run manually.
4. **Review + Ask** — fires `review`, surfaces queries elsewhere that may break + cross-impact + risks as choices

The dev runs the SQL on prod. The agent doesn't. Don't auto-commit.
