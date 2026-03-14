"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { apiPost } from "@/lib/api";
import type { PriceAlertItem } from "@/types/stocks";

interface PriceAlertFormProps {
  stockId: number;
  ticker: string;
}

export function PriceAlertForm({ stockId, ticker }: PriceAlertFormProps): JSX.Element {
  const router = useRouter();
  const [operator, setOperator] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);
    try {
      await apiPost<PriceAlertItem[], { stock_id: number; operator: "above" | "below"; threshold: number }>(
        "/api/v1/alerts",
        { stock_id: stockId, operator, threshold: Number(threshold) }
      );
      setMessage(`已为 ${ticker} 创建价格告警。`);
      setThreshold("");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setMessage("创建告警失败，请检查阈值后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="content-panel space-y-4 p-5 text-slate-700">
      <div>
        <p className="eyebrow-label">Alert builder</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-950">创建价格告警</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          为 <span className="font-semibold text-slate-950">{ticker}</span> 设置阈值，价格越过条件后会自动生成通知。
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-slate-600">
          <span>条件</span>
          <select
            value={operator}
            onChange={(event) => setOperator(event.target.value as "above" | "below")}
            className="input-surface h-10 w-full rounded-xl px-3 text-sm"
          >
            <option value="above">价格高于</option>
            <option value="below">价格低于</option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-slate-600">
          <span>阈值</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            placeholder="例如 100.00"
            className="input-surface h-10 w-full rounded-xl px-3 text-sm"
            required
          />
        </label>
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 text-xs leading-6 text-slate-600">
        当前支持基础条件：价格高于或低于指定阈值。后续可继续扩展到区间、波动率或新闻事件联动告警。
      </div>
      <button
        type="submit"
        disabled={isSubmitting || isPending}
        className="button-primary inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting || isPending ? "创建中..." : "创建价格告警"}
      </button>
      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
    </form>
  );
}
