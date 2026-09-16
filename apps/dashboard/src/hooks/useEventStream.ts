import { useEffect, useRef, useState } from 'react';

export interface StreamEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Hook for Server-Sent Events stream from backend
 * Automatically reconnects on disconnect
 */
export function useEventStream(onEvent?: (event: StreamEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;

      eventSource = new EventSource('/api/command-center/events/stream');

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StreamEvent;
          onEventRef.current?.(data);
        } catch (err) {
          console.error('Failed to parse event:', err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        setError('Connection lost');
        eventSource?.close();
        eventSource = null;

        if (!destroyed && !reconnectTimeout) {
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null;
            connect();
          }, 3000);
        }
      };
    };

    connect();

    return () => {
      destroyed = true;

      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };
  }, []);

  return { isConnected, error };
}
