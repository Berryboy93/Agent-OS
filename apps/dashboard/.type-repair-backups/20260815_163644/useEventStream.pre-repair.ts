import { useEffect, useCallback, useState } from 'react';
import { apiClient } from '../services/api';

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

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = async () => {
      try {
        const response = await apiClient.streamEvents();
        eventSource = new EventSource('/api/command-center/events/stream');

        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onEvent?.(data);
          } catch (err) {
            console.error('Failed to parse event:', err);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          setError('Connection lost');
          eventSource?.close();
          eventSource = null;

          // Attempt reconnection after 3 seconds
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed');
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [onEvent]);

  return { isConnected, error };
}
