# Progress Log — NewsIntel 全球新闻研判平台

## Session: 2026-03-05

### Phase 0: 项目规划
- **Status:** complete
- **Started:** 2026-03-05

- Actions taken:
  - 调研全球新闻API（Currents, NewsData.io, Finnhub, GNews等）
  - 调研股票行情API（Finnhub, Alpha Vantage, Polygon.io, FMP等）
  - 调研NLP/AI方案（FinBERT, BART, Claude API）
  - 调研技术栈（Next.js, FastAPI, PostgreSQL, Redis, Elasticsearch）
  - 编写完整项目规划文档 task_plan.md
  - 编写技术调研结论 findings.md

- Files created/modified:
  - task_plan.md (created) — 完整项目规划文档
  - findings.md (created) — 技术选型与调研结论
  - progress.md (created) — 本文件

### Phase 1: 项目初始化
- **Status:** in_progress
- **Started:** 2026-03-06
- Actions taken:
  - 完成 Spec 执行基线文件：`.trae/specs/bootstrap-newsintel-foundation/spec.md`
  - 完成任务拆解与依赖：`.trae/specs/bootstrap-newsintel-foundation/tasks.md`
  - 完成检查清单：`.trae/specs/bootstrap-newsintel-foundation/checklist.md`
  - 完成 Task 1-4：后端骨架、前端骨架、docker-compose、CI 基础流程
  - 完成部分验证：后端 ruff/mypy/pytest 通过；前端 test 通过（占位）
  - 记录环境限制：前端 type-check 因依赖安装权限问题未完成；当前环境缺少 docker 命令
  - 完成后端新闻 API：`GET /api/v1/news`、`GET /api/v1/news/{id}`，含服务层与数据库依赖注入
  - 完成前端 `/news` 页面：接入 `/api/v1/news`，支持 loading/error/empty 三态
  - 完成新增自测：后端 `ruff` 通过；`pytest` 相关用例 5 passed
- Current risks:
  - Windows 环境对 `node_modules` 写入出现 EPERM，影响 TypeScript 校验完整闭环
  - 无 Docker 可执行环境，容器层验证需在具备 Docker 的环境补跑
- Current issues:
  - `pnpm run type-check` 失败：`tsc` 不可用（依赖未完整安装）
  - `docker compose config` 无法执行（缺少 docker）
  - `pnpm lint` 失败：`next` 不可用（依赖安装仍受 EPERM 影响）
- Files created/modified:
  - `.trae/specs/bootstrap-newsintel-foundation/spec.md`
  - `.trae/specs/bootstrap-newsintel-foundation/tasks.md`
  - `.trae/specs/bootstrap-newsintel-foundation/checklist.md`
  - `backend/*`（FastAPI 基础工程）
  - `frontend/*`（Next.js 基础工程）
  - `docker-compose.yml`
  - `.github/workflows/ci.yml`
  - `backend/app/models/*`（数据库 Schema 已落地）
  - `backend/alembic/*`（迁移初始化与首版迁移）
  - `backend/app/schemas/*`（Pydantic v2 占位）
  - `backend/app/services/news_service.py`（新闻查询服务）
  - `backend/app/api/v1/routes/news.py`（新闻列表/详情接口）
  - `frontend/src/app/news/*`（新闻页与路由级 loading/error）
  - `frontend/src/lib/api.ts`、`frontend/src/types/*`（API 客户端与类型）

## Session: 2026-03-07

### 当前停靠点（续作中）
- **Status:** in_progress
- **已完成:**
  - 后端新闻搜索接口：`GET /api/v1/news/search`（支持 q/category/from/to/page/size）
  - 后端搜索相关测试：API + Service 用例通过
  - 前端新闻详情页：`/news/[id]` 已接入详情接口，支持 loading/error/not-found
  - 前端列表筛选联动：`/news` 新增 `category` 查询并支持与详情页分类标签跳转联动
  - 验证结果：后端 `ruff` 与新闻相关 `pytest` 通过（7 passed）
  - 前端工程依赖恢复：`next`、`tsc`、`tailwindcss` 工具链已可用
  - 前端验证通过：`pnpm lint`、`pnpm exec tsc --noEmit`、`pnpm dev` + 首页 HTTP 200
  - 后端默认数据库切换为本地 SQLite（`sqlite+aiosqlite`），启动自动建表并注入示例新闻数据
  - 本地联调通过：`/api/v1/health`=200、`/api/v1/news` 可返回数据、`/news` 页面可展示新闻
  - 确认本地调试策略：当前阶段不要求 Docker 依赖服务验证，Task 5 按本地标准收口
  - 前端新增 `/search` 页面并接入 `/api/v1/news/search`（支持 q/category/from/to/page/size）
  - `/search` 本地验证通过：API 返回 success，页面访问 200，前端 lint/tsc 通过
  - 首页已由占位页升级为 Dashboard（统计卡、最新新闻、情感分布、快捷入口）
  - Dashboard 本地验证通过：`/` 访问 200，`/api/v1/news` 返回 success，前端 lint/tsc 通过
  - 前端新增 `/analysis` 页面，接入 `/api/v1/news` 聚合实现情感分布与高影响信号视图
  - `/analysis` 本地验证通过：页面访问 200，API 返回 success，前端 lint/tsc 通过
  - 前端新增 `/analysis/[stockId]` 个股分析页，基于新闻影响信号聚合输出个股结论与相关新闻
  - `/analysis/1` 本地验证通过：页面访问 200，前端 lint/tsc 通过
  - 前端新增 `/market` 页面，基于 `/api/v1/news` 聚合实现市场脉冲、个股影响排行与最新事件列表
  - `/market` 本地验证通过：页面访问 200，API 返回 success，前端 lint/tsc 通过
  - 后端新增 `GET /api/v1/analysis/market` 聚合接口（market pulse、direction distribution、stock rankings、latest events）
  - 前端 `/market` 已改造为直接调用 `/api/v1/analysis/market`，移除前端重复聚合逻辑并新增 `src/types/analysis.ts`
  - 验证通过：后端 ruff、`pytest tests/test_api_analysis_market.py tests/test_api_news.py`、前端 lint/tsc 均通过
  - 后端新增 `GET /api/v1/analysis/overview` 聚合接口（stats cards、sentiment distribution、top impact signals）
  - 前端 `/analysis` 已改造为直接调用 `/api/v1/analysis/overview`，移除页面本地聚合逻辑并复用 `src/types/analysis.ts`
  - 验证通过：后端 ruff、`pytest tests/test_api_analysis_overview.py tests/test_api_analysis_market.py tests/test_api_news.py`、前端 lint/tsc 均通过
  - 前端 `/analysis` 与 `/market` 新增 URL 参数化筛选（window_hours/article_limit/top_signals/top_stocks/latest_events）与预设快捷入口
  - 参数联动验证通过：`/analysis?window_hours=6&article_limit=120&top_signals=6` 与 `/market?window_hours=72&article_limit=300&top_stocks=20&latest_events=20` 页面访问 200，前端 lint/tsc 通过
  - 后端新增新闻抓取入库脚本 `scripts/ingest_news.py`，支持按 source+limit 调用 news skills 抓取并映射既有分类后入库（含 URL 去重）
  - 新增 ingestion 模块与来源技能注册：`reuters_world`、`bbc_world`，并补充脚本测试 `tests/test_script_ingest_news.py`
  - 验证通过：`ruff check app scripts tests/test_script_ingest_news.py`、`pytest tests/test_script_ingest_news.py`；外网受限时脚本可容错返回不崩溃
  - 入库脚本新增 `--source all`，支持批量遍历全部已注册来源并汇总统计（fetched/inserted/duplicate/invalid/failed）
  - 新增 all 模式测试，覆盖跨来源 URL 去重与统计聚合，验证通过（`pytest tests/test_script_ingest_news.py`）
  - 入库脚本新增 `--per-source-limit` 与 `--global-limit`：支持 all 模式下“每来源抓取上限 + 全局入库上限”联合控制
  - 新增限流参数测试，覆盖 all 模式总入库封顶、单来源忽略 global-limit、per-source-limit 覆盖默认 limit
  - 非新闻开发线推进：前端抽离 `/analysis` 与 `/market` URL 参数公共模块 `src/lib/analysis-query.ts`，统一边界解析与 query href 构建
  - 前端验证通过：`pnpm lint`、`pnpm exec tsc --noEmit`
