# Repo Agent Bootstrap

This repository is governed by the user's local Repo Operator system.

## Source of authority

1. Read this repository's existing authority files first (`AGENTS.md`, `REPO_IDENTITY.md`, `*AUTHORITY*.md`, `*GOVERNANCE*.md`, `*RUNBOOK*.md`, `_repo_update_contract.json`, `_repo_validation_matrix.json`, `_repo_lifecycle_profile.json`).
2. Repo-local authority outranks global instructions where the hierarchy says so.
3. The global Repo Work OS and active tool manifest live under `~/repo-tools/reference-authorities/repo-work-os` and `~/repo-tools/manifests/ACTIVE_SCRIPTS.md`.
4. Hallmark is an existing repo tool/authority under `~/repo-tools/reference-authorities/hallmark`; inspect and use the active Hallmark workflow when substantial architecture or production-readiness review requires it. Do not recreate Hallmark.

## Terminal entry points

Normal repo work:

```bash
~/repo-tools/agent/repo-work <repo>
```

Help / refresher:

```bash
~/repo-tools/agent/repo-work --help
```

Full unattended lifecycle on a prepared isolated worktree:

```bash
~/repo-tools/agent/repo-supervisor --engine <codex|claude|antigravity> --repo <repo-name> --worktree <exact-worktree-path> --task-file <task-file>
```

Live supervisor status from another terminal:

```bash
~/repo-tools/agent/repo-status
```

Parallel model bake-off from one frozen baseline:

```bash
~/repo-tools/agent/repo-bakeoff --repo-path <canonical-repo-path> --baseline <SHA> --slug <task-slug> --task-file <task-file> --engines codex,claude,antigravity
```

## Operating law

- Lock the exact repo, worktree, branch, baseline SHA, and remote before mutation.
- Unattended work runs only on isolated `work/*` branches/worktrees.
- Never substitute another repo or write to another canonical repo.
- Full-baseline ZIP is the governed handoff artifact when required.
- Local updater validation and exact-SHA GitHub checks must pass before merge eligibility.
- RED or UNPROVEN remains merge-blocked.
- Merge to main/default is permitted ONLY when every required check is green: never with `--admin`, never force-pushed, never on a RED or UNPROVEN result. A blocker that cannot go green on its own — a credential, an account setting, a product decision — is reported as a NAMED STOP, never merged around.
- Provider quota/rate-limit is BLOCKED/UNSCORED, not a model-quality failure.
- For material UI/UX/design-system work, use the Claude Design routing layer when it materially improves the result; do not invoke it for backend-only work.
- Use existing tools and repo authority rather than inventing duplicate systems.
