"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { apiDelete, apiPost } from "@/lib/api";
import type { WatchlistItem } from "@/types/stocks";

interface WatchlistToggleButtonProps {
  stockId: number;
  initialInWatchlist: boolean;
}

export function WatchlistToggleButton({ stockId, initialInWatchlist }: WatchlistToggleButtonProps): JSX.Element {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleToggle(): Promise<void> {
    setMessage(null);
    setIsSubmitting(true);
    try {
      if (initialInWatchlist) {
        await apiDelete<WatchlistItem[]>(`/api/v1/watchlist/${stockId}`);
        setMessage("已从自选股移除。");
      } else {
        await apiPost<WatchlistItem[], { stock_id: number }>("/api/v1/watchlist", { stock_id: stockId });
        setMessage("已加入自选股。");
      }
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage("操作失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          void handleToggle();
        }}
        disabled={isSubmitting || isPending}
        className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          initialInWatchlist
            ? "border border-[#1E293B] text-[#F8FAFC] hover:border-[#334155]"
            : "bg-[#14B8A6] text-white hover:bg-[#0F9F92]"
        }`}
      >
        {isSubmitting || isPending ? "提交中..." : initialInWatchlist ? "移出自选" : "加入自选"}
      </button>
      {message ? <p className="text-xs text-[#94A3B8]">{message}</p> : null}
    </div>
  );
}
