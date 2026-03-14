import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WatchlistToggleButton } from "@/components/watchlist-toggle-button";

const refreshMock = vi.fn();
const apiPostMock = vi.fn();
const apiDeleteMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock
  })
}));

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    apiPost: (...args: unknown[]) => apiPostMock(...args),
    apiDelete: (...args: unknown[]) => apiDeleteMock(...args)
  };
});

describe("WatchlistToggleButton", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    apiPostMock.mockReset();
    apiDeleteMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("adds stock to watchlist when initially absent", async () => {
    apiPostMock.mockResolvedValue({ data: [] });

    render(<WatchlistToggleButton stockId={7} initialInWatchlist={false} />);

    fireEvent.click(screen.getByRole("button", { name: "加入自选" }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith("/api/v1/watchlist", { stock_id: 7 });
    });
  });

  it("removes stock from watchlist when initially present", async () => {
    apiDeleteMock.mockResolvedValue({ data: [] });

    render(<WatchlistToggleButton stockId={8} initialInWatchlist />);

    fireEvent.click(screen.getByRole("button", { name: "移出自选" }));

    await waitFor(() => {
      expect(apiDeleteMock).toHaveBeenCalledWith("/api/v1/watchlist/8");
    });
  });
});
