import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WatchlistPage from "@/app/watchlist/page";
import { ApiRequestError } from "@/lib/api";

const apiGetMock = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiGet: (...args: unknown[]) => apiGetMock(...args)
  };
});

vi.mock("@/components/watchlist-toggle-button", () => ({
  WatchlistToggleButton: ({ stockId }: { stockId: number }) => <div>Toggle {stockId}</div>
}));

vi.mock("@/components/stock-sync-status-panel", () => ({
  StockSyncStatusPanel: ({ title }: { title?: string } = {}) => <div>{title ?? "sync-panel"}</div>
}));

vi.mock("@/components/realtime-connection-panel", () => ({
  RealtimeConnectionPanel: ({ title }: { title: string }) => <div>{title}</div>
}));

vi.mock("@/components/live-news-feed", () => ({
  LiveNewsFeed: () => <div>Live News Feed</div>
}));

vi.mock("@/components/watchlist-live-board", () => ({
  WatchlistLiveBoard: () => <div>Watchlist Live Board</div>
}));

describe("WatchlistPage", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it("renders watchlist cards and the shared sync panel for authenticated users", async () => {
    apiGetMock.mockImplementation((path: string) => {
      if (path === "/api/v1/watchlist") {
        return Promise.resolve({
          data: [
            {
              stock_id: 1,
              ticker: "AAPL",
              name: "Apple Inc.",
              exchange: "NASDAQ",
              sector: "Technology",
              industry: "Consumer Electronics",
              country: "US",
              market_cap: 1000,
              added_at: "2026-03-09T09:00:00Z",
              snapshot: {
                latest_close: 210.12,
                previous_close: 208.01,
                change: 2.11,
                change_percent: 1.01,
                last_updated_at: new Date().toISOString()
              }
            }
          ]
        });
      }

      if (path === "/api/v1/news") {
        return Promise.resolve({
          data: [
            {
              id: 101,
              title: "Live fallback headline",
              description: "Live fallback summary",
              url: "https://example.com/news/101",
              source_name: "Reuters",
              published_at: "2026-03-12T10:00:00Z",
              language: "en",
              categories: [],
              sentiment: null,
              impacts: []
            }
          ]
        });
      }

      return Promise.reject(new Error(`unexpected path ${path}`));
    });

    const html = renderToStaticMarkup(await WatchlistPage());

    expect(html).toContain("AAPL");
    expect(html).toContain("观察列表行情状态");
    expect(html).toContain("价格较新");
    expect(html).toContain("Toggle 1");
    expect(html).toContain("自选股价格订阅");
    expect(html).toContain("Live News Feed");
    expect(html).toContain("Watchlist Live Board");
  });

  it("renders login required state when the API returns 401", async () => {
    apiGetMock.mockRejectedValue(new ApiRequestError(401, "unauthorized"));

    const html = renderToStaticMarkup(await WatchlistPage());

    expect(html).toContain("登录后查看自选股");
    expect(html).not.toContain("观察列表行情状态");
    expect(html).not.toContain("自选股价格订阅");
    expect(html).not.toContain("Watchlist Live Board");
  });
});
