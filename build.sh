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
    build/css/ai.css
    build/css/articles.css
    build/css/agent.css
    build/css/chat.css
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
    build/javascript/core/app.js
    build/javascript/core/app_routes.js
    build/javascript/controllers/home_controller.js
    build/javascript/controllers/ai_controller.js
    build/javascript/controllers/articles_controller.js
    build/javascript/controllers/agent_controller.js
    build/javascript/controllers/render_controller.js
    build/javascript/controllers/context_controller.js
    build/javascript/controllers/multiple_prompts_controller.js
    build/javascript/controllers/chat_controller.js
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

rm app/php/src/views/oneapply/index.js
touch app/php/src/views/oneapply/index.js

echo "[BUILD] Compiling JavaScript..."
JS_FILES=(
    build/javascript/core/app.js
    build/oneapply/core/app_init.js
    build/oneapply/controllers/feed_controller.js
    build/oneapply/core/index.js
)
: > app/php/src/views/oneapply/script.js
for js in "${JS_FILES[@]}"; do
    if [ -f "$js" ]; then
        cat "$js" >> app/php/src/views/oneapply/index.js
        printf '\n' >> app/php/src/views/oneapply/index.js
    fi
done
echo "[SUCCESS] Frontend assets built."