- **环境限制:**
  - 无 Docker 环境，容器相关验证转为后续部署阶段处理
- **下一步:**
  - 推进筛选组件化与参数状态持久化，减少页面级重复逻辑

## Session: 2026-03-08

### 进度核对与继续开发
- **Status:** in_progress
- **已完成:**
  - 核对当前代码、`tasks.md` 与 `progress.md`，确认任务文档与真实落地状态存在偏差：初始化、新闻检索、分析聚合、市场页等能力已先于任务表完成
  - 修复 Alembic 初始迁移在 SQLite 下的兼容问题：将 `stock_prices`、`stock_impacts`、`watchlists` 的唯一约束改为建表时内联声明，避免 `create_unique_constraint` 在 SQLite 上触发 `NotImplementedError`
  - 后端完整回归通过：`python -m pytest` = `20 passed`
  - 新增前端共享筛选组件：`frontend/src/components/numeric-filter-panel.tsx`
  - `/analysis` 与 `/market` 已接入共享筛选面板，支持：
    - 预设高亮
    - 数值输入后直接应用筛选
    - 本地 `localStorage` 持久化最近一次筛选参数
    - 无 query 进入页面时自动恢复最近一次筛选
  - 前端验证通过：`pnpm lint`、`pnpm type-check`、`pnpm build`
- **当前判断:**
  - 项目已不在“纯骨架阶段”，当前属于“基础功能可用、继续补齐深水区能力”的迭代开发阶段
  - 已完成主链路：新闻列表/详情/搜索、Dashboard、分析总览、市场脉冲、新闻抓取入库脚本、分析聚合 API
  - 主要未完成项集中在：股票 CRUD / 行情抓取、认证、自选股/告警、SSE/WebSocket、真实 NLP 模型接入、前端测试/E2E、部署收口
- **下一步建议:**
  - 优先补齐股票数据链路（`stocks` API + 行情抓取）或继续补前端测试基线

## 2026-03-08（Stocks 基础链路补齐）

- **已完成:**
  - 后端新增 `GET /api/v1/stocks` 列表接口，支持按 `ticker/name` 搜索，并返回最新价格快照
  - 后端新增 `GET /api/v1/stocks/{stock_id}` 详情接口，返回价格序列、影响汇总、相关新闻
  - 启动种子数据补充 `AAPL`、`NVDA` 股票、价格样本与影响信号，便于本地联调
  - 前端 `frontend/src/app/analysis/[stockId]/page.tsx` 改为直接调用 `stocks` 详情接口，移除前端重复聚合逻辑
  - 修复 `backend/tests/test_script_ingest_news.py` 在仓库根目录运行时的 `scripts` 导入失败问题
  - 新增后端测试 `backend/tests/test_api_stocks.py`
- **验证结果:**
  - 后端 `pytest` 通过：`test_api_stocks.py`、`test_script_ingest_news.py`、`test_api_analysis_market.py`、`test_api_analysis_overview.py`
  - 前端 `pnpm exec tsc --noEmit`、`pnpm lint` 通过
- **当前缺口:**
  - `stocks` 仍为本地种子/静态样本，尚未接入真实行情抓取任务
  - 个股分析页已可消费后端数据，但尚未加入图表可视化与股票检索入口
- **下一步建议:**
  - 补 `StockPrice` 的真实抓取脚本 / 定时任务
  - 增加 `/stocks` 前端检索页或把股票搜索入口接入 `/analysis`

## 2026-03-08（本地模拟行情启动补数）

- **已完成:**
  - 启动补数逻辑重构为真正幂等：不再因已有文章种子而跳过股票/价格补数
  - 新增本地模拟行情生成器：启动后自动为种子股票补齐最近 `5` 个交易日 OHLCV 数据
  - 交易日生成跳过周末，价格走势基于 `ticker + date` 的确定性波动生成，便于稳定复现页面效果
  - 个股分析页新增“最近价格序列”展示区，可直接看到近 5 个交易日价格与成交量
  - 新增幂等测试，验证补数后为 5 个交易日且重复执行不产生重复数据
- **验证结果:**
  - 后端 `pytest` 通过：`test_api_stocks.py`、`test_api_analysis_market.py`、`test_api_analysis_overview.py`、`test_script_ingest_news.py`
  - 前端 `pnpm exec tsc --noEmit`、`pnpm lint` 通过

## 2026-03-08（/market 五日价格卡片墙）

- **已完成:**
  - `/market` 页面新增“5日价格变化卡片”区块
  - 复用 `analysis/market` 的个股排行结果，二次拉取 `stocks/{id}` 详情拼装卡片数据
  - 每张卡展示 `ticker`、名称、最新价、近 5 日涨跌幅、5 日收盘微柱图，并支持跳转个股分析页
  - 卡片默认按近 5 日绝对涨跌幅排序，优先展示波动更大的股票
- **验证结果:**
  - 前端 `pnpm exec tsc --noEmit`、`pnpm lint` 通过

## 2026-03-08（股票检索入口与 /stocks 页面）

- **已完成:**
  - 新增 `frontend/src/app/stocks/page.tsx` 股票检索页，支持按 `ticker/company name` 搜索
  - 新增 `frontend/src/app/stocks/loading.tsx`，补齐页面 loading 状态
  - `/stocks` 页面展示股票卡片：最新价、涨跌幅、市值、交易所、行业，并可直接跳转 `/analysis/{stockId}`
  - 列表支持分页导航，便于后续股票池扩展
- **验证结果:**
  - 前端 `pnpm exec tsc --noEmit`、`pnpm lint` 通过

## 2026-03-08（/stocks 卡片增强）

- **已完成:**
  - `/stocks` 页面卡片增强为“信息卡 + 近 5 日收盘微图”布局
  - 列表页在调用 `GET /api/v1/stocks` 后，会进一步拉取 `GET /api/v1/stocks/{id}` 详情补足 5 日价格序列与信号摘要
  - 每张卡新增：日内变化、更新时间、区间高低点、近 5 日微柱图、信号方向
- **验证结果:**
  - 前端 `pnpm exec tsc --noEmit`、`pnpm lint` 通过

## 2026-03-08（轻量价格折线图组件）

- **已完成:**
  - 新增可复用组件 `frontend/src/components/stock-price-line-chart.tsx`
  - 个股页 `frontend/src/app/analysis/[stockId]/page.tsx` 接入折线图，替换原先单纯价格卡片墙为“图表 + 明细”双栏布局
  - `/stocks` 页面复用同一折线图组件，替代原有微柱图方案，视觉更统一
- **验证结果:**
  - 前端 `pnpm exec tsc --noEmit`、`pnpm lint` 通过

## 2026-03-08（真实股票行情抓取基础链路）

- **已完成:**
  - 后端新增股票行情 Provider 抽象：`backend/app/providers/stocks/`
  - 新增 `Finnhub` 默认实现，并通过环境变量支持后续扩展切换
  - 新增抓取脚本 `backend/scripts/fetch_stock_prices.py`，支持按指定 `ticker` 或全量股票抓取近 N 天日线并入库
  - 抓取逻辑支持按 `(stock_id, time)` 幂等更新：新数据插入，已有时间点覆盖更新，不重复写入
  - 配置层新增 `STOCK_DATA_PROVIDER`、`FINNHUB_API_KEY`、`FINNHUB_BASE_URL`、`STOCK_DATA_TIMEOUT_SECONDS`
  - 新增测试 `backend/tests/test_script_fetch_stock_prices.py`，覆盖插入、更新、单 ticker 失败不中断三类场景
