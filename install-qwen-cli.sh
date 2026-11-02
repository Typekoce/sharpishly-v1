#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${HOME}/Documents/sharpishly"

echo "===================================================="
echo "[INFO] Bootstrapping Sharpishly Platform + Qwen-CLI"
echo "[INFO] Target Directory: $PROJECT_DIR"
echo "===================================================="

# 1. Create Complete Directory Hierarchy
mkdir -p "$PROJECT_DIR/build/css"
mkdir -p "$PROJECT_DIR/build/javascript/core"
mkdir -p "$PROJECT_DIR/build/javascript/controllers"
mkdir -p "$PROJECT_DIR/build/shells"
mkdir -p "$PROJECT_DIR/public"
mkdir -p "$PROJECT_DIR/views/pages"
mkdir -p "$PROJECT_DIR/php/Controllers"
mkdir -p "$PROJECT_DIR/php/Models"
mkdir -p "$PROJECT_DIR/.github/workflows"
mkdir -p "${HOME}/.local/bin"

# Idempotent file writer
create_if_missing() {
    local path="$1"
    if [ -f "$path" ]; then
        echo "[INFO] Preserving existing: $path"
        return
    fi
    mkdir -p "$(dirname "$path")"
    cat > "$path"
    echo "[INFO] Created default: $path"
}

# 2. Generate Robust Build Script (build.sh)
cat << 'EOF' > "$PROJECT_DIR/build.sh"
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "[BUILD] Compiling CSS..."
CSS_FILES=(
    build/css/global.css
    build/css/home.css
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
EOF
chmod +x "$PROJECT_DIR/build.sh"

# 3. Generate the Memory-Optimized qwen-cli Wrapper
cat << 'EOF' > "$PROJECT_DIR/build/shells/qwen-cli"
#!/usr/bin/env python3
import json
import os
import re
import sys
import urllib.error
import urllib.request

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/chat")
MODEL = os.environ.get("QWEN_MODEL", "qwen2.5:0.5b")
MAX_FILE_BYTES = int(os.environ.get("QWEN_MAX_FILE_BYTES", 40 * 1024))
MAX_TOTAL_CHARS = int(os.environ.get("QWEN_MAX_TOTAL_CHARS", 60 * 1024))
FILE_PATTERN = re.compile(r'@((?:[\w.-]+/)*[\w.-]+)')

SYSTEM_PROMPT = (
    "You are a concise local coding assistant. "
    "Use only the supplied file contents when answering. "
    "If information is missing, say so."
)

def read_referenced_files(prompt):
    contexts = []
    total_chars = 0

    for raw_path in FILE_PATTERN.findall(prompt):
        path = os.path.abspath(raw_path)

        if not os.path.isfile(path):
            print(f"[qwen-cli] Not a file: {raw_path}", file=sys.stderr)
            continue

        size = os.path.getsize(path)
        if size > MAX_FILE_BYTES:
            print(
                f"[qwen-cli] Skipping {raw_path}: {size} bytes exceeds "
                f"{MAX_FILE_BYTES}-byte limit",
                file=sys.stderr,
            )
            continue

        try:
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        except OSError as exc:
            print(f"[qwen-cli] Could not read {raw_path}: {exc}", file=sys.stderr)
            continue

        block = f"\n\n--- FILE: {raw_path} ---\n{content}\n--- END FILE ---"
        if total_chars + len(block) > MAX_TOTAL_CHARS:
            print("[qwen-cli] Context budget reached; ignoring remaining files.",
                  file=sys.stderr)
            break

        total_chars += len(block)
        contexts.append(block)
        print(f"[qwen-cli] Loaded {raw_path} ({size} bytes)", file=sys.stderr)

    return "".join(contexts)

def stream_chat(user_prompt):
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "stream": True,
        "options": {
            "num_ctx": 2048,
            "temperature": 0.2,
        },
    }

    request = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(request) as response:
            for raw_line in response:
                if not raw_line.strip():
                    continue

                chunk = json.loads(raw_line.decode("utf-8"))
                text = chunk.get("message", {}).get("content", "")
                print(text, end="", flush=True)

                if chunk.get("done"):
                    print()
    except urllib.error.URLError as exc:
        print(f"\n[qwen-cli] Cannot reach Ollama at {OLLAMA_URL}: {exc}",
              file=sys.stderr)
        print("Start it with: ollama serve", file=sys.stderr)
        sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print('Usage: qwen-cli "Explain @src/app.js and list likely bugs"')
        sys.exit(1)

    prompt = " ".join(sys.argv[1:])
    file_context = read_referenced_files(prompt)
    final_prompt = f"{file_context}\n\n--- REQUEST ---\n{prompt}"

    print(f"[qwen-cli] Model: {MODEL}", file=sys.stderr)
    stream_chat(final_prompt)

