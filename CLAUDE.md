# CLAUDE.md — NewsIntel 全球新闻研判平台

> **项目代号**: NewsIntel (新闻智研)
> **阶段**: Phase 0 规划完成 → Phase 1 项目初始化待开始
> **最后更新**: 2026-03-05

---

## 项目简介

全球实时新闻检索与股市研判分析 Web 平台。自动采集新闻 → AI 分类/情感分析 → 股市影响预测 → 可视化仪表盘展示。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 15 (App Router, RSC) + TypeScript + Tailwind CSS + shadcn/ui |
| 图表 | TradingView Lightweight Charts (K线) + Recharts (数据图表) |
| 实时 | SSE (服务端推送) + WebSocket (双向交互) |
| 状态 | TanStack Query (服务端) + Zustand (客户端) |
| 后端 | FastAPI (Python 3.12+, async) |
| ORM | SQLAlchemy 2.0 (async) + Alembic (迁移) |
| 任务队列 | Celery + Redis (消息代理) |
| 数据库 | PostgreSQL 16 + TimescaleDB (时序数据) |
| 缓存 | Redis 7 |
| 搜索 | Elasticsearch 8 (全文检索) |
| AI/NLP | FinBERT (情感分析) + BART-large-MNLI (零样本分类) + Claude API (实体抽取/摘要) |
| 部署 | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| 监控 | Prometheus + Grafana |

## 目录结构 (目标)

```
newsIntel/
├── frontend/                # Next.js 15 前端
│   ├── app/                 # App Router 页面
│   ├── components/          # UI 组件
│   │   ├── ui/              # shadcn/ui 基础组件
│   │   ├── charts/          # 图表组件
│   │   ├── news/            # 新闻相关组件
│   │   └── layout/          # 布局组件
│   ├── lib/                 # 工具函数、API 客户端
│   ├── hooks/               # 自定义 hooks
│   ├── stores/              # Zustand stores
│   └── types/               # TypeScript 类型定义
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── api/v1/          # API 路由
│   │   ├── models/          # SQLAlchemy 模型
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # 业务逻辑
│   │   ├── tasks/           # Celery 异步任务
│   │   └── core/            # 配置、安全、依赖
│   ├── nlp/                 # AI/NLP 管道
│   │   ├── sentiment.py     # FinBERT 情感分析
│   │   ├── classifier.py    # BART 零样本分类
│   │   ├── extractor.py     # Claude API 实体抽取
│   │   └── impact.py        # 股市影响评估引擎
│   ├── crawlers/            # 新闻/行情数据采集
│   ├── alembic/             # 数据库迁移
│   └── tests/               # pytest 测试
├── docker-compose.yml
├── .env.example
└── CLAUDE.md
```

## 开发命令

```bash
# --- 前端 ---
cd frontend
npm install                        # 安装依赖
npm run dev                        # 开发服务器 (localhost:3000)
npm run build                      # 生产构建
npm run lint                       # ESLint 检查
npx vitest                         # 运行单元测试
npx vitest run path/to/test        # 运行单个测试
npx playwright test                # E2E 测试

# --- 后端 ---
cd backend
pip install -r requirements.txt    # 安装依赖
uvicorn app.main:app --reload      # 开发服务器 (localhost:8000)
pytest                             # 运行所有测试
pytest tests/test_xxx.py -v        # 运行单个测试
alembic upgrade head               # 应用数据库迁移
alembic revision --autogenerate -m "msg"  # 生成迁移

# --- Docker ---
docker-compose up -d               # 启动所有服务
docker-compose down                # 停止所有服务
docker-compose logs -f backend     # 查看后端日志
```

## 核心编码规范

### 通用规则
- 中文注释，英文代码（变量名、函数名、类名全英文）
- 所有新代码必须有类型标注（TypeScript strict / Python type hints）
- 每个模块写完后立即写对应测试
- 不要硬编码 API 密钥，统一走环境变量 (.env)
- 错误处理：后端统一返回 `{"success": bool, "data": ..., "error": ...}` 格式