- **当前缺口:**
  - 目前默认只实现 `Finnhub` Provider，其他数据源仍待补充
  - 尚未接入定时调度与前端自动刷新
- **下一步建议:**
  - 接入定时抓取任务（如 APScheduler / Celery Beat）
  - 为前端页面补充“最近更新时间”和抓取状态提示

## 2026-03-08（股票行情后台定时同步）

- **已完成:**
  - 新增轻量后台同步服务 `backend/app/services/stock_price_sync.py`
  - FastAPI `lifespan` 已接入股票价格定时同步任务，服务启动后可自动按间隔抓取真实行情
  - 配置层新增 `STOCK_PRICE_SYNC_ENABLED`、`STOCK_PRICE_SYNC_INTERVAL_SECONDS`、`STOCK_PRICE_SYNC_LOOKBACK_DAYS`
  - 新增测试 `backend/tests/test_stock_price_sync_service.py`，覆盖单次执行与后台循环停止逻辑
- **当前缺口:**
  - 当前为单进程内轻量循环，尚未接入分布式调度与多实例去重
  - 尚未暴露抓取状态到前端页面
- **下一步建议:**
  - 增加后台同步状态接口，前端展示最近更新时间
  - 后续如需多实例部署，再切换到 APScheduler / Celery Beat

## 2026-03-08（股票行情同步状态接口）

- **已完成:**
  - 新增同步状态存储 `backend/app/services/stock_price_sync_state.py`
  - 股票同步服务执行时会记录最近开始/完成/成功时间、最近错误和本轮统计
  - 新增接口 `GET /api/v1/stocks/sync-status`，可供前端直接展示同步状态
  - 新增测试 `backend/tests/test_api_stock_sync_status.py`
- **下一步建议:**
  - 前端 `/stocks` 或 Dashboard 接入该接口，展示“最近同步时间 / 是否成功 / 当前是否同步中”

## 2026-03-08（/stocks 接入行情同步状态）

- **已完成:**
  - `frontend/src/app/stocks/page.tsx` 已接入 `GET /api/v1/stocks/sync-status`
  - 页面头部新增“行情同步状态”卡，展示：启用状态、最近成功时间、请求股票数、成功/失败数、写入/更新数
  - 当状态接口失败时，页面会显示降级提示，但不影响股票列表浏览
- **验证结果:**
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 2026-03-08（首页 Dashboard 接入行情同步状态）

- **已完成:**
  - `frontend/src/app/page.tsx` 已接入 `GET /api/v1/stocks/sync-status`
  - Dashboard 新增“行情同步状态”区块，展示：状态徽标、最近成功时间、请求股票数、成功/失败数、抓取价格点、写入/更新数
  - 新增从首页跳转 `/stocks` 的入口，方便查看详细股票页
- **验证结果:**
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 2026-03-08（手动触发行情同步）

- **已完成:**
  - 后端新增 `POST /api/v1/stocks/sync`，支持手动触发一次股票行情同步
  - 股票同步服务改为可复用单例，供启动调度和手动接口共享
  - `/stocks` 页面新增“手动同步一次”按钮，触发成功后会刷新页面状态
- **当前约束:**
  - 若后台定时同步或另一次手动同步已在进行中，接口会返回 `409`

## 2026-03-08（首页支持手动触发行情同步）

- **已完成:**
  - 首页 `frontend/src/app/page.tsx` 复用 `ManualStockSyncButton`
  - Dashboard 现在也可直接手动触发一次股票行情同步，无需先进入 `/stocks`
- **验证结果:**
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 2026-03-08（Watchlist 单用户可升级版）

- **已完成:**
  - 后端新增 `watchlist` API：查看、加入、移除
  - 启动种子数据新增默认用户，供当前无认证阶段的自选股功能使用
  - 新增 `/watchlist` 页面，用于查看和移除自选股
  - `/stocks` 页面新增加入/移除自选按钮
  - 首页 Dashboard 快捷入口新增 `/watchlist`

## 2026-03-08（个股分析页接入自选按钮）

- **已完成:**
  - `frontend/src/app/analysis/[stockId]/page.tsx` 已接入自选股状态查询
  - 个股分析页页头新增“加入自选 / 移出自选”按钮，和 `/stocks`、`/watchlist` 保持一致
- **验证结果:**
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 2026-03-08（价格告警基础版）

- **已完成:**
  - 后端新增价格告警 API：查看、创建、删除
  - 股票行情同步后会检查活跃告警，并在触发后自动停用、记录触发时间与触发价格
  - 个股分析页新增价格告警创建表单
  - 新增 `/alerts` 页面查看告警状态
  - 首页 Dashboard 快捷入口新增 `/alerts`

## 2026-03-08（首页告警摘要卡）

- **已完成:**
  - 首页 `frontend/src/app/page.tsx` 已接入 `/api/v1/alerts`
  - Dashboard 新增“告警摘要”区块，展示活跃告警数、已触发数、监控中股票和最近触发记录
  - 摘要卡提供跳转 `/alerts` 的入口
- **验证结果:**
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 2026-03-08（Cookie 会话认证基础版）

- **已完成:**
  - 后端新增认证 API：注册、登录、退出、当前用户
  - 新增密码哈希与签名会话 Cookie 逻辑
  - 后端启用 CORS 凭证透传，前端 API 请求支持携带浏览器 Cookie 与服务端转发 Cookie
  - 新增前端 `/login`、`/register` 页面与顶部登录态入口
  - `watchlist`、`alerts` 已从默认单用户切换为当前登录用户上下文
- **验证结果:**
  - 后端 `pytest` 通过：auth/watchlist/alerts/sync 相关用例
  - 后端 `ruff check` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 2026-03-08（未登录态引导）

- **已完成:**
  - 新增统一未登录提示卡组件 `frontend/src/components/login-required-card.tsx`
  - `/watchlist`、`/alerts` 在未登录时会展示明确的登录/注册引导
  - `/stocks`、个股分析页在未登录时不再展示可操作的自选按钮，而改为登录入口
  - 个股分析页的价格告警区域在未登录时改为登录引导卡
- **验证结果:**
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 2026-03-08（个人中心页）

- **已完成:**
  - 新增 `frontend/src/app/profile/page.tsx` 个人中心页
  - 页面聚合展示当前用户信息、自选股数量、活跃告警数量、已触发告警数量
  - 顶部登录态用户名已改为可点击入口，跳转到 `/profile`
- **验证结果:**
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 2026-03-08（修改密码）

- **已完成:**
  - 后端新增 `POST /api/v1/auth/change-password`
  - 个人中心新增“修改密码”入口，跳转 `/profile/security`
  - 新增前端修改密码表单 `frontend/src/components/change-password-form.tsx`
  - 未登录访问修改密码页时展示登录引导
- **验证结果:**
  - 后端 `pytest` 通过：`backend/tests/test_api_auth.py`
  - 后端 `ruff check` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 2026-03-08（个人中心最近活动摘要）

- **已完成:**
  - `frontend/src/app/profile/page.tsx` 新增“最近加入的自选股”区块
  - `frontend/src/app/profile/page.tsx` 新增“最近触发的告警”区块
  - 两个区块均支持跳转到对应详情页或列表页
- **验证结果:**
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 2026-03-08（首页登录后个性化欢迎区）

- **已完成:**
  - 首页 `frontend/src/app/page.tsx` 已接入当前登录用户信息
  - 登录后 Dashboard 顶部新增个性化欢迎区，展示用户名并提供个人中心、自选股、告警快捷入口
