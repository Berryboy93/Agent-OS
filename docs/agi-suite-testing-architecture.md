# Agi-Suite Testing Architecture: Expert-Grade Blueprint

## I. Test Pyramid & Scope Definition

### Layer 1: Unit Tests (40% coverage)
**Target:** Individual command handlers, approval state transitions, validation logic
**SLA:** <50ms per test, deterministic

```
packages/cli/__tests__/unit/
├── approval-handler.test.ts      # approve/reject state machine
├── validation.test.ts             # arg parsing, schema validation
├── output-formatter.test.ts       # help text, error messages
└── auth-token.test.ts             # credential handling
```

**Expert criteria:**
- No external I/O (mock all)
- Pure function focused (approval state → next state)
- Deterministic (seed random, freeze time)
- 100% branch coverage for critical paths

---

### Layer 2: Integration Tests (40% coverage)
**Target:** CLI → CLI Router → Service Layer; CLI ↔ Auth Middleware; CLI ↔ Metrics Pipeline
**SLA:** <500ms per test, but idempotent

```
packages/cli/__tests__/integration/
├── approval-workflow.test.ts      # full approve/reject cycle
├── cli-to-auth.test.ts            # 401/403 error flow
├── cli-to-metrics.test.ts         # event emission verification
└── retry-resilience.test.ts       # transient failure handling
```

**Expert criteria:**
- Real service endpoints (testnet/ephemeral)
- Verify state persistence (PostgreSQL mutations)
- Check side effects (logs, metrics, auth tokens)
- Rollback verification (idempotent operations)

---

### Layer 3: E2E Tests (15% coverage)
**Target:** Cross-system workflows (Agi-Suite CLI → R3 v4 signal emission)
**SLA:** <2s per test, runs in CI only

```
packages/cli/__tests__/e2e/
├── cross-system-approval.test.ts  # CLI approval → R3 v4 DAW state update
└── data-pipeline-integrity.test.ts # approval event through full stack
```

**Expert criteria:**
- Against staging Docker containers
- Validate final state across both systems
- Time-bounded (timeout 5s)
- Automated cleanup/teardown

---

## II. Critical Test Coverage Gaps (Your Approval Flow)

### A. Approval State Machine
**Current gap:** You're only testing help text and arg parsing.
**Expert requirement:** Test all state transitions and guards.

```typescript
// approval-state-machine.test.ts
describe('Approval State Machine', () => {
  describe('Transitions', () => {
    it('should reject transition from PENDING→REJECTED without note', () => {
      const state = { status: 'PENDING', id: 'APR-001' };
      const result = approveStateTransition(state, 'REJECT', { note: '' });
      expect(result).toEqual({
        ok: false,
        error: 'NOTE_REQUIRED_FOR_REJECTION'
      });
    });

    it('should persist approval event to PostgreSQL with idempotency key', async () => {
      const approvalId = 'APR-' + crypto.randomUUID();
      const idempotencyKey = 'IDEMPOTENT-KEY-123';
      
      const result1 = await approveApproval(approvalId, { 
        note: 'Looks good',
        idempotencyKey 
      });
      const result2 = await approveApproval(approvalId, {
        note: 'Looks good',
        idempotencyKey
      });
      
      // Both calls return same result; only one DB write occurred
      expect(result1).toEqual(result2);
      const eventCount = await db.query(
        'SELECT COUNT(*) FROM approval_events WHERE idempotency_key = $1',
        [idempotencyKey]
      );
      expect(eventCount).toBe(1);
    });
  });

  describe('Error Guard Rails', () => {
    it('should reject approval of non-existent request (404)', async () => {
      const result = await approveApproval('APR-NONEXISTENT', {});
      expect(result.error).toBe('APPROVAL_NOT_FOUND');
      expect(result.statusCode).toBe(404);
    });

    it('should reject approval without valid auth token (401)', async () => {
      const result = await approveApproval('APR-001', {}, {
        authToken: 'INVALID'
      });
      expect(result.error).toBe('UNAUTHORIZED');
      expect(result.statusCode).toBe(401);
    });

    it('should reject approval of already-approved request (409)', async () => {
      const approvalId = await createApproval();
      await approveApproval(approvalId, {});
      
      const result = await approveApproval(approvalId, {});
      expect(result.error).toBe('APPROVAL_ALREADY_PROCESSED');
      expect(result.statusCode).toBe(409);
    });
  });
});
```

---

### B. Approval ↔ Auth Middleware Integration
**Current gap:** No verification that CLI approvals trigger middleware auth state updates
**Expert requirement:** Test the full auth propagation chain

