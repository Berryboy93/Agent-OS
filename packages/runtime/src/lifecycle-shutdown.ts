/**
 * @package @agent-os/lifecycle
 * Graceful shutdown coordinator for Agent-OS
 * 
 * Prevents data loss by coordinating:
 * - In-flight agent execution checkpoints
 * - Database WAL flush and close
 * - WebSocket graceful disconnect
 * - Event loop drain
 * - Resource cleanup
 */

import { EventEmitter } from 'events';

export interface ShutdownHandler {
  name: string;
  timeout: number; // ms
  fn: () => Promise<void>;
  priority: number; // Higher = runs first (0-100)
}

export interface ShutdownConfig {
  gracefulTimeout: number; // Total shutdown grace period (default 30s)
  sigHandlers: boolean; // Auto-attach SIGTERM/SIGINT (default true)
  exitCode?: number;
}

export class LifecycleManager extends EventEmitter {
  private handlers: ShutdownHandler[] = [];
  private isShuttingDown = false;
  private config: Required<ShutdownConfig>;

  constructor(config: Partial<ShutdownConfig> = {}) {
    super();
    this.config = {
      gracefulTimeout: config.gracefulTimeout ?? 30_000,
      sigHandlers: config.sigHandlers ?? true,
      exitCode: config.exitCode ?? 0,
    };

    if (this.config.sigHandlers) {
      this.attachSignalHandlers();
    }
  }

  /**
   * Register a handler to run during shutdown
   * Priority: 100 runs before 50 runs before 0
   */
  register(handler: ShutdownHandler): void {
    if (this.isShuttingDown) {
      throw new Error('Cannot register handlers during shutdown');
    }
    this.handlers.push(handler);
    // Sort by priority (descending)
    this.handlers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Execute all registered handlers in priority order
   */
  async shutdown(reason: string = 'manual shutdown'): Promise<void> {
    if (this.isShuttingDown) {
      console.warn('[Lifecycle] Shutdown already in progress, ignoring duplicate request');
      return;
    }

    this.isShuttingDown = true;
    console.log(`\n[Lifecycle] Graceful shutdown initiated: ${reason}`);

    const startTime = Date.now();
    const results: Array<{ handler: string; status: 'success' | 'timeout' | 'error'; duration: number; error?: string }> = [];

    for (const handler of this.handlers) {
      const handlerStart = Date.now();
      try {
        console.log(`[Lifecycle] Running: ${handler.name}`);
        
        // Race: handler vs timeout
        const result = await Promise.race([
          handler.fn(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Handler timeout (${handler.timeout}ms)`)),
              handler.timeout
            )
          ),
        ]);

        const duration = Date.now() - handlerStart;
        results.push({ handler: handler.name, status: 'success', duration });
        console.log(`[Lifecycle] ✅ ${handler.name} (${duration}ms)`);
      } catch (error) {
        const duration = Date.now() - handlerStart;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({ handler: handler.name, status: 'error', duration, error: errorMsg });
        console.error(`[Lifecycle] ❌ ${handler.name}: ${errorMsg}`);
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[Lifecycle] Shutdown completed in ${totalDuration}ms`);

    this.emit('shutdown:complete', { reason, totalDuration, results });
  }

  private attachSignalHandlers(): void {
    const signals = ['SIGTERM', 'SIGINT'] as const;
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n[Lifecycle] Received ${signal}`);
        await this.shutdown(`${signal} signal`);
        process.exit(this.config.exitCode);
      });
    });

    // Uncaught exception handler
    process.on('uncaughtException', async (error) => {
      console.error('[Lifecycle] Uncaught exception:', error);
      await this.shutdown('uncaught exception');
      process.exit(1);
    });

    // Unhandled rejection handler
    process.on('unhandledRejection', async (reason) => {
      console.error('[Lifecycle] Unhandled rejection:', reason);
      await this.shutdown('unhandled rejection');
      process.exit(1);
    });
  }

  isShutting(): boolean {
    return this.isShuttingDown;
  }
}

/**
 * Factory: Create a pre-configured lifecycle manager with standard handlers
 * Call this in your main.ts or server bootstrap
 */
export function createDefaultLifecycleManager(
  config?: Partial<ShutdownConfig>
): LifecycleManager {
  const manager = new LifecycleManager(config);

  // Register standard handlers (these will be appended; user can add more)
  manager.register({
    name: 'Event Loop Drain',
    priority: 10,
    timeout: 2_000,
    fn: async () => {
      // Allow pending microtasks to complete
      await new Promise(resolve => setImmediate(resolve));
    },
  });

  return manager;
}

export default LifecycleManager;
