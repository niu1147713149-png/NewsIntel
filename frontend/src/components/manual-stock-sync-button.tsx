"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function ManualStockSyncButton(): JSX.Element {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleClick(): Promise<void> {
    setMessage(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/stocks/sync`, {
        method: "POST",
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        if (response.status === 409) {
          setMessage("后台同步正在进行中，请稍后再试。");
          return;
        }
        setMessage("手动同步失败，请稍后重试。");
        return;
      }

      setMessage("已触发手动同步，页面状态即将刷新。");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage("手动同步失败，请检查后端服务是否可用。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          void handleClick();
        }}
        disabled={isPending || isSubmitting}
        className="inline-flex items-center rounded-md bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending || isSubmitting ? "同步提交中..." : "手动同步一次"}
      </button>
      {message ? <p className="text-xs text-[#94A3B8]">{message}</p> : null}
    </div>
  );
}
