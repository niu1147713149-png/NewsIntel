import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationGroups } from "@/components/notification-groups";

vi.mock("@/components/notifications-read-ticker-button", () => ({
  NotificationsReadTickerButton: ({ ticker }: { ticker: string }) => <button>Read {ticker}</button>
}));

vi.mock("@/components/notification-read-button", () => ({
  NotificationReadButton: ({ alertId }: { alertId: number }) => <button>Mark {alertId}</button>
}));

afterEach(() => {
  cleanup();
});

describe("NotificationGroups", () => {
  it("renders expanded unread groups by default and can collapse them", () => {
    render(
      <NotificationGroups
        scope="all"
        sort="newest"
        groups={[
          {
            ticker: "NVDA",
            stockName: "NVIDIA",
            totalCount: 2,
            unreadCount: 1,
            latestTriggeredAt: "2026-03-09T10:00:00Z",
            latestItem: {
              alert_id: 1,
              stock_id: 9,
              ticker: "NVDA",
              stock_name: "NVIDIA",
              operator: "above",
              threshold: 900,
              status: "triggered",
              is_active: false,
              triggered_at: "2026-03-09T10:00:00Z",
              triggered_price: 905,
              is_read: false,
              created_at: "2026-03-09T09:00:00Z",
              snapshot: {
                latest_close: 905,
                previous_close: 880,
                change: 25,
                change_percent: 2.84,
                last_updated_at: new Date().toISOString()
              }
            },
            items: [
              {
                alert_id: 1,
                stock_id: 9,
                ticker: "NVDA",
                stock_name: "NVIDIA",
                operator: "above",
                threshold: 900,
                status: "triggered",
                is_active: false,
                triggered_at: "2026-03-09T10:00:00Z",
                triggered_price: 905,
                is_read: false,
                created_at: "2026-03-09T09:00:00Z",
                snapshot: {
                  latest_close: 905,
                  previous_close: 880,
                  change: 25,
                  change_percent: 2.84,
                  last_updated_at: new Date().toISOString()
                }
              }
            ]
          }
        ]}
      />
    );

    expect(screen.getByText("Read NVDA")).toBeInTheDocument();
    expect(screen.getByText("Mark 1")).toBeInTheDocument();
    expect(screen.getByText(/快照较新|建议刷新关注|快照偏旧|暂无价格快照/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("收起分组").closest("button") as HTMLButtonElement);

    expect(screen.queryByText("Mark 1")).not.toBeInTheDocument();
    expect(screen.getByText("展开分组")).toBeInTheDocument();
  });

  it("keeps read-only groups collapsed when not first and without unread items", () => {
    render(
      <NotificationGroups
        scope="all"
        sort="newest"
        groups={[
          {
            ticker: "AAPL",
            stockName: "Apple",
            totalCount: 1,
            unreadCount: 0,
            latestTriggeredAt: "2026-03-09T10:00:00Z",
            latestItem: null,
            items: []
          },
          {
            ticker: "MSFT",
            stockName: "Microsoft",
            totalCount: 1,
            unreadCount: 0,
            latestTriggeredAt: "2026-03-09T10:00:00Z",
            latestItem: null,
            items: [
              {
                alert_id: 2,
                stock_id: 3,
                ticker: "MSFT",
                stock_name: "Microsoft",
                operator: "below",
                threshold: 300,
                status: "triggered",
                is_active: false,
                triggered_at: "2026-03-09T10:00:00Z",
                triggered_price: 299,
                is_read: true,
                created_at: "2026-03-09T09:00:00Z",
                snapshot: {
                  latest_close: 299,
                  previous_close: 305,
                  change: -6,
                  change_percent: -1.96,
                  last_updated_at: null
                }
              }
            ]
          }
        ]}
      />
    );

    expect(screen.queryByText("Mark 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Read MSFT")).not.toBeInTheDocument();
  });
});