- **验证结果:**
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 2026-03-08（个人资料编辑）

- **已完成:**
  - 后端新增 `POST /api/v1/auth/profile`，支持更新当前用户昵称
  - 个人中心新增“编辑个人资料”表单，支持修改昵称
  - 更新后页面会刷新并同步展示新的顶部登录态名称与个人中心信息
- **验证结果:**
  - 后端 `pytest` 通过：`backend/tests/test_api_auth.py`
  - 后端 `ruff check` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 2026-03-08（告警通知中心基础版）

- **已完成:**
  - 后端新增通知接口：触发告警列表、单条标记已读、全部标记已读
  - 触发价格告警后会自动生成未读通知状态
  - 新增 `/notifications` 页面查看通知并标记已读
  - 顶部导航新增通知入口与未读数量徽标
  - 首页快捷入口新增“通知中心”

## 2026-03-08（通知中心筛选）

- **已完成:**
  - 后端通知接口新增 `scope=all|unread` 参数，支持只看未读通知
  - `/notifications` 页面新增“全部 / 未读”筛选切换
- **验证结果:**
  - 后端 `pytest` 通过：`backend/tests/test_api_alerts.py`
  - 后端 `ruff check` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 2026-03-08（首页最近未读通知卡）

- **已完成:**
  - 首页 `frontend/src/app/page.tsx` 新增“最近未读通知”区块
  - 登录用户可直接在首页看到最近 3 条未读通知，并跳转到对应个股详情或通知中心
- **验证结果:**
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 2026-03-08（通知中心按股票筛选）

- **已完成:**
  - 后端通知接口新增 `ticker` 查询参数
  - `/notifications` 页面新增按 `ticker` 的筛选输入框与清除操作
  - 筛选可与“全部 / 未读”范围组合使用
- **验证结果:**
  - 后端 `pytest` 通过：`backend/tests/test_api_alerts.py`
  - 后端 `ruff check` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm lint` 通过

## 5-Question Reboot Check

| Question | Answer |
|----------|--------|
| Where am I? | Phase 1 基础任务已完成，进入后续功能迭代 |
| Where am I going? | 推进前端页面矩阵与分析能力，逐步补齐规划路线 |
| What's the goal? | 构建全球实时新闻检索与股市研判分析Web平台 |
| What have I learned? | See findings.md |
| What have I done? | 已完成项目初始化骨架、数据库 Schema（T-104）与部分验证，见本次 Phase 1 记录 |

---

*Update after completing each phase or encountering errors*

## 2026-03-08��֪ͨ����������ǿ��

- **�����**
  - ���֪ͨ�ӿ����� `sort=newest|oldest` ������֧������������������������
  - `/notifications` ҳ���������������� / �������ȡ��л������롰ȫ�� / δ������ ticker ɸѡ���ʹ��
  - ������˲��ԣ���֤֪ͨ������ʱ��������������
- **��֤���:**
  - ��� `pytest` ͨ����`backend/tests/test_api_alerts.py`
  - ��� `ruff check` ͨ��
  - ǰ�� `pnpm exec tsc --noEmit` ͨ��
  - ǰ�� `pnpm lint` ͨ��

## 2026-03-08��֪ͨժҪ����ǿ��

- **�����**
  - `/notifications` ҳ������ժҪ����չʾ��ǰ��������Ѷ�ռ�ȡ����´���ʱ�䡢Top 3 ��Ƶ ticker
  - ��ҳ�����δ��֪ͨ������������������չʾδ�����������´���ʱ�䡢��� ticker
  - ������ǿ����������֪ͨ������ǰ�˻��ܣ����������ӿ�
- **��֤���:**
  - ǰ�� `pnpm exec tsc --noEmit` ͨ��
  - ǰ�� `pnpm lint` ͨ��

## 2026-03-08��֪ͨ�� ticker �����Ѷ���

- **�����**
  - ������� `POST /api/v1/alerts/notifications/read-by-ticker?ticker=...`��֧�ְ� ticker �������֪ͨΪ�Ѷ�
  - `/notifications` ҳ���ڴ��� ticker ɸѡʱ���������� ticker ��Ϊ�Ѷ�����ť
  - ������˲��ԣ���֤��Ŀ�� ticker ��֪ͨ���������£����� ticker ����δ��
- **��֤���:**
  - ��� `pytest` ͨ����`backend/tests/test_api_alerts.py`
  - ��� `ruff check` ͨ��
  - ǰ�� `pnpm exec tsc --noEmit` ͨ��
  - ǰ�� `pnpm lint` ͨ��

## 2026-03-08��֪ͨ����ǰɸѡ�����Ѷ���

- **�����**
  - ������� `POST /api/v1/alerts/notifications/read-filtered`��֧�ֻ��ڵ�ǰ `scope + ticker + sort` ����������Ϊ�Ѷ�
  - `/notifications` ҳ����������ǰɸѡ�Ѷ�����ť��֧��ֱ�Ӵ�����ǰ�ɼ�֪ͨ���
  - ������˲��ԣ���֤����ǰɸѡ���е�δ��֪ͨ����������
- **��֤���:**
  - ��� `pytest` ͨ����`backend/tests/test_api_alerts.py`
  - ��� `ruff check` ͨ��
  - ǰ�� `pnpm exec tsc --noEmit` ͨ��
  - ǰ�� `pnpm lint` ͨ��

## 2026-03-08��֪ͨ�� ticker ����չʾ��

- **�����**
  - `/notifications` ҳ��֪ͨ�б���Ϊ�� `ticker` ����չʾ
  - ÿ��������ʾ������δ�������������ʱ�䣬���ṩ�������� ticker��������
  - ���ڱ�������֪ͨ��Ƭ�뵥���Ѷ������������б��ɶ���
- **��֤���:**
  - ǰ�� `pnpm exec tsc --noEmit` ͨ��
  - ǰ�� `pnpm lint` ͨ��

## 2026-03-08��֪ͨ�����۵�/չ����

- **�����**
  - �����ɸ������ `frontend/src/components/notification-groups.tsx`������֪ͨ����չʾ���۵�����
  - `/notifications` ҳ�����Ĭ��չ������ͺ�δ���ķ��飬����ɰ���չ��
  - ����ͷ������չ������ / ������顱��ʾ�����б����������
- **��֤���:**
  - ǰ�� `pnpm exec tsc --noEmit` ͨ��
  - ǰ�� `pnpm lint` ͨ��

## 2026-03-08��֪ͨ����ͷ����Ѷ���

- **�����**
  - `frontend/src/components/notification-groups.tsx` ����ͷ����������ȫ���Ѷ�����ݲ���
  - �������а� ticker �����Ѷ����������ڸ÷�������δ��ʱ��ʾ��ť
  - ֪ͨҳ�����Ƴ��ظ��� ticker �����Ѷ���ڣ������������
- **��֤���:**
  - ǰ�� `pnpm exec tsc --noEmit` ͨ��
  - ǰ�� `pnpm lint` ͨ��

## 2026-03-08��֪ͨ����δ����������

- **�����**
  - `/notifications` �����б�����Ϊδ��������ķ���������ʾ
  - ��δ������ͬ������£��������������ʱ������
  - ����Ҫ���ȴ�����֪ͨ�������ǰ�����ٹ������ҳɱ�
- **��֤���:**
  - ǰ�� `pnpm exec tsc --noEmit` ͨ��
  - ǰ�� `pnpm lint` ͨ��

## 2026-03-08��֪ͨ����ͷ����ժҪ��

- **�����**
  - `/notifications` ������������ `latestItem`����������ÿ������һ��֪ͨ
  - ����ͷֱ��չʾ����һ��֪ͨ�ķ�����ֵ�봥����
  - �û�����չ�����鼴�ɿ����жϸ������¸澯����
- **��֤���:**
  - ǰ�� `pnpm exec tsc --noEmit` ͨ��
  - ǰ�� `pnpm lint` ͨ��

## 2026-03-08��֪ͨҳ�İ�������

- **�����**
  - ͳһ���� `/notifications` ҳ�漰��ذ�ť����������е����������İ�
  - ��̬��ɸѡ�����򡢷���ͷ������֪ͨ��Ƭ�İ�ͳһΪ�ɶ�����
  - �������н����������߼����䣬����֪ͨ���������ı��޸�
- **��֤���:**
  - ǰ�� `pnpm exec tsc --noEmit` ͨ��
  - ǰ�� `pnpm lint` ͨ��

## 2026-03-08�����������İ��޸���

- **�����**
  - ��д `frontend/src/app/profile/page.tsx`���޸���������ҳ�����������İ�
  - ��д `frontend/src/app/profile/security/page.tsx`���޸������޸�ҳ��¼�����İ�
  - ����ԭ�������߼���ҳ��ṹ�������İ���չʾ������
- **��֤���:**
  - ǰ�� `pnpm exec tsc --noEmit` ͨ��
  - ǰ�� `pnpm lint` ͨ��

## 2026-03-08��ǰ������ƽ��뷽���׶Σ�

- **�����**
  - ������ǰǰ���������������ع�ҳ��
  - ���½��Ӽƻ�����ȷ�������ȴ���ҳ��ȫ�����ϵͳ����
  - ��ǰ���롰�ȳ���������ʵʩ����ǰ������ƽ׶�

- ��ƽ����ĵ��������`docs/plans/2026-03-08-frontend-redesign-design.md`
- �Ƽ�������ȷ��Ϊ��A / Signal Desk���ִ���Ʒ�� �� ý���鱨�ںϣ�
- ��ǰ�׶ν����������������ٿ�ʼ��ҳ�ع�

## 2026-03-09（行情时效闭环与前端测试基线补齐）

- **已完成**
  - 新增可复用行情同步状态组件 `frontend/src/components/stock-sync-status-panel.tsx`
  - 个股分析页、告警页、观察列表页、通知页已统一接入行情同步状态展示
  - 观察列表页新增价格新鲜度标签，通知分组与通知卡片新增价格快照时间、快照新鲜度、最新价与日内变化
  - 前端新增 `Vitest` 测试基线，补齐页面级与组件级测试：
    - `frontend/src/components/stock-sync-status-panel.test.tsx`
    - `frontend/src/app/watchlist/page.test.tsx`
    - `frontend/src/app/notifications/page.test.tsx`
    - `frontend/src/app/analysis/[stockId]/page.test.tsx`
    - `frontend/src/app/alerts/page.test.tsx`
    - `frontend/src/components/notification-groups.test.tsx`
    - `frontend/src/components/watchlist-toggle-button.test.tsx`
  - 前端新增 Playwright E2E 基线：
    - `frontend/playwright.config.ts`
    - `frontend/e2e/authenticated-smoke.spec.ts`
    - `frontend/package.json` 新增 `test:e2e`
  - `Vitest` 已排除 `e2e/`，`ESLint` 已忽略 `test-results/` 与 `playwright-report/`

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test` 通过：7 files, 15 tests passed
  - 前端 `pnpm test:e2e` 通过：1 Playwright smoke test passed（Edge）