### 前端规范
- 使用 App Router，优先 Server Components，需要交互时用 `"use client"`
- 组件命名 PascalCase，文件命名 kebab-case
- 用 shadcn/ui 作为基础组件，不要自己造轮子
- 实时数据用 `EventSource` (SSE)，自选股订阅用 WebSocket
- 图表组件封装在 `components/charts/` 下，统一暴露 props 接口
- 暗色模式优先设计（Dark-first）

### 后端规范
- 路由函数使用 `async def`，数据库操作用 `async session`
- Pydantic v2 做请求/响应验证
- 业务逻辑放 `services/`，路由只做参数校验和调用 service
- 长耗时操作（AI推理、数据采集）走 Celery 异步任务
- API 版本化：`/api/v1/...`

### AI/NLP 规范
- 模型推理统一封装在 `nlp/` 目录下
- 模型加载使用单例模式，避免重复加载
- 推理结果缓存到 Redis，TTL 根据新闻时效性设定
- FinBERT 输出: `{"label": "positive|negative|neutral", "score": float}`
- 影响评估输出: `{"impact": "bullish|bearish|neutral", "confidence": float, "affected_sectors": list}`

## 关键数据类型 (跨模块共享)

```typescript
// 前端 TypeScript
interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: "geopolitics" | "elections" | "economy" | "crime" | "bilateral" | "policy";
  sentiment: { label: "positive" | "negative" | "neutral"; score: number };
  impact: { direction: "bullish" | "bearish" | "neutral"; confidence: number; sectors: string[] };
  published_at: string;
  entities: { companies: string[]; people: string[]; regions: string[] };
}
```

```python
# 后端 Pydantic
class NewsArticleSchema(BaseModel):
    id: str
    title: str
    summary: str
    source: str
    category: Literal["geopolitics", "elections", "economy", "crime", "bilateral", "policy"]
    sentiment: SentimentResult
    impact: ImpactAssessment
    published_at: datetime
    entities: ExtractedEntities
```

## 外部 API 密钥 (环境变量)

```env
# .env.example
CURRENTS_API_KEY=           # 新闻源 (免费, 生产可用)
FINNHUB_API_KEY=            # 股票行情+新闻 (免费 60次/分钟)
ANTHROPIC_API_KEY=          # Claude API (实体抽取/摘要)
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/newsintel
REDIS_URL=redis://localhost:6379/0
ELASTICSEARCH_URL=http://localhost:9200
```

## 重要参考文件

| 文件 | 用途 |
|---|---|
| `task_plan.md` | 完整项目规划文档（架构、数据库设计、API设计、开发阶段） |
| `findings.md` | 技术调研结论（API对比、NLP方案、实时通信选型） |
| `progress.md` | 开发进度记录 |
| `mcp-prompts/` | 分角色详细提示词（设计师/前端/后端/AI/QA） |

## 开发阶段

| Phase | 内容 | 状态 |
|-------|------|------|
| 0 | 项目规划与技术调研 | ✅ 完成 |
| 1 | 项目初始化 (仓库、Docker、骨架代码) | ⬜ 待开始 |
| 2 | 后端核心 (数据库、API、数据采集) | ⬜ |
| 3 | AI/NLP 管道 (FinBERT、BART、Claude) | ⬜ |
| 4 | 前端仪表盘 (页面、组件、图表) | ⬜ |
| 5 | 实时通信 (SSE、WebSocket) | ⬜ |
| 6 | 测试、优化与部署 | ⬜ |

## AI 协作指引

1. **开始新 Phase 前**：先读 `task_plan.md` 对应章节和 `progress.md` 了解上下文
2. **写代码前**：先确认目录结构是否已创建，检查依赖是否安装
3. **遇到选择时**：参考 `findings.md` 中的技术选型决策，不要偏离已定方案
4. **完成任务后必须同步进度**：每次完成代码修改、脚手架搭建、测试修复或阶段性任务后，必须立即更新 `progress.md`，记录完成内容、变更文件、当前状态、下一步待办和已知风险；不要等待用户额外提醒
5. **切换角色时**：参考 `mcp-prompts/` 目录下对应角色的详细提示词
6. **写测试时**：参考 `mcp-prompts/05-qa-test-engineer.md` 的测试策略
7. **代码风格**：严格遵守上方"核心编码规范"，不要自行发明约定
