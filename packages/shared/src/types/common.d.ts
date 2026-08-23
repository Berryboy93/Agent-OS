/**
 * Common types shared across all AGI ecosystem packages
 */
import type { AGIError } from '../errors/AGIError.js';
export type UUID = string;
export type Timestamp = number;
export type Hash = string;
export interface Identifiable {
    id: UUID;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
export interface Versioned {
    version: string;
    schemaVersion: number;
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: Timestamp;
    context?: Record<string, unknown>;
    traceId?: UUID;
    spanId?: UUID;
}
export type Result<T, E = AGIError> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};
export interface Paginated<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}
export interface RetryConfig {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
    jitter: boolean;
}
export declare const DEFAULT_RETRY: RetryConfig;
//# sourceMappingURL=common.d.ts.map