- **当前判断**
  - 用户侧“行情是否新鲜”信息已经贯通到分析、告警、观察、通知四条主链路
  - 前端目前已具备单测 + 轻量 E2E 双层基线，后续继续迭代时可以直接沿这套测试面扩展
  - Playwright smoke 目前通过“后端 API 注册 + 注入 session cookie”方式建立登录态，真实浏览器里的注册表单提交流程仍需后续单独修复

- **明日建议优先项**
  - 优先修复前端注册/登录表单在真实浏览器下的提交卡住问题，并把当前 E2E 从“API 注入会话”切回真实 UI 登录/注册流程
  - 之后可继续扩展第二条 E2E：登录后创建告警 -> 通知中心查看 -> 标记已读

## 2026-03-12（前端 redesign 续作进度保存）

- **已完成**
  - 恢复并承接 2026-03-10 的长会话前端 redesign 上下文，确认首页 / 新闻 / 新闻详情 / 分析总览 / 市场页已先完成浅深混合改版
  - 继续统一剩余旧视觉页面：`/alerts`、`/notifications`、`/watchlist`、`/stocks`、`/search`、`/profile`、`/profile/security`、`/register`
  - 继续统一共享组件视觉语言：
    - `frontend/src/components/login-required-card.tsx`
    - `frontend/src/components/auth-form.tsx`
    - `frontend/src/components/profile-edit-form.tsx`
    - `frontend/src/components/change-password-form.tsx`
    - `frontend/src/components/price-alert-form.tsx`
    - `frontend/src/components/stock-sync-status-panel.tsx`
    - `frontend/src/components/notification-groups.tsx`
    - `frontend/src/components/stock-price-line-chart.tsx`
  - 页面视觉从“旧的硬编码深色卡片”继续收口到统一体系：浅色内容区承担阅读 / 表单 / 摘要，深色数据面板承担行情 / 通知分组 / 股票卡 / 告警状态
  - `/search` 已补成与新闻流一致的图片化阅读卡片节奏，认证与安全页也切回与全站一致的 shell / hero / form 语言

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm build` 通过
  - 手动路由验证通过：清理占用 `3000` 端口的脏 Next 进程后，重新启动干净 dev 实例，`/register`、`/search`、`/alerts`、`/notifications`、`/stocks`、`/profile/security` 均返回 `200`
  - 页面文本验证可见新版入口文案：`Create account`、`Research search`、`Alert control`、`Market coverage`

- **当前判断**
  - 前端 redesign 已从“首页与主内容链路先改”推进到“账号 / 搜索 / 通知 / 自选 / 告警 / 股票页同步统一”，整站视觉一致性明显提升
  - 当前仍有少量页面和组件可继续精修，但主观感受上已不再是“一半新版、一半旧版”的状态
  - 本地验证里 `lsp_diagnostics` 仍不可用，原因是环境缺少 `typescript-language-server`；本次继续以 `lint + build + 实际路由访问` 作为验收依据

- **下次继续建议**
  - 继续精修 `analysis/[stockId]` 等仍有自定义视觉类名的页面，进一步减少非标准样式分叉
  - 如要继续提升完成度，可补“真实图片资源策略 / 字体体系 / 空态与 loading 态细化”，把 redesign 从“统一”推进到“品牌化”

## 2026-03-12（个股分析页 redesign 收口）

- **已完成**
  - 重做 `frontend/src/app/analysis/[stockId]/page.tsx` 的页面层级，补齐 hero brief、信号分布、轻量 research brief、相关新闻阅读区与价格明细区的统一视觉
  - 将个股页从“深色卡片堆叠”调整为与全站一致的“浅色内容区 + 深色数据面板”混合节奏，减少旧样式分叉
  - 优化 `frontend/src/components/stock-price-line-chart.tsx`：新增标题/副标题能力，并将标签渲染改为抽样显示，避免 30 个价格点时底部标签拥挤
  - 优化 `frontend/src/components/price-alert-form.tsx`，使告警创建表单与当前 redesign 体系一致，并补充更清晰的文案提示

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：7 files, 15 tests passed
  - 前端 `pnpm build` 通过

- **当前判断**
  - 个股分析页已从旧版局部样式切回统一设计语言，当前 redesign 的主要残留分叉进一步减少
  - 折线图标签抽样后，长价格窗口下的可读性明显好于此前固定全量标签输出

- **下次继续建议**
  - 可继续补个股页 loading / empty / not-found 的细化视觉，完成这一条链路的状态统一
  - 如转向功能开发，下一优先项可回到 `progress.md` 里的真实登录/注册 E2E 修复

## 2026-03-12（认证真实 UI E2E 切换完成）

- **已完成**
  - 核对 `frontend/src/components/auth-form.tsx`、`frontend/e2e/authenticated-smoke.spec.ts` 与 Playwright 配置，确认此前 smoke 仍依赖“API 注册 + 手动注入 session cookie”方案
  - 通过真实浏览器手动验证注册流程，确认当前 UI 提交链路本身可用，问题主要在 E2E 尚未切回真实表单流
  - 更新 `frontend/e2e/authenticated-smoke.spec.ts`：改为真实访问 `/register` 与 `/login`，用表单完成注册、退出、重新登录，再验证 `/watchlist`、`/alerts`、`/notifications` 受保护页面
  - 优化 `frontend/src/components/auth-form.tsx`：为昵称/邮箱/密码字段补充 `name` 与 `autocomplete`，并为提交中状态与错误提示补充更明确的浏览器语义

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：7 files, 15 tests passed
  - 前端 `pnpm test:e2e` 通过：1 Playwright test passed（真实 UI 注册/登录流程）

- **当前判断**
  - Playwright smoke 已不再依赖 API 注入会话，认证主链路现在由真实浏览器交互覆盖
  - 认证表单的浏览器 autofill / password manager 兼容性也比之前更稳，后续可直接在这条基线上扩 E2E 用例

- **下次继续建议**
  - 可新增第二条 E2E：登录后创建价格告警 -> 通知中心查看 -> 标记已读
  - 如继续做认证体验，可补注册失败 / 登录失败的前端交互与测试覆盖

## 2026-03-12（告警到通知的第二条 E2E）

- **已完成**
  - 后端新增 `POST /api/v1/alerts/evaluate`，用于立即执行一次当前用户价格告警评估，并返回最新告警列表
  - 补充后端测试 `backend/tests/test_api_alerts.py`，覆盖 evaluate 接口触发 active alert -> triggered notification 的闭环
  - 更新 `frontend/e2e/authenticated-smoke.spec.ts`：新增“登录后创建价格告警 -> 调用评估接口 -> 通知中心查看未读 -> 标记已读 -> 回看 all 列表”的完整 E2E
  - 当前这条 E2E 采用“API 预创建账号 + UI 登录 + UI 创建告警 + UI 查看/已读通知”的混合方式，保证链路稳定同时仍覆盖真实登录表单

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test:e2e` 通过：1 Playwright test passed
  - 后端 `python -m pytest tests/test_api_alerts.py` 通过：7 passed

