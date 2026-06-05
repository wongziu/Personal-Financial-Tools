# Project Agent Instructions

## Repository Scope

- This repository is a local single-user investment decision system built with Next.js App Router, TypeScript, Tailwind CSS, SQLite, Vitest, and Playwright.
- Follow the existing metadata-driven module patterns and UI conventions before introducing new abstractions.
- Do not commit local SQLite databases, generated reports, `.env*` files, build output, test output, or dependency folders.

## Git And Branching

- Use `codex/<short-task-name>` for Codex implementation branches.
- Use `feature/<short-feature-name>` for human feature branches.
- Use `fix/<short-bug-name>` for normal bug fixes.
- Use `hotfix/<short-incident-name>` for production fixes created from `main`.
- Use `release/vX.Y.Z` for test/UAT stabilization.
- `develop` is the development integration branch.
- `main` is the production baseline and must only receive reviewed release or hotfix merges.

## Working Tree Rules

- Before editing, inspect `git status --short --branch`.
- Existing uncommitted changes may belong to the user. Do not revert, overwrite, format, or stage them unless the user explicitly asks.
- Keep each task on an isolated branch or Codex worktree when there are existing unrelated changes.
- Stage only files that are part of the current task.
- Prefer small, focused commits that can be reviewed and reverted independently.

## Verification

- Before committing application or workflow changes, run the commands that match the touched surface.
- For general code changes, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

- For browser-facing behavior changes, also run:

```bash
npm run test:e2e
```

- If a required verification command cannot run locally, state the exact command, failure reason, and residual risk in the final response.

## Release Rules

- Development deployments follow `develop`.
- Test/UAT deployments follow `release/vX.Y.Z`.
- Production releases are created only from `main` and an annotated `vX.Y.Z` tag.
- Do not create production tags from feature, fix, or Codex branches.
- Hotfixes must be merged back into both `main` and `develop` after release.
