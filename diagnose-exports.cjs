#!/usr/bin/env node
// Agent-OS Export Diagnostic — Check actual vs barrel exports
const fs = require('fs');
const path = require('path');

const REPO = '/home/r3v/Agent-OS';

// Map of packages and their barrel -> source module relationships
const packages = [
  {
    name: 'civilization-orchestrator',
    barrel: 'src/index.ts',
    sources: ['src/long-horizon/index.ts', 'src/coordination/index.ts']
  },
  {
    name: 'mythos-policy-engine',
    barrel: 'src/index.ts',
    sources: ['src/dsl/index.ts', 'src/evaluator/index.ts', 'src/rules/index.ts']
  },
  {
    name: 'agent-os-runtime',
    barrel: 'src/index.ts',
    sources: ['src/sandbox/index.ts', 'src/capabilities/index.ts', 'src/executor/index.ts', 'src/events/index.ts']
  },
  {
    name: 'swarm-runtime',
    barrel: 'src/index.ts',
    sources: ['src/scheduler/index.ts', 'src/orchestrator/index.ts', 'src/fault-isolation/index.ts']
  },
  {
    name: 'simulation-engine',
    barrel: 'src/index.ts',
    sources: ['src/scoring/index.ts', 'src/counterfactual/index.ts']
  }
];

function extractExports(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exports: [], error: 'File not found' };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const exports = [];

  // Match export { A, B, C } from './module'
  const reExportRegex = /export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?/g;
  let match;
  while ((match = reExportRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(s => s.trim()).filter(s => s);
    exports.push(...names.map(name => ({ name, type: 're-export', source: match[2] })));
  }

  // Match export const/function/class Name
  const directExportRegex = /export\s+(?:const|function|class|type|interface)\s+(\w+)/g;
  while ((match = directExportRegex.exec(content)) !== null) {
    exports.push({ name: match[1], type: 'direct' });
  }

  // Match export default Name
  const defaultExportRegex = /export\s+default\s+(\w+)/g;
  while ((match = defaultExportRegex.exec(content)) !== null) {
    exports.push({ name: match[1], type: 'default' });
  }

  return { exports, error: null };
}

function extractBarrelExports(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exports: [], error: 'File not found' };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const exports = [];

  // Match export { A, B, C } from './module'
  const reExportRegex = /export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?/g;
  let match;
  while ((match = reExportRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(s => s.trim()).filter(s => s);
    exports.push(...names.map(name => ({ name, source: match[2] })));
  }

  return { exports, error: null };
}

console.log('=== Agent-OS Export Diagnostic ===\n');

for (const pkg of packages) {
  console.log(`--- Package: ${pkg.name} ---`);

  const barrelPath = path.join(REPO, 'packages', pkg.name, pkg.barrel);
  const barrel = extractBarrelExports(barrelPath);

  if (barrel.error) {
    console.log(`  [ERROR] Barrel: ${barrel.error}`);
    continue;
  }

  console.log(`  Barrel exports: ${barrel.exports.length} items`);

  // Collect all actual exports from source modules
  const actualExports = new Map();
  for (const source of pkg.sources) {
    const sourcePath = path.join(REPO, 'packages', pkg.name, source);
    const sourceExports = extractExports(sourcePath);

    if (sourceExports.error) {
      console.log(`  [WARN] ${source}: ${sourceExports.error}`);
      continue;
    }

    for (const exp of sourceExports.exports) {
      actualExports.set(exp.name, { type: exp.type, source });
    }
  }

  console.log(`  Source exports: ${actualExports.size} items`);

  // Find stale exports (in barrel but not in sources)
  const stale = [];
  for (const exp of barrel.exports) {
    if (!actualExports.has(exp.name)) {
      stale.push(exp.name);
    }
  }

  if (stale.length > 0) {
    console.log(`  [STALE] ${stale.length} exports not found in sources:`);
    for (const name of stale) {
      console.log(`    - ${name}`);
    }
  } else {
    console.log('  [OK] All barrel exports found in sources');
  }

  // Find missing exports (in sources but not in barrel) - optional
  const barrelNames = new Set(barrel.exports.map(e => e.name));
  const missing = [];
  for (const [name, info] of actualExports) {
    if (!barrelNames.has(name)) {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    console.log(`  [INFO] ${missing.length} exports in sources but not barrel:`);
    for (const name of missing.slice(0, 5)) {
      console.log(`    + ${name}`);
    }
    if (missing.length > 5) {
      console.log(`    ... and ${missing.length - 5} more`);
    }
  }

  console.log('');
}

console.log('=== Diagnostic Complete ===');
