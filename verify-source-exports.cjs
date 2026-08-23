#!/usr/bin/env node
// Check actual source file contents for specific exports
const fs = require('fs');
const path = require('path');

const REPO = '/home/r3v/Agent-OS';

const checks = [
  {
    package: 'civilization-orchestrator',
    file: 'src/long-horizon/index.ts',
    expected: 'ExecutionPhase'
  },
  {
    package: 'mythos-policy-engine',
    file: 'src/evaluator/index.ts',
    expected: 'EvaluationContext'
  },
  {
    package: 'agent-os-runtime',
    file: 'src/executor/index.ts',
    expected: 'NodeExecutionResult'
  },
  {
    package: 'swarm-runtime',
    file: 'src/scheduler/index.ts',
    expected: 'ScheduleResult'
  },
  {
    package: 'simulation-engine',
    file: 'src/scoring/index.ts',
    expected: 'SimulationScore'
  }
];

console.log('=== Source File Export Verification ===\n');

for (const check of checks) {
  const filePath = path.join(REPO, 'packages', check.package, check.file);

  console.log(`--- ${check.package}/${check.file} ---`);

  if (!fs.existsSync(filePath)) {
    console.log(`  [MISSING] File not found`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Check for the expected export
  const hasExport = content.includes(check.expected);
  console.log(`  [${hasExport ? 'FOUND' : 'NOT FOUND'}] ${check.expected}`);

  // Show all exports in the file
  const exportMatches = content.match(/export\s+(?:const|function|class|type|interface|enum)\s+(\w+)/g);
  if (exportMatches) {
    console.log(`  All exports: ${exportMatches.map(m => m.replace(/export\s+\w+\s+/, '')).join(', ')}`);
  }

  // Show re-exports
  const reExportMatches = content.match(/export\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"];?/g);
  if (reExportMatches) {
    console.log(`  Re-exports:`);
    for (const match of reExportMatches) {
      console.log(`    ${match}`);
    }
  }

  console.log('');
}

console.log('=== Verification Complete ===');
