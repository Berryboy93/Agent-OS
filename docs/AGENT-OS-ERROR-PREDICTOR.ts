/**
 * ErrorPredictor Service
 * 
 * Detects error patterns using 8 signatures + compound pattern analysis.
 * Part of the Agent-OS predictive remediation system.
 * 
 * Pipeline:
 *   Event Stream → Observer → Predictor → (Confidence > 70%) → Remediator
 */

export interface ErrorEvent {
  timestamp: number;
  source: string;      // 'api' | 'db' | 'worker' | 'deployment'
  errorType: string;   // error class/type
  message: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

export interface PredictionResult {
  pattern: string;
  confidence: number;  // 0-100
  severity: 'info' | 'warning' | 'critical';
  suggestedFix: string;
  compoundPatterns?: string[];
  requiresApproval: boolean;
}

export interface ErrorSignature {
  id: string;
  name: string;
  description: string;
  matcher: (event: ErrorEvent) => boolean;
  severity: 'info' | 'warning' | 'critical';
  suggestedFix: string;
}

/**
 * Observer: Collects events in a sliding window
 */
export class Observer {
  private eventWindow: ErrorEvent[] = [];
  private readonly windowSize = 100;
  private readonly pollInterval = 5000; // 5 seconds

  addEvent(event: ErrorEvent): void {
    this.eventWindow.push(event);
    if (this.eventWindow.length > this.windowSize) {
      this.eventWindow.shift();
    }
  }

  getRecentEvents(minutes: number = 5): ErrorEvent[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.eventWindow.filter(e => e.timestamp > cutoff);
  }

  getWindow(): ErrorEvent[] {
    return [...this.eventWindow];
  }

  clear(): void {
    this.eventWindow = [];
  }
}

/**
 * Error Signatures: 8 core patterns
 */
export const ERROR_SIGNATURES: ErrorSignature[] = [
  {
    id: 'timeout',
    name: 'Request Timeout',
    description: 'API request exceeded timeout threshold',
    matcher: (e) => e.message.includes('timeout') || e.message.includes('TIMEOUT'),
    severity: 'warning',
    suggestedFix: 'Increase timeout threshold or optimize query performance',
  },
  {
    id: 'connection-refused',
    name: 'Connection Refused',
    description: 'Database or service connection refused',
    matcher: (e) => e.message.includes('ECONNREFUSED') || e.message.includes('connection refused'),
    severity: 'critical',
    suggestedFix: 'Restart service or check network connectivity',
  },
  {
    id: 'memory-leak',
    name: 'Memory Pressure',
    description: 'Memory usage exceeding thresholds',
    matcher: (e) => e.message.includes('heap') || e.message.includes('OOM') || e.message.includes('memory'),
    severity: 'critical',
    suggestedFix: 'Restart worker process and investigate memory leaks',
  },
  {
    id: 'rate-limit',
    name: 'Rate Limit Exceeded',
    description: 'API rate limit hit',
    matcher: (e) => e.message.includes('429') || e.message.includes('rate limit'),
    severity: 'warning',
    suggestedFix: 'Implement backoff strategy or increase rate limit allocation',
  },
  {
    id: 'auth-failure',
    name: 'Authentication Failure',
    description: 'Token expired or invalid credentials',
    matcher: (e) => e.message.includes('401') || e.message.includes('unauthorized'),
    severity: 'warning',
    suggestedFix: 'Refresh authentication token',
  },
  {
    id: 'schema-mismatch',
    name: 'Schema Validation Error',
    description: 'Data structure mismatch',
    matcher: (e) => e.message.includes('schema') || e.message.includes('validation'),
    severity: 'warning',
    suggestedFix: 'Check data migration scripts or schema versioning',
  },
  {
    id: 'cascade-failure',
    name: 'Cascade Failure Detection',
    description: 'Multiple downstream services failing',
    matcher: (e) => e.source === 'deployment' && e.message.includes('cascade'),
    severity: 'critical',
    suggestedFix: 'Activate circuit breaker and pause deployments',
  },
  {
    id: 'unknown-error',
    name: 'Unknown Error',
    description: 'Unclassified error',
    matcher: () => true, // Fallback
    severity: 'info',
    suggestedFix: 'Investigate error logs for more details',
  },
];

/**
 * Predictor: Matches events against signatures + compound patterns
 */
export class Predictor {
  private signatures: ErrorSignature[] = ERROR_SIGNATURES;
  private observer: Observer;

