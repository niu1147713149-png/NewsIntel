"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { apiPost } from "@/lib/api";
import type { PriceAlertItem } from "@/types/stocks";

export function NotificationReadButton({ alertId, label = "标记已读" }: { alertId: number; label?: string }): JSX.Element {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleClick(): Promise<void> {
    setIsSubmitting(true);
    try {
      await apiPost<PriceAlertItem[], Record<string, never>>(`/api/v1/alerts/notifications/${alertId}/read`, {});
      startTransition(() => router.refresh());
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button type="button" onClick={() => void handleClick()} disabled={isSubmitting || isPending} className="rounded-md border border-[#1E293B] px-3 py-2 text-sm text-[#CBD5E1] disabled:opacity-60">
      {isSubmitting || isPending ? "处理中..." : label}
    </button>
  );
}
