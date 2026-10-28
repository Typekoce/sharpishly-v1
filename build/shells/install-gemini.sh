#!/usr/bin/env sh
set -eu

# Print status messages
info() { printf "\031[34m[INFO]\033[0m %s\n" "$1"; }
error() { printf "\033[31m[ERROR]\033[0m %s\n" "$1" >&2; exit 1; }

MIN_NODE_VERSION=18

info "Checking for Node.js installation..."

if ! command -v node >/dev/null 2>&1; then
    error "Node.js is not installed. Please install Node.js (v${MIN_NODE_VERSION}+) and run this script again."
fi

# Extract major version number
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_VERSION" -lt "$MIN_NODE_VERSION" ]; then
    error "Node.js version v${NODE_VERSION} detected. Gemini CLI requires Node.js v${MIN_NODE_VERSION} or higher."
fi

info "Node.js version v$(node -v | cut -d'v' -f2) detected."

# Check for npm
if ! command -v npm >/dev/null 2>&1; then
    error "npm is not installed. Please install npm to proceed."
fi

info "Installing @google/gemini-cli globally..."

# Handle permissions gracefully (use sudo if not writable and sudo exists)
NPM_GLOBAL_DIR=$(npm config get prefix)
if [ -w "$NPM_GLOBAL_DIR" ] || [ -w "$NPM_GLOBAL_DIR/lib" ]; then
    npm install -g @google/gemini-cli
else
    info "Elevated permissions required to install to $NPM_GLOBAL_DIR..."
    if command -v sudo >/dev/null 2>&1; then
        sudo npm install -g @google/gemini-cli
    else
        error "Cannot write to $NPM_GLOBAL_DIR and 'sudo' was not found."
    fi
fi

info "Verifying installation..."

if command -v gemini >/dev/null 2>&1; then
    printf "\n\033[32m[SUCCESS]\033[0m Gemini CLI successfully installed!\n"
    printf "Binary location: %s\n\n" "$(command -v gemini)"
    printf "Run '\033[1mgemini\033[0m' to initialize authentication and start.\n"
else
    error "Installation appeared to succeed, but 'gemini' executable is not in PATH. Ensure $NPM_GLOBAL_DIR/bin is in your PATH."
fi
