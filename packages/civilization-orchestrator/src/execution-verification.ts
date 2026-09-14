import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CapabilityManager,
} from '@agi-ecosystem/agent-os-runtime';

import type { EvidenceCheck } from '@agi-ecosystem/evidence-engine';

import {
  AuthorizedVerificationRunner,
  registerVerificationCapabilities,
} from './authorized-verification-runner.js';

import {
  TRUSTED_VERIFICATION_PROFILE_IDS,
  type TrustedVerificationProfileId,
} from './verification-profiles.js';

const MODULE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../..',
);

const VERIFICATION_AGENT_ID =
  '00000000-0000-4000-8000-000000000001';

export interface ExecutionVerificationResult {
  readonly checks: EvidenceCheck[];
  readonly profileIds: TrustedVerificationProfileId[];
}

export interface ExecutionVerificationOptions {
  readonly repositoryRoot?: string;
  readonly profileIds?: readonly TrustedVerificationProfileId[];
}

export const DEFAULT_EXECUTION_VERIFICATION_PROFILE_IDS = [
  'evidence-tests',
  'evidence-typecheck',
  'civilization-typecheck',
] as const satisfies readonly TrustedVerificationProfileId[];


export async function collectExecutionVerification(
  options: ExecutionVerificationOptions = {},
): Promise<ExecutionVerificationResult> {
  const repositoryRoot = resolve(
    options.repositoryRoot ??
      process.env.NATIVE_SHIFT_REPOSITORY_ROOT ??
      MODULE_ROOT,
  );

  const profileIds = [
    ...(options.profileIds ??
      DEFAULT_EXECUTION_VERIFICATION_PROFILE_IDS),
  ];

  const capabilityManager = new CapabilityManager();

  registerVerificationCapabilities(
    capabilityManager,
    VERIFICATION_AGENT_ID,
    profileIds,
    repositoryRoot,
  );

  const runner = new AuthorizedVerificationRunner({
    repositoryRoot,
    agentId: VERIFICATION_AGENT_ID,
    capabilityManager,
  });

  const executions = await runner.runMany(profileIds);

  return {
    checks: executions.map(execution => execution.check),
    profileIds,
  };
}
