import { describe, expect, it } from 'vitest';
import { evaluateExecutionPromotion } from '../src/promotion-gate.ts';

describe('execution promotion gate', () => {
  it('returns human_review for runtime-only evidence', () => {
    const result = evaluateExecutionPromotion({
      runId: 'run-runtime-only',
      taskId: 'task-runtime-only',
      baseRevision: '2.0.0',
      operations: ['execute-dag:test'],
      checks: [
        {
          id: 'runtime:test',
          category: 'runtime',
          status: 'passed',
          required: true,
          critical: true,
        },
      ],
    });

    expect(result.promotion.decision).toBe('human_review');
    expect(result.promotion.score.evidenceCompleteness).toBe(1);
    expect(result.promotion.score.testConfidence).toBe(0);
    expect(result.promotion.score.buildConfidence).toBe(0);
    expect(result.promotion.score.securityConfidence).toBe(0);
    expect(result.promotion.score.overall).toBeLessThan(0.98);
    expect(result.promotion.evidenceHash).toBe(result.evidenceHash);
    expect(result.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('promotes complete passing evidence', () => {
    const result = evaluateExecutionPromotion({
      runId: 'run-complete',
      taskId: 'task-complete',
      baseRevision: '2.0.0',
      operations: ['execute-dag:test'],
      checks: [
        {
          id: 'runtime:test',
          category: 'runtime',
          status: 'passed',
          required: true,
          critical: true,
        },
        {
          id: 'policy:test',
          category: 'policy',
          status: 'passed',
          required: true,
          critical: true,
        },
        {
          id: 'test:test',
          category: 'test',
          status: 'passed',
          required: true,
          critical: false,
        },
        {
          id: 'build:test',
          category: 'build',
          status: 'passed',
          required: true,
          critical: false,
        },
        {
          id: 'security:test',
          category: 'security',
          status: 'passed',
          required: true,
          critical: true,
        },
      ],
    });

    expect(result.promotion.decision).toBe('promote');
    expect(result.promotion.score.evidenceCompleteness).toBe(1);
    expect(result.promotion.score.testConfidence).toBe(1);
    expect(result.promotion.score.buildConfidence).toBe(1);
    expect(result.promotion.score.securityConfidence).toBe(1);
    expect(result.promotion.score.overall).toBe(1);
    expect(result.promotion.evidenceHash).toBe(result.evidenceHash);
  });

  it('fails closed when a required security check fails', () => {
    const result = evaluateExecutionPromotion({
      runId: 'run-security-failure',
      taskId: 'task-security-failure',
      baseRevision: '2.0.0',
      operations: ['execute-dag:test'],
      checks: [
        {
          id: 'runtime:test',
          category: 'runtime',
          status: 'passed',
          required: true,
          critical: true,
        },
        {
          id: 'test:test',
          category: 'test',
          status: 'passed',
          required: true,
          critical: false,
        },
        {
          id: 'build:test',
          category: 'build',
          status: 'passed',
          required: true,
          critical: false,
        },
        {
          id: 'security:test',
          category: 'security',
          status: 'failed',
          required: true,
          critical: true,
        },
      ],
    });

    expect(result.promotion.decision).toBe('rollback');
    expect(result.promotion.reasons).toContain(
      '1 critical evidence check(s) failed',
    );
    expect(result.promotion.evidenceHash).toBe(result.evidenceHash);
  });
});