```typescript
// cli-to-auth-middleware.test.ts
describe('Approval → Auth Middleware Integration', () => {
  it('should invalidate cached tokens on approval rejection', async () => {
    const userId = 'USER-123';
    const token = await generateTestToken(userId);
    
    // Verify token works before rejection
    const preCheck = await verifyToken(token);
    expect(preCheck.valid).toBe(true);
    
    // Reject the approval that granted this token
    const approvalId = await createApprovalForToken(token);
    await rejectApproval(approvalId, { reason: 'REVOKED' });
    
    // Verify token is now invalid (middleware must have updated cache)
    const postCheck = await verifyToken(token);
    expect(postCheck.valid).toBe(false);
    expect(postCheck.reason).toBe('APPROVAL_REVOKED');
  });

  it('should propagate approval metadata to metrics pipeline within 100ms', async () => {
    const approvalId = await createApproval({
      resource: 'DAW_TRACK_DELETE',
      userId: 'USER-123'
    });
    
    const startTime = Date.now();
    await approveApproval(approvalId, { note: 'Approved by admin' });
    
    // Poll metrics with exponential backoff (5 retries, 20ms base)
    const metrics = await pollMetricsWithBackoff(
      () => getApprovalMetrics(approvalId),
      { maxAttempts: 5, baseDelay: 20 }
    );
    
    expect(metrics).toBeDefined();
    expect(metrics.eventType).toBe('APPROVAL_CONFIRMED');
    expect(Date.now() - startTime).toBeLessThan(100);
  });
});
```

---

### C. Cross-System Signal Emission (Agi-Suite ↔ R3 v4)
**Current gap:** CLI approvals don't verify R3 v4 state updates
**Expert requirement:** Validate approval events propagate to DAW signal bus

```typescript
// cross-system-approval-signal.test.ts
describe('Approval → R3 v4 Signal Propagation', () => {
  it('should emit DAW_TRACK_DELETE approval to R3 signal bus', async () => {
    const trackId = 'TRACK-abc123';
    const userId = 'USER-456';
    
    // Create approval for track deletion
    const approvalId = await createApproval({
      type: 'DAW_TRACK_DELETE',
      resource: trackId,
      userId
    });
    
    // Listen for signal on R3 v4 signal bus (BroadcastChannel)
    const signalPromise = listenForSignal(
      'DAW_APPROVAL_CONFIRMED',
      { trackId, approvalId }
    );
    
    // Approve via CLI
    await approveApproval(approvalId, { note: 'Admin approval' });
    
    // Verify signal arrived within SLA (≤15ms)
    const signal = await Promise.race([
      signalPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Signal timeout')), 15)
      )
    ]);
    
    expect(signal.type).toBe('DAW_APPROVAL_CONFIRMED');
    expect(signal.payload).toEqual({
      trackId,
      approvalId,
      approvedBy: 'CLI_USER',
      timestamp: expect.any(Number)
    });
  });

  it('should handle rejection signal with rollback semantics', async () => {
    const trackId = 'TRACK-xyz789';
    const approvalId = await createApproval({
      type: 'DAW_TRACK_DELETE',
      resource: trackId
    });
    
    const signalPromise = listenForSignal('DAW_APPROVAL_REJECTED', {
      trackId,
      approvalId
    });
    
    await rejectApproval(approvalId, { reason: 'REQUIRES_REVIEW' });
    
    const signal = await Promise.race([
      signalPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Signal timeout')), 15)
      )
    ]);
    
    expect(signal.type).toBe('DAW_APPROVAL_REJECTED');
  });
});
```

---

## III. Test Infrastructure Requirements

### A. Vitest Configuration (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Isolation & repeatability
    globals: true,
    environment: 'node',
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    isolate: true,
    
    // Timeout SLAs
    testTimeout: 5000,
    hookTimeout: 5000,
    teardownTimeout: 3000,
    
    // Coverage requirements
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'packages/*/src/**/*.d.ts',
        'packages/*/src/**/index.ts' // exports only
      ],
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85,
      checkCoverage: true
    },
    
    // Reporter for CI/CD
    reporters: ['verbose', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml'
    },
    
    // Test files discovery
    include: [
      'packages/*/src/**/*.{test,spec}.ts',
      'packages/*/__tests__/**/*.test.ts'
    ]
  }
});
```

---

### B. Test Utilities & Fixtures (packages/cli/__tests__/fixtures/)

```typescript
// db.fixture.ts - Ephemeral PostgreSQL container
export async function setupTestDb() {
  const container = await startTestContainer('postgres:16-alpine', {
    env: { POSTGRES_PASSWORD: 'test' },
    portBindings: { '5432/tcp': [{ HostPort: '0' }] }
  });
  
  const port = container.inspect().NetworkSettings.Ports['5432/tcp'][0].HostPort;
  process.env.DATABASE_URL = `postgresql://postgres:test@localhost:${port}/test`;
  
  await runMigrations();
  
  return {
    cleanup: () => container.stop(),
    db: createDbClient()
  };
}

