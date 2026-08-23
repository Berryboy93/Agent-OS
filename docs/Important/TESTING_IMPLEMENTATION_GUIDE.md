# Expert-Grade Testing Framework: Implementation Guide

**Status:** Production-Ready  
**Last Updated:** 2026-05-25  
**Target Systems:** Agi-Suite (CLI + Backend) + R3 v4 (DAW)  
**Compliance:** Wire §3-§18

---

## I. Overview & Architecture

This testing framework provides:

1. **Three-tier test pyramid** (Unit → Integration → E2E)
2. **Wire §3-§18 compliance enforcement** (version control, isolation, SLAs, CI/CD)
3. **Cross-system signal validation** (CLI → Auth Middleware → Metrics → R3 v4)
4. **Idempotency & concurrency testing** (production-grade reliability)
5. **Automated coverage & performance gating** (CI/CD integration)

**Key metrics:**
- Unit tests: <50ms per test
- Integration tests: <500ms per test
- E2E tests: <2s per test
- Total CI pipeline: ~40s
- Coverage minimum: 85% lines/functions, 80% branches

---

## II. Step-by-Step Implementation

### Step 1: Copy Files to Your Monorepo

```bash
# Navigate to monorepo root
cd ~/Agent-OS

# Copy Vitest configuration
cp /path/to/vitest.config.ts ./

# Create test fixture directory
mkdir -p packages/cli/__tests__/fixtures

# Copy test fixtures
cp /path/to/test-fixtures.ts packages/cli/__tests__/fixtures/index.ts
# (Split into separate files as shown in fixture structure)

# Copy approval workflow tests
cp /path/to/approval-workflow.test.ts packages/cli/__tests__/

# Copy CI/CD workflow
mkdir -p .github/workflows
cp /path/to/.github-workflows-test.yml .github/workflows/test.yml

# Copy compliance validation script
mkdir -p scripts
cp /path/to/validate-wire-compliance.js scripts/

# Update package.json scripts
# (Merge test scripts from package.json.test-scripts into your package.json)
```

### Step 2: Install Vitest & Dependencies

```bash
# Already done from your earlier command
cd ~/Agent-OS
pnpm add -D -w vitest @vitest/ui

# Additional test utilities (if needed)
pnpm add -D -w @vitest/coverage-v8 @testing-library/jest-dom
```

### Step 3: Create Fixture Directory Structure

```bash
# Create the full fixture module
mkdir -p packages/cli/__tests__/fixtures

# Create individual fixture files
touch packages/cli/__tests__/fixtures/db.fixture.ts
touch packages/cli/__tests__/fixtures/approval.fixture.ts
touch packages/cli/__tests__/fixtures/signal.fixture.ts
touch packages/cli/__tests__/fixtures/exec.fixture.ts
touch packages/cli/__tests__/fixtures/index.ts
```

**Copy fixture code** from `test-fixtures.ts` into each file.

### Step 4: Build & Verify

```bash
# Build CLI (required before running tests)
pnpm build:cli

# Run unit tests first
pnpm test:unit

# Expected output:
# ✓ packages/cli/__tests__/unit/... (N tests)
# Tests: N passed (N)
```

### Step 5: Wire Compliance Check

```bash
# Run compliance audit
node scripts/validate-wire-compliance.js

# Expected output:
# ✅ COMPLIANCE CHECK PASSED
# Summary: X passed, 0 failed, Y warned
```

### Step 6: Configure CI/CD

**Option A: GitHub Actions (Recommended)**

```bash
# The .github/workflows/test.yml is already in place
# Commit and push to trigger

git add .github/workflows/test.yml
git commit -m "chore: add Wire-compliant test CI/CD pipeline"
git push
```

**Option B: Local CI Simulation**

```bash
# Run full CI pipeline locally (for testing before push)
./scripts/run-ci-locally.sh
```

---

## III. Test Execution & Validation

### Running Tests Locally

```bash
# All tests (unit + integration)
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests (requires database)
pnpm test:integration

# Watch mode (auto-rerun on file change)
pnpm test:watch

# With UI dashboard
pnpm test:ui

# Coverage report
pnpm test:coverage
```

### Interpreting Coverage Reports

```bash
# Text summary
pnpm test:coverage
# Output: Lines: 87% | Functions: 85% | Branches: 78% | Statements: 87%

# HTML report (detailed)
open coverage/index.html

# LCOV (codecov.io compatible)
# Coverage report at: coverage/lcov.info
```

### Performance Benchmarking

```bash
# Run performance benchmarks
pnpm test:perf

# Compare against baseline
pnpm test:perf:check

# Update baseline (after approved performance improvement)
cp perf-results.json .github/perf-baseline.json
```

---

## IV. Database Setup for Integration Tests

