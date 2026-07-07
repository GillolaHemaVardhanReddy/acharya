---
description: Logical + technical + security + cross-impact review. Dev picks action per finding (see `.claude/contract.md` (Phase 4)).
argument-hint: "[base branch — defaults to master]"
---

Resolve the diff scope:
- No arg: `git diff master...HEAD` + staged + unstaged
- Arg: use that as the base

Compute affected skills:
```
node .claude/scripts/affected-skills.js --range <base>..HEAD
```

Spawn the `review` agent with the diff + the affected-skills list. It returns structured findings with sections:
- `## FINDINGS` (Critical / High / Medium / Low)
- `## CROSS_IMPACT` (other skills that share the touched files)
- `## FUTURE_RISKS`
- `## COMPLEMENTS`
- `## CLEAN`

**Auto-proceed when clean.** If the review returns `## CLEAN` with no Critical /
High / Medium findings (Low-only counts as clean), do NOT open a question block.
Report "Review clean — proceeding." in one line and stop. Don't manufacture
decisions from an empty result.

Otherwise present **ONE consolidated `AskUserQuestion` block** (matching
`contract.md` Phase 4 — a single batch, not one block per category). Put the real
forks across up to 4 questions; the dev picks per item:
- Findings → fix now / file as ticket / accept
- Cross-impact → leave / add guard / extend properly in the impacted skill
- Future risks → mitigate now / document / accept
- Complements → extend now / ticket / leave

Fold low-stakes categories into a single question rather than spending a whole
question on each. For any "fix now" / "extend now" / "mitigate now" / "add guard"
picks, dispatch the appropriate planner (`bug` / `extend` / `feature`) with the
chosen specifics. The dev's picks become the next round of work.

Don't auto-commit.
