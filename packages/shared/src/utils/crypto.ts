/**
 * Cryptographic utilities for the AGI ecosystem
 * All hashing uses SHA-256 for deterministic replay
 */

import { createHash, randomUUID } from 'crypto';
import type { Hash, UUID } from '../types/common.js';

export function sha256(data: string | Buffer): Hash {
  return createHash('sha256').update(data).digest('hex');
}

export function sha256Object(obj: Record<string, unknown>): Hash {
  const canonical = JSON.stringify(obj, Object.keys(obj).sort());
  return sha256(canonical);
}

export function generateUUID(): UUID {
  return randomUUID();
}

export function verifyHash(data: string | Buffer, expectedHash: Hash): boolean {
  return sha256(data) === expectedHash;
}

export function hashChain(previousHash: Hash, currentData: string): Hash {
  return sha256(`${previousHash}:${currentData}`);
}

export function generateNonce(length = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