### Option A: Docker (Recommended)

The test fixture automatically starts an ephemeral PostgreSQL container.

```bash
# Verify Docker is running
docker ps

# Tests will automatically:
# 1. Start postgres:16-alpine container
# 2. Run migrations
# 3. Stop container after test
```

### Option B: Existing PostgreSQL

```bash
# Set test database URL
export DATABASE_URL_TEST=postgresql://user:pass@localhost:5432/test

# Fixtures will use this instead of starting container
pnpm test:integration
```

### Option C: GitHub Actions Service Container

```yaml
# Already configured in .github/workflows/test.yml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_PASSWORD: testpass
    ports:
      - 5432:5432
```

---

## V. Cross-System Signal Testing

### Setup R3 v4 Signal Bus Mock

The test fixtures provide a mock `BroadcastChannel` for testing cross-system signals.

```typescript
// In your test
beforeEach(() => {
  setupSignalBusMock();
});

// Listen for signal
const signal = await listenForSignal('DAW_APPROVAL_CONFIRMED', {
  approvalId: 'APR-123'
}, 2000); // 2s timeout

// Verify signal
expect(signal.type).toBe('DAW_APPROVAL_CONFIRMED');
expect(signal.payload.approvalId).toBe('APR-123');
```

### Actual R3 v4 Integration

To test against real R3 v4 instance:

```bash
# Start R3 v4 on port 3000
cd ~/Agent-OS
pnpm dev:r3

# In separate terminal, run E2E tests
pnpm test:e2e
```

---

## VI. Wire Compliance Checklist

Before merging test code, verify:

- [ ] **Wire §3:** All test data in fixtures (not hardcoded)
- [ ] **Wire §5:** Each test is isolated; cleanup verified in afterEach
- [ ] **Wire §6:** SLAs measured; Unit <50ms, Integration <500ms, E2E <2s
- [ ] **Wire §8:** Database state verified; events persisted
- [ ] **Wire §9-§12:** All approval workflow paths tested
- [ ] **Wire §12:** Cross-system signals tested and timed
- [ ] **Wire §18:** CI/CD workflow defined; passes locally
- [ ] **Coverage:** Minimum 85% lines/functions, 80% branches
- [ ] **No Pollution:** All tests pass in parallel
- [ ] **Idempotency:** Duplicate calls handled correctly

**Validation:**
```bash
node scripts/validate-wire-compliance.js --strict
```

---

## VII. Common Tasks & Troubleshooting

### Task 1: Add New Test Case

```typescript
// In packages/cli/__tests__/approval-workflow.test.ts

describe('New Feature: X', () => {
  it('should do Y when Z happens', async () => {
    // Arrange
    const approval = await createTestApproval(db, { /* overrides */ });
    
    // Act
    const result = execCli('approve ...');
    
    // Assert
    expect(result.exitCode).toBe(0);
    
    // Verify persistence
    const state = await getApprovalState(db, approval.id);
    expect(state.status).toBe('APPROVED');
  });
});
```

### Task 2: Debug Failing Test

```bash
# Run single test with verbose output
pnpm test -- approval-workflow.test.ts -t "should approve a pending approval"

# With debugger
pnpm test:debug

# In browser: chrome://inspect (if using --inspect-brk)
```

### Task 3: Update Performance Baseline

```bash
# Run benchmarks
pnpm test:perf

# Verify performance is acceptable
pnpm test:perf:check --threshold 15  # Allow 15% improvement

# Update baseline
cp perf-results.json .github/perf-baseline.json
git add .github/perf-baseline.json
git commit -m "perf: update baseline after optimization"
```

### Task 4: Add Coverage Exception

If a code path is genuinely untestable, mark it:

```typescript
// Untestable: error recovery in network failure
// Wire §6: Exempt from coverage (marked in cobertura)
/* c8 ignore start */
catch (err) {
  // Recovery logic...
}
/* c8 ignore end */
```

### Troubleshooting: Database Connection Errors

```
Error: Test database failed to start

Solutions:
1. Verify Docker is running: docker ps
2. Check port availability: lsof -i :54320
3. Kill stray containers: docker ps -a | grep test-pg | xargs docker rm
4. Set DATABASE_URL_TEST env var to existing database
```

### Troubleshooting: Signal Bus Timeout

```
Error: Signal timeout: DAW_APPROVAL_CONFIRMED (1000ms)

Solutions:
1. Verify setupSignalBusMock() called in beforeEach
2. Check signal listener is registered before approval
3. Increase timeout: listenForSignal(..., 3000) // 3 seconds
4. Verify emitSignal() called after CLI command
```

---

## VIII. Extending the Framework

### Add E2E Test for New Workflow

