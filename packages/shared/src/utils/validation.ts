/**
 * Validation utilities using Zod schemas
 */

import { z } from 'zod';

export const UUIDSchema = z.string().uuid();
export const HashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const TimestampSchema = z.number().int().positive();

export const RetryConfigSchema = z.object({
  maxAttempts: z.number().int().min(1).max(10),
  backoffMs: z.number().int().positive(),
  maxBackoffMs: z.number().int().positive(),
  jitter: z.boolean(),
});

export function validateUUID(value: string): boolean {
  return UUIDSchema.safeParse(value).success;
}

export function validateHash(value: string): boolean {
  return HashSchema.safeParse(value).success;
}

export function assertNonEmpty<T>(arr: T[], name: string): asserts arr is [T, ...T[]] {
  if (arr.length === 0) {
    throw new Error(`${name} cannot be empty`);
  }
}
