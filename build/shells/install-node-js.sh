#!/usr/bin/env bash
set -euo pipefail

info() { printf "\033[34m[INFO]\033[0m %s\n" "$1"; }
error() { printf "\033[31m[ERROR]\033[0m %s\n" "$1" >&2; exit 1; }

MIN_NODE_VERSION=18
NODESOURCE_URL="https://deb.nodesource.com/setup_20.x"

info "Checking existing Node.js installation..."

if command -v node >/dev/null 2>&1; then
    NODE_VERSION="$(node -v | sed 's/^v//' | cut -d. -f1)"

    if [ "$NODE_VERSION" -ge "$MIN_NODE_VERSION" ]; then
        info "Node.js $(node -v) is already installed and meets the v${MIN_NODE_VERSION}+ requirement."
        exit 0
    else
        info "Found Node.js $(node -v), which is below v${MIN_NODE_VERSION}. Upgrading..."
    fi
fi

if ! command -v curl >/dev/null 2>&1; then
    error "'curl' is required. Install it with: sudo apt update && sudo apt install -y curl"
fi

info "Configuring NodeSource repository for Node.js 20 LTS..."

if command -v sudo >/dev/null 2>&1; then
    curl -fsSL "$NODESOURCE_URL" | sudo -E bash -
    info "Installing Node.js via apt..."
    sudo apt-get update
    sudo apt-get install -y nodejs
else
    curl -fsSL "$NODESOURCE_URL" | bash -
    info "Installing Node.js via apt..."
    apt-get update
    apt-get install -y nodejs
fi

info "Verifying installation..."

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    printf "\n\033[32m[SUCCESS]\033[0m Node.js %s and npm %s installed.\n" "$(node -v)" "$(npm -v)"
else
    error "Installation failed or node/npm are not available in PATH."
fi
