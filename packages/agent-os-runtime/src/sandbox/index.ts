import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

export interface SandboxResult {
  success: boolean;
  output: unknown;
  logs: string[];
  execution_time_ms: number;
  memory_peak_mb: number;
  cpu_ms: number;
  error?: string;
}

export interface SandboxConfig {
  timeout_ms: number;
  memory_limit_mb: number;
  cpu_limit_percent: number;
  allowed_modules: string[];
  network_access: boolean;
  file_system_access: boolean;
}

interface RunnerResult {
  type: 'result';
  success: boolean;
  output?: unknown;
  logs: string[];
  error?: string;
  memory_peak_mb: number;
  cpu_ms: number;
}

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const RUNNER_PATH = join(MODULE_DIR, 'runner.mjs');

const NODE_RUNTIME_OVERHEAD_MB = 384;

function clampPositiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

function signalError(signal: NodeJS.Signals | null): string {
  if (!signal) return 'Sandbox process exited without a result';

  if (signal === 'SIGXCPU') {
    return 'Sandbox CPU limit exceeded';
  }

  if (signal === 'SIGKILL') {
    return 'Sandbox process was killed';
  }

  return `Sandbox process terminated by ${signal}`;
}

export class AgentSandbox {
  private readonly config: SandboxConfig;

  constructor(config: Partial<SandboxConfig> = {}) {
    this.config = {
      timeout_ms: 30000,
      memory_limit_mb: 128,
      cpu_limit_percent: 50,
      allowed_modules: ['math', 'json', 'crypto'],
      network_access: false,
      file_system_access: false,
      ...config,
    };

    if (this.config.network_access) {
      throw new Error(
        'network_access=true is not supported by this sandbox backend',
      );
    }

    if (this.config.file_system_access) {
      throw new Error(
        'file_system_access=true is not supported by this sandbox backend',
      );
    }
  }

  async execute(
    code: string,
    input: Record<string, unknown> = {},
  ): Promise<SandboxResult> {
    const start = process.hrtime.bigint();

    const timeoutMs = clampPositiveInteger(
      this.config.timeout_ms,
      30000,
    );

    const memoryLimitMb = clampPositiveInteger(
      this.config.memory_limit_mb,
      128,
    );

    const cpuLimitPercent = Math.min(
      100,
      Math.max(
        1,
        clampPositiveInteger(this.config.cpu_limit_percent, 50),
      ),
    );

    try {
      const addressSpaceMb = Math.max(
        512,
        memoryLimitMb + NODE_RUNTIME_OVERHEAD_MB,
      );

      const cpuBudgetSeconds = Math.max(
        1,
        Math.ceil((timeoutMs / 1000) * (cpuLimitPercent / 100)),
      );

      const nodeArgs: string[] = [
        '--permission',
        `--max-old-space-size=${Math.max(16, memoryLimitMb)}`,
        RUNNER_PATH,
      ];

      if (this.config.network_access) {
        nodeArgs.push('--allow-net=*');
      }

      const useNetworkNamespace = !this.config.network_access;

      const commandArgs: string[] = [
        `--cpu=${cpuBudgetSeconds}`,
        `--as=${addressSpaceMb * 1024 * 1024}`,
        '--',
      ];

      if (useNetworkNamespace) {
        commandArgs.push(
          'unshare',
          '--user',
          '--map-root-user',
          '--net',
          '--mount',
          '--pid',
          '--fork',
          '--mount-proc',
          '--',
        );
      }

      commandArgs.push(process.execPath, ...nodeArgs);

      const child = spawn('prlimit', commandArgs, {
        cwd: tmpdir(),
        env: {
          PATH: process.env.PATH ?? '',
          NODE_NO_WARNINGS: '1',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const response = await new Promise<RunnerResult>((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        let settled = false;

        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          fn();
        };

        const timer = setTimeout(() => {
          finish(() => {
            child.kill('SIGKILL');
            reject(new Error(`Sandbox timeout after ${timeoutMs}ms`));
          });
        }, timeoutMs);

        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');

        child.stdout.on('data', (chunk: string) => {
          stdout += chunk;
        });

        child.stderr.on('data', (chunk: string) => {
          stderr += chunk;
        });

        child.on('error', (error) => {
          finish(() => reject(error));
        });

        child.on('exit', (code, signal) => {
          finish(() => {
            if (signal) {
              reject(new Error(signalError(signal)));
              return;
            }

            if (code !== 0) {
              const detail = stderr.trim();
              reject(
                new Error(
                  detail
                    ? `Sandbox process exited with code ${code}: ${detail}`
                    : `Sandbox process exited with code ${code}`,
                ),
              );
              return;
            }

            const line = stdout
              .trim()
              .split('\n')
              .filter(Boolean)
              .at(-1);

            if (!line) {
              reject(
                new Error(
                  stderr.trim() || 'Sandbox produced no result',
                ),
              );
              return;
            }

            try {
              const parsed = JSON.parse(line) as RunnerResult;

              if (parsed.type !== 'result') {
                throw new Error('Invalid sandbox response');
              }

              resolve(parsed);
            } catch (error) {
              reject(
                new Error(
                  `Invalid sandbox response: ${
                    error instanceof Error
                      ? error.message
                      : String(error)
                  }`,
                ),
              );
            }
          });
        });

        child.stdin.write(
          JSON.stringify({
            code,
            input,
            allowedModules: this.config.allowed_modules,
          }),
        );

        child.stdin.end();
      });

      const executionTimeMs = Number(
        process.hrtime.bigint() - start,
      ) / 1_000_000;

      return {
        success: response.success,
        output: response.output ?? null,
        logs: response.logs ?? [],
        error: response.error,
        execution_time_ms: executionTimeMs,
        memory_peak_mb: response.memory_peak_mb ?? 0,
        cpu_ms: response.cpu_ms ?? 0,
      };
    } catch (error) {
      const executionTimeMs = Number(
        process.hrtime.bigint() - start,
      ) / 1_000_000;

      return {
        success: false,
        output: null,
        logs: [],
        error: error instanceof Error ? error.message : String(error),
        execution_time_ms: executionTimeMs,
        memory_peak_mb: 0,
        cpu_ms: 0,
      };
    } finally {
    }
  }

  getConfig(): SandboxConfig {
    return { ...this.config };
  }
}
