/**
 * Server-Sent Events hook with auto-reconnect
 * Drop into any component for live data streaming.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface SSEMessage {
  type: string;
  [key: string]: unknown;
}

export interface UseSSEOptions {
  onMessage?: (msg: SSEMessage) => void;
  onConnect?: () => void;
  onError?: (err: Event) => void;
}

export function useSSE(endpoint: string, options: UseSSEOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEMessage | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) return;
    const url = `${import.meta.env.VITE_API_BASE_URL || ''}${endpoint}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      options.onConnect?.();
    };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as SSEMessage;
        setLastEvent(data);
        options.onMessage?.(data);
      } catch {
        // heartbeat or comment line — ignore
      }
    };

    es.onerror = (err) => {
      setConnected(false);
      options.onError?.(err);
      es.close();
      esRef.current = null;
      timerRef.current = setTimeout(connect, 3000);
    };
  }, [endpoint, options]);

  useEffect(() => {
    connect();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    };
  }, [connect]);

  return { connected, lastEvent };
}
