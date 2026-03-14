# NewsIntel — MCP 角色提示词合集

> 为 NewsIntel 全球新闻研判平台的不同开发角色定制的 System Prompt

## 文件清单

| 文件 | 角色 | 核心职责 |
|------|------|---------|
| `01-uiux-designer.md` | UI/UX 设计师 | 设计系统、页面原型、组件规范、交互设计、色彩/字体/间距体系 |
| `02-frontend-developer.md` | 前端工程师 | Next.js 15 + TypeScript + shadcn/ui、实时数据流、图表渲染、类型系统 |
| `03-backend-developer.md` | 后端工程师 | FastAPI + SQLAlchemy + Celery、API设计、数据采集、SSE/WebSocket、数据库 |
| `04-ai-nlp-engineer.md` | AI/NLP 工程师 | FinBERT情感分析、BART分类、Claude实体抽取、影响评估引擎、模型优化 |
| `05-qa-test-engineer.md` | QA 测试工程师 | 测试策略、单元/集成/E2E测试、安全测试、性能测试、NLP准确率验证、测试报告 |

## 使用方式

### 方式一：Claude Code / CLI

将对应文件中 ` ``` ` 代码块内的内容复制到项目根目录的 `CLAUDE.md` 中作为指令。

### 方式二：Cursor / Windsurf

1. 打开 Settings → AI → System Prompt
2. 粘贴对应角色的 System Prompt 内容
3. 开始对话即可

### 方式三：Claude Web / API

在对话开始时，将 System Prompt 作为 `system` 消息传入。

### 方式四：多角色协作

在同一项目中可按需切换不同角色的 Prompt：
- 做设计时 → 用 01 UI/UX 设计师
- 写前端时 → 用 02 前端工程师
- 写后端时 → 用 03 后端工程师
- 做AI模型时 → 用 04 AI/NLP工程师
- 写测试/质量把关时 → 用 05 QA 测试工程师

## 各角色核心技术栈

```
UI/UX 设计师
├── Design System: Dark-first, 金融专业配色
├── Layout: Bento Grid, 12列栅格
├── Tools: Tailwind CSS, shadcn/ui, Framer Motion
└── Output: TSX + Tailwind 生产代码

前端工程师
├── Framework: Next.js 15 (App Router, RSC)
├── State: TanStack Query + Zustand
├── Charts: TradingView + Recharts
├── Real-time: SSE (EventSource) + WebSocket
└── Testing: Vitest + Playwright

后端工程师
├── Framework: FastAPI (async)
├── ORM: SQLAlchemy 2.0 (async) + Alembic
├── Queue: Celery + Redis
├── Database: PostgreSQL + TimescaleDB
├── Search: Elasticsearch 8
└── Testing: pytest + pytest-asyncio

AI/NLP 工程师
├── Classification: BART-large-MNLI (zero-shot)
├── Sentiment: FinBERT (ProsusAI/finbert)
├── Entity Extraction: Claude API
├── Impact Engine: 多因子评分模型
├── Optimization: ONNX, INT8 量化
└── Pipeline: Celery async task chain

QA 测试工程师
├── Strategy: Test Pyramid (60% unit, 30% integration, 10% E2E)
├── Frontend: Vitest + React Testing Library + Playwright
├── Backend: pytest + pytest-asyncio + httpx TestClient
├── Security: OWASP Top 10 automated tests
├── Performance: Response time + throughput benchmarks
├── NLP: Golden dataset accuracy validation
└── Output: Structured test reports + bug reports
```

## 每个 Prompt 包含什么

1. **角色身份** — 专业定位、技术专长、编码风格
2. **项目上下文** — NewsIntel 的完整技术背景
3. **目录结构** — 该角色负责的代码组织方式
4. **核心代码模式** — 带完整示例的编码规范
5. **类型定义** — 跨模块共享的数据类型
6. **编码规则** — 必须遵守的硬性约束
7. **MCP 服务器配置** — 推荐的工具链配置
8. **使用示例** — 典型的指令示例
