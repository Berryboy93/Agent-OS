/**
 * router-type.ts
 *
 * Placement: ~/Stable/packages/r3-api-types/src/router-type.ts
 *
 * This file imports AppRouter from R3v4 and re-exports it.
 * It must live inside the Stable monorepo so the type import resolves
 * via the local workspace. Agi-Suite accesses it via the workspace link.
 *
 * IMPORTANT: This is a TYPE-ONLY import. It produces zero JS output.
 */
export type { AppRouter } from '../../apps/r3vibe/src/server/routers/_app';
