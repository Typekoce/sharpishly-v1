#!/usr/bin/env bash
set -euo pipefail

SOURCE_BRANCH="feature/10-chat"

echo "==> Checking for Git repository..."
if [ ! -d ".git" ]; then
    echo "Error: Not a Git repository root." >&2
    exit 1
fi

echo "==> Verifying source branch '${SOURCE_BRANCH}' exists..."
if ! git rev-parse --verify "${SOURCE_BRANCH}" &>/dev/null && ! git rev-parse --verify "origin/${SOURCE_BRANCH}" &>/dev/null; then
    echo "Error: Branch '${SOURCE_BRANCH}' not found locally or on origin." >&2
    exit 1
fi

echo "==> Searching for Contacts-related files on '${SOURCE_BRANCH}'..."
CONTACTS_FILES=$(git ls-tree -r --name-only "${SOURCE_BRANCH}" | grep -iE 'contact.*\.php' || true)

if [ -z "${CONTACTS_FILES}" ]; then
    echo "Warning: No standard Contacts PHP files matched automatically. Listing all files containing 'contact':"
    git ls-tree -r --name-only "${SOURCE_BRANCH}" | grep -i 'contact' || echo "None found."
    echo "Error: Could not automatically determine Contacts file paths." >&2
    exit 1
fi

echo "Found the following files on ${SOURCE_BRANCH}:"
echo "${CONTACTS_FILES}"
echo ""

read -p "Do you want to check out these files into your current branch? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation aborted."
    exit 0
fi

echo "==> Checking out files from ${SOURCE_BRANCH}..."
while IFS= read -r file; do
    if [ -n "$file" ]; then
        echo "Checking out: $file"
        git checkout "${SOURCE_BRANCH}" -- "$file"
    fi
done <<< "${CONTACTS_FILES}"

echo ""
echo "==> Complete! Files have been checked out and staged."
git status
