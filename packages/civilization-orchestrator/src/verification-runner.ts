import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isAbsolute, relative, resolve } from 'node:path';

import type { EvidenceCheck } from '@agi-ecosystem/evidence-engine';
import {
  getTrustedVerificationProfiles,
} from './verification-profiles.js';
import {
  captureRepositoryProvenance,
  sameRepositoryProvenance,
  type RepositoryProvenance,
} from './repository-provenance.js';

const execFileAsync = promisify(execFile);

export type VerificationCategory =
  | 'test'
  | 'build'
  | 'security';

export interface VerificationProfile {
  readonly id: string;
  readonly category: VerificationCategory;
  readonly description: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly workingDirectory?: string;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly environment?: readonly string[];
  readonly required?: boolean;
  readonly critical?: boolean;
}

export interface VerificationRunnerConfig {
  readonly repositoryRoot: string;
  readonly profiles: Readonly<Record<string, VerificationProfile>>;
  readonly defaultTimeoutMs?: number;
  readonly defaultMaxOutputBytes?: number;
}

export interface VerificationExecution {
  readonly check: EvidenceCheck;
  readonly command: string;
  readonly args: readonly string[];
  readonly workingDirectory: string;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly provenance: RepositoryProvenance;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

function assertWithinRoot(
  candidate: string,
  repositoryRoot: string,
): string {
  const root = resolve(repositoryRoot);
  const resolved = resolve(candidate);
  const relativePath = relative(root, resolved);

  if (
    relativePath !== '' &&
    (relativePath.startsWith('..') || isAbsolute(relativePath))
  ) {
    throw new Error(
      `Verification working directory is outside repository root: ${resolved}`,
    );
  }

  return resolved;
}

function clipOutput(value: string, maxBytes: number): string {
  const bytes = Buffer.byteLength(value, 'utf8');

  if (bytes <= maxBytes) {
    return value;
  }

  const clipped = Buffer.from(value, 'utf8')
    .subarray(0, maxBytes)
    .toString('utf8');

  return `${clipped}\n[output truncated at ${maxBytes} bytes]`;
}

export class VerificationRunner {
  private readonly repositoryRoot: string;
  private readonly profiles: Readonly<Record<string, VerificationProfile>>;
  private readonly defaultTimeoutMs: number;
  private readonly defaultMaxOutputBytes: number;

  constructor(config: VerificationRunnerConfig) {
    this.repositoryRoot = resolve(config.repositoryRoot);
    this.profiles = config.profiles;
    this.defaultTimeoutMs =
      config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.defaultMaxOutputBytes =
      config.defaultMaxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;

    if (!this.profiles || Object.keys(this.profiles).length === 0) {
      throw new Error('VerificationRunner requires at least one profile');
    }
  }

  async run(profileId: string): Promise<VerificationExecution> {
    const profile = this.profiles[profileId];

    if (!profile) {
      throw new Error(
        `Verification profile not found: ${profileId}`,
      );
    }

    const workingDirectory = assertWithinRoot(
      profile.workingDirectory ?? this.repositoryRoot,
      this.repositoryRoot,
    );

    const timeoutMs = profile.timeoutMs ?? this.defaultTimeoutMs;
    const maxOutputBytes =
      profile.maxOutputBytes ?? this.defaultMaxOutputBytes;

    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
      throw new Error(
        `Invalid verification timeout for ${profile.id}`,
      );
    }

    if (!Number.isInteger(maxOutputBytes) || maxOutputBytes <= 0) {
      throw new Error(
        `Invalid verification output limit for ${profile.id}`,
      );
    }

    const provenanceBefore = await captureRepositoryProvenance(
      this.repositoryRoot,
    );

    const started = process.hrtime.bigint();

    let stdout = '';
    let stderr = '';
    let exitCode: number | null = null;
    let timedOut = false;
    let errorMessage: string | undefined;

    try {
      const result = await execFileAsync(
        profile.command,
        [...profile.args],
        {
          cwd: workingDirectory,
          shell: false,
          timeout: timeoutMs,
          maxBuffer: maxOutputBytes,
          encoding: 'utf8',
          env: {
            PATH: process.env.PATH ?? '',
            NODE_NO_WARNINGS: '1',
            ...Object.fromEntries(
              (profile.environment ?? [])
                .filter(name => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
                .filter(name => process.env[name] !== undefined)
                .map(name => [name, process.env[name] as string]),
            ),
          },
        },
      );

      stdout = String(result.stdout ?? '');
      stderr = String(result.stderr ?? '');
      exitCode = 0;
    } catch (error) {
      const childError = error as NodeJS.ErrnoException & {
        code?: string | number;
        stdout?: string | Buffer;
        stderr?: string | Buffer;
        signal?: NodeJS.Signals;
      };

      stdout = String(childError.stdout ?? '');
      stderr = String(childError.stderr ?? '');

      if (typeof childError.code === 'number') {
        exitCode = childError.code;
      } else if (
        typeof childError.code === 'string' &&
        /^\d+$/.test(childError.code)
      ) {
        exitCode = Number(childError.code);
      } else {
        exitCode = null;
      }

      timedOut =
        childError.code === 'ETIMEDOUT' ||
        childError.signal === 'SIGTERM' ||
        childError.signal === 'SIGKILL';

      errorMessage =
        error instanceof Error
          ? error.message
          : String(error);
    }

    const durationMs = Number(
      process.hrtime.bigint() - started,
    ) / 1_000_000;

    const provenanceAfter = await captureRepositoryProvenance(
      this.repositoryRoot,
    );

    const provenanceStable = sameRepositoryProvenance(
      provenanceBefore,
      provenanceAfter,
    );

    const passed =
      exitCode === 0 &&
      !timedOut &&
      provenanceStable;

    const output = clipOutput(stdout, maxOutputBytes);
    const errorOutput = clipOutput(stderr, maxOutputBytes);

    const message = passed
      ? `${profile.description} passed`
      : [
          `${profile.description} failed`,
          errorMessage ? `error=${errorMessage}` : null,
          `exitCode=${exitCode ?? 'unknown'}`,
          timedOut ? 'timedOut=true' : null,
          !provenanceStable
            ? 'repositoryChangedDuringVerification=true'
            : null,
        ]
          .filter(Boolean)
          .join('; ');

    const check: EvidenceCheck = {
      id: profile.id,
      category: profile.category,
      status: passed ? 'passed' : 'failed',
      required: profile.required ?? true,
      critical: profile.critical ?? false,
      message,
      durationMs,
      metadata: {
        command: profile.command,
        args: [...profile.args],
        workingDirectory,
        exitCode,
        timedOut,
        stdout: output,
        stderr: errorOutput,
        repository_provenance: provenanceAfter,
      },
    };

    return {
      check,
      command: profile.command,
      args: [...profile.args],
      workingDirectory,
      exitCode,
      stdout: output,
      stderr: errorOutput,
      timedOut,
      provenance: provenanceAfter,
    };
  }

  async runMany(
    profileIds: readonly string[],
  ): Promise<VerificationExecution[]> {
    const results: VerificationExecution[] = [];

    for (const profileId of profileIds) {
      results.push(await this.run(profileId));
    }

    return results;
  }
}

export function createTrustedVerificationRunner(
  repositoryRoot: string,
): VerificationRunner {
  return new VerificationRunner({
    repositoryRoot,
    profiles: getTrustedVerificationProfiles(repositoryRoot),
  });
}
