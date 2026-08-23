#!/usr/bin/env node
// Check actual source file exports (current state)
const fs = require('fs');
const path = require('path');

const REPO = '/home/r3v/Agent-OS';

const checks = [
  {
    package: 'civilization-orchestrator',
    file: 'src/long-horizon/index.ts',
    expected: ['ExecutionStrategy', 'ExecutionPhase', 'Checkpoint', 'LongHorizonPlanner', 'LongHorizonGoal', 'GoalConstraint']
  },
  {
    package: 'mythos-policy-engine',
    file: 'src/dsl/index.ts',
    expected: ['ParsedPolicy', 'MythosParser', 'ParsedRule', 'Condition', 'Action']
  },
  {
    package: 'agent-os-runtime',
    file: 'src/sandbox/index.ts',
    expected: ['SandboxConfig', 'AgentSandbox', 'SandboxResult']
  },
  {
    package: 'swarm-runtime',
    file: 'src/orchestrator/index.ts',
    expected: ['SwarmConfig', 'SwarmOrchestrator']
  }
];

console.log('=== Current Source File Export Check ===\n');

for (const check of checks) {
  const filePath = path.join(REPO, 'packages', check.package, check.file);

  console.log(`--- ${check.package}/${check.file} ---`);

  if (!fs.existsSync(filePath)) {
    console.log('  [MISSING] File not found');
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Show first 30 lines
  console.log('  First 30 lines:');
  const lines = content.split('\n').slice(0, 30);
  for (let i = 0; i < lines.length; i++) {
    console.log(`    ${i+1}: ${lines[i]}`);
  }

  // Check for expected exports
  console.log('\n  Expected exports:');
  for (const exp of check.expected) {
    const found = content.includes(exp);
    console.log(`    ${found ? '✓' : '✗'} ${exp}`);
  }

  console.log('\n');
}

console.log('=== Check Complete ===');
