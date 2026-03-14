"use client";

import { useMemo } from "react";

import { useSSE } from "@/hooks/use-sse";
import { useWebSocket } from "@/hooks/use-websocket";

interface RealtimeConnectionPanelProps {
  title: string;
  description: string;
  transport: "sse" | "websocket";
  endpoint?: string;
  autoConnect?: boolean;
}

const STATUS_META = {
  idle: { label: "待连接", className: "border-slate-300 bg-slate-100 text-slate-600" },
  connecting: { label: "连接中", className: "border-sky-200 bg-sky-50 text-sky-700" },
  open: { label: "已连接", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  error: { label: "连接失败", className: "border-rose-200 bg-rose-50 text-rose-700" },
  closed: { label: "未启用", className: "border-slate-300 bg-slate-100 text-slate-600" }
} as const;

function formatDateTime(value: string | null): string {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function getPayloadHint(payload: string | null): string {
  if (!payload) {
    return "等待第一帧消息...";
  }

  try {
    const parsed = JSON.parse(payload) as { event?: string; count?: number; tick?: number };
    if (parsed.event === "price-update") {
      return `已收到第 ${parsed.tick ?? "?"} 次增量更新 · ${parsed.count ?? 0} 条记录`;
    }
    if (parsed.event === "price-snapshot") {
      return `已收到价格快照 · ${parsed.count ?? 0} 条记录`;
    }
    if (parsed.event === "news-snapshot") {
      return `已收到新闻快照 · ${parsed.count ?? 0} 条记录`;
    }
    if (parsed.event === "news-update") {
      return `已收到第 ${parsed.tick ?? "?"} 次新闻更新 · ${parsed.count ?? 0} 条记录`;
    }
  } catch {
    return "已收到原始消息帧";
  }

  return "已收到消息帧";
}

export function RealtimeConnectionPanel({
  title,
  description,
  transport,
  endpoint,
  autoConnect = false
}: RealtimeConnectionPanelProps): JSX.Element {
  const sse = useSSE({ url: transport === "sse" ? endpoint : undefined, autoConnect });
  const websocket = useWebSocket({ url: transport === "websocket" ? endpoint : undefined, autoConnect });
  const state = transport === "sse" ? sse : websocket;
  const statusMeta = STATUS_META[state.status];
  const transportLabel = transport === "sse" ? "SSE" : "WebSocket";
  const messagePreview = useMemo(() => {
    if (!state.lastMessage) {
      return "--";
    }
    return state.lastMessage.length > 72 ? `${state.lastMessage.slice(0, 72)}...` : state.lastMessage;
  }, [state.lastMessage]);
  const payloadHint = useMemo(() => getPayloadHint(state.lastMessage), [state.lastMessage]);

  return (
    <article className="content-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow-label">{transportLabel}</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${statusMeta.className}`}>
          {statusMeta.label}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Endpoint</p>
          <p className="mt-2 break-all font-medium text-slate-800">{endpoint ?? "待后端接口接入"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Last update</p>
          <p className="mt-2 font-medium text-slate-800">{formatDateTime(state.lastMessageAt)}</p>
          <p className="mt-1 text-slate-500">重试 {state.retryCount} 次</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Latest payload</p>
        <p className="mt-2 text-slate-500">{payloadHint}</p>
        <p className="mt-2 break-words text-slate-700">{messagePreview}</p>
        {state.errorMessage ? <p className="mt-2 text-rose-600">{state.errorMessage}</p> : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={state.connect} className="button-primary rounded-xl px-4 py-2 text-sm font-medium">
          开始连接
        </button>
        <button type="button" onClick={state.disconnect} className="button-secondary rounded-xl px-4 py-2 text-sm font-medium">
          断开连接
        </button>
      </div>
    </article>
  );
}