  constructor(observer: Observer) {
    this.observer = observer;
  }

  /**
   * Predict error patterns from recent events
   */
  predict(event: ErrorEvent): PredictionResult {
    // Single signature match
    const matching = this.signatures.filter(sig => sig.matcher(event));
    if (matching.length === 0) {
      return {
        pattern: 'unknown',
        confidence: 10,
        severity: 'info',
        suggestedFix: 'Monitor for patterns',
        requiresApproval: false,
      };
    }

    const primary = matching[0];
    const confidence = this.calculateConfidence(event, primary);

    // Detect compound patterns
    const compound = this.detectCompoundPatterns(event);

    return {
      pattern: primary.name,
      confidence,
      severity: primary.severity,
      suggestedFix: primary.suggestedFix,
      compoundPatterns: compound,
      requiresApproval: confidence > 70 && primary.severity === 'critical',
    };
  }

  /**
   * Calculate confidence based on event context
   * Higher if: recent similar events, high severity, cascade potential
   */
  private calculateConfidence(event: ErrorEvent, signature: ErrorSignature): number {
    let base = 50;

    // Boost by severity
    if (signature.severity === 'critical') base += 20;
    if (signature.severity === 'warning') base += 10;

    // Boost by repetition
    const recent = this.observer.getRecentEvents(1);
    const similar = recent.filter(e => signature.matcher(e)).length;
    base += Math.min(similar * 5, 30);

    // Cap at 100
    return Math.min(base, 100);
  }

  /**
   * Detect compound patterns (e.g., cascading failures)
   */
  private detectCompoundPatterns(event: ErrorEvent): string[] {
    const patterns: string[] = [];
    const recent = this.observer.getRecentEvents(5);

    // Check for cascade: multiple services failing
    const failingSources = new Set(recent.map(e => e.source));
    if (failingSources.size > 2) {
      patterns.push('cascade-failure');
    }

    // Check for repeated error type
    const sameType = recent.filter(e => e.errorType === event.errorType);
    if (sameType.length > 3) {
      patterns.push('repeated-pattern');
    }

    // Check for auth cascade (many 401s following one)
    const authErrors = recent.filter(e => e.message.includes('401'));
    if (authErrors.length > 5) {
      patterns.push('auth-cascade');
    }

    return patterns;
  }
}

/**
 * CircuitBreaker: Halts deployments on cascade detection
 */
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private readonly failureThreshold = 5;
  private readonly successThreshold = 2;

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount += 1;
      if (this.successCount >= this.successThreshold) {
        this.close();
      }
    }
  }

  recordFailure(): void {
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold) {
      this.open();
    }
  }

  private open(): void {
    console.warn('🛑 CircuitBreaker OPEN: Halting deployments');
    this.state = 'open';
  }

  private close(): void {
    console.log('✅ CircuitBreaker CLOSED: Resuming normal operation');
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
  }

  canProceed(): boolean {
    return this.state !== 'open';
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
  }
}

/**
 * Integration: Setup and usage
 */
export function setupErrorPrediction() {
  const observer = new Observer();
  const predictor = new Predictor(observer);
  const breaker = new CircuitBreaker();

  return {
    observer,
    predictor,
    breaker,

    /**
     * Main prediction pipeline
     */
    onError(event: ErrorEvent) {
      observer.addEvent(event);
      const prediction = predictor.predict(event);

      // Log for dashboard
      console.log(`[Prediction] ${prediction.pattern} (${prediction.confidence}%)`, {
        severity: prediction.severity,
        fix: prediction.suggestedFix,
      });

      // Check circuit breaker
      if (prediction.compoundPatterns?.includes('cascade-failure')) {
        breaker.recordFailure();
        if (!breaker.canProceed()) {
          console.error('🚨 HALT DEPLOYMENTS: Cascade failure detected');
          // Notify RemediationAgent to take action
        }
      } else {
        breaker.recordSuccess();
      }

      return prediction;
    },
  };
}

export type ErrorPredictionSystem = ReturnType<typeof setupErrorPrediction>;
