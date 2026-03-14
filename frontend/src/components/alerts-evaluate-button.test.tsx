import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AlertsEvaluateButton } from "@/components/alerts-evaluate-button";

const refreshMock = vi.fn();
const apiPostMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock
  })
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiPost: (...args: unknown[]) => apiPostMock(...args)
  };
});

describe("AlertsEvaluateButton", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    apiPostMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows notification shortcut when triggered alerts exist", async () => {
    apiPostMock.mockResolvedValue({
      data: [
        {
          alert_id: 1,
          stock_id: 1,
          ticker: "AAPL",
          stock_name: "Apple Inc.",
          operator: "above",
          threshold: 100,
          status: "triggered",
          is_active: false,
          triggered_at: "2026-03-12T10:00:00Z",
          triggered_price: 110,
          is_read: false,
          created_at: "2026-03-12T09:00:00Z",
          snapshot: {
            latest_close: 110,
            previous_close: 105,
            change: 5,
            change_percent: 4.76,
            last_updated_at: "2026-03-12T10:00:00Z"
          }
        }
      ]
    });

    render(<AlertsEvaluateButton />);

    fireEvent.click(screen.getByRole("button", { name: "立即评估告警" }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith("/api/v1/alerts/evaluate", {});
    });

    expect(screen.getByText("已完成评估，当前共有 1 条已触发通知。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "去通知中心查看未读通知" })).toHaveAttribute(
      "href",
      "/notifications?scope=unread"
    );
  });

  it("does not show notification shortcut when nothing triggered", async () => {
    apiPostMock.mockResolvedValue({
      data: [
        {
          alert_id: 1,
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
          created_at: "2026-03-12T09:00:00Z",
          snapshot: {
            latest_close: 110,
            previous_close: 105,
            change: 5,
            change_percent: 4.76,
            last_updated_at: "2026-03-12T10:00:00Z"
          }
        }
      ]
    });

    render(<AlertsEvaluateButton />);

    fireEvent.click(screen.getByRole("button", { name: "立即评估告警" }));

    await waitFor(() => {
      expect(screen.getByText("已完成评估，当前没有新触发的告警。")).toBeInTheDocument();
    });

    expect(screen.queryByRole("link", { name: "去通知中心查看未读通知" })).not.toBeInTheDocument();
  });

  it("shows an error message when evaluation fails", async () => {
    apiPostMock.mockRejectedValue(new Error("boom"));

    render(<AlertsEvaluateButton />);

    fireEvent.click(screen.getByRole("button", { name: "立即评估告警" }));

    await waitFor(() => {
      expect(screen.getByText("立即评估失败，请稍后重试。")).toBeInTheDocument();
    });

    expect(screen.queryByRole("link", { name: "去通知中心查看未读通知" })).not.toBeInTheDocument();
  });
});