- **当前判断**
  - 价格告警从创建到通知已读的主链路现在已有自动化回归覆盖
  - 为避免当前 dev server 下注册页偶发刷新噪音，这条用例把“创建账号”放到 API setup，重点把稳定性留给“真实 UI 登录 + 告警操作 + 通知处理”部分

- **下次继续建议**
  - 可继续补“按 ticker 批量已读 / 按筛选条件批量已读”的通知中心 E2E
  - 如要增强体验，可在前端加入“立即评估告警”入口，而不只让 E2E 通过后端接口触发

## 2026-03-12（dev runtime JSON 噪音收口）

- **已完成**
  - 排查前端 dev server 中反复出现的 `Unexpected end of JSON input` 噪音，确认高风险点集中在 `frontend/src/lib/api.ts` 对成功响应直接 `response.json()` 的假设过强
  - 为 `apiGet` / `apiPost` / `apiDelete` 增加统一的 `readJsonBody()` 读取逻辑：先读文本，再在非空时解析 JSON；空响应则抛出更明确的 `ApiRequestError`
  - 调整 `frontend/e2e/authenticated-smoke.spec.ts` 的交互等待方式：对登录与创建告警改为显式等待对应 API 响应成功，再继续页面断言，减少 dev 模式下因客户端跳转节奏造成的假失败

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test:e2e` 通过：1 Playwright test passed

- **当前判断**
  - 原先的 `JSON.parse` 类噪音已不再作为这条 E2E 的直接失败来源，当前剩余主要是 Next dev 的 `Fast Refresh had to perform a full reload` 提示
  - 这些提示更像开发态热更新噪音，不影响当前自动化链路通过；若后续继续收口，可优先在生产构建模式或更稳定的 E2E server 启动方式上处理

## 2026-03-12（通知中心批量已读 E2E）

- **已完成**
  - 扩展 `frontend/e2e/authenticated-smoke.spec.ts`，覆盖通知中心两类批量处理链路：按 ticker 已读、按当前筛选条件批量已读
  - 当前用例会为同一用户准备 `AAPL` 与 `NVDA` 两条已触发通知，然后验证：
    - `AAPL` 按 ticker 已读后，未读列表仅剩 `NVDA`
    - 切到 `ticker=NVDA` 的 unread 视图后执行 filtered read，未读列表归零
    - 回到 `scope=all` 后仍可看到两组通知记录
  - 为保证稳定性，当前这条批量已读 E2E 继续采用“API 准备用户/告警/评估状态 + UI 验证通知页结果”的混合策略

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test:e2e` 通过：1 Playwright test passed
  - 后端 `python -m pytest tests/test_api_alerts.py` 通过：7 passed

- **当前判断**
  - 通知中心的单条已读、按 ticker 已读、按当前筛选批量已读三类核心状态流现在都有自动化覆盖
  - E2E 仍会看到少量 Next dev 模式的 Fast Refresh 提示，但对当前通知链路稳定性已无实质影响

## 2026-03-12（前端补立即评估告警入口）

- **已完成**
  - 新增 `frontend/src/components/alerts-evaluate-button.tsx`，为已登录用户提供“立即评估告警”按钮
  - 按钮会调用后端 `POST /api/v1/alerts/evaluate`，随后根据返回的告警状态给出简要反馈文案，并刷新当前页面
  - 将该入口接入 `frontend/src/app/alerts/page.tsx` 的 header 区域，使其与告警总览处于同一操作上下文中
  - 更新 `frontend/src/app/alerts/page.test.tsx`，覆盖已登录时展示按钮、未登录时不展示按钮的基本页面行为

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：7 files, 15 tests passed
  - 前端 `pnpm test:e2e` 通过：1 Playwright test passed

- **当前判断**
  - 现在“创建告警 -> 手动立即评估 -> 去通知中心查看结果”这条链路在产品界面上已经可直接操作，不再只存在于测试辅助接口里
  - 后续如果要继续提升体验，可以把评估结果做成更明显的状态反馈，或在评估成功后提供直达通知中心的快捷入口

## 2026-03-12（评估结果补通知快捷入口）

- **已完成**
  - 更新 `frontend/src/components/alerts-evaluate-button.tsx`，在评估结果存在已触发通知时，额外显示“去通知中心查看未读通知”快捷链接
  - 当前按钮的反馈逻辑会同时保留文案提示与触发数量状态，避免刷新后用户不知道下一步该去哪里

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：7 files, 15 tests passed

- **当前判断**
  - 告警评估入口现在不只是“执行动作”，而是补上了动作后的下一步导航，用户从告警页跳转到通知页的链路更顺了

## 2026-03-12（评估按钮补组件测试）

- **已完成**
  - 新增 `frontend/src/components/alerts-evaluate-button.test.tsx`
  - 覆盖三种核心状态：
    - 评估成功且存在已触发通知时，显示成功文案与通知中心快捷链接
    - 评估成功但没有新触发告警时，不显示快捷链接
    - 评估失败时，显示错误提示且不显示快捷链接

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：8 files, 18 tests passed

- **当前判断**
  - `alerts-evaluate-button` 的成功 / 空结果 / 失败三类反馈现在都有单元测试保护，后续再改文案或交互时更不容易回归破坏

