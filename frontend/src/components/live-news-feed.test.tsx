import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LiveNewsFeed } from "@/components/live-news-feed";
import type { Article } from "@/types/news";

const useSSEMock = vi.fn();

vi.mock("@/hooks/use-sse", () => ({
  useSSE: (...args: unknown[]) => useSSEMock(...args)
}));

const initialArticles: Article[] = [
  {
    id: 1,
    title: "Initial headline",
    description: "Initial summary",
    url: "https://example.com/news/1",
    source_name: "Reuters",
    published_at: "2026-03-12T10:00:00Z",
    language: "en",
    categories: [],
    sentiment: null,
    impacts: []
  }
];

describe("LiveNewsFeed", () => {
  beforeEach(() => {
    useSSEMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders initial articles while waiting for the realtime stream", () => {
    useSSEMock.mockReturnValue({
      status: "connecting",
      lastMessage: null,
      lastMessageAt: null,
      errorMessage: null,
      retryCount: 0,
      connect: vi.fn(),
      disconnect: vi.fn()
    });

    render(<LiveNewsFeed endpoint="http://localhost:8000/api/v1/stream/news" initialArticles={initialArticles} />);

    expect(screen.getByText("实时流连接中")).toBeInTheDocument();
    expect(screen.getByText("Initial headline")).toBeInTheDocument();
    expect(screen.getByText("Initial summary")).toBeInTheDocument();
  });

  it("replaces the list when a news snapshot arrives", () => {
    useSSEMock.mockReturnValue({
      status: "open",
      lastMessage: JSON.stringify({
        items: [
          {
            id: 2,
            title: "Snapshot headline",
            description: "Snapshot summary",
            url: "https://example.com/news/2",
            source_name: "BBC",
            published_at: "2026-03-12T11:00:00Z",
            language: "en",
            categories: [],
            sentiment: null,
            impacts: []
          }
        ],
        count: 1
      }),
      lastMessageAt: "2026-03-12T11:00:00Z",
      errorMessage: null,
      retryCount: 0,
      connect: vi.fn(),
      disconnect: vi.fn()
    });

    render(<LiveNewsFeed endpoint="http://localhost:8000/api/v1/stream/news" initialArticles={initialArticles} />);

    expect(screen.getByText("实时流已连接")).toBeInTheDocument();
    expect(screen.getByText("Snapshot headline")).toBeInTheDocument();
    expect(screen.queryByText("Initial headline")).not.toBeInTheDocument();
  });

  it("merges incremental update payloads and shows degraded status on error", () => {
    useSSEMock.mockReturnValue({
      status: "error",
      lastMessage: JSON.stringify({
        items: [
          {
            id: 3,
            title: "Live update headline · update 2",
            description: null,
            url: "https://example.com/news/3",
            source_name: "AP",
            published_at: "2026-03-12T12:00:00Z",
            language: "en",
            categories: [],
            sentiment: null,
            impacts: []
          }
        ],
        count: 1,
        tick: 2
      }),
      lastMessageAt: "2026-03-12T12:00:00Z",
      errorMessage: "stream interrupted",
      retryCount: 1,
      connect: vi.fn(),
      disconnect: vi.fn()
    });

    render(<LiveNewsFeed endpoint="http://localhost:8000/api/v1/stream/news" initialArticles={initialArticles} />);

    expect(screen.getByText("实时流暂时中断")).toBeInTheDocument();
    expect(screen.getByText("Initial headline")).toBeInTheDocument();
    expect(screen.getByText("Live update headline · update 2")).toBeInTheDocument();
    expect(screen.getByText("暂无摘要")).toBeInTheDocument();
  });

  it("deduplicates incremental updates by article id", () => {
    useSSEMock.mockReturnValue({
      status: "open",
      lastMessage: JSON.stringify({
        items: [
          {
            id: 1,
            title: "Initial headline",
            description: "Initial summary",
            url: "https://example.com/news/1",
            source_name: "Reuters",
            published_at: "2026-03-12T10:00:00Z",
            language: "en",
            categories: [],
            sentiment: null,
            impacts: []
          }
        ],
        count: 1,
        tick: 3
      }),
      lastMessageAt: "2026-03-12T12:10:00Z",
      errorMessage: null,
      retryCount: 0,
      connect: vi.fn(),
      disconnect: vi.fn()
    });

    render(<LiveNewsFeed endpoint="http://localhost:8000/api/v1/stream/news" initialArticles={initialArticles} />);

    expect(screen.getAllByText("Initial headline")).toHaveLength(1);
  });
});
