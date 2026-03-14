"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { apiPost } from "@/lib/api";
import type { PriceAlertItem } from "@/types/stocks";

export function AlertsEvaluateButton(): JSX.Element {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [triggeredCount, setTriggeredCount] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleEvaluate(): Promise<void> {
    setMessage(null);
    setTriggeredCount(null);
    setIsSubmitting(true);

    try {
      const response = await apiPost<PriceAlertItem[], Record<string, never>>("/api/v1/alerts/evaluate", {});
      const nextTriggeredCount = response.data.filter((alert) => !alert.is_active).length;
      setTriggeredCount(nextTriggeredCount);
      setMessage(
        nextTriggeredCount > 0
          ? `已完成评估，当前共有 ${nextTriggeredCount} 条已触发通知。`
          : "已完成评估，当前没有新触发的告警。"
      );
      startTransition(() => router.refresh());
    } catch {
      setMessage("立即评估失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleEvaluate()}
        disabled={isSubmitting || isPending}
        className="button-secondary inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting || isPending ? "评估中..." : "立即评估告警"}
      </button>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
      {triggeredCount && triggeredCount > 0 ? (
        <Link href="/notifications?scope=unread" className="inline-flex text-xs font-medium text-sky-600 transition-colors hover:text-sky-700">
          去通知中心查看未读通知
        </Link>
      ) : null}
    </div>
  );
}
