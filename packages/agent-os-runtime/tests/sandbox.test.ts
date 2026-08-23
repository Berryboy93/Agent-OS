import { describe, it, expect } from 'vitest';
import { AgentSandbox } from '../src/index.js';

describe('AgentSandbox', () => {
  it('executes simple code safely', async () => {
    const sandbox = new AgentSandbox({ timeout_ms: 1000 });
    const result = await sandbox.execute('return 1 + 1;');
    expect(result.success).toBe(true);
    expect(result.output).toBe(2);
  });

  it('blocks dangerous operations', async () => {
    const sandbox = new AgentSandbox();
    const result = await sandbox.execute('return process.exit(1);');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('respects timeout', async () => {
    const sandbox = new AgentSandbox({ timeout_ms: 100 });
    const result = await sandbox.execute('while(true) {}');
    expect(result.success).toBe(false);
  });

  it('injects input variables', async () => {
    const sandbox = new AgentSandbox();
    const result = await sandbox.execute('return input_x * 2;', { x: 21 });
    expect(result.output).toBe(42);
  });
});
