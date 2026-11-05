#!/bin/bash
#cd ../..
# build/mcp/.venv/bin/python3 -m uvicorn api:app \
#   --host 127.0.0.1 \
#   --port 8000 \
#   --app-dir app/python

build/mcp/.venv/bin/python3 -m uvicorn api:app --host 127.0.0.1 --port 8000 --app-dir app/python --reload