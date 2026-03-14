"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RealtimeConnectionStatus } from "@/hooks/use-sse";

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
}

interface UseWebSocketResult {
  status: RealtimeConnectionStatus;
  lastMessage: string | null;
  lastMessageAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket({ url, autoConnect = false }: UseWebSocketOptions): UseWebSocketResult {
  const socketRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<RealtimeConnectionStatus>(url ? "idle" : "closed");
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    setStatus("closed");
  }, []);

  const connect = useCallback(() => {
    if (!url || typeof window === "undefined" || typeof window.WebSocket === "undefined") {
      setStatus("closed");
      setErrorMessage(url ? "当前环境不支持 WebSocket。" : "WebSocket endpoint 未配置。");
      return;
    }

    socketRef.current?.close();
    setStatus("connecting");
    setErrorMessage(null);

    const socket = new window.WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus("open");
      setErrorMessage(null);
    };

    socket.onmessage = (event) => {
      setLastMessage(typeof event.data === "string" ? event.data : "[binary message]");
      setLastMessageAt(new Date().toISOString());
    };

    socket.onerror = () => {
      setStatus("error");
      setRetryCount((current) => current + 1);
      setErrorMessage("WebSocket 连接失败。可在后端通道就绪后重试。");
    };

    socket.onclose = () => {
      setStatus((current) => (current === "error" ? current : "closed"));
      socketRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    if (autoConnect && url) {
      connect();
    }

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
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
