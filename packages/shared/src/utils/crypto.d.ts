/**
 * Cryptographic utilities for the AGI ecosystem
 * All hashing uses SHA-256 for deterministic replay
 */
import type { Hash, UUID } from '../types/common.js';
export declare function sha256(data: string | Buffer): Hash;
export declare function sha256Object(obj: Record<string, unknown>): Hash;
export declare function generateUUID(): UUID;
export declare function verifyHash(data: string | Buffer, expectedHash: Hash): boolean;
export declare function hashChain(previousHash: Hash, currentData: string): Hash;
export declare function generateNonce(length?: number): string;
//# sourceMappingURL=crypto.d.ts.map