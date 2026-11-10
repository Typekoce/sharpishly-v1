from fastapi import FastAPI, Query
from datetime import datetime
import os
import platform
from pathlib import Path

# (Assuming 'app' is your FastAPI instance in api.py)

LOG_SOURCES = {
    "nginx": {
        "access": "/var/log/nginx/access.log",
        "error": "/var/log/nginx/error.log",
    },
    "php": {
        "fpm_error": "/var/log/php8.2-fpm.log",
        "app_error": "/var/log/php/error.log",
    },
    "mariadb": {
        "error": "/var/log/mysql/error.log",
    },
    "python": {
        "mcp_server": "/var/log/sharpishly/python_mcp.log",
        "uvicorn": "/var/log/sharpishly/uvicorn.log",
    },
    "app": {
        "javascript": "/var/log/sharpishly/js_errors.log",
        "cmd_jobs": "/var/log/sharpishly/cmd_jobs.log",
    }
}

CONFIG_SOURCES = {
    "php_ini": "/etc/php/8.2/fpm/php.ini",
    "nginx_site": "/etc/nginx/sites-available/default",
    "himalaya": "~/.config/himalaya/config.toml",
    "gpg_agent": "~/.gnupg/gpg-agent.conf",
}

def expand_path(path_str: str) -> str:
    if path_str.startswith("~"):
        return str(Path.home() / path_str[1:])
    return path_str

def read_tail(file_path: str, lines: int) -> dict:
    path = Path(file_path)
    if not path.exists():
        return {"status": "missing", "path": file_path, "entries": []}
    if not os.access(path, os.R_OK):
        return {"status": "unreadable", "path": file_path, "entries": ["Error: Permission denied."]}

    try:
        with open(path, "rb") as f:
            f.seek(0, os.SEEK_END)
            file_size = f.tell()
            buffer_size = 1024
            blocks = []
            block_count = 0
            
            while file_size > 0 and block_count < lines * 10:
                if file_size >= buffer_size:
                    f.seek(file_size - buffer_size, os.SEEK_SET)
                    block = f.read(buffer_size)
                    file_size -= buffer_size
                else:
                    f.seek(0, os.SEEK_SET)
                    block = f.read(file_size)
                    file_size = 0
                blocks.append(block)
                block_count += 1
                if block.count(b'\n') >= lines + 1:
                    break
            
            data = b"".join(reversed(blocks))
            decoded_lines = [line.decode("utf-8", errors="replace").strip() for line in data.splitlines()]
            decoded_lines = [l for l in decoded_lines if l != ""]
            returned_entries = decoded_lines[-lines:] if len(decoded_lines) > lines else decoded_lines

            return {
                "status": "ok",
                "path": file_path,
                "total_lines": len(decoded_lines),
                "returned": len(returned_entries),
                "entries": returned_entries
            }
    except Exception as e:
        return {"status": "error", "path": file_path, "entries": [str(e)]}

@app.get("/logs")
def get_logs(lines: int = Query(100, ge=1, le=1000), category: str | None = None):
    logs = {}
    for group, files in LOG_SOURCES.items():
        if category and category != group:
            continue
        logs[group] = {}
        for name, path in files.items():
            logs[group][name] = read_tail(expand_path(path), lines)

    configs = {}
    for key, path in CONFIG_SOURCES.items():
        expanded = expand_path(path)
        p = Path(expanded)
        exists = p.exists()
        configs[key] = {
            "path": path,
            "exists": exists,
            "readable": exists and os.access(p, os.R_OK),
            "size_bytes": p.stat().st_size if exists else 0,
            "modified": datetime.fromtimestamp(p.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S') if exists else None
        }

    return {
        "status": "success",
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "environment": {
            "python_version": platform.python_version(),
            "os": platform.system(),
            "hostname": platform.node(),
        },
        "logs": logs,
        "config": configs
    }