## 2026-03-12（通知页补回告警闭环入口）

- **已完成**
  - 在 `frontend/src/app/notifications/page.tsx` 增加“继续处理”操作区
  - 提供两个明确入口：`返回告警页` 与 `继续评估告警`，都把用户导回 `alerts` 总览，减少从通知页回到操作页时的路径成本
  - 更新 `frontend/src/app/notifications/page.test.tsx`，确保该操作区在已登录通知页面中可见

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：8 files, 18 tests passed

- **当前判断**
  - 告警页与通知页现在形成了更完整的双向闭环：告警页可直达通知中心，通知页也能快速返回继续评估与管理阈值

## 2026-03-12（评估按钮补 E2E）

- **已完成**
  - 扩展 `frontend/e2e/authenticated-smoke.spec.ts`，新增一条基于真实 UI 的 E2E：
    - 登录后进入 `alerts` 页
    - 点击 `立即评估告警`
    - 验证成功提示与“去通知中心查看未读通知”链接存在
    - 跳转到 `notifications?scope=unread` 并确认触发通知可见
  - 这条 E2E 与现有批量已读用例一起，覆盖了“告警评估 -> 通知查看”的产品闭环

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test:e2e` 通过：2 Playwright tests passed

- **当前判断**
  - 现在不仅有按钮的组件级保护，也有从 `alerts` 页触发评估到进入通知页的端到端回归覆盖

## 2026-03-12（实时前端骨架起步）

- **已完成**
  - 新增前端实时 hooks：`frontend/src/hooks/use-sse.ts` 与 `frontend/src/hooks/use-websocket.ts`
  - 两个 hook 均支持连接状态、最近消息、最近消息时间、错误文案、重试次数，以及手动 connect / disconnect 控制
  - 新增可复用组件 `frontend/src/components/realtime-connection-panel.tsx`，用于展示 SSE / WebSocket endpoint、连接状态与最新 payload 预览
  - `frontend/src/app/watchlist/page.tsx` 先接入第一批实时骨架卡片：
    - `自选股价格订阅`（WebSocket）
    - `新闻快讯流`（SSE）
  - 当前设计为“手动连接”模式，避免在后端实时端点尚未落地前自动报错刷屏，但前端接线位和状态展示已准备好
  - 更新 `frontend/src/app/watchlist/page.test.tsx`，覆盖实时骨架区块在登录态下可见、未登录时不展示

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：8 files, 18 tests passed

- **当前判断**
  - 这是实时能力的前端第一刀：先把连接管理和展示骨架立住，后续接后端 SSE / WebSocket 真端点时能直接复用
  - 下一步最自然的是为后端补最小可用的 `stream/news` 或 `ws/prices` 测试端点，再把这两张卡从“占位连接”推进到“真实消息预览”

## 2026-03-12（最小 SSE 新闻流打通）

- **已完成**
  - 新增后端实时路由 `backend/app/api/v1/routes/stream.py`
  - 提供 `GET /api/v1/stream/news` SSE 端点：首次连接立即推送一帧 `news-snapshot`，内容为最新新闻列表的 JSON 快照
  - 端点支持 `limit` 参数控制首帧条数，并支持 `once=true` 便于测试场景下只输出一次后关闭连接
  - 将实时路由接入 `backend/app/api/v1/router.py`
  - 新增后端测试 `backend/tests/test_api_stream.py`，验证 SSE 返回 `text/event-stream` 且首帧包含新闻快照 payload
  - 前端 `frontend/src/app/watchlist/page.tsx` 中的“新闻快讯流”卡改为 `autoConnect`，现在页面加载后会直接尝试连接真实 SSE 端点并显示最近 payload 预览

- **验证结果**
  - 后端 `python -m pytest tests/test_api_stream.py tests/test_api_news.py` 通过：5 passed
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：8 files, 18 tests passed

- **当前判断**
  - SSE 主链路已经有最小可用闭环：FastAPI 端点 -> EventSource 连接 -> 前端状态面板显示 payload
  - 下一步可以继续补 `ws/prices` 的最小可用 WebSocket 测试端点，或者把 SSE 负载从“快照”扩到“连续推送 / 模拟事件流”

## 2026-03-12（最小 WebSocket 价格流打通）

- **已完成**
  - 新增后端实时路由 `backend/app/api/v1/routes/ws.py`
  - 提供 `WS /api/v1/ws/prices` 最小可用 WebSocket 端点：连接成功后立即发送一帧 `price-snapshot`，内容为股票列表快照
  - 将 `ws` 路由接入 `backend/app/api/v1/router.py`
  - 新增后端测试 `backend/tests/test_api_ws.py`，验证 WebSocket 首帧可正常返回 JSON snapshot
  - 前端 `frontend/src/app/watchlist/page.tsx` 中的“自选股价格订阅”卡已切为 `autoConnect`，现在 SSE 与 WebSocket 两张实时卡都会在页面加载后尝试连接真实端点

- **验证结果**
  - 后端 `python -m pytest tests/test_api_stream.py tests/test_api_ws.py tests/test_api_news.py` 通过：6 passed
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：8 files, 18 tests passed

- **当前判断**
  - 实时通信的两条最小链路现在都已经打通：
    - SSE 新闻快讯流
    - WebSocket 价格快照流
  - 后续可以从“最小快照”继续升级到“持续推送 / 订阅指定 watchlist / 后端真实事件源联动”

## 2026-03-12（WebSocket 升级为 watchlist 订阅）

- **已完成**
  - 升级 `backend/app/api/v1/routes/ws.py`，`WS /api/v1/ws/prices` 现支持 `stock_ids` 查询参数
  - 当客户端携带 `stock_ids=1,2,...` 时，首帧 `price-snapshot` 会只返回对应股票的价格快照，而不是全量股票列表
  - WebSocket 返回体新增 `subscription.stock_ids` 字段，便于前端确认当前订阅范围
  - `frontend/src/app/watchlist/page.tsx` 会根据当前 watchlist 项动态拼接 `stock_ids`，使“自选股价格订阅”卡真正与当前观察列表绑定
  - 更新 `backend/tests/test_api_ws.py`，新增按 `stock_ids` 过滤的测试覆盖

- **验证结果**
  - 后端 `python -m pytest tests/test_api_stream.py tests/test_api_ws.py tests/test_api_news.py` 通过：7 passed
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：8 files, 18 tests passed

- **当前判断**
  - WebSocket 价格流已从“全量快照 demo”进入“与当前 watchlist 有关”的更真实订阅模型
  - 下一步可继续做真正的增量推送（定时模拟或基于同步任务广播），以及后续加入用户身份维度的订阅隔离

## 2026-03-12（WebSocket 持续更新模拟）

- **已完成**
  - 升级 `backend/app/api/v1/routes/ws.py`，在首帧 `price-snapshot` 之后，按固定间隔持续推送 `price-update` 事件
  - 当前更新采用轻量模拟策略：基于 `stock id + tick` 生成稳定可复现的小幅价格变化，用于前端联调和状态展示
  - 新增 `interval_seconds` 查询参数，便于测试中快速收到第二帧增量消息
  - 更新 `backend/tests/test_api_ws.py`，新增“持续更新”测试，验证连接后可收到 `price-update` 事件
  - 优化 `frontend/src/components/realtime-connection-panel.tsx`，现在会根据 payload 中的 `event` 自动提示：
    - 价格快照
    - 价格增量更新
    - 新闻快照

- **验证结果**
  - 后端 `python -m pytest tests/test_api_stream.py tests/test_api_ws.py tests/test_api_news.py` 通过：8 passed
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：8 files, 18 tests passed

- **当前判断**
  - WebSocket 价格流已经从“静态首帧”升级到“可持续变化”的联调阶段，前端面板现在能明确区分快照与增量更新
  - 下一步可以把这套模拟更新继续替换为真实同步任务广播，或同步给 SSE 新闻流也加上连续事件输出

## 2026-03-12（SSE 连续新闻更新模拟）

- **已完成**
  - 升级 `backend/app/api/v1/routes/stream.py`，在首帧 `news-snapshot` 之后，按固定间隔持续推送 `news-update` 事件
  - 当前 `news-update` 采用轻量模拟策略：沿用最新新闻快照结构，并在标题中附带递增 update 标记，便于前端明确观察到连续事件
  - 新增 `interval_seconds` 与 `max_updates` 参数，既方便本地联调，也便于测试控制输出次数
  - 更新 `backend/tests/test_api_stream.py`，新增“连续更新”测试，验证 `news-update` 事件可被正确输出
  - 优化 `frontend/src/components/realtime-connection-panel.tsx`，增加对 `news-update` 的提示文案，区分新闻快照与新闻连续更新

- **验证结果**
  - 后端 `python -m pytest tests/test_api_stream.py tests/test_api_ws.py tests/test_api_news.py` 通过：9 passed
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：8 files, 18 tests passed

- **当前判断**
  - 现在两条实时通道都已具备“首帧快照 + 持续模拟更新”能力：
    - SSE 新闻流
    - WebSocket 价格流
  - 下一步可以把模拟更新替换成真实数据广播源，或开始补前端更具体的实时消费组件（例如实时新闻 feed / watchlist live badge）

## 2026-03-12（首页接入实时新闻 feed）

- **已完成**
  - 新增 `frontend/src/components/live-news-feed.tsx`，直接消费 `SSE /api/v1/stream/news`，在客户端根据 `news-snapshot` / `news-update` 实时刷新列表
  - 升级 `frontend/src/hooks/use-sse.ts`，支持通过 `eventNames` 监听命名事件，避免只依赖默认 `message` 事件
  - 在 `frontend/src/app/page.tsx` 将实时新闻 feed 接入首页右侧信息区，与情感分布、快捷入口并列，形成更直接的首页实时入口
  - 该 feed 默认使用首页已有 `latestNews` 作为首屏回退数据，SSE 连上后再切到实时消息

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：8 files, 18 tests passed

- **当前判断**
  - 实时新闻能力已经从“状态面板演示”进入“真实首页消费组件”阶段，首页现在可以直接作为 live desk 入口使用
  - 下一步可继续补组件级测试，或把实时 feed 的卡片样式与排序策略做得更贴近真正 newsroom 工作流

## 2026-03-12（实时新闻 feed 补组件测试）

- **已完成**
  - 新增 `frontend/src/components/live-news-feed.test.tsx`
  - 覆盖 3 类核心状态：
    - 等待 SSE 建连时，展示首页传入的初始新闻列表
    - 收到 `news-snapshot` 后，用快照内容替换初始列表
    - 收到连续更新 payload 且 SSE 进入 error 状态时，仍渲染最新更新内容并展示降级状态文案

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：9 files, 21 tests passed

- **当前判断**
  - 首页实时新闻 feed 现在已经有基础单元测试保护，后续继续迭代排序、动画或卡片结构时更不容易破坏实时更新行为

## 2026-03-12（watchlist 接入实时价格看板）

- **已完成**
  - 新增 `frontend/src/components/watchlist-live-board.tsx`，直接消费 watchlist scoped `WS /api/v1/ws/prices`
  - 该看板会把静态 watchlist 数据与最近一帧 WebSocket payload 合并，展示：
    - 最新价格
    - 日内变化与百分比
    - `STATIC / LIVE / LIVE #tick` 状态徽标
  - `frontend/src/app/watchlist/page.tsx` 已接入该实时看板，放在连接状态面板与静态卡片列表之间，形成“连接状态 -> 实时看板 -> 详情卡片”层级
  - 新增 `frontend/src/components/watchlist-live-board.test.tsx`，覆盖静态态、快照态、增量更新态三类渲染行为
  - 更新 `frontend/src/app/watchlist/page.test.tsx`，确保 watchlist 页面在登录态下会渲染实时看板区块

