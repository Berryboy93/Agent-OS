#!/usr/bin/env node
/**
 * Simple Type-Only Export Fix
 * 
 * Directly replaces runtime exports with type-only exports for interfaces/types
 */

const fs = require('fs');
const path = require('path');

const REPO = '/home/r3v/Agent-OS';

// Map of barrel files and their type-only exports
const fixes = [
  {
    file: 'packages/civilization-orchestrator/src/index.ts',
    typeOnlyExports: ['ExecutionStrategy', 'ExecutionPhase', 'Checkpoint', 'LongHorizonGoal', 'GoalConstraint']
  },
  {
    file: 'packages/mythos-policy-engine/src/index.ts',
    typeOnlyExports: ['ParsedPolicy', 'ParsedRule', 'Condition', 'Action', 'PolicyDecision']
  },
  {
    file: 'packages/agent-os-runtime/src/index.ts',
    typeOnlyExports: ['SandboxResult', 'SandboxConfig', 'AgentProfile', 'Capability']
  },
  {
    file: 'packages/swarm-runtime/src/index.ts',
    typeOnlyExports: ['SwarmConfig']
  }
];

function isTypeOnlyExport(filePath, exportName) {
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(exportName)) {
      // Check for interface declaration
      if (/^\s*export\s+interface\s+/.test(line) && line.includes(exportName)) {
        return true;
      }
      // Check for type declaration
      if (/^\s*export\s+type\s+/.test(line) && line.includes(exportName)) {
        return true;
      }
      // Check for type re-export
      if (/^\s*export\s+type\s*\{/.test(line)) {
        const match = line.match(/export\s+type\s*\{([^}]+)\}/);
        if (match && match[1].includes(exportName)) {
          return true;
        }
      }
    }
  }

  return false;
}

console.log('=== Simple Type-Only Export Fix ===\n');

for (const fix of fixes) {
  const filePath = path.join(REPO, fix.file);

  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] ${fix.file} not found`);
    continue;
  }

  console.log(`--- ${fix.file} ---`);

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let modified = false;

  // Find all export { ... } from './module' statements
  const exportRegex = /export\s*\{([^}]+)\}\s*from\s*(['"][^'"]+['"]);?/g;
  let match;

  while ((match = exportRegex.exec(original)) !== null) {
    const fullMatch = match[0];
    const exportList = match[1];
    const sourceModule = match[2];
    const sourcePath = path.join(path.dirname(filePath), sourceModule.replace(/['"]/g, '').replace('.js', '.ts'));

    // Parse export names
    const names = exportList.split(',').map(s => s.trim()).filter(s => s);

    // Check which are type-only
    const typeOnlyNames = [];
    const valueNames = [];

    for (const name of names) {
      if (fix.typeOnlyExports.includes(name) || isTypeOnlyExport(sourcePath, name)) {
        typeOnlyNames.push(name);
      } else {
        valueNames.push(name);
      }
    }

    if (typeOnlyNames.length > 0) {
      // Build replacement
      let replacement = '';

      if (valueNames.length > 0) {
        replacement += `export { ${valueNames.join(', ')} } from ${sourceModule};`;
      }

      if (replacement) replacement += '\n';

      replacement += `export type { ${typeOnlyNames.join(', ')} } from ${sourceModule};`;

      // Replace in content
      content = content.replace(fullMatch, replacement);
      modified = true;

      console.log(`  [FIXED] ${typeOnlyNames.join(', ')} → type export from ${sourceModule}`);
    }
  }

  if (modified) {
    // Backup
    const backupPath = filePath + '.type-fix.bak';
    fs.writeFileSync(backupPath, original);

    // Write
    fs.writeFileSync(filePath, content);
    console.log(`  [SAVED] Backup: ${path.basename(backupPath)}`);
  } else {
    console.log(`  [SKIP] No changes needed`);
  }

  console.log('');
}

console.log('=== Fix Complete ===');
console.log('Run: pnpm dev');
