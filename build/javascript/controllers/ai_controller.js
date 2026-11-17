const AiConfig = {
    apiBaseUrl: "http://sharpishly2.test/py"
};

const AiController = {
    toolsEndpoint: `${AiConfig.apiBaseUrl}/mcp/tools`,
    executeEndpoint: `${AiConfig.apiBaseUrl}/mcp/execute`,
    gateway: null,
    selectedFile: null,
    activeRequest: null,
    isSubmitting: false,
    requestToken: 0,

    init(gateway) {
        this.gateway = gateway;

        const form = app.el('ai-prompt-form');
        const input = app.el('ai-prompt-input');

        if (!form || form.dataset.initialized) {
            return;
        }

        form.dataset.initialized = 'true';

        this.bindEvents(form, input);
        this.bindFileUpload();
        this.getModel();
    },

    index() {
        const form = app.el('ai-prompt-form');
        const input = app.el('ai-prompt-input');

        if (!form || form.dataset.initialized) {
            return;
        }

        form.dataset.initialized = 'true';

        this.bindEvents(form, input);
        this.getModel();
        this.loadToolsDropdown();
        this.loadChatHistory();
    },

    bindEvents(form, input) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            this.handlePromptSubmit(input);
        });

        if (!input) {
            return;
        }

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                form.requestSubmit();
            }
        });

        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
        });
    },

    bindFileUpload() {
        const uploadBtn = app.el('ai-upload-btn');
        const fileInput = app.el('ai-file-input');
        const clearBtn = app.el('ai-file-clear');

        if (!uploadBtn || !fileInput) {
            return;
        }

        uploadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (event) => {
            const file = event.target.files?.[0];

            if (!file) {
                return;
            }

            this.selectedFile = file;

            const preview = app.el('ai-file-preview');
            const fileName = app.el('ai-file-name');

            if (fileName) {
                fileName.textContent = `📎 ${file.name}`;
            }

            if (preview) {
                preview.style.display = 'inline-flex';
            }
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSelectedFile());
        }
    },

    clearSelectedFile() {
        this.selectedFile = null;

        const fileInput = app.el('ai-file-input');
        const preview = app.el('ai-file-preview');

        if (fileInput) {
            fileInput.value = '';
        }

        if (preview) {
            preview.style.display = 'none';
        }
    },

    renderHistory(records) {
        if (!Array.isArray(records) || !records.length) {
            return;
        }

        const stream = app.el('ai-chat-stream');

        if (stream) {
            stream.replaceChildren();
        }

        records.forEach((record) => {
            const role = record.role === 'user' ? 'user' : 'assistant';

            this.appendMessage(
                role,
                app.item('p', '', record.content)
            );
        });

        this.scrollToBottom();
    },

    async loadChatHistory(realityId = 1) {
        try {
            const data = await app.get(
                `chat/history?reality_id=${realityId}`
            );

            if (data?.success && Array.isArray(data.records)) {
                this.renderHistory(data.records);
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    },

    async loadToolsDropdown() {
        const select = app.el('tool-select');

        if (!select) {
            return;
        }

        try {
            const response = await fetch(this.toolsEndpoint);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!Array.isArray(data.tools) || !data.tools.length) {
                throw new Error('No MCP tools available.');
            }

            select.replaceChildren();

            data.tools.forEach((tool) => {
                const option = app.item(
                    'option',
                    '',
                    `${tool.name} — ${tool.description}`
                );

                option.value = tool.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to load MCP tools:', error);

            select.replaceChildren();

            const fallback = app.item(
                'option',
                '',
                'MCP tools unavailable'
            );

            fallback.value = '';
            fallback.disabled = true;
            fallback.selected = true;

            select.appendChild(fallback);
        }
    },

    async handlePromptSubmit(input) {
        if (this.isSubmitting) {
            return;
        }

        const prompt = input ? input.value.trim() : '';
        const attachedFile = this.selectedFile;

        if (!prompt && !attachedFile) {
            return;
        }

        if (this.gateway) {
            await this.handleGatewayPrompt(input, prompt, attachedFile);
            return;
        }

        await this.handleStandalonePrompt(input, prompt);
    },

    async handleGatewayPrompt(input, prompt, attachedFile) {
        const requestToken = ++this.requestToken;

        this.isSubmitting = true;
        this.setBusyState(true);

        const displayLabel = attachedFile
            ? `${prompt ? prompt + '\n' : ''}[Attached: ${attachedFile.name}]`
            : prompt;

        const userMessageEl = this.appendUserMessage(displayLabel);
        const loadingMessage = this.appendLoadingMessage();

        try {
            this.activeRequest?.abort();
            this.activeRequest = new AbortController();

            const result = await this.gateway.sendMessage(
                prompt,
                attachedFile,
                this.activeRequest.signal
            );

            if (requestToken !== this.requestToken) {
                return;
            }

            if (!result || !result.success) {
                throw new Error(
                    result?.error || 'Unable to generate a response.'
                );
            }

            if (input) {
                input.value = '';
                input.style.height = 'auto';
            }

            this.clearSelectedFile();

            const content = loadingMessage?.querySelector('.message-content');

            if (content) {
                content.replaceChildren();

                if (result.tool) {
                    content.appendChild(
                        app.item(
                            'div',
                            'tool-call-badge',
                            `⚡ Used [${result.tool}]`
                        )
                    );
                }

                content.appendChild(
                    app.item(
                        'p',
                        '',
                        result.response || 'No response generated.'
                    )
                );
            }
        } catch (error) {
            if (requestToken !== this.requestToken) {
                return;
            }

            if (error.name === 'AbortError') {
                return;
            }

            if (userMessageEl) {
                userMessageEl.remove();
            }

            if (loadingMessage) {
                this.renderError(loadingMessage, error.message);
            }
        } finally {
            if (requestToken === this.requestToken) {
                this.isSubmitting = false;
                this.setBusyState(false);
                this.scrollToBottom();
            }
        }
    },

    async handleStandalonePrompt(input, prompt) {
        const toolSelect = app.el('tool-select');
        const tool = toolSelect?.value;

        if (!tool || !prompt) {
            return;
        }

        this.appendUserMessage(prompt);

        if (input) {
            input.value = '';
            input.style.height = 'auto';
        }

        this.setBusyState(true);

        const loadingMessage = this.appendLoadingMessage();

        if (!loadingMessage) {
            this.setBusyState(false);
            return;
        }

        try {
            const result = await this.executeTool(tool, prompt);

            this.renderAssistantResponse(
                loadingMessage,
                tool,
                prompt,
                result
            );
        } catch (error) {
            this.renderError(loadingMessage, error.message);
        } finally {
            this.setBusyState(false);
            this.scrollToBottom();
        }
    },

    async executeTool(tool, prompt) {
        let args = { query: prompt };

        if (tool === 'calculator') {
            args = { expression: prompt };
        } else if (tool === 'stock_quote') {
            args = { ticker: prompt.toUpperCase() };
        } else if (tool === 'gmail') {
            args = { action: 'search', query: prompt };
        }

        const response = await fetch(this.executeEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tool,
                args
            })
        });

        const result = await response.json();

        if (!response.ok || result.status !== 'success') {
            throw new Error(
                result?.error?.message ||
                result?.message ||
                'Tool execution failed.'
            );
        }

        return result.output;
    },

    renderAssistantResponse(messageEl, tool, prompt, output) {
        const content = messageEl.querySelector('.message-content');

        if (!content) {
            return;
        }

        content.replaceChildren();

        const formattedOutput = this.formatToolOutput(tool, output);

        if (tool === 'gmail' && output?.output) {
            content.appendChild(
                app.item('pre', 'himalaya-output', output.output)
            );

            return;
        }

        content.appendChild(
            app.item(
                'div',
                'tool-call-badge',
                `⚡ Executed [${tool}]`
            )
        );

        content.appendChild(
            app.item('p', '', formattedOutput)
        );
    },

    renderError(messageEl, errorMessage) {
        const content = messageEl.querySelector('.message-content');

        if (!content) {
            return;
        }

        content.replaceChildren();

        content.appendChild(
            app.item(
                'p',
                'chat-error',
                `[Error]: ${errorMessage}`
            )
        );
    },

    getModel() {
        const badge = app.el('model-badge');

        if (badge) {
            badge.textContent = 'qwen2.5:0.5b';
        }
    },

    appendUserMessage(text) {
        return this.appendMessage(
            'user',
            app.item('p', '', text)
        );
    },

    appendLoadingMessage() {
        const spinner = app.loadingSpinner('Thinking…');

        return this.appendMessage('assistant', spinner);
    },

    formatToolOutput(tool, output) {
        if (typeof output !== 'object' || output === null) {
            return String(output);
        }

        if (tool === 'calculator' && output.result !== undefined) {
            return String(output.result);
        }

        if (tool === 'stock_quote' && output.price !== undefined) {
            return `${output.ticker}: ${output.price} ${output.currency ?? ''}`.trim();
        }

        return JSON.stringify(output, null, 2);
    },

    appendMessage(role, childNode) {
        const stream = app.el('ai-chat-stream');

        if (!stream) {
            return null;
        }

        const message = app.item(
            'div',
            `chat-message ${role}-message`
        );

        const content = app.item('div', 'message-content');

        content.appendChild(childNode);

        message.append(
            app.item(
                'div',
                'avatar',
                role === 'user' ? 'You' : 'AI'
            ),
            content
        );

        stream.appendChild(message);
        this.scrollToBottom();

        return message;
    },

    setBusyState(isBusy) {
        const sendBtn = app.el('ai-send-btn');
        const input = app.el('ai-prompt-input');
        const uploadBtn = app.el('ai-upload-btn');

        if (sendBtn) {
            sendBtn.disabled = isBusy;
        }

        if (input) {
            input.disabled = isBusy;
        }

        if (uploadBtn) {
            uploadBtn.disabled = isBusy;
        }
    },

    scrollToBottom() {
        const stream = app.el('ai-chat-stream');

        if (stream) {
            stream.scrollTop = stream.scrollHeight;
        }
    }
};