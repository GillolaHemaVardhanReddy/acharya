---
description: Refresh .claude/skills/ to match recent code. Args: latest | <SHA> | <SHA>..<SHA> | last N | all.
argument-hint: "[latest | <sha> | <sha>..<sha> | last N | all]"
---

Resolve range from $ARGUMENTS:
- empty / `latest` → `<contents of .claude/.skills-sync>..HEAD`
- `<sha>` → `<sha>..HEAD`
- `<sha>..<sha>` → as-is
- `last N` → `HEAD~N..HEAD`
- `all` → every skill in `.claude/skills-routing.json`

If `latest` and sync already equals HEAD, print "skills in sync" and stop.

Compute affected skills:
```
node .claude/scripts/affected-skills.js --range <range>
```

Create `.claude/.skills-sync-dirty` lock file (gitignored) with current PID. If a lock already exists with a live PID, abort.

Spawn one `skill-updater` agent per affected skill, IN PARALLEL (cap at 8 per batch). Each gets: skill name, commit range, files in scope.

On all-success: `git rev-parse HEAD > .claude/.skills-sync`. Report count + new SHA. Remove the lock.

On any failure: don't bump the marker. Report which skill failed and why. Remove the lock.

For `all`: warn the dev this is expensive (~22 parallel agents). Confirm before proceeding.
