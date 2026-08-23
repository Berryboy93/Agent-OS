/**
 * Validation utilities using Zod schemas
 */
import { z } from 'zod';
export declare const UUIDSchema: z.ZodString;
export declare const HashSchema: z.ZodString;
export declare const TimestampSchema: z.ZodNumber;
export declare const RetryConfigSchema: z.ZodObject<{
    maxAttempts: z.ZodNumber;
    backoffMs: z.ZodNumber;
    maxBackoffMs: z.ZodNumber;
    jitter: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
    jitter: boolean;
}, {
    maxAttempts: number;
    backoffMs: number;
    maxBackoffMs: number;
    jitter: boolean;
}>;
export declare function validateUUID(value: string): boolean;
export declare function validateHash(value: string): boolean;
export declare function assertNonEmpty<T>(arr: T[], name: string): asserts arr is [T, ...T[]];
//# sourceMappingURL=validation.d.ts.map