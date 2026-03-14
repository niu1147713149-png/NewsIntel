# 2026-03-14 Branch Protection 配置清单

## 目标

将 `main` 与 `develop` 设为受保护分支，保证所有重要变更通过 PR、评审与 CI 进入主线。

## `main` 配置

在 GitHub 仓库设置页为 `main` 打开以下规则：

- Require a pull request before merging
- Require approvals: `1`
- Dismiss stale pull request approvals when new commits are pushed
- Require review from code owners
- Require status checks to pass before merging
- Required checks:
  - `frontend`
  - `backend`
- Require conversation resolution before merging
- Require branches to be up to date before merging
- Block force pushes
- Do not allow deletions

## `develop` 配置

在 GitHub 仓库设置页为 `develop` 打开以下规则：

- Require a pull request before merging
- Require approvals: `1`（如当前团队只有 1 人，可先不启用）
- Require review from code owners
- Require status checks to pass before merging
- Required checks:
  - `frontend`
  - `backend`
- Require conversation resolution before merging
- Block force pushes
- Do not allow deletions

## 推荐顺序

1. 先创建 `develop`
2. 先给 `main` 开保护
3. 再给 `develop` 开保护
4. 最后验证：尝试从功能分支发起 PR，确认必须等 CI 通过后才能合并

## 当前说明

- 当前仓库 CI 工作流定义于 `.github/workflows/ci.yml`
- 当前 `CODEOWNERS` 定义于 `.github/CODEOWNERS`
- 若后续 CI job 名称调整，需同步更新 required checks
