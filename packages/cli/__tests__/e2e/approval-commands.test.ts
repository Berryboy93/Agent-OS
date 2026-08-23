// packages/cli/__tests__/e2e/approval-commands.test.ts
// E2E: Full CLI invocation (via execSync) — runs LAST, after unit/integration pass
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_ROOT = resolve(__dirname, '../..'); // packages/cli/

describe('Approval Commands (E2E)', () => {
  // ONLY test: CLI argument parsing, help text, exit codes
  // Do NOT test business logic here (unit tests already do this)

  it('should display help for approve command', () => {
    const output = execSync('tsx src/index.ts approve --help', {
      cwd: CLI_ROOT,
      encoding: 'utf-8',
    });
    expect(output).toContain('Approve a pending approval');
  });

  it('should fail with usage error for missing approval ID', () => {
    try {
      execSync('tsx src/index.ts approve', { cwd: CLI_ROOT, stdio: 'pipe' });
      throw new Error('Should have thrown');
    } catch (err: unknown) {
      expect((err as { status: number }).status).toBe(1);
    }
  });
});
