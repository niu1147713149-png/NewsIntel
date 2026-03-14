import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WatchlistLiveBoard } from "@/components/watchlist-live-board";
import type { WatchlistItem } from "@/types/stocks";

const useWebSocketMock = vi.fn();

vi.mock("@/hooks/use-websocket", () => ({
  useWebSocket: (...args: unknown[]) => useWebSocketMock(...args)
}));

const items: WatchlistItem[] = [
  {
    stock_id: 1,
    ticker: "AAPL",
    name: "Apple Inc.",
    exchange: "NASDAQ",
    sector: "Technology",
    industry: "Consumer Electronics",
    country: "US",
    market_cap: 1000,
    added_at: "2026-03-12T09:00:00Z",
    snapshot: {
      latest_close: 210.12,
      previous_close: 208.01,
      change: 2.11,
      change_percent: 1.01,
      last_updated_at: "2026-03-12T10:00:00Z"
    }
  }
];

describe("WatchlistLiveBoard", () => {
  beforeEach(() => {
    useWebSocketMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders static values while websocket is connecting", () => {
    useWebSocketMock.mockReturnValue({
      status: "connecting",
      lastMessage: null,
      lastMessageAt: null,
      errorMessage: null,
      retryCount: 0,
      connect: vi.fn(),
      disconnect: vi.fn()
    });

    render(<WatchlistLiveBoard endpoint="ws://localhost:8000/api/v1/ws/prices?stock_ids=1" items={items} />);

    expect(screen.getByText("实时价格连接中")).toBeInTheDocument();
    expect(screen.getByText("STATIC")).toBeInTheDocument();
    expect(screen.getByText("210.12")).toBeInTheDocument();
  });

  it("renders live snapshot values after websocket data arrives", () => {
    useWebSocketMock.mockReturnValue({
      status: "open",
      lastMessage: JSON.stringify({
        event: "price-snapshot",
        items: [
          {
            id: 1,
            ticker: "AAPL",
            snapshot: {
              latest_close: 212.5,
              previous_close: 208.01,
              change: 4.49,
              change_percent: 2.16,
              last_updated_at: "2026-03-12T11:00:00Z"
            }
          }
        ]
      }),
      lastMessageAt: "2026-03-12T11:00:00Z",
      errorMessage: null,
      retryCount: 0,
      connect: vi.fn(),
      disconnect: vi.fn()
    });

    render(<WatchlistLiveBoard endpoint="ws://localhost:8000/api/v1/ws/prices?stock_ids=1" items={items} />);

    expect(screen.getByText("实时价格已连接")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
    expect(screen.getByText("212.50")).toBeInTheDocument();
  });

  it("renders live update tick badges on incremental updates", () => {
    useWebSocketMock.mockReturnValue({
      status: "open",
      lastMessage: JSON.stringify({
        event: "price-update",
        tick: 3,
        items: [
          {
            id: 1,
            ticker: "AAPL",
            snapshot: {
              latest_close: 213.01,
              previous_close: 208.01,
              change: 0.21,
              change_percent: 0.1,
              last_updated_at: "2026-03-12T11:05:00Z"
            }
          }
        ]
      }),
      lastMessageAt: "2026-03-12T11:05:00Z",
      errorMessage: null,
      retryCount: 0,
      connect: vi.fn(),
      disconnect: vi.fn()
    });

    render(<WatchlistLiveBoard endpoint="ws://localhost:8000/api/v1/ws/prices?stock_ids=1" items={items} />);

    expect(screen.getByText("LIVE · #3")).toBeInTheDocument();
    expect(screen.getByText("213.01")).toBeInTheDocument();
    expect(screen.getByText("+0.10%")).toBeInTheDocument();
  });
});
