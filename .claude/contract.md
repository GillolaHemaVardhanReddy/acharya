# The Acharya working contract

The canonical, machine-read rules the guild follows. This lives INSIDE `.claude/`
so the kit is self-contained — agents reference this file, not a root CLAUDE.md.
(A project may ALSO keep a human-facing CLAUDE.md; if so, it should defer here.)

---

## Altitude — spend the fewest tokens that still get it right

**Context is the cost.** Spend ≈ (context carried per step) × (number of steps).
A multi-agent run burns **~15× the tokens of one inline pass** — it only pays when
the work is genuinely parallel, context-heavy-but-separable, or huge. Default to
the LOWEST tier that works; escalate only when the task clears the bar.

| Task | How to work | Spawn agents? |
|---|---|---|
| Trivial (rename, typo, 1-file tweak) | Inline, just do it | No |
| Routine feature / bug / extend / docs | **Main thread runs the 4 phases INLINE** | Only for a genuinely separable chunk |
| Big fan-out (audit, migration over many files, multi-angle review) | Orchestrator + parallel workers (or a Workflow) | Yes — parallelism pays |
| Open-ended research / "find everything" | Multi-agent + verify loop | Yes |

**Token budget per tier — declare it up front.** State the tier at the START of a
task ("Lean ~5k", "Standard", "Heavy") so the developer sees the spend you're
committing to and can correct it before it's burned.

| Tier | Fits | Target | Rules |
|---|---|---|---|
| **Lean** | trivial / localized — 1-2 files, obvious fix, no new design | **≤ 5k** | NO subagents. `grep` to locate, read with `offset`/`limit` windows — NEVER slurp a >500-line file whole. Inline self-check. Skip the ASK round. |
| **Standard** | routine feature / bug / extend across a few files with real logic | ~10–30k | Recon-from-the-diff. Targeted reads. ONE batched ASK if there's a real fork. Size-gated review (usually one Netra pass). |
| **Heavy** | audit / migration / multi-file sweep / multi-angle review | 30k+ (accepted) | Fan-out pays: parallel workers / Workflow. Spend buys coverage. |

**The two things that blow a Lean budget:** (1) spawning ANY subagent — one hop is
~20–60k, that alone breaks 5k; (2) reading a large file whole — a 4k-line component
is ~40k. A Lean task does NEITHER: no agents, and `grep` → `offset`/`limit` reads
only. If a task you thought was Lean starts needing an agent or a broad read, say
so and re-tier it — don't silently overspend a 5k commitment.

