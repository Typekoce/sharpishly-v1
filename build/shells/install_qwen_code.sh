#!/usr/bin/env bash
set -euo pipefail

MODEL_NAME="${1:-qwen2.5:0.5b}"
BIN_DIR="$HOME/.local/bin"
WRAPPER_PATH="$BIN_DIR/qwen"

echo "=== Setting up Qwen CLI wrapper (Model: ${MODEL_NAME}) ==="

# 1. Install Ollama if not already present
if ! command -v ollama &> /dev/null; then
    echo "Ollama not found. Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo "Ollama is already installed."
fi

# 2. Ensure Ollama service is running
if systemctl list-unit-files | grep -q ollama.service; then
    sudo systemctl enable --now ollama
elif pgrep -x "ollama" > /dev/null; then
    echo "Ollama daemon is running."
else
    echo "Starting ollama serve in background..."
    ollama serve &> /dev/null &
    sleep 2
fi

# 3. Pull the Qwen model
echo "Pulling model '${MODEL_NAME}'..."
ollama pull "${MODEL_NAME}"

# 4. Create user bin directory if it doesn't exist
mkdir -p "$BIN_DIR"

# 5. Create the global 'qwen' executable wrapper script
echo "Creating wrapper script at ${WRAPPER_PATH}..."
cat << EOF > "$WRAPPER_PATH"
#!/usr/bin/env bash
exec ollama run ${MODEL_NAME} "\$@"
EOF

chmod +x "$WRAPPER_PATH"

# 6. Ensure ~/.local/bin is permanently in PATH
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo "Adding $BIN_DIR to PATH in ~/.bashrc..."
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
fi

# Apply to current session
export PATH="$BIN_DIR:$PATH"

echo "=== Setup Complete! ==="
*Verification:* Run `source ~/.bashrc` and test the command with `qwen --version`.
