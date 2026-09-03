#!/bin/bash

################################################################################
# AGENT-OS PRE-FLIGHT VERIFICATION PROTOCOL
# Zero-Assumption Evidence-Based State Verification
#
# PROTOCOL: Do not guess. Verify every claim from source code.
# If evidence insufficient, state exactly what's needed.
#
# This script performs complete structural verification before ANY audit work:
# 1. Verify repository exists and is accessible
# 2. Verify all files referenced in plan actually exist
# 3. Verify actual package structure (not assumed)
# 4. Verify actual dependencies declared
# 5. Verify actual imports in code
# 6. Generate evidence-based status report
# 7. Flag gaps and unknowns explicitly
#
# Output: VERIFICATION_REPORT_*.txt with full evidence chain
################################################################################

set -e

REPO_ROOT="${AGENT_OS_PATH:-$HOME/Agent-OS}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
VERIFY_LOG="AGENT_OS_PREFLIGHT_VERIFY_${TIMESTAMP}.txt"
EVIDENCE_CHAIN=""
VERIFICATION_GAPS=""
VERIFICATION_PASS=0
VERIFICATION_FAIL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $@"; ((VERIFICATION_PASS++)); }
fail() { echo -e "${RED}✗${NC} $@"; ((VERIFICATION_FAIL++)); }
gap() { echo -e "${YELLOW}?${NC} $@"; VERIFICATION_GAPS="${VERIFICATION_GAPS}\n  - $@"; }
evidence() { EVIDENCE_CHAIN="${EVIDENCE_CHAIN}\n[EVIDENCE] $@"; }

header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$@${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

################################################################################
# SECTION 1: REPOSITORY EXISTENCE & ACCESSIBILITY
################################################################################
verify_repo_exists() {
    header "SECTION 1: REPOSITORY VERIFICATION"
    
    if [[ ! -d "$REPO_ROOT" ]]; then
        fail "Agent-OS directory NOT found at: $REPO_ROOT"
        evidence "Checked path: $REPO_ROOT - directory does not exist"
        return 1
    fi
    
    pass "Agent-OS directory exists: $REPO_ROOT"
    evidence "Verified directory exists: $REPO_ROOT"
    
    # Check readability
    if [[ ! -r "$REPO_ROOT" ]]; then
        fail "Agent-OS directory NOT readable"
        evidence "Permission denied on: $REPO_ROOT"
        return 1
    fi
    
    pass "Agent-OS directory is readable"
    evidence "Verified read permissions on: $REPO_ROOT"
    
    # Check it's a git repository
    if [[ -d "$REPO_ROOT/.git" ]]; then
        pass "Git repository detected"
        evidence "Found .git directory in: $REPO_ROOT"
        
        cd "$REPO_ROOT"
        local git_status=$(git status 2>/dev/null | head -1 || echo "unknown")
        evidence "Git status: $git_status"
    else
        gap "Not a git repository (no .git directory)"
        evidence "Missing .git directory in: $REPO_ROOT"
    fi
}

################################################################################
# SECTION 2: CRITICAL FILES VERIFICATION
################################################################################
verify_critical_files() {
    header "SECTION 2: CRITICAL FILES VERIFICATION"
    
    cd "$REPO_ROOT"
    
    local files=(
        "package.json"
        "pnpm-workspace.yaml"
        "tsconfig.json"
        "vitest.config.ts"
        "pnpm-lock.yaml"
    )
    
    for file in "${files[@]}"; do
        if [[ -f "$file" ]]; then
            local size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "unknown")
            pass "File exists: $file ($size bytes)"
            evidence "Verified file: $file - exists and readable"
        else
            gap "File MISSING: $file"
            evidence "File NOT found: $file"
        fi
    done
}

