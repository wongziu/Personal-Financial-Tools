# Release Checklist

Use this checklist for every `vX.Y.Z` production release. Replace `X.Y.Z` with the target version.

## 1. Prepare Release Branch

```bash
git checkout develop
git pull origin develop
git checkout -b release/vX.Y.Z
git push -u origin release/vX.Y.Z
```

- Confirm the branch name is exactly `release/vX.Y.Z`.
- Confirm no unrelated local files are staged.
- Confirm the release scope is documented in the PR or release notes.

## 2. Verify Release Candidate

Run the full local verification suite:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Acceptance checks:

- CI passes on `release/vX.Y.Z`.
- Core create/read/update flows still work.
- Portfolio, ledger, market data, accounts, settings, and source intelligence routes load without framework overlays.
- No production secrets, local SQLite files, or `.env*` files are staged.

## 3. Stabilize Test/UAT

- Merge only release fixes into `release/vX.Y.Z`.
- Re-run CI after each release fix.
- Record UAT approval source, date, and remaining known limitations.

## 4. Merge To Production Baseline

```bash
git checkout main
git pull origin main
git merge --no-ff release/vX.Y.Z
git push origin main
```

- Confirm CI passes on `main`.
- Confirm the merge commit contains only the approved release scope.

## 5. Create Production Tag

```bash
git checkout main
git pull origin main
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

- Tags must use the exact `vX.Y.Z` format for production releases.
- Do not create production tags from `develop`, `release/vX.Y.Z`, `feature/*`, `fix/*`, or `codex/*`.
- Pre-release tags such as `vX.Y.Z-rc.1` are not production releases.

## 6. Publish Release Notes

The release workflow creates a GitHub Release draft after the production tag passes verification. Review and complete the draft with:

- Summary of user-facing changes.
- Data or configuration notes.
- Verification evidence.
- Known issues.
- Rollback target tag.

## 7. Back-Merge Release Fixes

```bash
git checkout develop
git pull origin develop
git merge --no-ff main
git push origin develop
```

- Confirm release fixes are present in `develop`.
- Delete the release branch only after the team no longer needs it:

```bash
git push origin --delete release/vX.Y.Z
```

## 8. Rollback

If production must be restored to the previous known-good tag:

```bash
git checkout main
git pull origin main
git tag --list "v*.*.*" --sort=-v:refname
git checkout vA.B.C
```

Use the deployment platform's rollback mechanism to redeploy `vA.B.C`. Then create a follow-up branch from `main`:

```bash
git checkout main
git checkout -b hotfix/<rollback-follow-up>
```

Document the failed tag, restored tag, customer impact, and follow-up fix.
