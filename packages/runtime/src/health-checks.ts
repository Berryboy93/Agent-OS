/**
 * @package @agent-os/health
 * Health check infrastructure
 * 
 * Provides:
 * - /health (liveness)
 * - /ready (readiness)
 * - Detailed component status
 * - Metrics integration
 */

import type { Express, Request, Response } from 'express';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  components: Record<string, ComponentHealth>;
  checks: HealthCheckEntry[];
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latency?: number;
  lastCheck?: string;
}

export interface HealthCheckEntry {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  duration: number;
  error?: string;
  timestamp: string;
}

export interface HealthCheckFunction {
  (context: HealthCheckContext): Promise<void>;
}

export interface HealthCheckContext {
  db?: any; // Database client
  eventBus?: any; // Event bus
  cache?: any; // Cache client if exists
  runtime?: any; // Runtime service
}

/**
 * Health check manager
 * Register component checks, run them on demand
 */
export class HealthChecker {
  private checks: Map<string, HealthCheckFunction> = new Map();
  private lastResults: HealthCheckResult | null = null;
  private startTime = Date.now();
  private context: HealthCheckContext;

  constructor(context: HealthCheckContext = {}) {
    this.context = context;
  }

  /**
   * Register a health check for a component
   */
  register(name: string, fn: HealthCheckFunction): void {
    this.checks.set(name, fn);
  }

  /**
   * Run all checks and return status
   */
  async check(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;
    const checks: HealthCheckEntry[] = [];
    const components: Record<string, ComponentHealth> = {};

    for (const [name, fn] of this.checks) {
      const start = Date.now();
      try {
        await fn(this.context);
        const duration = Date.now() - start;
        checks.push({
          name,
          status: 'pass',
          duration,
          timestamp,
        });
        components[name] = {
          status: 'healthy',
          latency: duration,
          lastCheck: timestamp,
        };
      } catch (error) {
        const duration = Date.now() - start;
        const msg = error instanceof Error ? error.message : String(error);
        checks.push({
          name,
          status: 'fail',
          duration,
          error: msg,
          timestamp,
        });
        components[name] = {
          status: 'unhealthy',
          message: msg,
          latency: duration,
          lastCheck: timestamp,
        };
      }
    }

    // Determine overall status
    const failCount = checks.filter(c => c.status === 'fail').length;
    const status: 'healthy' | 'degraded' | 'unhealthy' =
      failCount === 0 ? 'healthy' : failCount < this.checks.size ? 'degraded' : 'unhealthy';

    const result: HealthCheckResult = {
      status,
      timestamp,
      uptime,
      components,
      checks,
    };

    this.lastResults = result;
    return result;
  }

  /**
   * Get cached results (for fast responses)
   */
  getCached(): HealthCheckResult | null {
    return this.lastResults;
  }
}

/**
 * Express middleware factory
 * Use: app.use('/health', createHealthEndpoint(checker))
 */
export function createHealthEndpoint(checker: HealthChecker) {
  return async (req: Request, res: Response) => {
    // Liveness check - return immediately
    if (req.path === '/live') {
      res.json({ status: 'alive', timestamp: new Date().toISOString() });
      return;
    }

    // Detailed health check
    const result = await checker.check();
    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 503 : 503;

    res.status(statusCode).json(result);
  };
}

/**
 * Pre-configured checks for standard components
 */
export const StandardChecks = {
  /**
   * Database connectivity check
   */
  database: (db: any) => async () => {
    if (!db) throw new Error('Database client not provided');
    // For SQLite via drizzle
    const result = db.select().from(db.raw('(SELECT 1)'));
    if (!result) throw new Error('Database query failed');
  },

  /**
   * Memory usage check (warn if > 80% heap)
   */
  memory: () => async () => {
    const used = process.memoryUsage().heapUsed;
    const limit = process.memoryUsage().heapTotal;
    const percent = (used / limit) * 100;

    if (percent > 80) {
      throw new Error(`Heap usage ${percent.toFixed(1)}%`);
    }
  },

  /**
   * Event bus connectivity
   */
  eventBus: (eventBus: any) => async () => {
    if (!eventBus) throw new Error('Event bus not provided');
    if (typeof eventBus.listeners !== 'function') {
      throw new Error('Event bus is not healthy');
    }
  },

  /**
   * Active agents check
   */
  agents: (runtime: any) => async () => {
    if (!runtime) throw new Error('Runtime not provided');
    // Check if runtime has agent tracking
    if (typeof runtime.getActiveAgents !== 'function') {
      throw new Error('Cannot determine active agents');
    }
  },
};

/**
 * Integration example for Express app
 * 
 * Usage in apps/dashboard/server.ts:
 * 
 * ```ts
 * import express from 'express';
 * import { HealthChecker, createHealthEndpoint, StandardChecks } from '@agent-os/health';
 * 
 * const app = express();
 * const db = createClient(); // Your db client
 * 
 * const health = new HealthChecker({ db });
 * health.register('database', StandardChecks.database(db));
 * health.register('memory', StandardChecks.memory());
 * 
 * app.get('/health', createHealthEndpoint(health));
 * app.get('/health/ready', async (req, res) => {
 *   const result = await health.check();
 *   res.status(result.status === 'healthy' ? 200 : 503).json(result);
 * });
 * 
 * app.get('/health/live', (req, res) => {
 *   res.json({ status: 'alive' });
 * });
 * ```
 */
export default HealthChecker;
