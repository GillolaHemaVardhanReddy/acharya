---
description: Bootstrap the Acharya kit for THIS project — set identity/stack, prune mismatched agents, wipe inherited skills, and generate fresh one-per-feature skills.
---

# /acharya-init — adopt this kit into the current project

Run this ONCE after dropping `.claude/` into a new repo. You (Acharya) drive it.
Goal: make the kit match this project and leave it with accurate, freshly-built
skills so per-project maintenance is near-zero.

## Phase 1 — Detect the project

Before asking anything, gather evidence so your questions are pre-filled, not blind:
- Read `package.json` / `requirements.txt` / `go.mod` / `pom.xml` / `Gemfile` / `composer.json` — whatever exists — to infer language + frameworks.
- Glob the tree for backend/frontend roots (`src/`, `api/`, `server/`, `frontend/`, `app/`, `cmd/`…).
- Grep for datastore fingerprints: `mysql2|sequelize|knex` (mysql), `pg|postgres` (postgres), `@clickhouse|clickhouse` (clickhouse), `ioredis|bullmq|redis` (redis), `mongoose|mongodb` (mongodb).
- Note the existing `.claude/acharya.config.json` (it still holds the PREVIOUS project's values).

## Phase 2 — Ask (lock the config with the developer)

Use `AskUserQuestion`. Confirm, don't assume:
1. **Project name** + **what Acharya should call them** (default "Boss").
2. **Stack** — backend framework, frontend framework, and **datastores** (multi-select: mysql / postgres / clickhouse / mongodb / redis / none). This drives which specialist agents survive.
3. **Backend/frontend paths** (pre-fill from Phase 1).

## Phase 3 — Write config + adapt the kit

1. Write `.claude/acharya.config.json` with the confirmed values (keep the `agents` block; only change `assistant`, `project`, `datastores`). Prune the `agents` map only if the developer wants fewer.
2. Run the dry-run and show the developer the plan:
   ```
   node .claude/scripts/acharya-init.js
   ```
3. On approval, apply it:
   ```
   node .claude/scripts/acharya-init.js --apply
   ```
   This prunes stack-mismatched agents (e.g. drops the ClickHouse specialist if there's no ClickHouse), **deletes the inherited skills**, resets `skills-routing.json`, and reseeds `.skills-sync` to HEAD.

## Phase 4 — Generate fresh skills (one per feature area)

The inherited skills are gone; now build correct ones for THIS project so future
sessions never re-scan the codebase. This is the maintenance-killer.

1. **Map feature areas.** Use `explorer` (Pathik) to scan the codebase and propose a list of DISTINCT feature areas — one skill per area (e.g. `auth`, `billing`, `catalog`, `notifications`, `<db>-schema`, `queues`). Aim for clear, non-overlapping boundaries; a skill per feature, not per file.
2. **Confirm the list** with the developer (`AskUserQuestion`, multi-select to drop any).
3. **Generate in parallel.** Spawn one `skill-maintainer` (Guru) per confirmed area, each in CREATE mode: "Create a skill documenting <area> from scratch." Run them concurrently (multiple Agent calls in one message).
4. **Rebuild routing.** After skills land, write `.claude/skills-routing.json` with one rule block per new skill (glob → skill name), so `/update-skills` and the pre-push drift check work.
5. **Bump the sync marker** to HEAD (`git rev-parse HEAD` → `.claude/.skills-sync`).

## Phase 4b — Replace the inherited human docs

The seed project's human docs still carry the OLD project's name/branch model/examples. Regenerate them for THIS project (delegate the writes to `editor`/Shilpi):
- **`.claude/QUICKSTART.md`** — rewrite the cheat-sheet for this project (title, branch model, example commands). If the team doesn't want it, delete it — `README.md` already documents the kit.
- **Root `CLAUDE.md`** (if present) — rewrite §0 to point at `.claude/identity.md`, replace the branch model + scenarios with this project's, and keep §3/§4/§8 deferring to `.claude/contract.md`. If the project has no CLAUDE.md, skip — the kit is self-contained without one.
- Leave the machine-core (`identity.md`, `contract.md`, `agents/`, `commands/`, `scripts/`) untouched — it's already generic.

## Phase 5 — Report

Tell the developer, in their address term:
- New identity (name + how you address them) and stack.
- Agents kept vs pruned.
- Skills created (one line each) + routing rebuilt.
- Suggested next step: try `/feature` or `/review`, and `bash .claude/scripts/setup.sh` if they want the git hooks.

## Rules
- Never delete skills WITHOUT regenerating — a project with no skills is worse than one with stale ones.
- Don't prune core agents (feature/bug/extend/review/editor/explorer/precommit/release-notes/skill-maintainer/skill-updater). Only stack specialists are conditional.
- One skill per feature area. Resist mega-skills and resist one-skill-per-file sprawl.
