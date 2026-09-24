import { describe, it, expect } from 'vitest';
import { AgentSandbox } from '../src/index.js';

describe('AgentSandbox', () => {
  it('executes simple code safely', async () => {
    const sandbox = new AgentSandbox({
      timeout_ms: 3000,
    });

    const result = await sandbox.execute('return 1 + 1;');

    expect(result.success).toBe(true);
    expect(result.output).toBe(2);
  });

  it('injects input variables', async () => {
    const sandbox = new AgentSandbox({
      timeout_ms: 3000,
    });

    const result = await sandbox.execute(
      'return input_x * 2;',
      { x: 21 },
    );

    expect(result.success).toBe(true);
    expect(result.output).toBe(42);
  });

  it('blocks process access', async () => {
    const sandbox = new AgentSandbox();

    const result = await sandbox.execute(
      'return typeof process;',
    );

    expect(result.success).toBe(true);
    expect(result.output).toBe('undefined');
  });

  it('blocks filesystem access', async () => {
    const sandbox = new AgentSandbox();

    const result = await sandbox.execute(`
      const fs = require('fs');
      return fs.readFileSync('/etc/passwd', 'utf8');
    `);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('blocks child-process creation', async () => {
    const sandbox = new AgentSandbox();

    const result = await sandbox.execute(`
      const cp = require('node:child_process');
      return cp.execSync('id').toString();
    `);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('disables dynamic code generation', async () => {
    const sandbox = new AgentSandbox();

    const result = await sandbox.execute(`
      const fn = Function('return 42');
      return fn();
    `);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('kills a runaway process on timeout', async () => {
    const sandbox = new AgentSandbox({
      timeout_ms: 100,
    });

    const started = Date.now();

    const result = await sandbox.execute(`
      while (true) {}
    `);

    const elapsed = Date.now() - started;

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/timeout|killed|terminated/i);
    expect(elapsed).toBeLessThan(3000);
  });

  it('supports safe input execution', async () => {
    const sandbox = new AgentSandbox({
      timeout_ms: 3000,
    });

    const result = await sandbox.execute(`
      console.log('hello', input_name);
      return {
        greeting: 'hello',
        value: input_value + 1
      };
    `, {
      name: 'Agent',
      value: 41,
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({
      greeting: 'hello',
      value: 42,
    });
    expect(result.logs).toContain('hello Agent');
  });

  it('rejects unsupported network access configuration', () => {
    expect(
      () =>
        new AgentSandbox({
          network_access: true,
        }),
    ).toThrow(/network_access=true is not supported/i);
  });

  it('rejects unsupported filesystem access configuration', () => {
    expect(
      () =>
        new AgentSandbox({
          file_system_access: true,
        }),
    ).toThrow(/file_system_access=true is not supported/i);
  });

  it('reports resource usage from the isolated process', async () => {
    const sandbox = new AgentSandbox({
      timeout_ms: 3000,
    });

    const result = await sandbox.execute(`
      let total = 0;
      for (let i = 0; i < 100000; i++) {
        total += i;
      }
      return total;
    `);

    expect(result.success).toBe(true);
    expect(result.cpu_ms).toBeGreaterThan(0);
    expect(result.memory_peak_mb).toBeGreaterThan(0);
  });

});
