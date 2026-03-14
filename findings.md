# Findings & Decisions — NewsIntel 全球新闻研判平台

## 需求清单

- 全球实时新闻检索，7×24小时自动采集
- 新闻分类：地缘政治、选举、经济、犯罪、双边协议、政策
- 基于AI的情感分析（利好/利空/中性）
- 股市走向预测与研判
- 关联新闻事件到具体股票/行业
- 专业级可视化仪表盘
- 实时推送（SSE + WebSocket）

## 技术选型决策

| 决策 | 理由 |
|------|------|
| FastAPI (Python) 作为后端 | 异步原生、与ML生态（HuggingFace/PyTorch）无缝集成、自动文档 |
| Next.js 15 作为前端 | SSR/SSG、React Server Components、SEO友好、流式渲染 |
| PostgreSQL + TimescaleDB | ACID合规金融数据、时序扩展成熟 |
| Redis | 缓存 + Pub/Sub + Celery消息代理 + 限流 |
| Elasticsearch | 全文检索新闻、聚合分析 |
| FinBERT 情感分析 | 金融领域SOTA，超越通用LLM在金融文本上的表现 |
| BART-large-MNLI 分类 | 零样本分类，无需标注训练数据 |
| Claude API 增强 | 实体抽取、摘要生成、深度分析 |
| Currents API 为主新闻源 | 免费可用于生产环境，78语言覆盖 |
| Finnhub 为股票/新闻双料源 | 免费60次/分钟、WebSocket实时、自带新闻情感 |

## 研究发现

### 新闻API
- Currents API 是唯一免费可商用的API（14,000+源，78语言）
- NewsData.io 覆盖最广（87,000+源，89语言）但付费$199/月
- Finnhub 同时提供股票行情和金融新闻，免费层最慷慨（60次/分钟）
- IEX Cloud 已于2024年8月关闭，不可用

### AI/NLP
- FinBERT在金融情感分析上超越GPT-4o和Claude的零样本表现
- 零样本BART分类约85%准确率，微调后可达92%
- 情感分数 >= +0.5 与股价上涨相关，<= -0.5 与下跌相关
- 混合模型（FinBERT + LSTM/GRU + 技术指标）是当前SOTA

### 实时通信
- SSE适合服务端单向推送（新闻流、行情、告警）
- WebSocket适合双向交互（自选股订阅）
- HTTP/2 SSE消除了连接数限制问题

## 资源链接

- FinBERT: https://huggingface.co/ProsusAI/finbert
- BART-MNLI: https://huggingface.co/facebook/bart-large-mnli
- TradingView Lightweight Charts: https://github.com/nicehash/Lightweight-Charts
- Currents API: https://currentsapi.services/
- Finnhub: https://finnhub.io/
- NewsData.io: https://newsdata.io/

## 2026-03-08 增量结论

### 执行状态校准
- `tasks.md` 当前不能单独作为真实进度来源，需结合 `progress.md` 与实际代码目录判断
- 项目已落地的范围明显超出“初始化阶段”，当前更接近“基础功能已可演示，进入增量迭代”

### SQLite 迁移兼容性
- Alembic 在 SQLite 下不支持对既有表执行 `create_unique_constraint` 这种 ALTER 约束操作
- 对于初始迁移，最稳妥的方案是在 `create_table(...)` 时直接内联声明唯一约束，并在 `downgrade()` 中直接 `drop_table(...)`
- 该调整已恢复后端完整测试通过，避免后续本地 SQLite 开发环境再次被迁移阻塞

### 前端筛选组件化
- `/analysis` 与 `/market` 的筛选头部存在明显重复，适合抽成共享组件
- 对分析型页面，参数持久化用 `URL query + localStorage` 的组合最轻量：
  - URL 负责可分享、可回放
  - `localStorage` 负责“回到页面时恢复上次筛选”
- 共享筛选面板已验证可行，不需要引入额外状态库

---

*Update this file after every 2 view/browser/search operations*

## 2026-03-08 - Stocks API 最小闭环

- `Stock` / `StockPrice` / `StockImpact` ORM 已存在，适合先补最小查询链路，而不是重做模型层
- 当前个股页此前依赖 `/api/v1/news` 在前端做二次聚合，存在重复计算和数据窗口不一致问题
- 新增 `stocks` 聚合接口后，个股页可直接消费统一的价格快照、影响汇总与相关新闻
- 测试层的 `scripts` 导入失败根因是从仓库根目录执行 pytest 时，`backend` 未稳定加入 `sys.path`
