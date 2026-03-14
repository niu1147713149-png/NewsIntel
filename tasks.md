# 任务清单 (Task Breakdown)

> **状态**: 部分执行中（具体以 `progress.md` 与实际代码为准）
> **总预估工时**: 320h (Phase 1-2)

## Phase 1: 项目初始化 (Project Initialization)

| 任务ID | 优先级 | 任务名称 | 描述 | 预估工时 | 依赖 | 状态 |
|--------|--------|----------|------|----------|------|------|
| T-101 | P0 | 仓库与环境搭建 | 初始化 Git, 配置 monorepo 结构, setup .gitignore | 2h | - | Pending |
| T-102 | P0 | Docker 环境配置 | 编写 `docker-compose.yml` (Postgres, Redis, ES) | 4h | T-101 | Pending |
| T-103 | P0 | 后端骨架搭建 | 初始化 FastAPI 项目, 配置 Poetry/uv, 日志, 错误处理 | 4h | T-101 | Pending |
| T-104 | P0 | 数据库 Schema 设计 | 编写 SQLAlchemy Models, 配置 Alembic 迁移脚本 | 6h | T-103 | Completed |
| T-105 | P0 | 前端骨架搭建 | 初始化 Next.js 15, 配置 Tailwind, shadcn/ui | 4h | T-101 | Pending |
| T-106 | P1 | CI/CD 基础配置 | 配置 GitHub Actions (Lint, Test) | 4h | T-103, T-105 | Pending |

## Phase 2: 后端核心 (Core Backend)

| 任务ID | 优先级 | 任务名称 | 描述 | 预估工时 | 依赖 | 状态 |
|--------|--------|----------|------|----------|------|------|
| T-201 | P0 | 新闻采集服务 | 实现 `NewsCrawler`, 接入 Currents/NewsData API | 12h | T-103 | Pending |
| T-202 | P0 | 去重逻辑实现 | 实现 URL MD5 和 Title SimHash 去重 | 6h | T-201 | Pending |
| T-203 | P1 | 行情采集服务 | 实现 `StockFetcher`, 接入 Finnhub API | 8h | T-103 | Pending |
| T-204 | P0 | 新闻 CRUD API | 实现 `/api/v1/news` 列表、详情、搜索接口 | 8h | T-104 | Pending |
| T-205 | P1 | 股票 CRUD API | 实现 `/api/v1/stocks` 列表、详情、历史数据接口 | 6h | T-104 | Pending |
| T-206 | P1 | 用户认证模块 | 实现 JWT 注册、登录、鉴权中间件 | 8h | T-104 | Pending |
| T-207 | P2 | Redis 缓存层 | 实现 API 响应缓存和数据预热 | 4h | T-204 | Pending |

## Phase 3: AI Pipeline (NLP & Analysis)

| 任务ID | 优先级 | 任务名称 | 描述 | 预估工时 | 依赖 | 状态 |
|--------|--------|----------|------|----------|------|------|
| T-301 | P0 | NLP 模型加载器 | 实现单例 ModelManager (BART, FinBERT) | 6h | T-103 | Pending |
| T-302 | P0 | 情感分析模块 | 集成 FinBERT, 实现 `analyze_sentiment` | 8h | T-301 | Pending |
| T-303 | P0 | 新闻分类模块 | 集成 BART-large-MNLI, 实现 `classify_news` | 8h | T-301 | Pending |
| T-304 | P1 | 实体抽取模块 | 集成 Claude API, 提取 Tickers | 6h | T-103 | Pending |
| T-305 | P0 | 影响评估引擎 | 实现多因子打分算法, 输出 Bullish/Bearish | 10h | T-302, T-303 | Pending |
| T-306 | P0 | Celery 任务链 | 串联 采集 -> NLP -> 入库 流程 | 8h | T-201, T-305 | Pending |

## Phase 4: 前端开发 (Frontend Dashboard)

| 任务ID | 优先级 | 任务名称 | 描述 | 预估工时 | 依赖 | 状态 |
|--------|--------|----------|------|----------|------|------|
| T-401 | P0 | 布局组件开发 | Navbar, Sidebar, Footer, ThemeToggle | 6h | T-105 | Pending |
| T-402 | P0 | 新闻列表页 | NewsFeed 组件, 筛选, 分页, NewsCard | 12h | T-204 | Pending |
| T-403 | P0 | 新闻详情页 | 展示新闻内容, 情感分数, 影响分析 | 8h | T-402 | Pending |
| T-404 | P0 | 仪表盘首页 | 市场情绪概览, 实时动态, Top Events | 10h | T-402 | Pending |
| T-405 | P1 | 股票详情页 | K线图 (TradingView), 关联新闻 | 10h | T-205 | Pending |
| T-406 | P1 | 实时数据集成 | 集成 SSE (`useSSE`), 更新新闻流和价格 | 8h | T-204 | Pending |

## Phase 5: 测试与部署 (Testing & Deployment)

| 任务ID | 优先级 | 任务名称 | 描述 | 预估工时 | 依赖 | 状态 |
|--------|--------|----------|------|----------|------|------|
| T-501 | P0 | 后端单元测试 | 覆盖 Service 层和 Utils, 覆盖率 > 80% | 10h | All Backend | Pending |
| T-502 | P0 | API 集成测试 | 测试所有 API 端点 | 8h | All Backend | Pending |
| T-503 | P1 | 前端组件测试 | 测试核心 UI 组件 | 8h | All Frontend | Pending |
| T-504 | P1 | E2E 测试 | Playwright 测试关键用户路径 | 10h | All | Pending |
| T-505 | P0 | 生产环境部署 | 最终 Docker Compose 调整, Nginx 配置 | 6h | All | Pending |
