# Contributing to NewsIntel

## Branch Strategy

NewsIntel uses a lightweight Git Flow variant.

- `main`: production-ready branch, merge by PR only
- `develop`: integration and test branch
- `feature/*`: new feature branches created from `develop`
- `fix/*`: regular bug fix branches created from `develop`
- `release/*`: release hardening branches created from `develop`
- `hotfix/*`: urgent production fixes created from `main`

## Branch Naming

Use lowercase branch names with a clear scope.

- `feature/frontend-market-dashboard`
- `feature/backend-news-ingest`
- `fix/frontend-login-empty-state`
- `release/v0.1.0`
- `hotfix/news-stream-timeout`

## Daily Flow

1. Sync `develop`
2. Create a feature or fix branch
3. Implement the change and add tests
4. Run the relevant local checks
5. Open a PR into `develop`
6. Merge only after review and CI pass

## Release Flow

1. Create `release/*` from `develop`
2. Freeze new feature work on that release branch
3. Let QA and product validate the release branch
4. Merge `release/*` into `main`
5. Merge the release changes back into `develop`

## Hotfix Flow

1. Create `hotfix/*` from `main`
2. Fix and validate the issue
3. Merge into `main`
4. Merge the same fix back into `develop`

## Pull Request Rules

- Do not push directly to `main` or `develop`
- Keep each PR focused on one topic
- Include tests when behavior changes
- Update `progress.md` after meaningful development work
- Document database, API, or realtime behavior changes in the PR body

## Recommended Local Checks

### Frontend

```bash
cd frontend
pnpm lint
pnpm type-check
pnpm test
```

### Backend

```bash
cd backend
ruff check app tests
mypy app tests
pytest
```

## References

- Workflow design: `docs/plans/2026-03-14-git-pr-workflow-design.md`
- Branch protection checklist: `docs/plans/2026-03-14-branch-protection-checklist.md`
- Project guidance: `CLAUDE.md`
- Progress log: `progress.md`
