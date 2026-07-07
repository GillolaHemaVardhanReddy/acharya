---
description: Minimal-scope bug fix. Dev picks depth at checkpoints (see `.claude/contract.md`).
argument-hint: "<bug report / stack trace / repro steps>"
---

**Trivial-bug escape hatch (check FIRST).** If the root cause is obvious and the
fix is a small, localized one-liner (typo, off-by-one, wrong var, missing guard at
a known line), do NOT spawn the agent. Fix it inline on the main thread per
`contract.md` Altitude, then run Phase-4 review only if it clears the review
threshold. Say: "Small bug — fixing inline." Spawn the agent when the cause is
unknown, spans files, or needs a same-pattern sweep.

Otherwise, spawn the `bug` agent with the report as input:

> $ARGUMENTS

The agent follows the 4-phase contract (`.claude/contract.md`):
1. **Analyze** — traces root cause, greps for the same pattern elsewhere
2. **Ask** — `AskUserQuestion` for fix depth (patch / patch+regression test / patch+codebase audit), severity action (fix now / hotfix / ticket)
3. **Implement** — smallest change at the buggy line; `editor` writes
4. **Review + Ask** — fires `review`, surfaces cross-impact + un-fixed sister occurrences as choices

You don't pick. The dev does. Don't auto-commit.
