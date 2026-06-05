# Version Management

This project uses a lightweight `develop/release/main` flow. The goal is to let Codex and human developers work in parallel while keeping development, testing, and production release decisions separate.

## Branch Model

| Branch | Purpose | Environment | Merge rule |
| --- | --- | --- | --- |
| `codex/<task>` | Codex task work | None by default | Open a PR into `develop` |
| `feature/<name>` | Human feature work | None by default | Open a PR into `develop` |
| `fix/<name>` | Non-production bug fixes | None by default | Open a PR into `develop` |
| `develop` | Integrated development baseline | Development | PR only |
| `release/vX.Y.Z` | Test/UAT stabilization | Test/UAT | Created from `develop`; fixes only |
| `main` | Production baseline | Production | Release and hotfix PRs only |
| `hotfix/<name>` | Urgent production fix | Test/UAT, then production | Created from `main`; merge back to `main` and `develop` |

## Environment Isolation

- Development uses `develop` and local or development-only data.
- Test/UAT uses `release/vX.Y.Z` and stable acceptance data.
- Production uses `main` plus an annotated `vX.Y.Z` tag.
- `.env*` files and SQLite database files stay out of Git.
- Local seed commands are allowed in development and test data setup, but not as a production release step.

## Codex Workflow

1. Start every Codex task by checking `git status --short --branch`.
2. If unrelated local changes exist, use a Codex worktree or a separate branch before editing.
3. Name Codex branches `codex/<short-task-name>`.
4. Keep the diff scoped to the task.
5. Stage only files from the current task.
6. Run the verification commands listed in `AGENTS.md`.
7. Open a PR into `develop` unless the task is a hotfix or release-only fix.

Codex worktrees are preferred for parallel tasks because each worktree has its own checkout while sharing the same Git history. A branch can only be checked out in one worktree at a time, so use handoff or a separate branch when moving work between local checkout and worktree.

## Pull Request Rules

- PRs into `develop` must pass CI.
- PRs into `release/vX.Y.Z` should contain only release stabilization fixes.
- PRs into `main` must come from `release/vX.Y.Z` or `hotfix/<name>`.
- Do not squash unrelated features into a release fix.
- Do not merge a PR that skips lint, typecheck, tests, or build without recording the reason in the PR.

## Release Flow

1. Merge completed feature and fix PRs into `develop`.
2. Cut a release branch:

```bash
git checkout develop
git pull origin develop
git checkout -b release/vX.Y.Z
git push -u origin release/vX.Y.Z
```

3. Run the release checklist in `docs/release-checklist.md`.
4. Merge `release/vX.Y.Z` into `main` after UAT approval.
5. Create an annotated production tag from `main`.
6. Push the tag and let the release workflow create a GitHub Release draft.
7. Merge `main` back into `develop` so release fixes are preserved.

## Hotfix Flow

1. Create the hotfix from `main`:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/<short-incident-name>
```

2. Apply the minimal production fix.
3. Run full verification.
4. Open a PR into `main`.
5. After production release, merge `main` back into `develop`.
6. If a release branch is active, also merge or cherry-pick the fix into that branch.

## Rollback Policy

Production rollback uses the last known-good `vX.Y.Z` tag. The rollback action should be documented in the release notes with the failed tag, restored tag, reason, and follow-up fix branch.
