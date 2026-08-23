// packages/cli/src/handlers/signals.ts
import { logger } from '../utils/logger.js';

export interface SignalPayload {
  signal: string;
  data: unknown;
  timestamp: string;
  source: string;
  correlationId?: string;
}

// In-memory signal bus for internal routing
const signalHandlers = new Map<string, Set<(payload: SignalPayload) => void>>();

// Register a signal handler
export function onSignal(signal: string, handler: (payload: SignalPayload) => void): () => void {
  if (!signalHandlers.has(signal)) {
    signalHandlers.set(signal, new Set());
  }
  signalHandlers.get(signal)!.add(handler);

  // Return unsubscribe function
  return () => {
    signalHandlers.get(signal)?.delete(handler);
  };
}

// Emit signal - routes to registered handlers + SSE
export function emitSignal(signal: string, payload: unknown): void {
  const signalPayload: SignalPayload = {
    signal,
    data: payload,
    timestamp: new Date().toISOString(),
    source: 'cli',
  };

  // Route to internal handlers
  const handlers = signalHandlers.get(signal);
  if (handlers) {
    handlers.forEach(handler => {
      try {
        handler(signalPayload);
      } catch (err) {
        logger.error('Signal handler failed', { signal, error: (err as Error).message });
      }
    });
  }

  // Also emit to wildcard handlers
  const wildcardHandlers = signalHandlers.get('*');
  if (wildcardHandlers) {
    wildcardHandlers.forEach(handler => {
      try {
        handler(signalPayload);
      } catch (err) {
        logger.error('Wildcard signal handler failed', { signal, error: (err as Error).message });
      }
    });
  }

  // Emit to SSE endpoint (async, non-blocking)
  emitSignalSSE(signalPayload).catch(() => {});

  logger.debug('Signal emitted', { signal, handlerCount: handlers?.size || 0 });
}

// SSE emission for signals
async function emitSignalSSE(payload: SignalPayload): Promise<void> {
  const sseEndpoint = process.env.SSE_ENDPOINT || 'http://localhost:3000/events';

  try {
    const response = await fetch(sseEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'signal',
        data: payload,
        timestamp: payload.timestamp,
      }),
    });

    if (!response.ok) {
      logger.debug('Signal SSE returned non-OK', { signal: payload.signal, status: response.status });
    }
  } catch (err) {
    logger.debug('Signal SSE failed (non-critical)', { 
      signal: payload.signal, 
      error: (err as Error).message 
    });
  }
}

// Built-in signal handlers

// Log all approval signals
onSignal('approval:approved', (payload) => {
  logger.info('Approval approved signal received', payload.data as Record<string, unknown>);
});

onSignal('approval:rejected', (payload) => {
  logger.info('Approval rejected signal received', payload.data as Record<string, unknown>);
});

// Metrics tracking
const metrics = {
  approvalsApproved: 0,
  approvalsRejected: 0,
  signalsEmitted: 0,
};

onSignal('approval:approved', () => { metrics.approvalsApproved++; });
onSignal('approval:rejected', () => { metrics.approvalsRejected++; });
onSignal('*', () => { metrics.signalsEmitted++; });

export function getMetrics(): typeof metrics {
  return { ...metrics };
}

export function resetMetrics(): void {
  metrics.approvalsApproved = 0;
  metrics.approvalsRejected = 0;
  metrics.signalsEmitted = 0;
}

