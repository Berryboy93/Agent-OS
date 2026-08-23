#!/usr/bin/env node
/**
 * Agent-OS Type-Only Export Fix
 * 
 * Problem: Barrel files import type-only exports (interfaces, types) using
 * `export { Name } from './module'` which fails at runtime because interfaces
 * and types are stripped during transpilation.
 * 
 * Fix: Detect type-only exports in source files and use `export type { Name }`
 * in barrel files.
 */

const fs = require('fs');
const path = require('path');

const REPO = '/home/r3v/Agent-OS';

// Map of packages and their barrel -> source modules with type-only exports
const typeOnlyExports = {
  'civilization-orchestrator': {
    barrel: 'src/index.ts',
    sources: {
      './long-horizon/index.js': ['ExecutionStrategy', 'ExecutionPhase', 'Checkpoint', 'LongHorizonGoal', 'GoalConstraint']
    }
  },
  'mythos-policy-engine': {
    barrel: 'src/index.ts',
    sources: {
      './dsl/index.js': ['ParsedPolicy', 'ParsedRule', 'Condition', 'Action']
    }
  },
  'agent-os-runtime': {
    barrel: 'src/index.ts',
    sources: {
      './sandbox/index.js': ['SandboxResult', 'SandboxConfig']
    }
  },
  'swarm-runtime': {
    barrel: 'src/index.ts',
    sources: {
      './orchestrator/index.js': ['SwarmConfig']
    }
  }
};

function isTypeOnlyExport(sourcePath, exportName) {
  if (!fs.existsSync(sourcePath)) return false;

  const content = fs.readFileSync(sourcePath, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if this line defines the export and is type-only
    if (line.includes(exportName)) {
      // Check for interface, type, or enum declarations
      if (/^\s*export\s+interface\s+/.test(line) && line.includes(exportName)) {
        return true;
      }
      if (/^\s*export\s+type\s+/.test(line) && line.includes(exportName)) {
        return true;
      }
      // Check multi-line type declarations
      if (/^\s*export\s+type\s+/.test(line)) {
        // Check next few lines for the name
        for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          if (lines[j].includes(exportName)) return true;
        }
      }
    }
  }

  return false;
}

console.log('=== Agent-OS Type-Only Export Fix ===\n');

for (const [pkg, config] of Object.entries(typeOnlyExports)) {
  const barrelPath = path.join(REPO, 'packages', pkg, config.barrel);

  if (!fs.existsSync(barrelPath)) {
    console.log(`[SKIP] ${pkg}: barrel not found`);
    continue;
  }

  console.log(`--- ${pkg} ---`);

  let content = fs.readFileSync(barrelPath, 'utf8');
  const original = content;
  let modified = false;

  for (const [sourceModule, exports] of Object.entries(config.sources)) {
    const sourcePath = path.join(REPO, 'packages', pkg, sourceModule.replace('.js', '.ts'));

    if (!fs.existsSync(sourcePath)) {
      console.log(`  [WARN] Source not found: ${sourceModule}`);
      continue;
    }

    for (const exportName of exports) {
      // Check if this is a type-only export
      const isTypeOnly = isTypeOnlyExport(sourcePath, exportName);

      if (!isTypeOnly) {
        console.log(`  [SKIP] ${exportName} is a runtime export`);
        continue;
      }

      // Check if barrel already has correct export
      const hasTypeExport = new RegExp(`export\\s+type\\s+\\{[^}]*\\b${exportName}\\b[^}]*\\}\\s+from\\s+['"]${sourceModule.replace(/\//g, '\\/')}['"];?`).test(content);
      const hasValueExport = new RegExp(`export\\s+\\{[^}]*\\b${exportName}\\b[^}]*\\}\\s+from\\s+['"]${sourceModule.replace(/\//g, '\\/')}['"];?`).test(content);

      if (hasTypeExport) {
        console.log(`  [OK] ${exportName} already has type export`);
        continue;
      }

      if (hasValueExport) {
        // Convert to type export
        const regex = new RegExp(
          `export\\s+\\{([^}]*)\\b${exportName}\\b([^}]*)\\}\\s+from\\s+(['"])${sourceModule.replace(/\//g, '\\/')}\\3;?`,
          'g'
        );

        content = content.replace(regex, (match, before, after, quote) => {
          const allExports = (before + exportName + after).split(',').map(s => s.trim()).filter(s => s);

          // Separate type-only and value exports
          const typeExports = [];
          const valueExports = [];

          for (const exp of allExports) {
            const expName = exp.split(/\s+as\s+/)[0].trim();
            if (isTypeOnlyExport(sourcePath, expName)) {
              typeExports.push(exp);
            } else {
              valueExports.push(exp);
            }
          }

          let result = '';
          if (valueExports.length > 0) {
            result += `export { ${valueExports.join(', ')} } from ${quote}${sourceModule}${quote};`;
          }
          if (typeExports.length > 0) {
            if (result) result += '\n';
            result += `export type { ${typeExports.join(', ')} } from ${quote}${sourceModule}${quote};`;
          }

          return result;
        });

        console.log(`  [FIXED] Converted ${exportName} to type export`);
        modified = true;
      } else {
        console.log(`  [WARN] ${exportName} not found in barrel`);
      }
    }
  }

  if (modified) {
    // Backup
    const backupPath = barrelPath + '.type-fix.bak';
    fs.writeFileSync(backupPath, original);

    // Write
    fs.writeFileSync(barrelPath, content);
    console.log(`  [SAVED] Backup: ${path.basename(backupPath)}`);
  } else {
    console.log(`  [SKIP] No changes needed`);
  }

  console.log('');
}

console.log('=== Fix Complete ===');
console.log('Run: pnpm dev');
