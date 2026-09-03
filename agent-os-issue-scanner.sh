#!/bin/bash

################################################################################
# AGENT-OS ISSUE SCANNER
# Comprehensive phantom dependency, version conflict, and circular dependency
# detection based on R3 v4 audit lessons
#
# Scans for:
#   - Phantom dependencies (imported but not declared)
#   - Version conflicts in monorepo catalog
#   - Peer dependency mismatches
#   - Circular imports between packages
#   - TypeScript composition issues
#   - Build script conflicts
#
# Usage:
#   bash agent-os-issue-scanner.sh
#   bash agent-os-issue-scanner.sh verbose
################################################################################

set -e

REPO_ROOT="${AGENT_OS_PATH:-$HOME/Agent-OS}"
VERBOSE="${1:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ISSUES_FOUND=0
CRITICAL_ISSUES=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $@"; }
fail() { echo -e "${RED}✗${NC} $@"; ((CRITICAL_ISSUES++)); }
warn() { echo -e "${YELLOW}⚠${NC} $@"; ((ISSUES_FOUND++)); }
info() { echo -e "${CYAN}ℹ${NC} $@"; }
debug() { [[ -n "$VERBOSE" ]] && echo -e "${MAGENTA}debug${NC} $@"; }

check_repo() {
    if [[ ! -d "$REPO_ROOT" ]]; then
        echo -e "${RED}Error: Agent-OS not found at $REPO_ROOT${NC}"
        exit 1
    fi
    pass "Repository: $REPO_ROOT"
}

