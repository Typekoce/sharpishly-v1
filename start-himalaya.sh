#!/usr/bin/env bash
set -euo pipefail

clear

line='--------------'
GPG_AGENT_CONF="$HOME/.gnupg/gpg-agent.conf"

echo "${line}Check GPG agent configuration"

mkdir -p "$HOME/.gnupg"
chmod 700 "$HOME/.gnupg"

if [ ! -f "$GPG_AGENT_CONF" ]; then
    touch "$GPG_AGENT_CONF"
    chmod 600 "$GPG_AGENT_CONF"
fi

# Remove an invalid/deprecated gpg-agent.conf pinentry-mode directive.
# This option belongs to gpg/gpgme sessions, not gpg-agent.conf.
if grep -Eq '^[[:space:]]*pinentry-mode([[:space:]]|$)' "$GPG_AGENT_CONF"; then
    cp -p "$GPG_AGENT_CONF" "${GPG_AGENT_CONF}.bak.$(date +%s)"
    sed -i '/^[[:space:]]*pinentry-mode\([[:space:]]\|$\)/d' "$GPG_AGENT_CONF"
    echo "Removed invalid pinentry-mode directive from $GPG_AGENT_CONF"
fi

if ! /usr/bin/gpg-agent --gpgconf-test; then
    echo "gpg-agent configuration test failed."
    echo "Current configuration:"
    cat -n "$GPG_AGENT_CONF" || true

    echo "Diagnostic output:"
    gpgconf --check-options gpg-agent || true

    if command -v pinentry-curses >/dev/null 2>&1; then
        cp -p "$GPG_AGENT_CONF" "${GPG_AGENT_CONF}.bak.$(date +%s)"

        if grep -qE '^[[:space:]]*pinentry-program([[:space:]]|$)' "$GPG_AGENT_CONF"; then
            sed -i \
                's|^[[:space:]]*pinentry-program[[:space:]].*|pinentry-program /usr/bin/pinentry-curses|' \
                "$GPG_AGENT_CONF"
        else
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

echo "${line}Check required tools"

for command_name in himalaya pass gpg; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
        echo "Error: required command not found: $command_name"
        exit 1
    fi
    command -v "$command_name"
done

echo "${line}Test password store"

if ! pass show email/mysharpishly >/dev/null; then
    echo "Error: unable to retrieve email/mysharpishly from pass."
    exit 1
fi

echo "Password lookup succeeded."

echo "${line}Test Himalaya"

if ! himalaya envelope list; then
    echo "Error: himalaya envelope list failed."
    exit 1
fi

echo "${line}Startup checks completed"