- **验证结果**
  - 前端 `pnpm lint` 通过
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 前端 `pnpm test -- --runInBand` 通过：10 files, 24 tests passed

- **当前判断**
  - WebSocket 价格流已经从“面板可见”进入“页面真正消费”阶段，watchlist 不再只是展示静态快照，而是能显式反映实时更新状态

## 2026-03-13（WebSocket 改接真实价格广播）

- **已完成**
  - 新增后端进程内价格事件总线 `backend/app/services/price_stream_bus.py`
  - `StockPriceSyncService.run_once()` 在成功同步后会读取最新股票快照并发布到事件总线，不再只更新状态存储
  - `WS /api/v1/ws/prices` 保留首帧 `price-snapshot`，后续增量消息改为订阅事件总线，移除原先基于 tick 的模拟价格波动
  - 更新测试：`backend/tests/test_api_ws.py` 验证 WebSocket 可收到总线发布的真实更新；`backend/tests/test_stock_price_sync_service.py` 验证同步服务会发布最新价格快照

- **验证结果**
  - 待本次会话执行 `pytest` 与手动 WebSocket 验证

## 2026-03-13（SSE 改接真实新闻广播）

- **已完成**
  - 新增后端进程内新闻事件总线 `backend/app/services/news_stream_bus.py`
  - `backend/scripts/ingest_news.py` 在成功提交新文章后会发布真实 `news-update` 事件，不再只写入数据库
  - `GET /api/v1/stream/news` 保留首帧 `news-snapshot`，后续更新改为订阅事件总线，移除原先基于 `update {tick}` 的模拟标题改写
  - 更新测试：`backend/tests/test_api_stream.py` 验证 SSE 可收到总线发布的真实更新；`backend/tests/test_script_ingest_news.py` 验证入库脚本会发布插入文章事件

- **验证结果**
  - 待本次会话执行 `pytest` 与手动 SSE 验证

## 2026-03-13（实时新闻 feed 适配增量 news-update）

- **已完成**
  - `frontend/src/components/live-news-feed.tsx` 已从“收到消息即整列表替换”调整为“snapshot 替换、update 增量合并”
  - 真实 `news-update` 现在会把新文章插入现有列表顶部，并按 `id` 去重、保留最近 5 条
  - 更新 `frontend/src/components/live-news-feed.test.tsx`，补充增量合并与去重用例，匹配当前后端只广播新增文章的实时语义

- **验证结果**
  - 前端 `pnpm exec vitest run src/components/live-news-feed.test.tsx` 通过：4 tests passed
  - 前端 `pnpm exec tsc --noEmit` 通过
  - 手动场景验证通过：定向执行增量更新用例后，确认 `news-update` 不再覆盖初始列表，而是与现有文章合并并去重

## 2026-03-14（进度同步规则强化）

- **已完成**
  - 更新项目协作约束：`CLAUDE.md` 中“AI 协作指引”第 4 条已从“完成阶段后更新 `progress.md`”强化为“每次完成代码修改、脚手架搭建、测试修复或阶段性任务后，必须立即更新 `progress.md`”
  - 新规则已明确要求记录完成内容、变更文件、当前状态、下一步待办和已知风险，避免后续还需用户重复提醒

- **变更文件**
  - `CLAUDE.md`
  - `progress.md`

- **当前状态**
  - 项目级指令已具备“默认自动保存进度”约束，后续完成有效开发工作后应同步更新 `progress.md`

- **下一步待办**
  - 后续每次实际开发任务收尾时，按新规则持续维护 `progress.md`

- **已知风险**
  - 若后续任务只涉及纯讨论或未产生实质性交付，是否写入 `progress.md` 仍需按任务性质判断，避免记录噪音