if __name__ == "__main__":
    main()
EOF

chmod +x "$PROJECT_DIR/build/shells/qwen-cli"
ln -sf "$PROJECT_DIR/build/shells/qwen-cli" "${HOME}/.local/bin/qwen-cli"
echo "[INFO] qwen-cli installed and linked to ~/.local/bin/qwen-cli"

# Ensure ~/.local/bin is in PATH for shell sessions
if ! grep -q '\.local/bin' "${HOME}/.bashrc" 2>/dev/null; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "${HOME}/.bashrc"
    echo "[INFO] Added ~/.local/bin to ~/.bashrc PATH"
fi

# 4. Local Ollama Code Review Hook
cat << 'EOF' > "$PROJECT_DIR/build/shells/ollama-review.sh"
#!/usr/bin/env bash
MODEL="${QWEN_MODEL:-qwen2.5:0.5b}"
DIFF=$(git diff --cached)

if [ -z "$DIFF" ]; then
    echo "[OLLAMA] No staged changes found to review."
    exit 0
fi

echo "[OLLAMA] Querying local model ($MODEL) for code review..."
# Passing diff to qwen-cli or direct API check
python3 -c "
import urllib.request, json
url = 'http://localhost:11434/api/chat'
payload = {
    'model': '$MODEL',
    'messages': [
        {'role': 'system', 'content': 'Review this git diff against DRY principles and thin controllers in 3 bullets.'},
        {'role': 'user', 'content': '''$DIFF'''}
    ],
    'stream': False,
    'options': {'num_ctx': 2048, 'temperature': 0.2}
}
req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as res:
        res_data = json.loads(res.read().decode('utf-8'))
        print(res_data.get('message', {}).get('content', ''))
except Exception as e:
    print('Ollama audit skipped:', e)
"
EOF
chmod +x "$PROJECT_DIR/build/shells/ollama-review.sh"

# 5. Git Init & Pre-commit Hook
cd "$PROJECT_DIR"
if [ ! -d ".git" ]; then
    echo "[INFO] Initializing Git repository..."
    git init
fi

GIT_DIR="$(git rev-parse --git-dir)"
cat << 'EOF' > "$GIT_DIR/hooks/pre-commit"
#!/usr/bin/env bash
set -euo pipefail
echo "[PRE-COMMIT] Validating PHP syntax..."
STAGED_PHP=$(git diff --cached --name-only --diff-filter=ACM | grep '\.php$' || true)
if [ -n "$STAGED_PHP" ]; then
    for file in $STAGED_PHP; do
        php -l "$file" > /dev/null || { echo "[ERROR] PHP syntax error in $file"; exit 1; }
    done
fi
echo "[PRE-COMMIT] Running local Qwen model check..."
if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    "$PWD/build/shells/ollama-review.sh" || true
else
    echo "[WARNING] Ollama daemon not running locally. Skipping AI review."
fi
EOF
chmod +x "$GIT_DIR/hooks/pre-commit"
echo "[INFO] Pre-commit hook installed successfully."

# 6. Generate Zero-Dependency PHP Backend Core & Controllers
create_if_missing "$PROJECT_DIR/public/index.php" << 'EOF'
<?php
/**
 * Sharpishly Front Controller (Zero-Dependency MVC)
 */
declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$segments = explode('/', trim($uri, '/'));

$controllerName = !empty($segments[1]) ? ucfirst($segments[1]) . 'Controller' : 'HomeController';
$actionName = !empty($segments[2]) ? $segments[2] : 'index';

$controllerPath = __DIR__ . '/../php/Controllers/' . $controllerName . '.php';

header('Content-Type: application/json');

