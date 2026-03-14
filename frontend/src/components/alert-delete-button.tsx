"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { apiDelete } from "@/lib/api";
import type { PriceAlertItem } from "@/types/stocks";

export function AlertDeleteButton({ alertId }: { alertId: number }): JSX.Element {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleDelete(): Promise<void> {
    setMessage(null);
    setIsSubmitting(true);
    try {
      await apiDelete<PriceAlertItem[]>(`/api/v1/alerts/${alertId}`);
      setMessage("已删除告警。");
      startTransition(() => router.refresh());
    } catch {
      setMessage("删除失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={isSubmitting || isPending}
        className="inline-flex items-center rounded-md border border-[#1E293B] px-3 py-2 text-sm text-[#CBD5E1] transition-colors hover:border-[#334155] hover:text-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting || isPending ? "处理中..." : "删除告警"}
      </button>
      {message ? <p className="text-xs text-[#94A3B8]">{message}</p> : null}
    </div>
  );
}
