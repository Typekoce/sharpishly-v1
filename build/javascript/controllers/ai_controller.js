const AiController = {
    index() {
        const form = app.el('ai-prompt-form');
        const input = app.el('ai-prompt-input');

        if (!form || form.dataset.initialized) return;
        form.dataset.initialized = 'true';

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const prompt = input.value.trim();
            const tool = app.el('tool-select').value;
            if (!prompt) return;

            this.appendMessage('user', prompt);
            input.value = '';

            this.sendPromptToQwen(prompt, tool);
        });
    },

    async sendPromptToQwen(userPrompt, targetTool) {
        const sendBtn = app.el('ai-send-btn');
        sendBtn.disabled = true;

        const loadingBubble = this.appendMessage('assistant', 'Thinking and invoking tools...');

        try {
            const response = await fetch('http://127.0.0.1:8000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userPrompt, tool: targetTool })
            });

            const result = await response.json();

            if (response.ok && result.status === 200) {
                const data = result.data;
                let formattedHtml = '';

                if (data.type === 'tool_call' && data.tool_calls) {
                    data.tool_calls.forEach(call => {
                        formattedHtml += `<div class="tool-call-badge">⚡ Executed: ${call.tool} (${JSON.stringify(call.args)})</div>`;
                    });
                }

                formattedHtml += `<p>${data.answer || 'No response returned.'}</p>`;
                loadingBubble.querySelector('.message-content').innerHTML = formattedHtml;
            } else {
                const errorMsg = result.error || 'Request failed';
                loadingBubble.querySelector('.message-content').innerHTML = `<p style="color: #ff5555;">[Error]: ${errorMsg}</p>`;
            }
        } catch (err) {
            loadingBubble.querySelector('.message-content').innerHTML = `<p style="color: #ff5555;">[Network Error]: ${err.message}</p>`;
        } finally {
            sendBtn.disabled = false;
            this.scrollToBottom();
        }
    },

    appendMessage(role, text) {
        const stream = app.el('ai-chat-stream');
        const msgDiv = app.item('div', `chat-message ${role}-message`);

        const avatar = app.item('div', 'avatar', role === 'user' ? 'You' : 'AI');
        const content = app.item('div', 'message-content');
        content.innerHTML = `<p>${text}</p>`;

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(content);

        stream.appendChild(msgDiv);
        this.scrollToBottom();
        return msgDiv;
    },

    scrollToBottom() {
        const stream = app.el('ai-chat-stream');
        if (stream) {
            stream.scrollTop = stream.scrollHeight;
        }
    }
};