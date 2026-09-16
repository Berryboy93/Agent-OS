import { resolve } from 'node:path';

import type {
  VerificationProfile,
} from './verification-runner.js';

export const TRUSTED_VERIFICATION_PROFILE_IDS = [
  'evidence-tests',
  'evidence-typecheck',
  'civilization-tests',
  'civilization-typecheck',
  'rbac-security-tests',
] as const;

export type TrustedVerificationProfileId =
  (typeof TRUSTED_VERIFICATION_PROFILE_IDS)[number];

const TEST_DATABASE_ENVIRONMENT = [
  'TEST_DB_HOST',
  'TEST_DB_PORT',
  'TEST_DB_NAME',
  'TEST_DB_USER',
  'TEST_DB_PASSWORD',
] as const;

const profiles = {
  'evidence-tests': {
    id: 'evidence-tests',
    category: 'test',
    description: 'Evidence Engine test suite',
    command: 'pnpm',
    args: ['--filter', '@agi-ecosystem/evidence-engine', 'test'],
    timeoutMs: 120_000,
    environment: TEST_DATABASE_ENVIRONMENT,
    required: true,
    critical: true,
  },

  'evidence-typecheck': {
    id: 'evidence-typecheck',
    category: 'build',
    description: 'Evidence Engine typecheck',
    command: 'pnpm',
    args: [
      '--filter',
      '@agi-ecosystem/evidence-engine',
      'typecheck',
    ],
    timeoutMs: 120_000,
    required: true,
    critical: true,
  },

  'civilization-tests': {
    id: 'civilization-tests',
    category: 'test',
    description: 'Civilization Orchestrator test suite',
    command: 'pnpm',
    args: [
      '--filter',
      '@agi-ecosystem/civilization-orchestrator',
      'test',
    ],
    timeoutMs: 120_000,
    required: true,
    critical: true,
  },

  'civilization-typecheck': {
    id: 'civilization-typecheck',
    category: 'build',
    description: 'Civilization Orchestrator typecheck',
    command: 'pnpm',
    args: [
      '--filter',
      '@agi-ecosystem/civilization-orchestrator',
      'typecheck',
    ],
    timeoutMs: 120_000,
    environment: TEST_DATABASE_ENVIRONMENT,
    required: true,
    critical: true,
  },

  'rbac-security-tests': {
    id: 'rbac-security-tests',
    category: 'security',
    description: 'RBAC security test suite',
    command: 'pnpm',
    args: [
      'exec',
      'vitest',
      '--config',
      './vitest.config.mjs',
      'run',
    ],
    timeoutMs: 120_000,
    required: true,
    critical: true,
  },
} satisfies Record<
  TrustedVerificationProfileId,
  Omit<VerificationProfile, 'workingDirectory'>
>;

export function getTrustedVerificationProfiles(
  repositoryRoot: string,
): Readonly<
  Record<TrustedVerificationProfileId, VerificationProfile>
> {
  const root = resolve(repositoryRoot);

  return Object.freeze({
    'evidence-tests': {
      ...profiles['evidence-tests'],
      workingDirectory: root,
    },

    'evidence-typecheck': {
      ...profiles['evidence-typecheck'],
      workingDirectory: root,
    },

    'civilization-tests': {
      ...profiles['civilization-tests'],
      workingDirectory: root,
    },

    'civilization-typecheck': {
      ...profiles['civilization-typecheck'],
      workingDirectory: root,
    },

    'rbac-security-tests': {
      ...profiles['rbac-security-tests'],
      workingDirectory: resolve(root, 'packages/rbac'),
    },
  });
}
