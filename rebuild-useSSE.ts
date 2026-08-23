import { useEffect, useRef, useState, useCallback } from 'react';
interface UseSSEOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectInterval?: number;
  maxRetries?: number;
}
interface UseSSEReturn {
  data: any | null;
  error: Error | null;
  isConnected: boolean;
  close: () => void;
}
export function useSSE(url: string, options: UseSSEOptions = {}): UseSSEReturn {
  const { onMessage, onError, onOpen, onClose, reconnectInterval = 3000, maxRetries = 5 } = options;
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const cleanupRef = useRef(false);
  const close = useCallback(() => {
    cleanupRef.current = true;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);
  const connect = useCallback(() => {
    if (cleanupRef.current) return;
    try {
      const es = new EventSource(url);
      es.addEventListener('open', () => {
        setIsConnected(true);
        setError(null);
        retriesRef.current = 0;
        onOpen?.();
      });
      es.addEventListener('message', (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setData(parsed);
          onMessage?.(parsed);
        } catch {
          setData(event.data);
          onMessage?.(event.data);
        }
      });
      es.addEventListener('error', (event) => {
        const err = new Error(`SSE error: ${event.type}`);
        setError(err);
        setIsConnected(false);
        onError?.(err);
        if (retriesRef.current < maxRetries) {
          retriesRef.current++;
          setTimeout(connect, reconnectInterval);
        } else {
          close();
        }
      });
      eventSourceRef.current = es;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    }
  }, [url, reconnectInterval, maxRetries, onMessage, onError, onOpen, close]);
  useEffect(() => {
    cleanupRef.current = false;
    connect();
    return () => {
      cleanupRef.current = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      onClose?.();
    };
  }, [connect, onClose]);
  return { data, error, isConnected, close };
}
export default useSSE;
