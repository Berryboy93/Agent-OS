import { QueryClient } from '@tanstack/react-query';

let socket: WebSocket | null = null;

export function initRealtime(queryClient: QueryClient) {
  if (socket) return;

  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';

  socket = new WebSocket(WS_URL);

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      const invalidate = (key: string[]) =>
        queryClient.invalidateQueries({ queryKey: key });

      switch (msg.type) {
        case 'health.updated':
          invalidate(['health']);
          break;
        case 'stats.updated':
          invalidate(['stats']);
          break;
        case 'runs.updated':
          invalidate(['runs']);
          break;
        case 'agents.updated':
          invalidate(['agents']);
          break;
        case 'events.new':
          invalidate(['events']);
          break;
      }
    } catch (e) {
      console.warn('WS error', e);
    }
  };

  socket.onclose = () => {
    socket = null;
    setTimeout(() => initRealtime(queryClient), 3000);
  };
}
