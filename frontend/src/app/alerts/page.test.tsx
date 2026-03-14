import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AlertsPage from "@/app/alerts/page";
import { ApiRequestError } from "@/lib/api";

const apiGetMock = vi.fn();

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiGet: (...args: unknown[]) => apiGetMock(...args)
  };
});

vi.mock("@/components/alert-delete-button", () => ({
  AlertDeleteButton: ({ alertId }: { alertId: number }) => <div>Delete {alertId}</div>
}));

vi.mock("@/components/alerts-evaluate-button", () => ({
  AlertsEvaluateButton: () => <div>Evaluate Alerts Button</div>
}));

vi.mock("@/components/stock-sync-status-panel", () => ({
  StockSyncStatusPanel: ({ title }: { title?: string } = {}) => <div>{title ?? "sync-panel"}</div>
}));

describe("AlertsPage", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it("renders alert cards and sync state for authenticated users", async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          alert_id: 5,
          stock_id: 1,
          ticker: "AAPL",
          stock_name: "Apple Inc.",
          operator: "above",
          threshold: 200,
          status: "active",
          is_active: true,
          triggered_at: null,
          triggered_price: null,
          is_read: false,
          created_at: "2026-03-09T09:00:00Z",
          snapshot: {
            latest_close: 210.12,
            previous_close: 205,
            change: 5.12,
            change_percent: 2.49,
            last_updated_at: "2026-03-09T10:00:00Z"
          }
        }
      ]
    });

    const html = renderToStaticMarkup(await AlertsPage());

    expect(html).toContain("AAPL");
    expect(html).toContain("告警依赖的行情状态");
    expect(html).toContain("Delete 5");
    expect(html).toContain("Evaluate Alerts Button");
  });

  it("renders login required state when alerts API is unauthorized", async () => {
    apiGetMock.mockRejectedValue(new ApiRequestError(401, "unauthorized"));

    const html = renderToStaticMarkup(await AlertsPage());

    expect(html).toContain("登录后查看价格告警");
    expect(html).toContain("告警依赖的行情状态");
    expect(html).not.toContain("Evaluate Alerts Button");
  });

  it("renders empty state when there are no alerts", async () => {
    apiGetMock.mockResolvedValue({
      data: []
    });

    const html = renderToStaticMarkup(await AlertsPage());

    expect(html).toContain("暂无价格告警");
    expect(html).toContain("/stocks");
  });
});
