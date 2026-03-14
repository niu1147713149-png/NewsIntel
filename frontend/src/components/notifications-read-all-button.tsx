"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { apiPost } from "@/lib/api";
import type { PriceAlertItem } from "@/types/stocks";

export function NotificationsReadAllButton(): JSX.Element {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleClick(): Promise<void> {
    setIsSubmitting(true);
    try {
      await apiPost<PriceAlertItem[], Record<string, never>>("/api/v1/alerts/notifications/read-all", {});
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
      className="rounded-md bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    >
      {isSubmitting || isPending ? "处理中..." : "全部标为已读"}
    </button>
  );
}
