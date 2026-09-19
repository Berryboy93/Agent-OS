import { beforeEach, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';

import {
  CapabilityManager,
} from '@agi-ecosystem/agent-os-runtime';

import {
  AuthorizedVerificationRunner,
  registerVerificationCapabilities,
  VERIFICATION_ACTION,
  VERIFICATION_EXECUTOR,
  VERIFICATION_RESOURCE,
} from '../src/authorized-verification-runner.ts';

const repositoryRoot = resolve(process.cwd());
const agentId = '11111111-1111-4111-8111-111111111111';

describe('AuthorizedVerificationRunner', () => {
  let capabilities: CapabilityManager;

  beforeEach(() => {
    capabilities = new CapabilityManager();
  });

  it('denies verification when the agent has no capability', async () => {
    const runner = new AuthorizedVerificationRunner({
      repositoryRoot,
      agentId,
      capabilityManager: capabilities,
    });

    await expect(
      runner.run('evidence-typecheck'),
    ).rejects.toThrow(
      'Verification capability denied for evidence-typecheck',
    );
  });

  it('denies a profile that was not explicitly granted', async () => {
    registerVerificationCapabilities(
      capabilities,
      agentId,
      ['evidence-typecheck'],
      repositoryRoot,
    );

    const runner = new AuthorizedVerificationRunner({
      repositoryRoot,
      agentId,
      capabilityManager: capabilities,
    });

    await expect(
      runner.run('civilization-typecheck'),
    ).rejects.toThrow(
      'Verification capability denied for civilization-typecheck',
    );
  });

  it('requires the verification-runner executor binding', () => {
    registerVerificationCapabilities(
      capabilities,
      agentId,
      ['evidence-typecheck'],
      repositoryRoot,
    );

    const result = capabilities.authorize(agentId, {
      resource: VERIFICATION_RESOURCE,
      action: VERIFICATION_ACTION,
      scope: 'evidence-typecheck',
      executor: 'wrong-executor',
      context: {
        path: repositoryRoot,
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('wrong-executor');
  });

  it('requires the authorized repository path', () => {
    registerVerificationCapabilities(
      capabilities,
      agentId,
      ['evidence-typecheck'],
      repositoryRoot,
    );

    const result = capabilities.authorize(agentId, {
      resource: VERIFICATION_RESOURCE,
      action: VERIFICATION_ACTION,
      scope: 'evidence-typecheck',
      executor: VERIFICATION_EXECUTOR,
      context: {
        path: '/tmp',
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not within an allowed path');
  });

  it(
    'executes a granted trusted profile',
    async () => {
      registerVerificationCapabilities(
        capabilities,
        agentId,
        ['evidence-typecheck'],
        repositoryRoot,
      );

      const runner = new AuthorizedVerificationRunner({
        repositoryRoot,
        agentId,
        capabilityManager: capabilities,
      });

      const result = await runner.run('evidence-typecheck');

      expect(result.check.id).toBe('evidence-typecheck');
      expect(result.check.category).toBe('build');
      expect(result.check.status).toBe('passed');
      expect(result.exitCode).toBe(0);
    },
    15_000,
  );
});