```typescript
// packages/cli/__tests__/e2e/new-workflow.e2e.test.ts

import { setupTestDb, setupSignalBusMock } from '../fixtures';

describe('New Workflow: E2E', () => {
  let db;
  
  beforeEach(async () => {
    db = await setupTestDb();
    setupSignalBusMock();
  });
  
  afterEach(async () => {
    await db.cleanup();
  });
  
  it('should complete new workflow end-to-end', async () => {
    // Test full stack integration
  });
});
```

### Add Performance Benchmark

```typescript
// In approval-workflow.test.ts

describe('Performance: New Benchmarks', () => {
  it('should perform operation in <100ms', async () => {
    const start = Date.now();
    
    // ... operation ...
    
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});
```

### Add Metrics Verification

```typescript
// In fixtures/approval.fixture.ts

export async function verifyMetricsEmitted(
  db: TestDbContext,
  approvalId: string,
  eventType: string
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM approval_events 
     WHERE approval_id = $1 AND event_type = $2`,
    [approvalId, eventType]
  );
  
  return result.rows.length > 0;
}
```

---

## IX. Continuous Improvement

### Week 1-2: Establish Baseline

```bash
# Run full test suite
pnpm test:ci

# Record baseline metrics
# - Coverage: ____%
# - Performance: ____ms average
# - Test count: ____
```

### Week 3-4: Expand Coverage

- Add tests for uncovered code paths (target 90%+)
- Add E2E tests for critical workflows
- Add performance tests for latency-sensitive operations

### Week 5-6: Optimize Performance

- Profile slow tests with `pnpm test:perf`
- Optimize database queries (use indexes)
- Reduce external I/O dependencies

### Ongoing: Maintenance

- Update test suite when features change (Wire §3)
- Review test coverage in PR reviews
- Monitor CI/CD pipeline performance
- Rotate performance baseline quarterly

---

## X. Reference: File Checklist

**Required files to copy to your monorepo:**

```
✓ ./vitest.config.ts                          (Vitest configuration)
✓ ./packages/cli/__tests__/fixtures/          (Fixture directory)
  ✓ db.fixture.ts                             (Database setup)
  ✓ approval.fixture.ts                       (Test data)
  ✓ signal.fixture.ts                         (Signal bus mock)
  ✓ exec.fixture.ts                           (CLI execution)
  ✓ index.ts                                  (Exports)
✓ ./packages/cli/__tests__/approval-workflow.test.ts (Test suite)
✓ ./.github/workflows/test.yml                (CI/CD pipeline)
✓ ./scripts/validate-wire-compliance.js       (Compliance checker)
✓ Update ./package.json with test scripts
```

---

## XI. Quick Reference: Command Cheatsheet

```bash
# Local development
pnpm test              # Run all tests (watch mode)
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests (requires DB)
pnpm test:ui           # Visual dashboard

# Coverage & quality
pnpm test:coverage     # Generate coverage report
pnpm test:coverage-check  # Verify thresholds
node scripts/validate-wire-compliance.js  # Wire compliance

# Continuous integration
pnpm test:ci           # Full CI pipeline locally
pnpm test:perf         # Performance benchmarks
pnpm test:perf:check   # Compare against baseline

# Debugging
pnpm test:debug        # Run with Node debugger
pnpm test -- --reporter=verbose  # Detailed output
pnpm test:watch        # Auto-rerun on changes
```

---

## XII. Support & Escalation

**Issue: Test flakiness**
1. Check for time-based assertions (use `vi.useFakeTimers()`)
2. Verify no shared state between tests (cleanup in afterEach)
3. Add explicit waits for async operations

**Issue: Performance degradation**
1. Run `pnpm test:perf` to profile
2. Check database query indexes
3. Review test setup overhead

**Issue: Signal not received**
1. Verify `setupSignalBusMock()` called
2. Check listener timeout (increase if needed)
3. Verify `emitSignal()` called after action

**Issue: Database locked**
1. Check for unclosed connections
2. Verify afterEach cleanup runs
3. Kill stray Docker containers: `docker ps -a | grep test-pg`

---

## XIII. Next Steps

1. **Today:** Copy files and run `pnpm test:unit`
2. **Tomorrow:** Set up database and run `pnpm test:integration`
3. **This week:** Validate Wire compliance with `node scripts/validate-wire-compliance.js`
4. **Next week:** Merge CI/CD workflow and run full `pnpm test:ci`

**Success criteria:**
- [ ] All tests pass locally
- [ ] Coverage ≥ 85% lines, ≥ 80% branches
- [ ] CI pipeline passes on main branch
- [ ] Signal propagation verified
- [ ] Performance SLAs met (<50ms unit, <500ms integration)

---

**Document Version:** 1.0  
**Last Verified:** 2026-05-25  
**Maintainer:** R3V Expert Test Framework
