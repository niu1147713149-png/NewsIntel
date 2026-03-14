"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { apiPost } from "@/lib/api";
import type { PriceAlertItem } from "@/types/stocks";

interface NotificationsReadFilteredButtonProps {
  scope: "all" | "unread";
  sort: "newest" | "oldest";
  ticker?: string;
}

export function NotificationsReadFilteredButton({
  scope,
  sort,
  ticker
}: NotificationsReadFilteredButtonProps): JSX.Element {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleClick(): Promise<void> {
    const params = new URLSearchParams({ scope, sort });
    if (ticker?.trim()) {
      params.set("ticker", ticker.trim().toUpperCase());
    }

    setIsSubmitting(true);
    try {
      await apiPost<PriceAlertItem[], Record<string, never>>(
        `/api/v1/alerts/notifications/read-filtered?${params.toString()}`,
        {}
      );
      startTransition(() => router.refresh());
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={isSubmitting || isPending}
      className="rounded-md border border-[#1E293B] px-4 py-2 text-sm text-[#CBD5E1] disabled:opacity-60 hover:border-[#334155]"
    >
      {isSubmitting || isPending ? "处理中..." : "当前筛选已读"}
    </button>
  );
}
