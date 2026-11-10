#!/usr/bin/env bash
set -euo pipefail

clear

line='--------------'

echo "${line}Check GPG agent configuration"

GPG_AGENT_CONF="$HOME/.gnupg/gpg-agent.conf"
mkdir -p "$HOME/.gnupg"
chmod 700 "$HOME/.gnupg"

if [ ! -f "$GPG_AGENT_CONF" ]; then
    touch "$GPG_AGENT_CONF"
    chmod 600 "$GPG_AGENT_CONF"
fi

if ! /usr/bin/gpg-agent --gpgconf-test; then
    echo "gpg-agent configuration test failed."
    echo "Current configuration:"
    cat -n "$GPG_AGENT_CONF" || true

    echo "Diagnostic output:"
    gpgconf --check-options gpg-agent || true

    if command -v pinentry-curses >/dev/null 2>&1; then
        cp "$GPG_AGENT_CONF" "${GPG_AGENT_CONF}.bak.$(date +%s)"

        sed -i \
            -e 's|^[[:space:]]*pinentry-program[[:space:]].*|pinentry-program /usr/bin/pinentry-curses|' \
            "$GPG_AGENT_CONF"

        if ! grep -q '^pinentry-program' "$GPG_AGENT_CONF"; then
            printf '\npinentry-program /usr/bin/pinentry-curses\n' >> "$GPG_AGENT_CONF"
        fi

        chmod 600 "$GPG_AGENT_CONF"
    fi

    if ! /usr/bin/gpg-agent --gpgconf-test; then
        echo "Error: gpg-agent configuration remains invalid."
        echo "Inspect: $GPG_AGENT_CONF"
        exit 1
    fi
fi

export GPG_TTY="$(tty)"

echo "${line}Restart GPG agent"
gpgconf --kill gpg-agent || true
gpgconf --launch gpg-agent

echo "${line}Start MCP"
./start-mcp-client.sh

echo "${line}Himalaya status"

which himalaya
which pass
which gpg

echo "Testing password lookup via pass..."
pass show email/mysharpishly

echo "Testing Himalaya envelope list..."
himalaya envelope list