if (file_exists($controllerPath)) {
    require_once $controllerPath;
    if (class_exists($controllerName)) {
        $controller = new $controllerName();
        if (method_exists($controller, $actionName)) {
            $controller->$actionName();
            exit;
        }
    }
}

http_response_code(404);
echo json_encode(['error' => 'Route not found', 'route' => $uri]);
EOF

create_if_missing "$PROJECT_DIR/php/Controllers/HomeController.php" << 'EOF'
<?php
declare(strict_types=1);

class HomeController {
    public function index(): void {
        echo json_encode([
            'status' => 'success',
            'message' => 'Welcome to Sharpishly R&D API',
            'controller' => 'HomeController',
            'action' => 'index'
        ]);
    }
}
EOF

# 7. Generate GitHub Actions CI/CD Pipeline
create_if_missing "$PROJECT_DIR/.github/workflows/ci.yml" << 'EOF'
name: Sharpishly CI/CD

on:
  push:
    branches: [ "main", "master", "feature/*" ]
  pull_request:
    branches: [ "main", "master" ]

jobs:
  validate-and-build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup PHP Environment
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'

      - name: Run Build Pipeline
        run: |
          chmod +x build.sh
          ./build.sh
          test -f public/script.js
          test -f public/global.css

      - name: Architectural Guardrail Check
        run: |
          if grep -rn "mysqli_query" php/Controllers/ || grep -rn "PDO::query" php/Controllers/; then
             echo "[ERROR] Raw SQL queries detected in Controllers!"
             exit 1
          fi
          echo "[CI] Architectural validation passed."
EOF

# 8. CSS & JS Assets Stubs
for css in global home syncapply health todo login; do
    create_if_missing "$PROJECT_DIR/build/css/${css}.css" "/* ${css} styles */"
done

create_if_missing "$PROJECT_DIR/build/javascript/core/pages.js" << 'EOF'
const Pages = {
    'home': () => HomeController.index(),
    'todo': () => TodoController.index()
};
EOF

create_if_missing "$PROJECT_DIR/build/javascript/core/app.js" << 'EOF'
const app = {
    currentPage: null,
    setPage(page) {
        this.currentPage = page;
        console.log({currentPage: page});
    },
    init() {
        void this.getPage('home');
        const url = '/php/home/index';
        this.request(url);
        this.gotoPage();
        this.navigation();
    },
    navigation() {
        if (this.currentPage == 'home') {
            HomeController.index();
        }
    },
    async getPage(page) {
        this.setPage(page);
        const container = document.getElementById('app');
        try {
            const url = `/views/pages/${encodeURIComponent(page)}.html`;
            const response = await fetch(url);
            const html = await response.text();
            container.innerHTML = html;
        } catch (error) {
            console.error(`Failed to load page: ${page}`, error);
        }
    },
    gotoPage() {
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-page]');
            if (target) {
                event.preventDefault();
                const page = target.getAttribute('data-page');
                if (page) {
                    void this.getPage(page);
                }
            }
        });
    },
    async request(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Failed to load URL: ${url}`, error);
        }
    }
};
EOF

create_if_missing "$PROJECT_DIR/build/javascript/core/app_routes.js" << 'EOF'
app.routes = function() {
    console.log({'routes': this.currentPage});
};
EOF

create_if_missing "$PROJECT_DIR/build/javascript/controllers/home_controller.js" << 'EOF'
const HomeController = {
    async index() {
        app.request('/php/home/index');
    }
};
EOF

create_if_missing "$PROJECT_DIR/build/javascript/core/global.js" << 'EOF'
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
EOF

create_if_missing "$PROJECT_DIR/views/pages/home.html" << 'EOF'
<div class="home-container">
    <h1>Welcome to Sharpishly R&D</h1>
    <p>Zero-dependency MVC with Qwen local chat CLI integration.</p>
</div>
EOF

create_if_missing "$PROJECT_DIR/views/pages/todo.html" << 'EOF'
<div class="todo-container">
    <h1>Task Manager</h1>
</div>
EOF

echo "===================================================="
echo "[SUCCESS] Sharpishly & qwen-cli fully bootstrapped!"
echo "[INFO] Run 'source ~/.bashrc' to load qwen-cli in your PATH."
echo "[INFO] Test with: qwen-cli \"@public/index.php Explain this route\""
echo "===================================================="
