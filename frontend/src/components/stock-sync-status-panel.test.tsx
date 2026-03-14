import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StockSyncStatusPanel } from "@/components/stock-sync-status-panel";

const apiGetMock = vi.fn();

vi.mock("@/lib/api", () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args)
}));

vi.mock("@/components/manual-stock-sync-button", () => ({
  ManualStockSyncButton: () => <div>Manual Sync Button</div>
}));

describe("StockSyncStatusPanel", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it("renders sync status data from the API", async () => {
    apiGetMock.mockResolvedValue({
      data: {
        enabled: true,
        running: false,
        provider_name: "Finnhub",
        last_started_at: "2026-03-09T10:00:00Z",
        last_finished_at: "2026-03-09T10:01:00Z",
        last_succeeded_at: "2026-03-09T10:01:00Z",
        last_error: null,
        tickers_requested: 4,
        tickers_succeeded: 4,
        tickers_failed: 0,
        price_points_fetched: 120,
        inserted: 10,
        updated: 110,
        updated_at: "2026-03-09T10:01:00Z"
      }
    });

    const element = await StockSyncStatusPanel({ title: "行情同步状态" });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("行情同步状态");
    expect(html).toContain("Finnhub");
    expect(html).toContain("4 / 0");
    expect(html).toContain("10 / 110");
    expect(html).toContain("Manual Sync Button");
  });

  it("renders fallback error copy when the status API fails", async () => {
    apiGetMock.mockRejectedValue(new Error("boom"));

    const element = await StockSyncStatusPanel({ title: "行情刷新状态", compact: true, showManualTrigger: false });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("行情刷新状态");
    expect(html).toContain("Provider:");
    expect(html).toContain("暂不可用");
    expect(html).not.toContain("Manual Sync Button");
  });
});
