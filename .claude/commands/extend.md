---
description: Extend an existing surface. Dev picks compatibility model + caller propagation at checkpoints (see `.claude/contract.md`).
argument-hint: "<extension request — what to add to which existing thing>"
---

**Trivial-extend escape hatch (check FIRST).** If the addition is small and the
surface + callers are obvious (e.g. add one field to a known response, one option
to an existing switch, a single new case), do NOT spawn the agent. Handle it inline
on the main thread per `contract.md` Altitude — write it, then run Phase-4 review
only if it clears the review threshold. Say: "Small extend — handling inline."

Otherwise, spawn the `extend` agent with the request as input:

> $ARGUMENTS

The agent follows the 4-phase contract (`.claude/contract.md`):
1. **Analyze** — reads X, builds a full caller map (every call-site), identifies 2-3 add-strategies
2. **Ask** — `AskUserQuestion` for compatibility (backward-compat / versioned / breaking), which callers to propagate to, future shape
3. **Implement** — applies via `editor`; updates only the callers the dev chose
4. **Review + Ask** — fires `review`, surfaces non-updated callers + complementary surfaces as choices

You don't pick. The dev does. Don't auto-commit.
