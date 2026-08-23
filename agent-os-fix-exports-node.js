#!/usr/bin/env node
// Agent-OS Stale Export Fix — Node.js implementation
// Fixes: Removes exports that don't exist in their source modules

const fs = require('fs');
const path = require('path');

const REPO = path.resolve('/home/r3v/Agent-OS');

const fixes = [
  {
    package: 'civilization-orchestrator',
    remove: 'ExecutionPhase',
    fromModule: './long-horizon/index.js'
  },
  {
    package: 'mythos-policy-engine',
    remove: 'EvaluationContext',
    fromModule: './evaluator/index.js'
  },
  {
    package: 'agent-os-runtime',
    remove: 'NodeExecutionResult',
    fromModule: './executor/index.js'
  },
  {
    package: 'swarm-runtime',
    remove: 'ScheduleResult',
    fromModule: './scheduler/index.js'
  }
];

console.log('=== Agent-OS Stale Export Fix ===\n');

for (const fix of fixes) {
  const indexPath = path.join(REPO, 'packages', fix.package, 'src', 'index.ts');

  if (!fs.existsSync(indexPath)) {
    console.log(`[SKIP] ${fix.package}/src/index.ts not found`);
    continue;
  }

  let content = fs.readFileSync(indexPath, 'utf8');
  const original = content;

  // Check if export exists
  if (!content.includes(fix.remove)) {
    console.log(`[SKIP] ${fix.remove} not found in ${fix.package}`);
    continue;
  }

  // Create backup
  const backupPath = indexPath + '.bak.' + Date.now();
  fs.writeFileSync(backupPath, original);

  // Parse export statements - handle single-line collapsed format
  // Pattern: export {A, B, C} from './module/index.js';
  const exportRegex = new RegExp(
    `export\\s*\\{([^}]*?)\\}\\s*from\\s*['"]${fix.fromModule.replace('/', '\\/')}['"];`,
    'g'
  );

  content = content.replace(exportRegex, (match, exportList) => {
    // Split by comma, trim, filter out the export to remove
    const exports = exportList
      .split(',')
      .map(e => e.trim())
      .filter(e => e && e !== fix.remove);

    if (exports.length === 0) {
      // Remove entire export statement if empty
      return '';
    }

    return `export { ${exports.join(', ')} } from '${fix.fromModule}';`;
  });

  if (content !== original) {
    fs.writeFileSync(indexPath, content);
    console.log(`[FIXED] Removed ${fix.remove} from ${fix.package}`);
  } else {
    console.log(`[WARN] ${fix.remove} found but could not remove from ${fix.package}`);
  }
}

console.log('\n=== Fix Complete ===');
console.log('Run: pnpm dev');
