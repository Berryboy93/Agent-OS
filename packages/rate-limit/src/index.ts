/**
 * @package @agent-os/rate-limit
 * Production-grade rate limiting
 * 
 * Strategies:
 * - Token bucket (smooth, precise)
 * - Sliding window (Redis-style)
 * - Per-user/IP limiting
 * - Adapter-specific limits (LLM tokens vs API calls)
 */

import type { Request, Response, NextFunction } from 'express';

export interface RateLimitConfig {
  windowMs: number; // Time window in ms
  maxRequests: number; // Max requests per window
  message?: string;
  statusCode?: number;
  skip?: (req: Request) => boolean; // Skip rate limit for certain requests
  keyGenerator?: (req: Request) => string; // Custom key (default: IP)
}

export interface TokenBucketConfig {
  capacity: number; // Max tokens
  refillRate: number; // Tokens per second
  initialTokens?: number;
}

export interface RateLimitStore {
  increment(key: string): Promise<number>;
  reset(key: string): Promise<void>;
  get(key: string): Promise<number>;
}

/**
 * In-memory rate limit store (single-process)
 * For distributed: implement with Redis
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  async increment(key: string): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      this.store.set(key, { count: 1, resetTime: now + this.windowMs });
      return 1;
    }

    // Same window
    entry.count++;
    return entry.count;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async get(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return 0;
    }
    return entry.count;
  }

  // Cleanup expired entries periodically
  startCleanupInterval(intervalMs: number = 60_000): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.resetTime) {
          this.store.delete(key);
        }
      }
    }, intervalMs);
  }
}

/**
 * Token bucket rate limiter
 * Provides smooth, bursting capability
 */
export class TokenBucket {
  private capacity: number;
  private refillRate: number;
  private tokens: number;
  private lastRefill: number;

  constructor(config: TokenBucketConfig) {
    this.capacity = config.capacity;
    this.refillRate = config.refillRate;
    this.tokens = config.initialTokens ?? config.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume n tokens
   * Returns true if successful, false if insufficient tokens
   */
  consume(amount: number = 1): boolean {
    this.refill();
    if (this.tokens >= amount) {
      this.tokens -= amount;
      return true;
    }
    return false;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

/**
 * Sliding window rate limiter
 * Strict enforcement over exact windows
 */
export class SlidingWindowRateLimiter {
  private store: RateLimitStore;
  private config: RateLimitConfig;

  constructor(store: RateLimitStore, config: RateLimitConfig) {
    this.store = store;
    this.config = config;
  }

  /**
   * Check if request is allowed
   */
  async isAllowed(key: string): Promise<boolean> {
    const count = await this.store.increment(key);
    return count <= this.config.maxRequests;
  }

  /**
   * Get remaining requests
   */
  async getRemaining(key: string): Promise<number> {
    const count = await this.store.get(key);
    return Math.max(0, this.config.maxRequests - count);
  }
}

/**
 * Express middleware factory
 * Use: app.use(createRateLimitMiddleware(config))
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  const store = new InMemoryRateLimitStore(config.windowMs);
  const limiter = new SlidingWindowRateLimiter(store, config);

  store.startCleanupInterval();

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if configured
    if (config.skip && config.skip(req)) {
      return next();
    }

    // Get rate limit key
    const key = config.keyGenerator ? config.keyGenerator(req) : getClientIp(req);

    // Check rate limit
    const allowed = await limiter.isAllowed(key);
    const remaining = await limiter.getRemaining(key);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + config.windowMs).toISOString());

    if (!allowed) {
      const statusCode = config.statusCode ?? 429;
      const message = config.message ?? 'Too many requests, please try again later.';
      return res.status(statusCode).json({ error: message, retryAfter: config.windowMs / 1000 });
    }

    next();
  };
}

/**
 * Per-agent rate limiter
 * Limits agent execution frequency and resource usage
 */
export class AgentRateLimiter {
  private executionLimiters: Map<string, TokenBucket> = new Map();
  private tokenLimiters: Map<string, TokenBucket> = new Map();

  /**
   * Create rate limit for an agent
   * @param agentId - Agent identifier
   * @param executionsPerMinute - Max executions per minute
   * @param tokensPerMinute - Max LLM tokens per minute
   */
  registerAgent(agentId: string, executionsPerMinute: number, tokensPerMinute: number): void {
    this.executionLimiters.set(
      agentId,
      new TokenBucket({
        capacity: executionsPerMinute,
        refillRate: executionsPerMinute / 60,
        initialTokens: executionsPerMinute,
      })
    );

    this.tokenLimiters.set(
      agentId,
      new TokenBucket({
        capacity: tokensPerMinute,
        refillRate: tokensPerMinute / 60,
        initialTokens: tokensPerMinute,
      })
    );
  }

  /**
   * Try to execute an agent
   */
  canExecute(agentId: string, tokensRequired: number = 0): boolean {
    const execBucket = this.executionLimiters.get(agentId);
    if (!execBucket || !execBucket.consume(1)) {
      return false;
    }

    if (tokensRequired > 0) {
      const tokenBucket = this.tokenLimiters.get(agentId);
      if (!tokenBucket || !tokenBucket.consume(tokensRequired)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get remaining execution capacity
   */
  getCapacity(agentId: string): { executions: number; tokens: number } {
    const execBucket = this.executionLimiters.get(agentId);
    const tokenBucket = this.tokenLimiters.get(agentId);

    return {
      executions: execBucket?.getTokens() ?? 0,
      tokens: tokenBucket?.getTokens() ?? 0,
    };
  }
}

/**
 * Get client IP from request
 * Respects X-Forwarded-For and X-Real-IP headers
 */
function getClientIp(req: Request): string {
  const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  const realIp    = req.headers['x-real-ip'] as string | undefined;
  return forwarded ?? realIp ?? req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

/**
 * Integration example
 * 
 * Usage in apps/dashboard/server.ts:
 * 
 * ```ts
 * import express from 'express';
 * import { createRateLimitMiddleware } from '@agent-os/rate-limit';
 * 
 * const app = express();
 * 
 * // Global rate limit: 100 requests per minute per IP
 * app.use(createRateLimitMiddleware({
 *   windowMs: 60_000,
 *   maxRequests: 100,
 *   message: 'Too many requests from this IP',
 * }));
 * 
 * // Stricter limit on /agent/* endpoints: 30 per minute
 * app.use('/agent', createRateLimitMiddleware({
 *   windowMs: 60_000,
 *   maxRequests: 30,
 * }));
 * 
 * // Skip health checks
 * app.use(createRateLimitMiddleware({
 *   windowMs: 60_000,
 *   maxRequests: 1000,
 *   skip: (req) => req.path.startsWith('/health'),
 * }));
 * ```
 */

export default createRateLimitMiddleware;
