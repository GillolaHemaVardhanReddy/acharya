---
description: Intake. Asks the dev what kind of work they're doing, then routes to /feature, /bug, /extend, /migration, /review, /commit, /update-skills, /release-notes.
argument-hint: "(optional) one-line description"
---

User's optional inline description: $ARGUMENTS

**`/triage` is route-only.** Its single job is to pick the work-type and hand the
raw request to the right specialist. It does NOT collect scope / surface / auth /
repro details — the chosen planner gathers those in its OWN Phase-2 ASK. Asking
them here just makes the dev answer the same things twice.

1. Use `AskUserQuestion` (single-select):

   **What kind of work are you starting?**
   - New feature → /feature
   - Bug fix → /bug
   - Extend existing → /extend
   - DB schema change → /migration

   (Harness automatically adds "Other".)

   If $ARGUMENTS already clearly maps to one of these, infer and skip the question. Say: "Inferred: /feature. Continuing..."

   For **Other**, do a one-line match to /review, /commit, /update-skills,
   /release-notes — or handle inline if trivial.

2. Hand the **raw request** straight to the chosen command. **Do not do the work
   yourself, and do not pre-ask the planner's questions** — `/triage` is a router.
   Exception: trivial inline edits (rename, typo) handled directly.

Never invoke `/triage` recursively.
