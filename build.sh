#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "[BUILD] Compiling CSS..."
CSS_FILES=(
    build/css/global.css
    build/css/home.css
    build/css/home_records.css
    build/css/syncapply.css
    build/css/health.css
    build/css/todo.css
    build/css/login.css
)
: > public/global.css
for css in "${CSS_FILES[@]}"; do
    if [ -f "$css" ]; then
        cat "$css" >> public/global.css
        printf '\n' >> public/global.css
    fi
done

echo "[BUILD] Compiling JavaScript..."
JS_FILES=(
    build/javascript/core/pages.js
    build/javascript/core/app.js
    build/javascript/core/app_routes.js
    build/javascript/controllers/home_controller.js
    build/javascript/core/global.js
)
: > public/script.js
for js in "${JS_FILES[@]}"; do
    if [ -f "$js" ]; then
        cat "$js" >> public/script.js
        printf '\n' >> public/script.js
    fi
done
echo "[SUCCESS] Frontend assets built."