**Spawn a subagent ONLY for one of three reasons:** (1) **parallelism** — N
independent things at once; (2) **context isolation** — read a lot, return a
little; (3) **a different boundary** — different model tier / tools / permissions,
**or objectivity** (a reviewer who didn't write the code). Linear, human-gated
*implementation* work is none of these → keep it inline.

**End-of-change review — size-gated.** Phase-4 review runs as the independent
`review` agent (Netra) for any change BEYOND a trivial 1-2 file, single-surface
tweak — its value is that it did NOT write the diff (reason 3, objectivity). A
trivial single-surface diff self-checks inline. Cost is controlled by *cadence*
(once, at the end, on the final diff) AND by this size gate. See Phase 4.

**Never spawn → ask the human → re-spawn per decision.** That re-reads context you
already had — it's what turns a 1× task into a 4× bill. Batch all decisions into
ONE `AskUserQuestion`, then run straight through.

---

## The 4-phase developer-decision contract

**Principle: Acharya analyzes; the developer decides.** You do not pick scope,
design, or trade-offs silently. You present options at well-defined checkpoints.

**But asking is not free either.** A decision prompt only earns its place when
there is a GENUINE fork — two-or-more reasonable paths with different consequences.
When one option is the obvious safe default (minimal scope on a small change, a
backward-compatible extension, a clean review), do NOT manufacture a choice:
**auto-accept the default, state it in one line, and proceed** ("Assuming minimal
scope — say the word to change it"). The developer can always reverse a stated
assumption; they cannot un-spend the time answering a question that had only one
sane answer. Reserve checkpoints for real forks. When in doubt, ask.
**By default the main thread (the session model) runs all four phases INLINE** —
no agent hops. Delegation is an escalation, not the default (see Altitude).

```
1. ANALYZE  ─►  2. ASK (once)  ─►  3. IMPLEMENT  ─►  4. REVIEW
  (read code    (one batched      (inline by        (once, at the
   + skills)     decision round)    default)          end, pre-commit)
```

**Phase 1 — ANALYZE.** Read affected skills + relevant code. Identify edge cases,
callers, integration points, possible designs. No writes. (Explore inline; only
fan out an `explorer`/`Explore` worker if the search is genuinely broad.)
**Recon-from-the-diff first.** When the work targets a known or recent commit, or a
localized area you can already name, the diff IS the map: `git show <sha> --stat` +
a handful of direct reads beats a blind `explorer` fan-out — which re-derives, at
~15× the cost, what the commit already tells you. Reserve the explorer for when you
genuinely don't know where the code lives.

**Phase 2 — ASK (a SINGLE batched checkpoint).** Use ONE `AskUserQuestion` call
with up to 4 questions that lock the developer's choices together — do not drip
questions across multiple rounds. Standard buckets:
- **Scope**: Minimal / Future-extensible / Comprehensive.
- **Design / integration**: build into existing pattern X (give 2-3 options) vs. independent module.
- **Edge cases**: present the analyzed list — "handle these now?" (multi-select).

You DO NOT pick. The developer picks.

**Skip-when-obvious.** If scope, design, and edge-cases are all unambiguous from
the request (a small, single-surface change with one sensible implementation), do
NOT fire the checkpoint — state the assumption in one line ("Assuming minimal
scope, existing pattern X — say the word to change it.") and go straight to
Phase 3. The ASK round is for genuine forks, not ceremony. When in doubt, ask.

**Phase 3 — IMPLEMENT.** Build the change from the developer's choices and **write
it inline by default.** Delegate to `editor` (Shilpi, Haiku) ONLY for a large batch
of mechanical writes where the cheaper tier actually pays — not for a handful of
edits (the agent hop costs more than it saves on small diffs).

**Phase 4 — REVIEW (independent, once, at the end) — size-gated.** Beyond a trivial
diff, review is done by the `review` agent (Netra) — an **independent reviewer that
did NOT write the code.** The implementer rationalizes its own choices, so fresh
eyes catch the cross-feature impact, future risks, and security holes the author is
blind to.

**Size gate.** Self-check inline (no agent) when the diff is small AND
single-surface — a trivial 1-2 file tweak with no new control-flow. Past that bar —
3+ files OR a broad multi-surface change — run Netra. **Risk override:** any auth /
payment / query / migration / data-write boundary pulls in Netra regardless of size
(even a 1-file change), because that is where the author's blind spots bite
hardest. When unsure, run Netra.
The cost discipline here is *cadence, not independence*: run Netra **ONCE** on the
final diff, just before commit — never after every fix round — and feed it the
diff + touched files, not a whole-repo re-scan. Collect ALL findings and present
them in a single batch of actionable options:
- **Issues found** (per severity): fix now / file a ticket / accept + document.
- **Cross-feature impact**: per impacted feature — leave / add defensive guard / extend properly.
- **Future risks**: mitigate now / document and accept.
- **What this complements**: extend now / queue as next iteration / leave.

The developer checks the boxes; you execute the chosen fixes in ONE consolidated
follow-up round — not a per-finding re-spawn loop.

---

## The editor pattern — one writer, for batch delegation

When you DO delegate writes (big mechanical change, or a planner agent that has no
`Edit`/`Write` tools), they all go through ONE agent: `editor` (Shilpi, Haiku
model). Planner agents (`feature`/Brahma, `bug`/Rudra, `extend`/Vishnu,
`migration`/Setu, `skill-updater`/Lipi) READ + REASON + DESIGN and hand `editor` a
structured patch spec to apply.

Why one writer: the cheap tier handles high-volume writes (cost); one agent
enforces code style consistently (style); one file to fix when something is
written that shouldn't be (accountability).

**But delegation is not free** — an agent hop adds a round-trip and re-establishes
context. For inline work and small diffs, the main thread writes directly. Reserve
the editor hop for genuinely large or parallel write batches.

---

## Git safety — pushing is ALWAYS the developer's call (MANDATORY)

- **NEVER `git push` on your own.** Not after a commit, not after a fix round,
  not because the task "feels finished." Ask first — or act only on an explicit
  instruction in the CURRENT conversation. Approval for one push does NOT carry
  over to the next.
- Before proposing a push, state which gates ran: the Phase-4 review (or the
  inline self-check for trivial diffs) and `precommit`. In a bridge instance,
  `/cross-check` must have run for anything touching shared background jobs or
  datastores.
- `settings.json` backs this with a permission prompt on `git push` — do not
  look for ways around it.
- Force-pushes, tag pushes, and pushes to any branch other than the current
  integration branch need an explicit, spelled-out instruction — never inferred.

---

## Commit format

```
<type>(<scope>): <subject>

<body>

Affected-skills: <comma-separated skill names>
```

- **type** (required): `feat | fix | refactor | docs | chore | perf | test | hotfix`
- **scope** (recommended): the dominant affected skill name.
- **subject**: ≤ 72 chars, imperative present-tense, no trailing period.
- The `Affected-skills:` footer is computed from the staged diff via
  `node .claude/scripts/affected-skills.js --staged`.

---

## Code style (terse on purpose)

- Don't add error handling for impossible states. Trust internal code; validate only at system boundaries.
- Don't write comments that just describe what code does. Only `// Why:` comments for non-obvious constraints/workarounds/invariants.
- Don't over-abstract. Three similar lines beat a premature abstraction.
- No `// TODO`-marker churn — open a ticket or fix it now.
- Bug fixes don't include surrounding cleanup. Keep the diff minimal.
- One-shot ops don't need helpers. Just write the code.
