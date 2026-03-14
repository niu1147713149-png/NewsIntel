# 项目技术规格书 (Technical Specification)

> **项目名称**: NewsIntel (新闻智研)
> **版本**: 1.0.0
> **日期**: 2026-03-05
> **基于**: CLAUDE.md & task_plan.md

## 1. 系统架构 (System Architecture)

### 1.1 总体架构
系统采用微服务架构，分为数据采集层、消息队列层、AI处理层、数据存储层、API服务层和前端展示层。

- **前端**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **后端**: FastAPI (Python 3.12+)
- **数据库**: PostgreSQL 16 (业务数据) + TimescaleDB (时序数据)
- **缓存/消息队列**: Redis 7
- **搜索**: Elasticsearch 8
- **AI/NLP**: FinBERT (情感分析) + BART-large-MNLI (零样本分类) + Claude API (实体/摘要)

### 1.2 模块划分
| 模块 | 标识 | 职责 | 技术栈 |
|------|------|------|--------|
| **采集服务** | `news-ingestion` | 多源新闻采集、去重、清洗 | Python, Celery |
| **行情服务** | `stock-ingestion` | 股票行情数据抓取 | Python, Celery |
| **NLP流水线** | `nlp-pipeline` | 分类、情感分析、实体抽取 | PyTorch, Transformers |
| **影响引擎** | `impact-engine` | 股市影响评估、多因子打分 | Python, Pandas |
| **API网关** | `api-gateway` | REST API, SSE, WebSocket | FastAPI |
| **Web前端** | `frontend` | 用户界面、图表展示 | Next.js, React |

## 2. 数据模型 (Data Models)

### 2.1 核心实体 (ERD)
详细字段定义参见 `task_plan.md` 第 7.2 节。

- **Articles**: 新闻文章 (id, title, content, url_hash, sentiment, ...)
- **Categories**: 新闻分类 (geopolitics, elections, economy, ...)
- **Stocks**: 股票基础信息 (ticker, name, sector, ...)
- **StockPrices**: 股票价格时序数据 (time, ticker, open, high, low, close, volume)
- **StockImpacts**: 新闻对股票的影响评估 (article_id, ticker, impact_score, direction)
- **Users**: 用户信息 (id, email, settings)
- **Watchlists**: 用户自选股

### 2.2 接口定义 (API)
详细接口定义参见 `task_plan.md` 第 8 节。

- `GET /api/v1/news`: 新闻列表查询
- `GET /api/v1/news/{id}`: 新闻详情
- `GET /api/v1/analysis/impact`: 影响评估
- `GET /api/v1/stocks/{ticker}/price`: 实时行情
- `GET /api/v1/stream/news`: SSE 实时新闻流

## 3. 业务逻辑 (Business Logic)

### 3.1 新闻处理流程
1. **采集**: 轮询外部 API -> 获取 Raw Data
2. **去重**: URL MD5 + 标题 SimHash -> 过滤重复
3. **清洗**: 去除 HTML 标签，提取正文
4. **NLP**:
    - **分类**: BART-large-MNLI -> 6大类别 (置信度 > 0.3)
    - **情感**: FinBERT -> Positive/Negative/Neutral
    - **实体**: Claude API -> 提取关联 Ticker
5. **研判**: Impact Engine -> 综合 Sentiment + Category + Entity -> Impact Score
6. **存储**: 写入 DB & ES
7. **推送**: Redis Pub/Sub -> SSE -> 前端

### 3.2 股市影响评估算法
`Impact Score = w1*Sentiment + w2*CategoryWeight + w3*SourceCredibility + w4*TimeDecay`
- 范围: [-1.0, +1.0]
- 阈值: >+0.2 (Bullish), <-0.2 (Bearish), else (Neutral)

## 4. 追踪矩阵 (Traceability Matrix)

| 需求ID | 功能域 | 描述 | 涉及文件 (规划) |
|--------|--------|------|-----------------|
| REQ-001 | Ingestion | 多源新闻采集 | `backend/app/ingestion/news_crawler.py` |
| REQ-002 | Ingestion | 新闻去重 | `backend/app/utils/dedup.py` |
| REQ-003 | NLP | 新闻分类 (BART) | `backend/app/nlp/classifier.py` |
| REQ-004 | NLP | 情感分析 (FinBERT) | `backend/app/nlp/sentiment.py` |
| REQ-005 | Analysis | 股市影响评估 | `backend/app/nlp/impact.py` |
| REQ-006 | API | 新闻查询接口 | `backend/app/api/v1/news.py` |
| REQ-007 | API | 实时推送 (SSE) | `backend/app/api/v1/stream.py` |
| REQ-008 | Frontend | 新闻信息流页面 | `frontend/src/app/news/page.tsx` |
| REQ-009 | Frontend | 股市研判仪表盘 | `frontend/src/app/page.tsx` |
