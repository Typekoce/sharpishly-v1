#!/bin/bash

clear

OUTPUT="public/global.css"
DIR="build/css"

cat "$DIR/global.css" \
    "$DIR/home.css" \
    "$DIR/syncapply.css" \
    "$DIR/health.css" \
    "$DIR/todo.css" \
    "$DIR/login.css" > "$OUTPUT"

echo "Successfully built $OUTPUT"


OUTPUT="public/script.js"
DIR="build/javascript"

cat "$DIR/core/pages.js" \
    "$DIR/core/app.js" \
    "$DIR/controllers/home_controller.js" \
    "$DIR/core/global.js" > "$OUTPUT"

echo "Successfully built $OUTPUT"

