#!/usr/bin/env bash

set -e

DRY_RUN=0
COMMIT_MSG=""

# Parse arguments for dry-run and custom commit message
while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run|-n)
            DRY_RUN=1
            echo "=== DRY RUN: commands only; overlapping scopes may repeat ==="
            shift
            ;;
        *)
            if [ -z "$COMMIT_MSG" ]; then
                COMMIT_MSG="$1"
            fi
            shift
            ;;
    esac
done

# 4. Run from the repository root
if ! repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
    echo "Error: Not inside a Git repository." >&2
    exit 1
fi
cd "$repo_root"

# 1. Refuse to run when anything is already staged
if ! git diff --cached --quiet; then
    echo "Error: Existing staged changes found." >&2
    echo "Commit or unstage them before running this script." >&2
    exit 1
fi

# Early exit if nothing to commit in the working tree
if [ -z "$(git status --porcelain)" ]; then
    echo "No changes to commit."
    exit 0
fi

# Fallback default message if none provided
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="update project files"
fi

# Map target directories directly to their commit scopes for v2 structure
declare -A TARGETS=(
    ["app/frontend"]="frontend"
    ["app/php/src/Controllers"]="controllers"
    ["app/php/src/Models"]="models"
    ["app/php/src/Services"]="services"
    ["app/php/src"]="php-core"
    ["app/php"]="app-php"
    ["app/python"]="python-app"
    ["app"]="app"
    ["build"]="build"
    ["public"]="public"
)

# Explicit execution order for v2 structure
ORDER=(
    "app/frontend"
    "app/php/src/Controllers"
    "app/php/src/Models"
    "app/php/src/Services"
    "app/php/src"
    "app/php"
    "app/python"
    "app"
    "build"
    "public"
)

run_git() {
    if [ "$DRY_RUN" -eq 1 ]; then
        echo "  [dry-run] git $*"
    else
        git "$@"
    fi
}

# Loop through each mapped directory and commit each scope separately; stop on the first failure.
for dir in "${ORDER[@]}"; do
    scope="${TARGETS[$dir]}"
    
    # 2. Allow deleted directories to be processed via git status pathspec
    if [[ -n "$(git status --porcelain -- "$dir")" ]]; then
        echo "--> [$scope] Committing changes in $dir..."
        run_git add -A -- "$dir"
        run_git commit -m "chore($scope): $COMMIT_MSG"
    fi
done

# Catch-all for remaining project files, explicitly ignoring storage
if [ -n "$(git status --porcelain -- ':!storage')" ]; then
    echo "--> [root] Committing remaining project files (excluding storage/)..."
    run_git add -A -- . ':!storage'
    run_git commit -m "chore(root): $COMMIT_MSG"
fi

echo "Done! All project directories processed."