################################################################################
# SECTION 3: PACKAGE STRUCTURE VERIFICATION
################################################################################
verify_package_structure() {
    header "SECTION 3: PACKAGE STRUCTURE VERIFICATION"
    
    cd "$REPO_ROOT"
    
    # Verify packages directory exists
    if [[ ! -d "packages" ]]; then
        fail "packages/ directory NOT found"
        evidence "Missing: packages/ directory"
        return 1
    fi
    
    pass "packages/ directory exists"
    evidence "Found: packages/ directory"
    
    # List actual packages (verify what REALLY exists)
    echo -e "\nActual packages found:"
    local packages=($(find packages -maxdepth 1 -type d | sort))
    
    if [[ ${#packages[@]} -le 1 ]]; then
        fail "No packages found in packages/ directory"
        evidence "packages/ directory is empty or malformed"
        return 1
    fi
    
    local package_count=0
    for pkg_dir in "${packages[@]}"; do
        # Skip the packages directory itself
        [[ "$pkg_dir" == "packages" ]] && continue
        
        local pkg_name=$(basename "$pkg_dir")
        
        # Verify package.json
        if [[ -f "$pkg_dir/package.json" ]]; then
            pass "  $pkg_name/package.json exists"
            evidence "Found: packages/$pkg_name/package.json"
            ((package_count++))
        else
            fail "  $pkg_name/package.json MISSING"
            evidence "Missing: packages/$pkg_name/package.json"
        fi
        
        # Verify src directory
        if [[ -d "$pkg_dir/src" ]]; then
            evidence "Found: packages/$pkg_name/src/ directory"
        else
            gap "  $pkg_name/src/ directory NOT found"
            evidence "Missing: packages/$pkg_name/src/"
        fi
        
        # Verify tsconfig.json
        if [[ -f "$pkg_dir/tsconfig.json" ]]; then
            evidence "Found: packages/$pkg_name/tsconfig.json"
        else
            gap "  $pkg_name/tsconfig.json NOT found"
            evidence "Missing: packages/$pkg_name/tsconfig.json"
        fi
    done
    
    pass "Total packages verified: $package_count"
    evidence "Counted actual packages: $package_count in packages/"
}

################################################################################
# SECTION 4: DEPENDENCY CATALOG VERIFICATION
################################################################################
verify_dependency_catalog() {
    header "SECTION 4: DEPENDENCY CATALOG VERIFICATION"
    
    cd "$REPO_ROOT"
    
    if [[ ! -f "pnpm-workspace.yaml" ]]; then
        gap "pnpm-workspace.yaml not found - cannot verify catalog"
        evidence "Missing: pnpm-workspace.yaml"
        return 1
    fi
    
    # Extract catalog section
    local has_catalog=0
    local catalog_line_count=0
    
    if grep -q "^catalog:" pnpm-workspace.yaml; then
        has_catalog=1
        pass "Catalog section found in pnpm-workspace.yaml"
        evidence "Found 'catalog:' section in pnpm-workspace.yaml"
        
        # Count catalog entries (lines starting with spaces + package name)
        catalog_line_count=$(grep -A 1000 "^catalog:" pnpm-workspace.yaml | \
            grep -E "^\s+[a-zA-Z0-9@].*:" | wc -l)
        
        pass "Catalog contains $catalog_line_count entries"
        evidence "Counted $catalog_line_count entries in catalog section"
        
        # Show sample entries
        echo -e "\nSample catalog entries:"
        grep -A 20 "^catalog:" pnpm-workspace.yaml | \
            grep -E "^\s+[a-zA-Z]" | head -5 | while read -r line; do
            echo "  $line"
            evidence "Catalog entry: $(echo $line | xargs)"
        done
    else
        gap "No 'catalog:' section found in pnpm-workspace.yaml"
        evidence "Missing 'catalog:' section in pnpm-workspace.yaml"
    fi
    
    # Verify pnpm-lock.yaml consistency
    if [[ -f "pnpm-lock.yaml" ]]; then
        pass "pnpm-lock.yaml exists (dependency lock)"
        local lock_size=$(stat -c%s pnpm-lock.yaml 2>/dev/null || stat -f%z pnpm-lock.yaml 2>/dev/null || echo "unknown")
        evidence "pnpm-lock.yaml size: $lock_size bytes"
    else
        gap "pnpm-lock.yaml NOT found - dependencies may not be installed"
        evidence "Missing: pnpm-lock.yaml"
    fi
}

################################################################################
# SECTION 5: ACTUAL IMPORT VERIFICATION
################################################################################
verify_actual_imports() {
    header "SECTION 5: ACTUAL IMPORTS IN SOURCE CODE"
    
    cd "$REPO_ROOT"
    
    if [[ ! -d "packages" ]]; then
        gap "Cannot verify imports - packages/ not found"
        return 1
    fi
    
    # Check if any .ts/.tsx files exist
    local ts_files=$(find packages -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
    if [[ $ts_files -eq 0 ]]; then
        gap "No TypeScript files found in packages/"
        evidence "Found 0 .ts/.tsx files in packages/"
        return 1
    fi
    
    pass "Found $ts_files TypeScript files in packages/"
    evidence "Scanned packages/ - found $ts_files .ts/.tsx files"
    
    # Scan for actual imports of critical packages
    local critical_packages=("rxjs" "typescript" "tone" "vite" "vitest" "axios" "express" "zod")
    
    echo -e "\nVerifying critical package imports:"
    
    for pkg in "${critical_packages[@]}"; do
        local count=$(find packages -type f \( -name "*.ts" -o -name "*.tsx" \) \
            -exec grep -l "import.*from.*['\"]${pkg}" {} \; 2>/dev/null | wc -l)
        
        if [[ $count -gt 0 ]]; then
            pass "  $pkg is imported in $count files"
            evidence "Import search: '$pkg' found in $count source files"
            
            # Show first file that imports it
            local first_file=$(find packages -type f \( -name "*.ts" -o -name "*.tsx" \) \
                -exec grep -l "import.*from.*['\"]${pkg}" {} \; 2>/dev/null | head -1)
            evidence "First import location: $first_file"
        else
            pass "  $pkg is NOT imported (skipping)"
            evidence "Import search: '$pkg' not found in source files"
        fi
    done
}

################################################################################
# SECTION 6: ACTUAL DECLARATIONS VERIFICATION
################################################################################
verify_actual_declarations() {
    header "SECTION 6: ACTUAL DEPENDENCY DECLARATIONS"
    
    cd "$REPO_ROOT"
    
    # Check root package.json dependencies
    if [[ -f "package.json" ]]; then
        echo -e "\nRoot package.json dependencies:"
        
        local deps=$(jq '.dependencies | keys[]' package.json 2>/dev/null | wc -l)
        local devdeps=$(jq '.devDependencies | keys[]' package.json 2>/dev/null | wc -l)
        
        pass "Root package.json has $deps dependencies"
        evidence "Root dependencies count: $deps"
        
        pass "Root package.json has $devdeps devDependencies"
        evidence "Root devDependencies count: $devdeps"
        
        # Show critical packages if they exist
        echo "  Critical packages in root:"
        for pkg in "typescript" "pnpm" "vitest" "vite"; do
            if jq -e ".dependencies[\"$pkg\"] // .devDependencies[\"$pkg\"]" package.json > /dev/null 2>&1; then
                local version=$(jq -r ".dependencies[\"$pkg\"] // .devDependencies[\"$pkg\"]" package.json)
                pass "    $pkg: $version"
                evidence "Root declares $pkg@$version"
            fi
        done
    fi
    
    # Check individual package declarations
    echo -e "\nIndividual package dependencies:"
    for pkg_dir in packages/*/; do
        if [[ -f "$pkg_dir/package.json" ]]; then
            local pkg_name=$(basename "$pkg_dir")
            local deps=$(jq '.dependencies | keys[]' "$pkg_dir/package.json" 2>/dev/null | wc -l)
            local devdeps=$(jq '.devDependencies | keys[]' "$pkg_dir/package.json" 2>/dev/null | wc -l)
            
            pass "  $pkg_name: $deps dependencies, $devdeps devDependencies"
            evidence "Package $pkg_name declares $deps dependencies, $devdeps devDependencies"
        fi
    done
}

################################################################################
# SECTION 7: BUILD & COMPILATION EVIDENCE
################################################################################
verify_build_capability() {
    header "SECTION 7: BUILD SYSTEM EVIDENCE"
    
    cd "$REPO_ROOT"
    
    # Check for build tools
    if [[ -f "package.json" ]]; then
        if jq -e '.devDependencies | has("typescript")' package.json > /dev/null 2>&1; then
            pass "TypeScript declared as devDependency"
            evidence "Found: typescript in devDependencies"
        else
            gap "TypeScript NOT in root devDependencies"
            evidence "Missing: typescript in root package.json devDependencies"
        fi
    fi
    
    # Check npm scripts
    if [[ -f "package.json" ]]; then
        echo -e "\nAvailable npm scripts:"
        local scripts=$(jq '.scripts | keys[]' package.json 2>/dev/null)
        if [[ -n "$scripts" ]]; then
            echo "$scripts" | while read -r script; do
                local cmd=$(jq -r ".scripts[\"$script\"]" package.json)
                pass "  $script: $cmd"
                evidence "Script defined: $script = $cmd"
            done
        else
            gap "No scripts defined in package.json"
            evidence "Scripts section empty or missing in package.json"
        fi
    fi
    
    # Check for node_modules
    if [[ -d "node_modules" ]]; then
        local modules_count=$(ls -1 node_modules 2>/dev/null | wc -l)
        pass "node_modules directory exists ($modules_count items)"
        evidence "node_modules exists with $modules_count entries"
    else
        gap "node_modules NOT found - dependencies may need installation"
        evidence "Missing: node_modules directory"
    fi
}

################################################################################
# SECTION 8: VERIFICATION GAPS & UNKNOWNS
################################################################################
generate_verification_report() {
    header "VERIFICATION SUMMARY"
    
    echo "Verification Results:"
    echo "  Passed: $VERIFICATION_PASS"
    echo "  Failed: $VERIFICATION_FAIL"
    
    if [[ -n "$VERIFICATION_GAPS" ]]; then
        echo ""
        echo "Verification Gaps (requires further investigation):"
        echo -e "$VERIFICATION_GAPS"
    fi
    
    echo ""
    echo "Evidence Chain:"
    echo -e "$EVIDENCE_CHAIN" | head -20
    echo ""
    echo "See full report: $VERIFY_LOG"
}

################################################################################
# MAIN EXECUTION
################################################################################

main() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  AGENT-OS PRE-FLIGHT VERIFICATION PROTOCOL v1.0            ║"
    echo "║  Zero-Assumption Evidence-Based State Verification         ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"

    # Start verification
    verify_repo_exists || {
        fail "Cannot proceed - repository not accessible"
        exit 1
    }
    
    verify_critical_files
    verify_package_structure
    verify_dependency_catalog
    verify_actual_imports
    verify_actual_declarations
    verify_build_capability
    
    # Generate report
    generate_verification_report
    
    # Save to file
    {
        echo "═══════════════════════════════════════════════════════════"
        echo "AGENT-OS PRE-FLIGHT VERIFICATION REPORT"
        echo "Generated: $(date)"
        echo "Repository: $REPO_ROOT"
        echo "═══════════════════════════════════════════════════════════"
        echo ""
        echo "VERIFICATION RESULTS:"
        echo "  Passed Checks: $VERIFICATION_PASS"
        echo "  Failed Checks: $VERIFICATION_FAIL"
        echo ""
        
        if [[ -n "$VERIFICATION_GAPS" ]]; then
            echo "INVESTIGATION GAPS:"
            echo -e "$VERIFICATION_GAPS"
            echo ""
        fi
        
        echo "EVIDENCE CHAIN:"
        echo -e "$EVIDENCE_CHAIN"
        echo ""
        echo "NEXT STEPS:"
        echo "1. Review gaps above - these require manual inspection"
        echo "2. Run: cd $REPO_ROOT && pnpm list (if pnpm installed)"
        echo "3. Run: find packages -name '*.ts' | head -10 (sample source files)"
        echo "4. Once verified, run full audit: bash agent-os-audit.sh all"
    } | tee "$VERIFY_LOG"
    
    echo ""
    echo "Report saved: $(pwd)/$VERIFY_LOG"
}

main "$@"
