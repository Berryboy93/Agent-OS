import { useSSE } from '../hooks/useSSE';

/**
 * LiveEvents — Real-time SSE event feed
 * Usage: <LiveEvents />
 */
export function LiveEvents() {
  const { connected, lastEvent } = useSSE('/events');

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-lg font-semibold">Live Events</h3>
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-xs text-gray-500">{connected ? 'Connected' : 'Disconnected'}</span>
      </div>
      <div className="bg-gray-900 rounded p-3 font-mono text-xs text-green-400 h-40 overflow-y-auto">
        {lastEvent ? (
          <pre>{JSON.stringify(lastEvent, null, 2)}</pre>
        ) : (
          <span className="text-gray-500">Waiting for events...</span>
        )}
      </div>
    </div>
  );
}
