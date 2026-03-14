# 2026-03-14 Git / PR 开发流程方案

## 背景

当前仓库已经有 `main` 分支和基础 CI，但缺少一套面向产品迭代、测试联调、发布收口的标准 Git 协作流程。目标是建立一套轻量、可执行、适合当前阶段的分支与 PR 规范，避免直接在主分支堆功能，也便于后续做产品验收 PR。

## 设计目标

1. `main` 始终保持可发布状态
2. 日常开发与测试联调有独立承载分支
3. 所有功能和修复都通过 PR 进入主线
4. 发布前有清晰的冻结与回归入口
5. 规则足够轻量，适合当前小团队快速推进

## 方案选择

本仓库采用“轻量 Git Flow 变体”，而不是完整传统 Git Flow。

原因：

- 当前项目仍在快速演进，流程不能过重
- 需要稳定主分支，也需要一个持续集成测试分支
- 后续要做产品 PR 和阶段验收，保留 `release/*` 能显著降低混乱度

## 分支模型

### 1. `main`

- 用途：生产分支 / 可发布分支
- 来源：只允许通过 PR 合并
- 要求：禁止直接 push，必须通过 CI，通过评审后才能合入
- 环境映射：生产环境

### 2. `develop`

- 用途：开发集成分支
- 来源：`feature/*`、`fix/*`、`hotfix/*` 回流
- 要求：团队日常联调、测试验收默认围绕该分支展开
- 环境映射：测试环境 / 集成环境

### 3. `feature/*`

- 用途：新功能开发
- 创建来源：从 `develop` 切出
- 命名规范：`feature/<scope>-<name>`
- 示例：`feature/frontend-market-dashboard`、`feature/backend-news-ingest`
- 合并目标：PR 到 `develop`

### 4. `fix/*`

- 用途：普通缺陷修复
- 创建来源：从 `develop` 切出
- 命名规范：`fix/<scope>-<name>`
- 合并目标：PR 到 `develop`

### 5. `release/*`

- 用途：版本冻结、回归测试、产品验收
- 创建来源：从 `develop` 切出
- 命名规范：`release/v0.1.0`
- 允许内容：版本号、发布说明、回归修复、小范围阻塞问题处理
- 合并目标：PR 到 `main`；发布完成后再回合到 `develop`
- 环境映射：预发布 / 验收环境

### 6. `hotfix/*`

- 用途：线上紧急修复
- 创建来源：从 `main` 切出
- 命名规范：`hotfix/<name>`
- 合并目标：先 PR 到 `main`，再同步回 `develop`

## PR 流程

### 日常开发 PR

1. 从 `develop` 创建 `feature/*` 或 `fix/*`
2. 本地开发、自测、补测试
3. 推送分支并创建 PR 到 `develop`
4. CI 通过、代码评审通过后合并
5. 合并后删除功能分支

### 产品验收 PR

1. 在一批需求准备交付时，从 `develop` 切出 `release/*`
2. 测试、产品、设计围绕 `release/*` 验收
3. 验收期间只修阻塞问题，不继续堆新功能
4. 验收通过后，创建 `release/* -> main` 的正式 PR
5. 合并到 `main` 后，立即把 `release/*` 或 `main` 的收口修复回合到 `develop`

### 紧急修复 PR

1. 从 `main` 创建 `hotfix/*`
2. 修复并验证
3. PR 到 `main`
4. 上线后再 PR 到 `develop`

## 合并策略

- `feature/* -> develop`：默认使用 Squash merge，保持开发历史清晰
- `fix/* -> develop`：默认使用 Squash merge
- `release/* -> main`：建议使用普通 merge 或 squash merge，二选一即可，但团队要统一
- `hotfix/* -> main`：建议使用普通 merge，便于保留紧急修复节点

当前推荐：

- 开发类 PR 全部 Squash
- 发布类 / 紧急修复类 PR 使用普通 Merge

## 分支保护建议

### `main`

- Require a pull request before merging
- Require at least 1 approval
- Require status checks to pass before merging
- Require conversation resolution before merging
- Block force pushes
- Block branch deletion

### `develop`

- Require a pull request before merging
- Require status checks to pass before merging
- Require conversation resolution before merging
- Block force pushes

## CI 与质量门禁

当前仓库已有 `.github/workflows/ci.yml`，并已对 `main` / `develop` 的 push 与 PR 触发 CI。建议把以下检查作为默认门禁：

- 前端：`pnpm lint`、`pnpm type-check`、`pnpm test`
- 后端：`ruff check app tests`、`mypy app tests`、`pytest`

后续如果需要更严格，可继续补：

- 前端 `pnpm build`
- Playwright 冒烟测试
- Docker Compose 配置校验

## 交付规范

每个 PR 至少包含：

- 变更背景
- 改动范围
- 验证方式
- 风险与回滚说明
- 是否影响前端 / 后端 / 数据库 / 实时链路

## 推荐日常操作

### 开发新功能

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<scope>-<name>
```

### 提交修复

```bash
git checkout develop
git pull origin develop
git checkout -b fix/<scope>-<name>
```

### 准备发版

```bash
git checkout develop
git pull origin develop
git checkout -b release/v0.1.0
```

### 线上热修复

```bash
git checkout main
git pull origin main
git checkout -b hotfix/<name>
```

## 首次落地范围

本次先落地以下内容：

1. 建立 `develop` 分支
2. 补齐 PR 模板
3. 补齐贡献流程文档
4. 形成仓库内可查阅的 Git / PR 规范文档

GitHub 上的 branch protection 规则需要在仓库设置页手动配置，不在本次仓库文件变更内自动完成。
