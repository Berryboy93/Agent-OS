#!/bin/bash
# AGENT-OS EVIDENCE REPORT
# Simple facts only - no guessing

cd ~/Agent-OS 2>/dev/null || { echo "ERROR: Cannot access ~/Agent-OS"; exit 1; }

echo "════════════════════════════════════════════════════════════"
echo "AGENT-OS EVIDENCE REPORT"
echo "Generated: $(date)"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "1. CRITICAL FILES"
echo "════════════════"
for f in package.json pnpm-workspace.yaml tsconfig.json vitest.config.ts pnpm-lock.yaml; do
  if [[ -f "$f" ]]; then
    echo "✓ $f ($(stat -f%z "$f" 2>/dev/null || stat -c%s "$f" 2>/dev/null) bytes)"
  else
    echo "✗ $f MISSING"
  fi
done
echo ""

echo "2. ACTUAL PACKAGES IN packages/"
echo "════════════════════════════════"
if [[ -d packages ]]; then
  ls -d packages/*/ 2>/dev/null | while read dir; do
    pkg=$(basename "$dir")
    if [[ -f "$dir/package.json" ]]; then
      echo "✓ $pkg/"
    else
      echo "✗ $pkg/ (NO package.json)"
    fi
  done
else
  echo "✗ packages/ directory NOT FOUND"
fi
echo ""

echo "3. ROOT DEPENDENCIES"
echo "═══════════════════"
if [[ -f package.json ]]; then
  echo "Dependencies:"
  jq '.dependencies | keys[]' package.json 2>/dev/null || echo "  (error reading)"
  echo ""
  echo "DevDependencies:"
  jq '.devDependencies | keys[]' package.json 2>/dev/null || echo "  (error reading)"
else
  echo "✗ package.json not found"
fi
echo ""

echo "4. PNPM WORKSPACE CATALOG"
echo "═════════════════════════"
if [[ -f pnpm-workspace.yaml ]]; then
  echo "Catalog entries:"
  awk '/^catalog:/,/^[a-z]/' pnpm-workspace.yaml | grep -E '^\s+[a-zA-Z]' | head -20
  echo ""
  local_count=$(awk '/^catalog:/,/^[a-z]/' pnpm-workspace.yaml | grep -E '^\s+[a-zA-Z]' | wc -l)
  echo "Total catalog entries: ~$local_count"
else
  echo "✗ pnpm-workspace.yaml not found"
fi
echo ""

echo "5. ACTUAL .ts/.tsx FILES"
echo "════════════════════════"
ts_count=$(find packages -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
echo "TypeScript files in packages/: $ts_count"
echo ""
echo "Sample files:"
find packages -name "*.ts" -o -name "*.tsx" 2>/dev/null | head -10
echo ""

echo "6. IMPORTS IN SOURCE CODE (samples)"
echo "════════════════════════════════════"
for pkg in rxjs typescript tone vite vitest axios express zod zustand; do
  count=$(find packages -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "from ['\"]$pkg" {} \; 2>/dev/null | wc -l)
  if [[ $count -gt 0 ]]; then
    echo "$pkg: imported in $count files"
  fi
done
echo ""

echo "7. node_modules STATE"
echo "════════════════════"
if [[ -d node_modules ]]; then
  echo "✓ node_modules exists"
  echo "  Size: $(du -sh node_modules 2>/dev/null | cut -f1)"
  echo "  Packages: $(ls -1 node_modules 2>/dev/null | wc -l)"
else
  echo "✗ node_modules NOT found (dependencies may not be installed)"
fi
echo ""

echo "8. GIT STATUS"
echo "═════════════"
if [[ -d .git ]]; then
  echo "✓ Git repository"
  git log --oneline -1 2>/dev/null
  echo "Current branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
else
  echo "✗ Not a git repository"
fi
echo ""

echo "════════════════════════════════════════════════════════════"
echo "END EVIDENCE REPORT"
echo "════════════════════════════════════════════════════════════"
