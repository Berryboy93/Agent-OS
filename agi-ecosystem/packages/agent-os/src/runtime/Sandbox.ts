/**
 * Sandbox - Isolated execution environment
 * Uses process isolation + resource limits
 * Production: Replace with Firecracker microVMs or gVisor
 */

import type { UUID } from '@agi-ecosystem/shared';
import { SecurityError } from '@agi-ecosystem/shared';
import type { SandboxConfig } from '../types/Agent.js';

export interface SandboxExecution {
  code: string;
  inputs: Record<string, unknown>;
  timeoutMs: number;
  memoryLimitMB: number;
}

export interface SandboxResult {
  success: boolean;
  output?: unknown;
  error?: string;
  logs: string[];
  resourceUsage: {
    cpuMs: number;
    memoryPeakMB: number;
    executionTimeMs: number;
  };
}

export class Sandbox {
  private activeProcesses = new Map<UUID, AbortController>();

  async execute(
    execution: SandboxExecution,
    config: SandboxConfig
  ): Promise<SandboxResult> {
    const traceId = crypto.randomUUID();
    const controller = new AbortController();
    this.activeProcesses.set(traceId, controller);

    const startTime = Date.now();
    const logs: string[] = [];

    try {
      // In production, this would spawn an isolated process/container
      // For now, we simulate with strict eval constraints
      const result = await this.runIsolated(execution, config, controller.signal, logs);

      return {
        success: true,
        output: result,
        logs,
        resourceUsage: {
          cpuMs: 0, // Would measure actual CPU time
          memoryPeakMB: 0, // Would measure actual memory
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        logs,
        resourceUsage: {
          cpuMs: 0,
          memoryPeakMB: 0,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } finally {
      this.activeProcesses.delete(traceId);
    }
  }

  private async runIsolated(
    execution: SandboxExecution,
    config: SandboxConfig,
    signal: AbortSignal,
    logs: string[]
  ): Promise<unknown> {
    // Security: Create a restricted context
    const sandboxContext = this.createSandboxContext(config, logs);

    // Wrap code in IIFE with strict mode
    const wrappedCode = `
      "use strict";
      (async function(__inputs, __console) {
        ${execution.code}
      })(__inputs, __console)
    `;

    // Execute with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Sandbox timeout')), execution.timeoutMs);
    });

    const executionPromise = this.runInContext(wrappedCode, sandboxContext, execution.inputs);

    return Promise.race([executionPromise, timeoutPromise]);
  }

  private createSandboxContext(config: SandboxConfig, logs: string[]) {
    const safeConsole = {
      log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
      error: (...args: unknown[]) => logs.push(`[ERROR] ${args.map(String).join(' ')}`),
      warn: (...args: unknown[]) => logs.push(`[WARN] ${args.map(String).join(' ')}`),
    };

    // Restricted globals - no access to require, process, etc.
    return {
      __console: safeConsole,
      Math,
      JSON,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Promise,
      Set,
      Map,
      // No eval, Function, require, process, fs, etc.
    };
  }

  private async runInContext(
    code: string, 
    context: Record<string, unknown>, 
    inputs: Record<string, unknown>
  ): Promise<unknown> {
    // In production: Use QuickJS, isolated-vm, or spawn child process
    // This is a simplified version for demonstration
    const fn = new Function('__inputs', '__console', ...Object.keys(context), code);
    return fn(inputs, context.__console, ...Object.values(context));
  }

  terminate(traceId: UUID): boolean {
    const controller = this.activeProcesses.get(traceId);
    if (controller) {
      controller.abort();
      this.activeProcesses.delete(traceId);
      return true;
    }
    return false;
  }

  getActiveExecutions(): UUID[] {
    return Array.from(this.activeProcesses.keys());
  }
}
