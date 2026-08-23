// packages/cli/src/handlers/validation.ts
import { validate as validateUUID } from 'uuid';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateApprovalId(id: string): ValidationResult {
  if (!id || id.length === 0) {
    return { valid: false, error: 'Approval ID is required' };
  }

  // Support both UUID v4 and alphanumeric IDs
  if (validateUUID(id)) {
    return { valid: true };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return { valid: false, error: 'Approval ID contains invalid characters. Use UUID or alphanumeric with underscores/hyphens.' };
  }

  if (id.length > 128) {
    return { valid: false, error: 'Approval ID exceeds maximum length of 128 characters' };
  }

  return { valid: true };
}

export function validateIdempotencyKey(key: string | undefined): ValidationResult {
  if (!key) return { valid: true }; // Optional

  if (key.length < 8) {
    return { valid: false, error: 'Idempotency key must be at least 8 characters' };
  }

  if (key.length > 64) {
    return { valid: false, error: 'Idempotency key exceeds maximum length of 64 characters' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    return { valid: false, error: 'Idempotency key contains invalid characters' };
  }

  return { valid: true };
}

