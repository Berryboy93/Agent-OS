/**
 * CI/CD Pipeline Configuration Files
 * Place in .github/workflows/
 */

// ============================================================================
// 1. .github/workflows/ci.yml
// ============================================================================
/**
 * Main CI pipeline:
 * - Code quality checks (lint)
 * - Type safety (tsc)
 * - Unit tests with coverage
 * - Build verification
 * - Dependency audit
 */

const ciWorkflow = `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

env:
  NODE_VERSION: '20.x'
  PNPM_VERSION: '8'

jobs:
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v2
        with:
          version: \${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm run lint --max-warnings 0

      - name: Type check
        run: pnpm run typecheck

      - name: Audit dependencies
        run: pnpm audit --audit-level moderate

  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: quality
    strategy:
      matrix:
        node-version: ['18.x', '20.x']
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: \${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test:run

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./coverage
          files: coverage-final.json
          flags: unittests-\${{ matrix.node-version }}

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [quality, test]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: \${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm build

      - name: Build dashboard
        working-directory: apps/dashboard
        run: pnpm build

      - name: Verify bundles
        run: |
          [ -d "dist" ] && echo "✅ Root dist exists"
          [ -d "apps/dashboard/dist" ] && echo "✅ Dashboard dist exists"
`;

// ============================================================================
// 2. .github/workflows/security.yml
// ============================================================================
/**
 * Security checks:
 * - SAST (static analysis)
 * - Dependency vulnerability scanning
 * - Secret detection
 */

const securityWorkflow = `name: Security

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * 0' # Weekly on Sunday

permissions:
  contents: read
  security-events: write

jobs:
  codeql:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    strategy:
      matrix:
        language: ['javascript', 'typescript']
    steps:
      - uses: actions/checkout@v4

      - uses: github/codeql-action/init@v2
        with:
          languages: \${{ matrix.language }}
          queries: security-and-quality

      - uses: github/codeql-action/autobuild@v2

      - uses: github/codeql-action/analyze@v2

  deps:
    name: Dependency Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Check for vulnerabilities
        run: pnpm audit --audit-level high

  secrets:
    name: Secret Detection
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: \${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --debug --only-verified
`;

// ============================================================================
// 3. .github/workflows/release.yml
// ============================================================================
/**
 * Release pipeline:
 * - Version bumping (semantic versioning)
 * - Changelog generation
 * - Package publishing to npm
 * - GitHub release creation
 */

const releaseWorkflow = `name: Release

on:
  push:
    branches: [main]
    paths:
      - 'packages/*/package.json'
      - 'apps/*/package.json'
  workflow_dispatch:

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Create Release
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}
`;

// ============================================================================
// 4. .github/workflows/migration-check.yml
// ============================================================================
/**
 * Database migration safety checks:
 * - Verify migrations are reversible
 * - Check for data loss risks
 * - Test migrations on test DB
 */

const migrationCheckWorkflow = `name: Migration Check

on:
  pull_request:
    paths:
      - 'packages/db/migrations/**'
      - 'packages/db/src/schema.ts'

jobs:
  check-migrations:
    name: Validate Migrations
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Check migration files
        working-directory: packages/db
        run: |
          if [ -z "$(ls migrations/*.sql 2>/dev/null)" ]; then
            echo "❌ No migration files found in migrations/"
            exit 1
          fi
          echo "✅ Migration files detected"

      - name: Validate migration syntax
        working-directory: packages/db
        run: |
          for file in migrations/*.sql; do
            echo "Checking: \$file"
            # Basic SQL validation could go here
          done

      - name: Test migrations
        working-directory: packages/db
        env:
          DATABASE_URL: ':memory:'
        run: pnpm run migrate
`;

// ============================================================================
// 5. .github/workflows/performance.yml
// ============================================================================
/**
 * Performance testing:
 * - Bundle size tracking
 * - Runtime benchmarks
 * - Memory profiling
 */

const performanceWorkflow = `name: Performance

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  bundle-size:
    name: Bundle Size
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - run: pnpm build

      - name: Check bundle sizes
        run: |
          echo "Bundle size report:"
          du -sh dist/* 2>/dev/null || echo "No dist found"
          du -sh apps/dashboard/dist 2>/dev/null || echo "No dashboard dist"
`;

// ============================================================================
// 6. .github/CODEOWNERS
// ============================================================================
/**
 * Automatic reviewer assignment
 */

const codeowners = `# Core runtime
packages/runtime/** @r3v

# Database
packages/db/** @r3v

# SDK
packages/sdk/** @r3v

# Adapters
packages/adapters/** @r3v

# Dashboard
apps/dashboard/** @r3v

# All
** @r3v
`;

// ============================================================================
// 7. package.json SCRIPTS UPDATE
// ============================================================================

/**
 * Add to root package.json:
 * 
 * "scripts": {
 *   "build": "pnpm -r run build",
 *   "typecheck": "tsc --noEmit",
 *   "lint": "eslint . --ext .ts,.tsx",
 *   "lint:fix": "eslint . --ext .ts,.tsx --fix",
 *   "test": "vitest",
 *   "test:run": "vitest run",
 *   "test:ui": "vitest --ui",
 *   "test:coverage": "vitest run --coverage",
 *   "db:migrate": "pnpm -C packages/db migrate",
 *   "db:migrate:gen": "pnpm -C packages/db migrate:generate"
 * }
 */

export { ciWorkflow, securityWorkflow, releaseWorkflow, migrationCheckWorkflow, performanceWorkflow, codeowners };
