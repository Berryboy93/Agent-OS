import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { rm } from 'node:fs/promises';

import {
  VerificationRunner,
  type VerificationProfile,
} from '../src/verification-runner.ts';

const repositoryRoot = resolve(process.cwd());

function runnerFor(
  profiles: readonly VerificationProfile[],
): VerificationRunner {
  return new VerificationRunner({
    repositoryRoot,
    profiles: Object.fromEntries(
      profiles.map(profile => [profile.id, profile]),
    ),
  });
}

describe('VerificationRunner', () => {
  it('records successful execution from the real process exit code', async () => {
    const runner = runnerFor([
      {
        id: 'test-success',
        category: 'test',
        description: 'Deterministic passing test',
        command: process.execPath,
        args: ['-e', 'process.stdout.write("verified")'],
      },
    ]);

    const result = await runner.run('test-success');

    expect(result.check.status).toBe('passed');
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.stdout).toBe('verified');
    expect(result.check.metadata).toMatchObject({
      exitCode: 0,
      timedOut: false,
    });
  });

  it('fails when verification mutates repository state', async () => {
    const mutationPath = resolve(
      repositoryRoot,
      `.provenance-test-${process.pid}-${Date.now()}.tmp`,
    );

    const runner = runnerFor([
      {
        id: 'repository-mutation',
        category: 'test',
        description: 'Repository mutation detection',
        command: process.execPath,
        args: [
          '-e',
          `process.getBuiltinModule('fs').writeFileSync(${JSON.stringify(mutationPath)}, 'mutation')`,
        ],
      },
    ]);

    try {
      const result = await runner.run('repository-mutation');


      expect(result.exitCode).toBe(0);
      expect(result.timedOut).toBe(false);
      expect(result.check.status).toBe('failed');
      expect(result.check.message).toContain(
        'repositoryChangedDuringVerification=true',
      );
      expect(result.check.metadata).toMatchObject({
        exitCode: 0,
        timedOut: false,
      });
      expect(result.provenance.fingerprint).toBeTruthy();
      expect(result.provenance.untrackedFilesHash).toBeTruthy();
    } finally {
      await rm(mutationPath, { force: true });
    }
  });

  it('fails when the real process exits non-zero', async () => {
    const runner = runnerFor([
      {
        id: 'test-failure',
        category: 'test',
        description: 'Deterministic failing test',
        command: process.execPath,
        args: [
          '-e',
          'process.stderr.write("failure"); process.exit(7)',
        ],
      },
    ]);

    const result = await runner.run('test-failure');

    expect(result.check.status).toBe('failed');
    expect(result.exitCode).toBe(7);
    expect(result.stderr).toBe('failure');
    expect(result.check.critical).toBe(false);
  });

  it('rejects an unknown profile instead of executing arbitrary commands', async () => {
    const runner = runnerFor([
      {
        id: 'known',
        category: 'test',
        description: 'Known profile',
        command: process.execPath,
        args: ['-e', 'process.exit(0)'],
      },
    ]);

    await expect(
      runner.run('node -e "process.exit(0)"'),
    ).rejects.toThrow('Verification profile not found');
  });

  it('rejects a working directory outside the repository root', async () => {
    const runner = runnerFor([
      {
        id: 'outside-root',
        category: 'test',
        description: 'Outside root',
        command: process.execPath,
        args: ['-e', 'process.exit(0)'],
        workingDirectory: '/tmp',
      },
    ]);

    await expect(
      runner.run('outside-root'),
    ).rejects.toThrow('outside repository root');
  });

  it('records a timeout as failed evidence', async () => {
    const runner = runnerFor([
      {
        id: 'test-timeout',
        category: 'test',
        description: 'Deterministic timeout test',
        command: process.execPath,
        args: ['-e', 'setTimeout(() => {}, 10_000)'],
        timeoutMs: 50,
      },
    ]);

    const result = await runner.run('test-timeout');

    expect(result.check.status).toBe('failed');
    expect(result.timedOut).toBe(true);
    expect(result.check.metadata).toMatchObject({
      timedOut: true,
    });
  });
});

describe('VerificationRunner environment isolation', () => {
  it('passes only explicitly allowed environment variables', async () => {
    const original = process.env.NATIVE_SHIFT_VERIFICATION_TEST;

    process.env.NATIVE_SHIFT_VERIFICATION_TEST = 'allowed-value';

    try {
      const runner = runnerFor([
        {
          id: 'environment-allowlist',
          category: 'test',
          description: 'Environment allowlist test',
          command: process.execPath,
          args: [
            '-e',
            'process.stdout.write(process.env.NATIVE_SHIFT_VERIFICATION_TEST ?? "missing")',
          ],
          environment: ['NATIVE_SHIFT_VERIFICATION_TEST'],
        },
      ]);

      const result = await runner.run('environment-allowlist');

      expect(result.check.status).toBe('passed');
      expect(result.stdout).toBe('allowed-value');
    } finally {
      if (original === undefined) {
        delete process.env.NATIVE_SHIFT_VERIFICATION_TEST;
      } else {
        process.env.NATIVE_SHIFT_VERIFICATION_TEST = original;
      }
    }
  });

  it('does not forward an environment variable that is not allowlisted', async () => {
    const original = process.env.NATIVE_SHIFT_VERIFICATION_SECRET;

    process.env.NATIVE_SHIFT_VERIFICATION_SECRET = 'must-not-cross';

    try {
      const runner = runnerFor([
        {
          id: 'environment-denied',
          category: 'test',
          description: 'Environment isolation test',
          command: process.execPath,
          args: [
            '-e',
            'process.stdout.write(process.env.NATIVE_SHIFT_VERIFICATION_SECRET ?? "missing")',
          ],
        },
      ]);

      const result = await runner.run('environment-denied');

      expect(result.check.status).toBe('passed');
      expect(result.stdout).toBe('missing');
    } finally {
      if (original === undefined) {
        delete process.env.NATIVE_SHIFT_VERIFICATION_SECRET;
      } else {
        process.env.NATIVE_SHIFT_VERIFICATION_SECRET = original;
      }
    }
  });
});
