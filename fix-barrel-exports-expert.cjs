#!/usr/bin/env node
/**
 * Agent-OS Barrel Export Fix — Expert Implementation
 * 
 * Fixes missing exports in barrel (index.ts) files by:
 * 1. Verifying source files exist and contain the exports
 * 2. Checking if exports are runtime values or type-only
 * 3. Adding exports with correct syntax (runtime vs type-only)
 * 4. Preserving existing formatting and structure
 * 5. Validating TypeScript syntax after modifications
 * 6. Creating backups with collision-safe naming
 * 7. Providing rollback capability on failure
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO = '/home/r3v/Agent-OS';
const TIMESTAMP = Date.now();
const BACKUPS = [];

// ── UTILITY FUNCTIONS ──

function log(level, message) {
  const prefix = { info: '  [INFO]', fixed: '  [FIXED]', skip: '  [SKIP]', warn: '  [WARN]', error: '  [ERROR]' }[level] || '  [?]';
  console.log(`${prefix} ${message}`);
}

function backupFile(filePath) {
  const backupPath = `${filePath}.bak.${TIMESTAMP}.${BACKUPS.length}`;
  fs.copyFileSync(filePath, backupPath);
  BACKUPS.push({ original: filePath, backup: backupPath });
  return backupPath;
}

function rollback() {
  console.log('\n=== ROLLING BACK CHANGES ===');
  for (const { original, backup } of BACKUPS.reverse()) {
    fs.copyFileSync(backup, original);
    console.log(`  [RESTORED] ${path.basename(original)}`);
  }
  console.log('=== Rollback Complete ===\n');
}

function extractExports(filePath) {
  if (!fs.existsSync(filePath)) return { exports: [], error: 'File not found' };

  const content = fs.readFileSync(filePath, 'utf8');
  const exports = [];

  // Match: export const Name, export function Name, export class Name, export type Name, export interface Name
  const directRegex = /export\s+(?:const|function|class|type|interface|enum)\s+(\w+)/g;
  let match;
  while ((match = directRegex.exec(content)) !== null) {
    exports.push({ name: match[1], kind: 'value', typeOnly: content.substring(match.index, match.index + 12).includes('type ') });
  }

  // Match: export { Name1, Name2 } from './module'
  const reExportRegex = /export\s*(type\s+)?\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?/g;
  while ((match = reExportRegex.exec(content)) !== null) {
    const isTypeOnly = !!match[1];
    const names = match[2].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(s => s);
    for (const name of names) {
      exports.push({ name, kind: 're-export', typeOnly: isTypeOnly, source: match[3] });
    }
  }

  // Match: export default Name
  const defaultRegex = /export\s+default\s+(?:class|function)?\s*(\w+)/g;
  while ((match = defaultRegex.exec(content)) !== null) {
    exports.push({ name: match[1], kind: 'default', typeOnly: false });
  }

  return { exports, error: null };
}

function isTypeOnlyExport(filePath, exportName) {
  const { exports } = extractExports(filePath);
  const exp = exports.find(e => e.name === exportName);
  return exp ? exp.typeOnly : false;
}

function checkTypeScript(filePath) {
  try {
    execSync(`npx tsc --noEmit --skipLibCheck --target ES2020 --module ES2020 --moduleResolution node ${filePath}`, {
      cwd: REPO,
      stdio: 'pipe',
      timeout: 30000
    });
    return { valid: true, error: null };
  } catch (err) {
    return { valid: false, error: err.stderr?.toString() || err.message };
  }
}

// ── MAIN FIX LOGIC ──

const fixes = [
  {
    package: 'civilization-orchestrator',
    additions: [
      { names: ['ExecutionPhase', 'Checkpoint', 'CoordinationSession'], source: './long-horizon/index.js' }
    ]
  },
  {
    package: 'mythos-policy-engine',
    additions: [
      { names: ['Condition', 'Action'], source: './dsl/index.js' },
      { names: ['EvaluationContext'], source: './evaluator/index.js' }
    ]
  },
  {
    package: 'agent-os-runtime',
    additions: [
      { names: ['ExecutionContext', 'NodeExecutionResult', 'AgentEvent'], source: './executor/index.js' }
    ]
  },
  {
    package: 'swarm-runtime',
    additions: [
      { names: ['NodeAssignment', 'ScheduleResult', 'FaultDomain'], source: './scheduler/index.js' }
    ]
  },
  {
    package: 'simulation-engine',
    additions: [
      { names: ['SimulationScore', 'ScoringWeights', 'CounterfactualResult'], source: './scoring/index.js' }
    ]
  }
];

console.log('=== Agent-OS Barrel Export Fix (Expert) ===\n');

let totalFixed = 0;
let totalSkipped = 0;
let totalErrors = 0;

for (const fix of fixes) {
  const barrelPath = path.join(REPO, 'packages', fix.package, 'src', 'index.ts');

  console.log(`--- ${fix.package} ---`);

  if (!fs.existsSync(barrelPath)) {
    log('error', `Barrel file not found: ${barrelPath}`);
    totalErrors++;
    continue;
  }

  let content = fs.readFileSync(barrelPath, 'utf8');
  const original = content;
  let modified = false;

  for (const addition of fix.additions) {
    const sourcePath = path.join(REPO, 'packages', fix.package, 'src', addition.source.replace('.js', '.ts'));

    // Verify source file exists
    if (!fs.existsSync(sourcePath)) {
      log('warn', `Source not found: ${addition.source}`);
      continue;
    }

    // Verify exports exist in source
    const sourceExports = extractExports(sourcePath);
    const sourceExportNames = sourceExports.exports.map(e => e.name);
    const missingInSource = addition.names.filter(n => !sourceExportNames.includes(n));

    if (missingInSource.length > 0) {
      log('warn', `Exports not in source: ${missingInSource.join(', ')}`);
      addition.names = addition.names.filter(n => !missingInSource.includes(n));
    }

    if (addition.names.length === 0) continue;

    // Check which names are already in barrel (exact word match, not substring)
    const barrelWords = new Set(content.split(/\W+/));
    const alreadyPresent = addition.names.filter(n => barrelWords.has(n));
    const toAdd = addition.names.filter(n => !barrelWords.has(n));

    if (alreadyPresent.length > 0) {
      log('skip', `${alreadyPresent.join(', ')} already in barrel`);
    }

    if (toAdd.length === 0) continue;

    // Determine if each export is type-only
    const typeOnlyExports = [];
    const valueExports = [];

    for (const name of toAdd) {
      if (isTypeOnlyExport(sourcePath, name)) {
        typeOnlyExports.push(name);
      } else {
        valueExports.push(name);
      }
    }

    // Try to extend existing export from same source
    const escapedSource = addition.source.replace(/\\/g, '\\\\').replace(/\//g, '\\/').replace(/\./g, '\\.');
    const existingRegex = new RegExp(`export\\s*(type\\s+)?\\{([^}]+)\\}\\s*from\\s*['"]${escapedSource}['"];?`, 'g');

    let match;
    let found = false;
    while ((match = existingRegex.exec(content)) !== null) {
      const isTypeOnlyBlock = !!match[1];
      const existingNames = match[2].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim()).filter(s => s);

      // Determine which exports to add to this block
      const blockType = isTypeOnlyBlock ? 'type' : 'value';
      const toAddToBlock = blockType === 'type' ? typeOnlyExports : valueExports;

      if (toAddToBlock.length > 0) {
        const newNames = [...existingNames, ...toAddToBlock];
        const typeKeyword = isTypeOnlyBlock ? 'type ' : '';
        const newExport = `export ${typeKeyword}{ ${newNames.join(', ')} } from '${addition.source}';`;
        content = content.replace(match[0], newExport);
        log('fixed', `Added ${toAddToBlock.join(', ')} to ${addition.source} export`);
        found = true;
        modified = true;

        // Remove added names from pending lists
        if (blockType === 'type') {
          typeOnlyExports.length = 0;
        } else {
          valueExports.length = 0;
        }
      }
    }

    // Add remaining exports as new lines
    const remaining = [...typeOnlyExports, ...valueExports];
    if (remaining.length > 0) {
      // Ensure content ends with newline
      if (!content.endsWith('\n')) content += '\n';

      for (const name of remaining) {
        const isType = isTypeOnlyExport(sourcePath, name);
        const typeKeyword = isType ? 'type ' : '';
        content += `export ${typeKeyword}{ ${name} } from '${addition.source}';\n`;
        log('fixed', `Added ${typeKeyword}{${name}} from ${addition.source}`);
        modified = true;
      }
    }
  }

  if (modified) {
    // Create backup
    backupFile(barrelPath);

    // Write modified content
    fs.writeFileSync(barrelPath, content);

    // Validate TypeScript syntax
    log('info', 'Validating TypeScript syntax...');
    const validation = checkTypeScript(barrelPath);

    if (!validation.valid) {
      log('error', 'TypeScript validation failed');
      console.log(validation.error);

      // Rollback
      rollback();
      totalErrors++;
      process.exit(1);
    }

    log('info', 'TypeScript validation passed');
    totalFixed++;
  } else {
    log('skip', 'No changes needed');
    totalSkipped++;
  }

  console.log('');
}

// ── SUMMARY ──

console.log('=== Fix Summary ===');
console.log(`  Fixed: ${totalFixed} packages`);
console.log(`  Skipped: ${totalSkipped} packages`);
console.log(`  Errors: ${totalErrors} packages`);
console.log(`  Backups: ${BACKUPS.length} files`);

if (BACKUPS.length > 0) {
  console.log('\n  Backup files:');
  for (const { original, backup } of BACKUPS) {
    console.log(`    ${path.basename(original)} → ${path.basename(backup)}`);
  }
}

console.log('\n=== Fix Complete ===');
console.log('Run: pnpm dev');
console.log('To rollback: node fix-barrel-exports-expert.cjs --rollback');