// approval.fixture.ts - Pre-populated test data
export async function createTestApproval(overrides = {}) {
  return db.query(`
    INSERT INTO approvals (
      id, type, resource, status, created_by, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, NOW()
    )
    RETURNING *
  `, [
    'APR-' + crypto.randomUUID(),
    overrides.type || 'DAW_TRACK_DELETE',
    overrides.resource || 'TRACK-001',
    overrides.status || 'PENDING',
    overrides.createdBy || 'TEST_USER'
  ]);
}

// signal-bus.fixture.ts - Mock R3 v4 signal listener
export function listenForSignal(eventType, matcher) {
  const bc = new BroadcastChannel('r3-signals');
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Signal timeout: ${eventType}`)),
      1000
    );
    
    bc.onmessage = (event) => {
      if (event.data.type === eventType && matchesObject(event.data, matcher)) {
        clearTimeout(timeout);
        bc.close();
        resolve(event.data);
      }
    };
  });
}
```

---

### C. Wire.txt Compliance Hooks

**Before each test suite:**
```typescript
beforeEach(async () => {
  // Wire §5: Verify test isolation
  // - Fresh DB state per test
  // - No cross-test pollution
  // - No dangling event listeners
  
  await cleanupTestDb();
  clearAllBroadcastChannels();
  clearAllTimers();
  clearAllMocks();
  
  // Wire §8: Persistence verification
  // - Document test data ID
  // - Store in test-artifacts/ for audit trail
  testContext.testId = generateTestId();
  testContext.artifacts = new TestArtifactRecorder(testContext.testId);
});

afterEach(async () => {
  // Wire §15: Cleanup & Verification
  await testContext.artifacts.flush();
  
  // Verify no dangling resources
  expect(getActiveDbConnections()).toBe(0);
  expect(getActiveBroadcastChannels()).toBe(0);
  
  // Generate test report
  await generateWireComplianceReport(testContext.testId);
});
```

---

## IV. Approval Workflow: Complete Test Suite Structure

```typescript
// packages/cli/__tests__/approval-workflow.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupTestDb, createTestApproval, listenForSignal } from './fixtures';

describe('Approval Workflow (Wire §9-§12 Compliance)', () => {
  let testContext;
  
  beforeEach(async () => {
    testContext = await setupTestDb();
    testContext.testId = generateTestId();
  });
  
  afterEach(async () => {
    await testContext.cleanup();
  });

  describe('Happy Path: Approve → Metrics → Signal', () => {
    it('should complete full approval cycle within SLA', async () => {
      const approval = await createTestApproval({
        type: 'DAW_TRACK_DELETE',
        resource: 'TRACK-abc123'
      });
      
      const metrics = testContext.artifacts.startTimer('approval-cycle');
      
      // Step 1: CLI approve command
      const result = await exec(`
        node dist/index.js approve ${approval.id} \
          --note "Approved by CI test" \
          --token ${process.env.TEST_AUTH_TOKEN}
      `);
      
      expect(result.exitCode).toBe(0);
      metrics.checkpoint('cli-invocation');
      
      // Step 2: Verify DB state
      const approved = await testContext.db.query(
        'SELECT * FROM approvals WHERE id = $1',
        [approval.id]
      );
      expect(approved.rows[0].status).toBe('APPROVED');
      expect(approved.rows[0].approved_at).toBeDefined();
      metrics.checkpoint('db-state');
      
      // Step 3: Verify metrics event
      const metricsEvent = await listenForSignal('APPROVAL_CONFIRMED', {
        approvalId: approval.id
      });
      expect(metricsEvent.timestamp).toBeDefined();
      metrics.checkpoint('metrics-event');
      
      // Step 4: Verify R3 signal
      const r3Signal = await listenForSignal('DAW_APPROVAL_CONFIRMED', {
        resource: 'TRACK-abc123'
      });
      expect(r3Signal.payload.approvedBy).toBe('CLI_USER');
      metrics.checkpoint('r3-signal');
      
      // Wire §6: SLA verification
      expect(metrics.elapsed()).toBeLessThan(500);
      testContext.artifacts.record('approval-cycle', metrics);
    });
  });

  describe('Error Path: Invalid Approval ID', () => {
    it('should fail with 404 and proper error message', async () => {
      const result = await exec(`
        node dist/index.js approve APR-NONEXISTENT --note "test"
      `);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('APPROVAL_NOT_FOUND');
      expect(result.stderr).toContain('404');
    });
  });

  describe('Concurrency: Multiple Approvals', () => {
    it('should handle 10 parallel approvals without race conditions', async () => {
      const approvals = await Promise.all(
        Array.from({ length: 10 }, () => createTestApproval())
      );
      
      const results = await Promise.allSettled(
        approvals.map(a => exec(`
          node dist/index.js approve ${a.id} --note "test"
        `))
      );
      
      // All must succeed
      results.forEach(r => expect(r.status).toBe('fulfilled'));
      
      // Verify DB consistency
      const allApproved = await testContext.db.query(`
        SELECT COUNT(*) FROM approvals WHERE status = 'APPROVED'
      `);
      expect(allApproved.rows[0].count).toBe('10');
    });
  });

  describe('Idempotency: Duplicate Calls', () => {
    it('should return same result for duplicate approve calls', async () => {
      const approval = await createTestApproval();
      const idempotencyKey = 'IDEMPOTENT-' + crypto.randomUUID();
      
      const result1 = await exec(`
        node dist/index.js approve ${approval.id} \
          --note "test" \
          --idempotency-key ${idempotencyKey}
      `);
      
      const result2 = await exec(`
        node dist/index.js approve ${approval.id} \
          --note "test" \
          --idempotency-key ${idempotencyKey}
      `);
      
      expect(result1.stdout).toEqual(result2.stdout);
      
      // Verify only one event in DB
      const events = await testContext.db.query(`
        SELECT COUNT(*) FROM approval_events 
        WHERE idempotency_key = $1
      `, [idempotencyKey]);
      expect(events.rows[0].count).toBe('1');
    });
  });
});
```

---

## V. CI/CD Integration

### GitHub Actions Workflow (Wire §18)

```yaml
name: Test Suite (Wire §8-§12)

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 11
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      
      # Build before tests (Wire §3)
      - run: pnpm build
      
      # Unit tests (fast)
      - run: pnpm test:unit --coverage
      
      # Integration tests (medium)
      - run: pnpm test:integration --coverage
      
      # E2E tests (slower, CI only)
      - run: pnpm test:e2e --timeout 10000
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
      
      # Coverage report (Wire §6)
      - run: pnpm test:coverage-check
      
      # Wire compliance validation
      - run: node scripts/validate-wire-compliance.js test-results/
      
      # Upload results
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
      
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
```

---

## VI. Test Execution SLA Matrix

| Layer | File Count | Avg Time/Test | Total SLA | Parallelism |
|-------|-----------|---------------|----------|------------|
| Unit  | 40-50     | 20-50ms       | 1-2s     | 4 threads  |
| Integration | 20-30 | 200-500ms     | 5-10s    | 2 threads  |
| E2E   | 5-10      | 1000-2000ms   | 15-30s   | 1 thread   |
| **Total** | **65-90** | — | **21-42s** | adaptive |

---

## VII. Expert Checklist Before Merging Test Code

- [ ] **Wire §3 Compliance:** All tests read from version-controlled fixtures; no hardcoded data
- [ ] **Wire §5 Isolation:** Each test is independent; cleanup verified in afterEach
- [ ] **Wire §6 Performance:** Unit tests <50ms, integration <500ms, E2E <2s
- [ ] **Coverage:** Minimum 85% lines/functions/statements; 80% branches
- [ ] **Error Paths:** Every throw/error case has a test
- [ ] **Concurrency:** Parallel execution verified without race conditions
- [ ] **Idempotency:** Duplicate calls tested for approval flow
- [ ] **Signal Integration:** R3 v4 cross-system signals verified
- [ ] **DB Cleanup:** No test pollution; verify active connections = 0 after
- [ ] **CI/CD Ready:** GitHub Actions workflow defined, all tests pass in container

---

## VIII. Next Immediate Actions

1. **Create test infrastructure layer** (fixtures, DB setup, signal mocking)
2. **Expand approval tests** to state machine + error paths
3. **Add integration tests** for auth middleware + metrics pipeline
4. **Add E2E test** for cross-system approval → R3 signal
5. **Wire CI/CD** GitHub Actions workflow
6. **Generate coverage baseline** (document current %, set improvement targets)
