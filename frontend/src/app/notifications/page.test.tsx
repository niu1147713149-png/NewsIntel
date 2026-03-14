import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NotificationsPage from "@/app/notifications/page";
import { ApiRequestError } from "@/lib/api";

const apiGetMock = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiGet: (...args: unknown[]) => apiGetMock(...args)
  };
});

vi.mock("@/components/notification-groups", () => ({
  NotificationGroups: ({ groups }: { groups: Array<{ ticker: string }> }) => <div>Groups {groups.map((group) => group.ticker).join(",")}</div>
}));

vi.mock("@/components/notifications-read-all-button", () => ({
  NotificationsReadAllButton: () => <button>Read All</button>
}));

vi.mock("@/components/notifications-read-filtered-button", () => ({
  NotificationsReadFilteredButton: () => <button>Read Filtered</button>
}));

vi.mock("@/components/stock-sync-status-panel", () => ({
  StockSyncStatusPanel: ({ title }: { title?: string } = {}) => <div>{title ?? "sync-panel"}</div>
}));

describe("NotificationsPage", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it("renders notification summary with latest snapshot metadata", async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          alert_id: 1,
          stock_id: 2,
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
            last_updated_at: "2026-03-09T09:59:00Z"
          }
        }
      ]
    });

    const html = renderToStaticMarkup(
      await NotificationsPage({
        searchParams: Promise.resolve({ scope: "unread", ticker: "NVDA", sort: "newest" })
      })
    );

    expect(html).toContain("通知依赖的行情状态");
    expect(html).toContain("最新行情快照");
    expect(html).toContain("Groups NVDA");
    expect(html).toContain("Read All");
    expect(html).toContain("返回告警页");
    expect(html).toContain("继续评估告警");
  });

  it("renders login required state when notifications API is unauthorized", async () => {
    apiGetMock.mockRejectedValue(new ApiRequestError(401, "unauthorized"));

    const html = renderToStaticMarkup(
      await NotificationsPage({
        searchParams: Promise.resolve({})
      })
    );

    expect(html).toContain("登录后查看通知中心");
    expect(html).not.toContain("通知依赖的行情状态");
  });
});
