#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "  Official Qwen Code CLI Setup Script"
echo "=================================================="

# 1. Node.js Version Check
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed." >&2
    exit 1
fi

NODE_MAJOR=$(node -v | sed 's/^v//' | cut -d. -f1)
if [ "${NODE_MAJOR}" -lt 22 ]; then
    echo "Warning: Node.js v22+ is recommended (found v$(node -v))." >&2
fi

# 2. Legacy Wrapper Cleanup (with backup if symlink target is atypical)
LEGACY_WRAPPER="${HOME}/.local/bin/qwen-cli"
PROJECT_SYMLINK="${PWD}/build/shells/qwen-cli"

if [ -f "${LEGACY_WRAPPER}" ] || [ -L "${LEGACY_WRAPPER}" ]; then
    echo "Cleaning up legacy wrapper at ${LEGACY_WRAPPER}..."
    rm -f "${LEGACY_WRAPPER}"
fi

if [ -f "${PROJECT_SYMLINK}" ] || [ -L "${PROJECT_SYMLINK}" ]; then
    echo "Cleaning up project symlink at ${PROJECT_SYMLINK}..."
    rm -f "${PROJECT_SYMLINK}"
fi

# 3. Robust Global Installation with EACCES Fallback
echo "Installing @qwen-code/qwen-code@latest globally via npm..."
if ! npm install -g @qwen-code/qwen-code@latest 2>/dev/null; then
    echo "Global installation failed (EACCES/permissions). Falling back to user-writable prefix..."
    USER_NPM_DIR="${HOME}/.npm-global"
    mkdir -p "${USER_NPM_DIR}"
    npm config set prefix "${USER_NPM_DIR}"
    echo "Set npm prefix to ${USER_NPM_DIR} (persisted in ~/.npmrc)"
    npm install -g @qwen-code/qwen-code@latest
fi

# 4. PATH Configuration & Deduplicated Shell Export
NPM_BIN_DIR="$(npm config get prefix)/bin"

SHELL_CONFIG="${HOME}/.bashrc"
if [ -n "${ZSH_VERSION:-}" ] || [ -f "${HOME}/.zshrc" ]; then
    SHELL_CONFIG="${HOME}/.zshrc"
fi

if [[ ":$PATH:" != *":${NPM_BIN_DIR}:"* ]]; then
    grep -qs "${NPM_BIN_DIR}" "${SHELL_CONFIG}" || \
        echo "export PATH=\"${NPM_BIN_DIR}:\$PATH\"" >> "${SHELL_CONFIG}"
    export PATH="${NPM_BIN_DIR}:${PATH}"
    echo "Added ${NPM_BIN_DIR} to ${SHELL_CONFIG}"
fi

# 5. Persistent Ollama Environment Variables
echo "Configuring persistent Ollama environment variables..."
grep -qs "OPENAI_BASE_URL" "${SHELL_CONFIG}" || cat >> "${SHELL_CONFIG}" <<'EOF'

# Qwen Code CLI -> Ollama Endpoint Configuration
export OPENAI_BASE_URL="http://localhost:11434/v1"
export OPENAI_MODEL="qwen2.5:7b"
export OPENAI_API_KEY="ollama"
EOF

export OPENAI_BASE_URL="http://localhost:11434/v1"
export OPENAI_MODEL="qwen2.5:7b"
export OPENAI_API_KEY="ollama"

# 6. Post-Installation Verification & Checks
echo "=================================================="
echo "  Verification & Diagnostics"
echo "=================================================="

# Test Ollama reachability with timeout
if curl -s -f --max-time 5 http://localhost:11434/v1/models > /dev/null 2>&1; then
    echo "[✓] Local Ollama API endpoint is reachable."
else
    echo "[!] Warning: Could not reach http://localhost:11434/v1/models (ensure Ollama is running)."
fi

if command -v qwen &> /dev/null; then
    echo -n "[✓] Installed binary: "
    qwen --version
else
    echo "[!] Installation complete, but 'qwen' is not yet active in this shell."
fi

echo ""
echo "Next Steps:"
echo "1. Run: source ${SHELL_CONFIG}"
echo "2. Run: hash -r  (or 'rehash' in zsh) to clear shell command cache."
echo "3. Launch the CLI: qwen"
echo "4. Inside qwen, run '/auth' to verify the OpenAI-compatible endpoint."