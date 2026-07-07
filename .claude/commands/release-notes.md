---
description: Changelog grouped by skill. Reads commit Affected-skills footers; routing fallback.
argument-hint: "<range — e.g. v1.4..HEAD, last 50, master..dev>"
---

Resolve range from $ARGUMENTS (empty defaults to `<.skills-sync>..HEAD`).

Spawn the `release-notes` agent. It will:
1. Get commits: `git log --no-merges --pretty=... <range>`
2. Classify each: parse `<type>(<scope>): <subject>` + `Affected-skills:` footer; fall back to routing
3. Group by skill (alphabetical) → by type (feat / fix / perf / refactor / docs / chore / test / hotfix)
4. Emit markdown changelog

Audience tuning via natural-language follow-up if dev asks ("for product", "for customers").

Read-only. Don't commit.
