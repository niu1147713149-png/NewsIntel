import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StockAnalysisPage from "@/app/analysis/[stockId]/page";

const apiGetMock = vi.fn();
const fetchCurrentUserMock = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiGet: (...args: unknown[]) => apiGetMock(...args)
  };
});

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    fetchCurrentUser: () => fetchCurrentUserMock()
  };
});

vi.mock("@/components/watchlist-toggle-button", () => ({
  WatchlistToggleButton: ({ stockId }: { stockId: number }) => <div>Watchlist {stockId}</div>
}));

vi.mock("@/components/price-alert-form", () => ({
  PriceAlertForm: ({ stockId, ticker }: { stockId: number; ticker: string }) => <div>Alert Form {stockId} {ticker}</div>
}));

vi.mock("@/components/stock-price-line-chart", () => ({
  StockPriceLineChart: () => <div>Price Chart</div>
}));

vi.mock("@/components/stock-sync-status-panel", () => ({
  StockSyncStatusPanel: ({ title }: { title?: string } = {}) => <div>{title ?? "sync-panel"}</div>
}));

describe("StockAnalysisPage", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    fetchCurrentUserMock.mockReset();
  });

  it("renders stock analysis data, watchlist toggle, alert form and sync panel for authenticated users", async () => {
    fetchCurrentUserMock.mockResolvedValue({ id: 1, email: "user@example.com", username: "demo" });
    apiGetMock
      .mockResolvedValueOnce({
        data: {
          id: 1,
          ticker: "AAPL",
          name: "Apple Inc.",
          exchange: "NASDAQ",
          sector: "Technology",
          industry: "Consumer Electronics",
          country: "US",
          market_cap: 1000,
          snapshot: {
            latest_close: 210.12,
            previous_close: 209.1,
            change: 1.02,
            change_percent: 0.49,
            last_updated_at: "2026-03-09T10:00:00Z"
          },
          prices: [
            { time: "2026-03-09T00:00:00Z", open: 200, high: 211, low: 199, close: 210.12, volume: 1000 }
          ],
          impact_summary: {
            total_signals: 4,
            bullish_count: 3,
            bearish_count: 1,
            neutral_count: 0,
            average_impact_score: 0.6,
            weighted_impact_score: 0.8,
            average_confidence: 0.7,
            overall_direction: "bullish"
          },
          related_articles: [
            {
              article_id: 10,
              title: "Apple demand grows",
              published_at: "2026-03-09T09:00:00Z",
              source_name: "Reuters",
              direction: "bullish",
              impact_score: 0.7,
              confidence: 0.8
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        data: [{ stock_id: 1 }]
      });

    const html = renderToStaticMarkup(
      await StockAnalysisPage({
        params: Promise.resolve({ stockId: "1" })
      })
    );

    expect(html).toContain("AAPL");
    expect(html).toContain("Watchlist 1");
    expect(html).toContain("Alert Form 1 AAPL");
    expect(html).toContain("行情刷新状态");
    expect(html).toContain("Price Chart");
    expect(html).toContain("价格更新时间");
  });

  it("renders login-required card instead of alert form for anonymous users", async () => {
    fetchCurrentUserMock.mockResolvedValue(null);
    apiGetMock
      .mockResolvedValueOnce({
        data: {
          id: 2,
          ticker: "NVDA",
          name: "NVIDIA",
          exchange: "NASDAQ",
          sector: "Technology",
          industry: "Semiconductors",
          country: "US",
          market_cap: 1000,
          snapshot: {
            latest_close: 900,
            previous_close: 880,
            change: 20,
            change_percent: 2.2,
            last_updated_at: "2026-03-09T10:00:00Z"
          },
          prices: [],
          impact_summary: {
            total_signals: 0,
            bullish_count: 0,
            bearish_count: 0,
            neutral_count: 0,
            average_impact_score: 0,
            weighted_impact_score: 0,
            average_confidence: 0,
            overall_direction: "neutral"
          },
          related_articles: []
        }
      })
      .mockResolvedValueOnce({
        data: []
      });

    const html = renderToStaticMarkup(
      await StockAnalysisPage({
        params: Promise.resolve({ stockId: "2" })
      })
    );

    expect(html).toContain("登录后创建价格告警");
    expect(html).toContain("行情刷新状态");
    expect(html).not.toContain("Alert Form 2 NVDA");
  });
});
