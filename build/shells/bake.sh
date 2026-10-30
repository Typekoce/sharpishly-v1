#!/usr/bin/env bash

# Exit immediately on error, unset variable, or pipe failure
set -euo pipefail

usage() {
    cat <<EOF
Usage: $0 <resource_name> [options]

Options:
  --table <name>   Custom database table name (default: derived from resource)
  --force          Overwrite existing backend and frontend files
  -h, --help       Show this help message

Examples:
  $0 timetable
  $0 todo --table tasks
  $0 timetable --force
EOF
    exit 1
}

RESOURCE=""
TABLE_NAME=""
FORCE=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            ;;
        --table)
            TABLE_NAME="$2"
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            if [[ -z "$RESOURCE" ]]; then
                RESOURCE="$1"
                shift
            else
                echo "Error: Unexpected argument '$1'"
                usage
            fi
            ;;
    esac
done

if [[ -z "$RESOURCE" ]]; then
    echo "Error: Missing resource name."
    usage
fi

# Transform casing
LOWER_NAME=$(echo "$RESOURCE" | tr '[:upper:]' '[:lower:]')
PASCAL_NAME=$(echo "$LOWER_NAME" | sed -r 's/(^|_)([a-z])/\U\2/g')
TABLE_NAME="${TABLE_NAME:-$LOWER_NAME}"

# Correct Project Paths based on actual tree layout
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

PHP_SRC="${PROJECT_ROOT}/app/php/src"
MODEL_DIR="${PHP_SRC}/Models"
CONTROLLER_DIR="${PHP_SRC}/Controllers"

BUILD_DIR="${PROJECT_ROOT}/build"
JS_DIR="${BUILD_DIR}/javascript/controllers"
CSS_DIR="${BUILD_DIR}/css"

PUBLIC_VIEWS="${PROJECT_ROOT}/public/views/pages"

MODEL_FILE="${MODEL_DIR}/${PASCAL_NAME}Model.php"
CONTROLLER_FILE="${CONTROLLER_DIR}/${PASCAL_NAME}Controller.php"
JS_FILE="${JS_DIR}/${LOWER_NAME}_controller.js"
CSS_FILE="${CSS_DIR}/${LOWER_NAME}.css"
HTML_FILE="${PUBLIC_VIEWS}/${LOWER_NAME}.html"

# Safeguard check
if [[ "$FORCE" = false ]]; then
    for FILE in "$MODEL_FILE" "$CONTROLLER_FILE" "$JS_FILE" "$CSS_FILE" "$HTML_FILE"; do
        if [[ -f "$FILE" ]]; then
            echo "Error: File already exists at $FILE. Use --force to overwrite."
            exit 1
        fi
    done
fi

mkdir -p "${MODEL_DIR}" "${CONTROLLER_DIR}" "${JS_DIR}" "${CSS_DIR}" "${PUBLIC_VIEWS}"

# ==============================================================================
# 1. PHP Model (Data Abstraction Layer)
# ==============================================================================
cat <<PHP > "${MODEL_FILE}"
<?php

declare(strict_types=1);

namespace App\Models;

use Throwable;

class ${PASCAL_NAME}Model extends BaseModel
{
    public string \$tbl = '${TABLE_NAME}';

    public function readData(string \$id = ''): array
    {
        try {
            \$conditions = [
                'tbl'   => \$this->tbl,
                'order' => ['id' => 'DESC']
            ];

            if (!empty(\$id)) {
                \$conditions['where'] = ['id' => \$id];
            }

            return \$this->db->find(\$conditions);
        } catch (Throwable \$e) {
            return [
                'error'   => true,
                'message' => \$e->getMessage()
            ];
        }
    }
}
PHP

# ==============================================================================
# 2. PHP Controller (Thin Controller using BaseController JSON helper)
# ==============================================================================
cat <<PHP > "${CONTROLLER_FILE}"
<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\\${PASCAL_NAME}Model;

class ${PASCAL_NAME}Controller extends BaseController 
{
    public function index(): void
    {
        \$this->json([
            'class'  => __CLASS__,
            'method' => __FUNCTION__,
            'file'   => __FILE__
        ]);
    }

    public function read(string \$id = ''): void
    {
        \$model = new ${PASCAL_NAME}Model();
        \$records = \$model->readData(\$id);

        \$this->json([
            'status'  => 'success',
            'records' => \$records
        ]);
    }
}
PHP

# ==============================================================================
# 3. JavaScript Controller
# ==============================================================================
cat <<JS > "${JS_FILE}"
const ${PASCAL_NAME}Controller = {
    async init() {
        const container = document.getElementById('${LOWER_NAME}-records');
        if (!container) return;

        try {
            const res = await fetch(App.url('${LOWER_NAME}/read'));
            const result = await res.json();
            
            container.textContent = '';
            if (result.status === 'success' && result.records.length > 0) {
                const ul = App.item('ul');
                result.records.forEach(item => {
                    const li = App.item('li');
                    li.textContent = item.title || JSON.stringify(item);
                    ul.appendChild(li);
                });
                container.appendChild(ul);
            } else {
                const p = App.item('p');
                p.textContent = 'No records found.';
                container.appendChild(p);
            }
        } catch (err) {
            console.error('Failed to load ${LOWER_NAME} records:', err);
        }
    }
};
JS

# ==============================================================================
# 4. CSS Stylesheet
# ==============================================================================
cat <<CSS > "${CSS_FILE}"
#${LOWER_NAME} {
    padding: 1rem;
    font-family: inherit;
}
CSS

# ==============================================================================
# 5. HTML View Partial
# ==============================================================================
cat <<HTML > "${HTML_FILE}"
<div id="${LOWER_NAME}">
    <h2>${PASCAL_NAME} Management</h2>
    <div id="${LOWER_NAME}-records">Loading...</div>
</div>
HTML

chmod 755 "${MODEL_FILE}" "${CONTROLLER_FILE}" "${JS_FILE}" "${CSS_FILE}" "${HTML_FILE}"

echo "Successfully baked ${PASCAL_NAME}:"
echo " - Model:      ${MODEL_FILE}"
echo " - Controller: ${CONTROLLER_FILE}"
echo " - JS:         ${JS_FILE}"
echo " - CSS:        ${CSS_FILE}"
echo " - HTML View:  ${HTML_FILE}"