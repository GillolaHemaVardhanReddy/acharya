# Acharya — a disciplined AI dev team for your codebase

[![npm version](https://img.shields.io/npm/v/acharya)](https://www.npmjs.com/package/acharya)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![git host](https://img.shields.io/badge/git-GitHub%20%7C%20GitLab%20%7C%20Bitbucket-lightgrey)

**A drop-in `.claude/` kit for [Claude Code](https://claude.com/claude-code) that turns one assistant into a managed guild of specialist engineers** — a lead who analyzes and asks before acting, a single cheap "hands" agent that types, an independent reviewer who never saw the diff being written, and stack specialists (SQL, analytics, queues) that are pruned automatically if your stack doesn't need them.

Born inside a real production system (a multi-service booking platform mid-migration) and extracted into a portable shell anyone can adopt with one command.

> ⚠️ **Use this for complex, multi-feature projects only.** Acharya's value is discipline at scale: many feature areas, shared datastores, background jobs, more than one person's mental model. On a small project (a script, a single-page app, a weekend prototype) the workflow is pure overhead — plain Claude Code will be faster and cheaper. Reach for Acharya when the cost of an unreviewed, scope-creeping change is real.

---

## The idea

Most AI-coding failure modes aren't intelligence problems — they're **process** problems:

- the model silently picks scope and design trade-offs that were yours to make;
- it reviews its own code and rationalizes its own bugs;
- it re-reads the whole codebase every session, burning tokens to re-learn what it knew yesterday;
- it spawns swarms of agents for work one pass could do.

Acharya is a workflow contract that fixes all four, packaged so it travels inside a single `.claude/` folder — no root `CLAUDE.md` required.

## The guild

One persona leads (default name: **Acharya**; every name is configurable). Specialists are invoked by routing id; the Vedic codenames are flavour you can re-theme in one config file.

| Routing id | Codename | Charter |
|---|---|---|
| — (main thread) | **Acharya** | lead engineer; runs most work inline; delegates only when it pays |
| `feature` | **Brahma** — the Creator | plans new full-stack features (4-phase contract) |
| `bug` | **Rudra** — the Destroyer | minimal-scope bug fixes; root cause first |
| `extend` | **Vishnu** — the Preserver | extends existing surfaces; maps every caller |
| `review` | **Netra** — the All-Seeing Eye | **independent** reviewer: logic, security, cross-feature blast radius, future risks |
| `editor` | **Shilpi** — the Craftsman | the **single writer** for delegated batches; runs on a cheap model tier |
| `explorer` | **Pathik** — the Wayfarer | read-only navigator; returns file:line maps, not file dumps |
| `precommit` | **Dwarpal** — the Gatekeeper | fast lint/type/skill-drift gate before commits |
| `release-notes` | **Vyasa** — the Chronicler | changelogs grouped by feature area |
| `skill-maintainer` | **Guru** — the Keeper | creates/refreshes the per-feature knowledge base |
| `skill-updater` | **Lipi** — the Scribe | minimal-edit skill sync for small diffs |
| `migration` | **Setu** — the Bridge | DB schema migrations; designs, never executes |
| `mysql-query-builder` | **Lekha** — the Archivist | index-aware MySQL query design |
| `clickhouse-query-builder` | **Kala** — the Timekeeper | sorting-key-aware ClickHouse query design |
| `redis-queue-engineer` | **Vayu** — the Windrunner | BullMQ/Redis queues, workers, cache keys |

Stack specialists carry a `requires` list — `/acharya-init` deletes the ones your datastores don't justify, and the session roster updates automatically.

## The 4-phase contract — *Acharya analyzes; the developer decides*

```
1. ANALYZE  ─►  2. ASK (once)  ─►  3. IMPLEMENT  ─►  4. REVIEW
  (read code     (ONE batched       (inline by       (independent agent,
   + skills)      decision round)    default)         once, on the final diff)
```

- **Phase 2 is a single batched checkpoint** — scope, design, edge cases in one `AskUserQuestion`, never a drip of questions. When there's only one sane answer, it states the assumption in one line and proceeds; checkpoints are for genuine forks.
- **Phase 4 is independent by construction.** The reviewer agent did not write the code, so it doesn't inherit the author's blind spots. It emits structured findings (severity, cross-feature impact, future risks) that come back to you as checkboxes — fix now / ticket / accept.
- Risky boundaries (auth, payments, migrations, data writes) trigger the independent review **regardless of diff size**.

The full contract lives in [`.claude/contract.md`](.claude/contract.md).

One rule is absolute: **the kit never pushes on its own.** `contract.md` forbids it, the identity carries it as a standing reflex, and `settings.json` backs it with a harness-level permission prompt on `git push` — commits are drafted and confirmed, pushes are always yours.

## What a session looks like

```text
> we need rate limiting on the public API

Acharya: Standard tier (~15k). Reading the api-gateway + auth skills…

── Phase 2: one batched checkpoint ────────────────────────────────
  Scope?       ( ) Minimal — per-route guard
               (•) Extensible — middleware + config table
  Design?      (•) reuse existing redis client   ( ) new limiter module
  Edge cases?  [x] burst on login   [ ] internal service calls
────────────────────────────────────────── you pick, Acharya builds ──

Acharya: Done — 4 files, +182 −7. Firing Netra (independent review)
on the final diff…

NETRA — FINDINGS
  HIGH  gateway.js:84  limit key derives from user-id BEFORE auth →
        unauthenticated requests all share one bucket. Fix: key on
        IP pre-auth, user-id post-auth.
  CROSS_IMPACT  webhooks → shares the middleware chain → AT_RISK
        options: leave / add_guard / extend_properly

Fix now, ticket, or accept? — one batch, you decide.
```

## Token economics — the part that makes it affordable

Multi-agent setups usually die by billing. Acharya is built around one number: **a subagent hop costs ~15× an inline pass.** So the kit enforces *altitude discipline*:

| Tier | Fits | Target budget | Rules |
|---|---|---|---|
| **Lean** | 1–2 file fix, obvious change | **≤ 5k tokens** | no subagents, no whole-file slurps — grep + windowed reads |
| **Standard** | routine feature / bug across a few files | ~10–30k | inline 4 phases; one batched ASK; size-gated review |
| **Heavy** | audits, migrations, multi-angle review | 30k+ (declared) | fan-out is allowed because parallelism actually pays |

The tier is **declared up front** ("Lean ~5k") so you see the spend before it happens. Other cost rules baked into the kit:

- **Inline by default.** Subagents exist for exactly three reasons: parallelism, context isolation (read a lot → return a little), or an independent boundary (the reviewer). Linear implementation work never delegates.
- **One writer.** Delegated edits all flow through the `editor` agent on a cheap model tier — planners think on the expensive tier, the typist types on the cheap one.
- **Ask once.** All decisions are batched into a single checkpoint; the spawn → ask → re-spawn loop that turns a 1× task into a 4× bill is forbidden by contract.
- **Review once.** The independent review runs a single time, on the final diff, pre-commit — not after every fix round.
- **Skills instead of re-reading.** See below — the biggest saving of all.

## The skills system — persistent codebase memory

`.claude/skills/` holds **one skill per feature area** (auth, billing, queues, `<db>-schema`, …): what the feature does, where it lives, its invariants and gotchas. Agents orient from skills first and grep second, so sessions stop re-deriving the codebase from scratch.

Kept honest by tooling, not hope:

- `skills-routing.json` maps file globs → skills; `affected-skills.js` computes which skills a diff touches.
- `/commit` writes an `Affected-skills:` footer into every commit.
- `/update-skills` syncs skills to recent commits; a `.skills-sync` marker + drift check catch staleness before it lies to you.

## Install (30 seconds)

```bash
# From your repo root — scaffolds .claude/ (refuses to clobber an existing one)
npx acharya init

# Then open Claude Code in your repo and run:
/acharya-init
```

Also available: `npx acharya init --dry-run` (preview what would be written), `init --force` (update kit files; your skills/routing/local settings are always preserved), and `npx acharya doctor` (health-check an installed kit: files, config, skill drift vs HEAD).

<details>
<summary>Manual install (without npm)</summary>

```bash
git clone https://github.com/GillolaHemaVardhanReddy/acharya
cp -r acharya/.claude /path/to/your-repo/
```
</details>

`/acharya-init` detects your stack from lockfiles and code fingerprints, asks you to confirm name/stack/paths, prunes the stack specialists you don't need, wipes any inherited skills, and drives `skill-maintainer` to generate **fresh skills for your codebase** — one per feature area, built in parallel. From then on maintenance is near zero.

Optional: `bash .claude/scripts/setup.sh` marks scripts executable and wires git hooks if you keep a `.githooks/` directory.

### Requirements

- [Claude Code](https://claude.com/claude-code) (CLI or IDE)
- Node.js ≥ 18 (the hooks and helper scripts are plain Node/bash — no dependencies to install)
- Any git host — GitHub, GitLab, Bitbucket, or a bare remote. The kit uses plain `git` only; nothing assumes a specific provider.

## What's in the box

| Path | Role |
|---|---|
| `.claude/identity.md` | The persona + standing reflexes (template; `{{placeholders}}` filled per project) |
| `.claude/contract.md` | The 4-phase contract, altitude tiers, editor pattern, commit format, code style |
| `.claude/acharya.config.json` | **The one file you edit** — names, stack, datastores, agent codenames |
| `.claude/agents/` | The guild (14 agents; stack specialists auto-pruned) |
| `.claude/commands/` | Slash commands: `/triage` `/feature` `/bug` `/extend` `/migration` `/review` `/commit` `/update-skills` `/release-notes` `/acharya-init` |
| `.claude/scripts/` | Hooks + helpers: identity injector, prompt-router nudge, skill-drift tooling, init |
| `.claude/skills/` | Your project's knowledge base — generated by `/acharya-init`, empty in this shell |
| `.claude/settings.json` | Hook wiring + a safe read-only permission allowlist |

How identity loads: `scripts/acharya-context.js` is a **SessionStart hook** — every session it fills `identity.md` from the config and prints the persona plus a live roster of the agents that actually exist on disk. That's why copying `.claude/` alone is enough.

## Customizing

Everything project-specific is `acharya.config.json`: rename the assistant, change what it calls you, list your datastores (drives specialist pruning), re-theme every codename. The prose persona lives in `identity.md` if you want a different personality altogether.

## Working across multiple repos?

Acharya governs **one** repo. If you're splitting a service out of a monolith, or running a migration where two repos share MySQL/Redis/queues and a same-named cron can double-fire in production — that's a different job, with its own hazard class. See **[Kira](https://github.com/GillolaHemaVardhanReddy/Kira)**, the cross-repo bridge instance built on this kit.

## License

MIT
