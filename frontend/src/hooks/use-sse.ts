"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RealtimeConnectionStatus = "idle" | "connecting" | "open" | "error" | "closed";

interface UseSSEOptions {
  url?: string;
  autoConnect?: boolean;
  eventNames?: string[];
}

interface UseSSEResult {
  status: RealtimeConnectionStatus;
  lastMessage: string | null;
  lastMessageAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  connect: () => void;
  disconnect: () => void;
}

export function useSSE({ url, autoConnect = false, eventNames = [] }: UseSSEOptions): UseSSEResult {
  const sourceRef = useRef<EventSource | null>(null);
  const [status, setStatus] = useState<RealtimeConnectionStatus>(url ? "idle" : "closed");
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const disconnect = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setStatus(url ? "closed" : "closed");
  }, [url]);

  const connect = useCallback(() => {
    if (!url || typeof window === "undefined" || typeof window.EventSource === "undefined") {
      setStatus("closed");
      setErrorMessage(url ? "当前环境不支持 EventSource。" : "SSE endpoint 未配置。");
      return;
    }

    sourceRef.current?.close();
    setStatus("connecting");
    setErrorMessage(null);

    const source = new window.EventSource(url, { withCredentials: true });
    sourceRef.current = source;

    const handleMessage = (event: MessageEvent<string>) => {
      setLastMessage(event.data);
      setLastMessageAt(new Date().toISOString());
    };

    source.onopen = () => {
      setStatus("open");
      setErrorMessage(null);
    };

    source.onmessage = handleMessage;
    for (const eventName of eventNames) {
      source.addEventListener(eventName, handleMessage as EventListener);
    }

    source.onerror = () => {
      setStatus("error");
      setRetryCount((current) => current + 1);
      setErrorMessage("SSE 连接失败或已中断。可稍后重试。");
      source.close();
      sourceRef.current = null;
    };
  }, [eventNames, url]);

  useEffect(() => {
    if (autoConnect && url) {
      connect();
    }

    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [autoConnect, connect, url]);

  return {
    status,
    lastMessage,
    lastMessageAt,
    errorMessage,
    retryCount,
    connect,
    disconnect
  };
}