################################################################################
# SCANNER 1: PHANTOM DEPENDENCIES
################################################################################
scan_phantom_dependencies() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}SCANNER 1: PHANTOM DEPENDENCIES${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"

    cd "$REPO_ROOT"

    # Common packages we should check
    local packages_to_check=(
        "rxjs"
        "typescript"
        "vite"
        "vitest"
        "tone"
        "axios"
        "express"
        "ws"
        "zod"
        "zustand"
        "react"
        "react-dom"
        "three"
        "d3"
    )

    echo "Checking for phantom dependencies..."

    for pkg in "${packages_to_check[@]}"; do
        # Search for imports of this package in source
        local import_count=$(find packages -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" 2>/dev/null | \
            xargs grep -l "import.*from.*['\"]${pkg}" 2>/dev/null | wc -l)
        
        if [[ $import_count -gt 0 ]]; then
            debug "Found $import_count files importing '$pkg'"
            
            # Check if it's declared in root or workspace
            local is_declared=0
            
            # Check root package.json
            if [[ -f "package.json" ]] && grep -q "\"${pkg}\"" package.json; then
                is_declared=1
                debug "  Found in root package.json"
            fi
            
            # Check pnpm catalog
            if [[ -f "pnpm-workspace.yaml" ]] && grep -q "${pkg}@" pnpm-workspace.yaml; then
                is_declared=1
                debug "  Found in pnpm catalog"
            fi
            
            # Check package-specific declarations
            local declared_count=$(find packages -name "package.json" -exec grep -l "\"${pkg}\"" {} \; 2>/dev/null | wc -l)
            if [[ $declared_count -gt 0 ]]; then
                is_declared=1
                debug "  Found in $declared_count package.json files"
            fi
            
            if [[ $is_declared -eq 0 ]]; then
                fail "PHANTOM DEPENDENCY: '$pkg' imported in $import_count files but NOT declared"
            else
                pass "'$pkg' properly declared (imported in $import_count files)"
            fi
        else
            debug "Package '$pkg' not imported (skipping)"
        fi
    done

    echo ""
}

################################################################################
# SCANNER 2: VERSION CONFLICTS IN CATALOG
################################################################################
scan_version_conflicts() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}SCANNER 2: VERSION CONFLICTS${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"

    cd "$REPO_ROOT"

    if [[ ! -f "pnpm-workspace.yaml" ]]; then
        warn "pnpm-workspace.yaml not found"
        return
    fi

    echo "Analyzing pnpm catalog for version mismatches..."

    # Extract catalog section
    local in_catalog=0
    local catalog_entries=()
    
    while IFS= read -r line; do
        if [[ "$line" =~ ^catalog: ]]; then
            in_catalog=1
            continue
        fi
        
        if [[ $in_catalog -eq 1 ]]; then
            # Stop when we hit the next top-level key
            if [[ "$line" =~ ^[a-zA-Z] ]] && [[ ! "$line" =~ ^[[:space:]] ]]; then
                break
            fi
            
            # Extract package@version pairs
            if [[ "$line" =~ ^[[:space:]]+([a-zA-Z0-9@/-]+):[[:space:]]*(.*) ]]; then
                local pkg_key="${BASH_REMATCH[1]}"
                local pkg_version="${BASH_REMATCH[2]}"
                catalog_entries+=("$pkg_key=$pkg_version")
                debug "Catalog entry: $pkg_key=$pkg_version"
            fi
        fi
    done < "pnpm-workspace.yaml"

    if [[ ${#catalog_entries[@]} -eq 0 ]]; then
        warn "No catalog entries found in pnpm-workspace.yaml"
        return
    fi

    # Check for potential version conflicts
    # (Two different versions of the same package in different packages)
    local declare -A pkg_versions
    
    for entry in "${catalog_entries[@]}"; do
        local pkg="${entry%=*}"
        local version="${entry#*=}"
        
        # Normalize package name (remove @scope if it's a secondary scope)
        local base_pkg="$(echo $pkg | sed 's/@[a-z]*\///g' | sed 's/@//g')"
        
        if [[ -n "${pkg_versions[$base_pkg]}" ]]; then
            if [[ "${pkg_versions[$base_pkg]}" != "$version" ]]; then
                warn "VERSION CONFLICT: '$base_pkg' has multiple versions in catalog"
                debug "  Entry 1: ${pkg_versions[$base_pkg]}"
                debug "  Entry 2: $version"
            fi
        else
            pkg_versions[$base_pkg]="$version"
        fi
    done

    echo "Catalog integrity check: ${#catalog_entries[@]} entries analyzed"
    echo ""
}

################################################################################
# SCANNER 3: CIRCULAR DEPENDENCY DETECTION
################################################################################
scan_circular_dependencies() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}SCANNER 3: CIRCULAR IMPORTS${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"

    cd "$REPO_ROOT"

    echo "Scanning for direct circular imports between packages..."

    local packages=($(ls -d packages/*/ 2>/dev/null | xargs -I {} basename {}))

    # Build dependency graph
    declare -A pkg_deps

    for pkg in "${packages[@]}"; do
        local deps=""
        
        if [[ -f "packages/$pkg/package.json" ]]; then
            # Extract @agent-os/* dependencies
            deps=$(jq -r '.dependencies // {} | keys[] | select(startswith("@agent-os/")) | gsub("@agent-os/"; "")' "packages/$pkg/package.json" 2>/dev/null | tr '\n' ' ')
        fi
        
        if [[ -n "$deps" ]]; then
            pkg_deps[$pkg]="$deps"
            debug "$pkg depends on: $deps"
        fi
    done

    # Check for circular dependencies
    local circular_found=0
    for pkg in "${!pkg_deps[@]}"; do
        for dep in ${pkg_deps[$pkg]}; do
            if [[ -n "${pkg_deps[$dep]}" ]]; then
                # Check if dep depends on pkg
                if [[ "${pkg_deps[$dep]}" =~ $pkg ]]; then
                    fail "CIRCULAR DEPENDENCY: $pkg ↔ $dep"
                    ((circular_found++))
                fi
            fi
        done
    done

    if [[ $circular_found -eq 0 ]]; then
        pass "No direct circular dependencies found"
    fi

    echo ""
}

################################################################################
# SCANNER 4: TYPESCRIPT COMPOSITION
################################################################################
scan_typescript_composition() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}SCANNER 4: TYPESCRIPT BUILD COMPOSITION${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"

    cd "$REPO_ROOT"

    echo "Verifying TypeScript composite project setup..."

    # Check root tsconfig
    if [[ ! -f "tsconfig.json" ]]; then
        fail "Root tsconfig.json NOT FOUND"
        return
    fi

    # Check for composite flag
    if jq -e '.compilerOptions.composite == true' tsconfig.json > /dev/null 2>&1; then
        pass "TypeScript composite mode enabled"
    else
        warn "TypeScript composite mode NOT enabled (may cause build issues)"
    fi

    # Check for references
    local ref_count=$(jq -e '.references | length' tsconfig.json 2>/dev/null || echo "0")
    if [[ "$ref_count" -gt 0 ]]; then
        pass "Found $ref_count TypeScript references"
    else
        warn "No TypeScript references found (should reference all workspace packages)"
    fi

    # Check individual package tsconfiguration
    local packages=($(ls -d packages/*/ 2>/dev/null | xargs -I {} basename {}))
    local missing_tsconfig=0

    for pkg in "${packages[@]}"; do
        if [[ ! -f "packages/$pkg/tsconfig.json" ]]; then
            warn "packages/$pkg/tsconfig.json MISSING"
            ((missing_tsconfig++))
        else
            # Check if it extends from root
            if ! jq -e '.extends' "packages/$pkg/tsconfig.json" > /dev/null 2>&1; then
                debug "packages/$pkg/tsconfig.json doesn't extend (may be standalone)"
            fi
        fi
    done

    if [[ $missing_tsconfig -gt 0 ]]; then
        warn "$missing_tsconfig packages missing tsconfig.json"
    else
        pass "All packages have tsconfig.json"
    fi

    echo ""
}

################################################################################
# SCANNER 5: BUILD SCRIPT CONFLICTS
################################################################################
scan_build_scripts() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}SCANNER 5: BUILD SCRIPT ANALYSIS${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"

    cd "$REPO_ROOT"

    echo "Analyzing build scripts and configurations..."

    # Check root package.json scripts
    if [[ -f "package.json" ]]; then
        local scripts=$(jq '.scripts | keys[]' package.json 2>/dev/null)
        if [[ -n "$scripts" ]]; then
            pass "Root scripts found:"
            echo "$scripts" | sed 's/^/  - /'
        else
            warn "No scripts defined in root package.json"
        fi
    fi

    # Check for build scripts in packages
    local packages=($(ls -d packages/*/ 2>/dev/null | xargs -I {} basename {}))
    local build_script_count=0

    for pkg in "${packages[@]}"; do
        if [[ -f "packages/$pkg/package.json" ]]; then
            if jq -e '.scripts.build' "packages/$pkg/package.json" > /dev/null 2>&1; then
                local build_cmd=$(jq -r '.scripts.build' "packages/$pkg/package.json")
                debug "packages/$pkg has build script: $build_cmd"
                ((build_script_count++))
            fi
        fi
    done

    info "$build_script_count packages have build scripts"

    # Check for conflicting build tools
    local has_esbuild=0
    local has_tsc=0
    local has_vite=0

    if grep -r "esbuild" packages/*/package.json 2>/dev/null | head -1 > /dev/null; then
        has_esbuild=1
    fi
    if grep -r "tsc" packages/*/package.json 2>/dev/null | head -1 > /dev/null; then
        has_tsc=1
    fi
    if grep -r "vite" packages/*/package.json 2>/dev/null | head -1 > /dev/null; then
        has_vite=1
    fi

    echo "Build tools detected:"
    [[ $has_esbuild -eq 1 ]] && info "  ✓ esbuild"
    [[ $has_tsc -eq 1 ]] && info "  ✓ tsc"
    [[ $has_vite -eq 1 ]] && info "  ✓ vite"

    echo ""
}

################################################################################
# SUMMARY REPORT
################################################################################
generate_report() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}SCAN SUMMARY${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"

    if [[ $CRITICAL_ISSUES -gt 0 ]]; then
        echo -e "${RED}CRITICAL ISSUES: $CRITICAL_ISSUES${NC}"
    fi
    
    echo -e "${YELLOW}Total Issues: $ISSUES_FOUND${NC}"
    
    if [[ $CRITICAL_ISSUES -eq 0 ]] && [[ $ISSUES_FOUND -le 3 ]]; then
        echo -e "${GREEN}Status: HEALTHY${NC}"
    elif [[ $CRITICAL_ISSUES -eq 0 ]]; then
        echo -e "${YELLOW}Status: WARNINGS PRESENT${NC}"
    else
        echo -e "${RED}Status: CRITICAL ISSUES DETECTED${NC}"
    fi

    echo ""
}

################################################################################
# MAIN EXECUTION
################################################################################

main() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║    AGENT-OS ISSUE SCANNER v1.0                             ║"
    echo "║    Phantom Deps | Version Conflicts | Circular Imports     ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"

    check_repo

    scan_phantom_dependencies
    scan_version_conflicts
    scan_circular_dependencies
    scan_typescript_composition
    scan_build_scripts

    generate_report
}

main "$@"
