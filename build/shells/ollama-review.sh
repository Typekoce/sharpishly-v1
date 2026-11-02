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
