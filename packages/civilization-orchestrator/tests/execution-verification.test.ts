import { describe, expect, it } from 'vitest';

import {
  collectExecutionVerification,
  DEFAULT_EXECUTION_VERIFICATION_PROFILE_IDS,
} from '../src/execution-verification.ts';

describe('execution verification', () => {
  it('collects real evidence checks through the authorized runner', async () => {
    const result = await collectExecutionVerification({
      profileIds: [
        'evidence-typecheck',
        'civilization-typecheck',
      ],
    });

    expect(result.profileIds).toEqual([
      'evidence-typecheck',
      'civilization-typecheck',
    ]);

    expect(result.checks).toHaveLength(2);

    for (const check of result.checks) {
      expect(check.status).toBe('passed');
      expect(check.category).toBe('build');
      expect(check.required).toBe(true);
      expect(check.critical).toBe(true);
      expect(check.durationMs).toBeGreaterThan(0);
      expect(check.metadata).toMatchObject({
        exitCode: 0,
        timedOut: false,
      });
    }
  }, 30_000);
});
describe('execution verification default policy', () => {
  it('does not recursively invoke the Civilization test suite', () => {
    expect(
      DEFAULT_EXECUTION_VERIFICATION_PROFILE_IDS,
    ).not.toContain('civilization-tests');
  });
});
