const AiConfig = {
    apiBaseUrl: "http://sharpishly2.test/py"
};

const AiController = {
    toolsEndpoint: `${AiConfig.apiBaseUrl}/mcp/tools`,
    executeEndpoint: `${AiConfig.apiBaseUrl}/mcp/execute`,
    gateway: null,
    activeContainer: null,
    selectedFile: null,
    activeRequest: null,
    isSubmitting: false,
    requestToken: 0,

    init(gateway) {
        this.gateway = gateway;

        const form = this.getActiveForm();
        const input = form ? form.querySelector('.prompt-input') : app.el('ai-prompt-input');

        if (!form) {
            return;
        }

        this.activeContainer = form.closest('.ai-container');

        if (form.dataset.initialized) {
            return;
        }

        form.dataset.initialized = 'true';

        this.bindEvents(form, input);
        this.bindFileUpload(form);
        this.getModel();
    },

    index() {
        this.gateway = null;

        const form = this.getActiveForm();
        const input = form ? form.querySelector('.prompt-input') : app.el('ai-prompt-input');

        if (!form) {
            return;
        }

        this.activeContainer = form.closest('.ai-container');

        if (form.dataset.initialized) {
            return;
        }

        form.dataset.initialized = 'true';

        this.bindEvents(form, input);
        this.getModel();
        this.loadToolsDropdown();
        this.loadChatHistory();
    },

    getActiveForm() {
        const forms = Array.from(document.querySelectorAll('#ai-prompt-form'));
        return forms.find((f) => f.offsetParent !== null) || forms[forms.length - 1] || null;
    },

    getStream() {
        if (this.activeContainer) {
            const scoped = this.activeContainer.querySelector('#ai-chat-stream');
            if (scoped) return scoped;
        }
        return app.el('ai-chat-stream');
    },

    bindEvents(form, input) {
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

    bindFileUpload(form) {
        const wrapper = form.closest('.ai-input-wrapper') || document;
        const uploadBtn = wrapper.querySelector('#ai-upload-btn');
        const fileInput = wrapper.querySelector('#ai-file-input');
        const clearBtn = wrapper.querySelector('#ai-file-clear');

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

            const preview = wrapper.querySelector('#ai-file-preview');
            const fileName = wrapper.querySelector('#ai-file-name');

            if (fileName) {
                fileName.textContent = `📎 ${file.name}`;
            }

            if (preview) {
                preview.style.display = 'inline-flex';
            }
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearSelectedFile(wrapper));
        }
    },

    clearSelectedFile(scope = document) {
        this.selectedFile = null;

        const fileInput = scope.querySelector('#ai-file-input');
        const preview = scope.querySelector('#ai-file-preview');

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

        const stream = this.getStream();

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

    async handlePromptSubmit(input, form = null) {
        if (this.isSubmitting) {
            return;
        }

        if (form) {
            this.activeContainer = form.closest('.ai-container');
        }

        const prompt = input ? input.value.trim() : '';
        const attachedFile = this.selectedFile;

        if (!prompt && !attachedFile) {
            return;
        }

        if (this.gateway) {
            await this.handleGatewayPrompt(input, prompt, attachedFile, form);
            return;
        }

        await this.handleStandalonePrompt(input, prompt, form);
    },

    async handleGatewayPrompt(input, prompt, attachedFile, form = null) {
        const requestToken = ++this.requestToken;
        const wrapper = form?.closest('.ai-input-wrapper') || document;

        this.isSubmitting = true;
        this.setBusyState(true, form);

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

            this.clearSelectedFile(wrapper);

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
                this.setBusyState(false, form);
                this.scrollToBottom();
            }
        }
    },

    async handleStandalonePrompt(input, prompt, form = null) {
        const scope = this.activeContainer || document;
        const toolSelect = scope.querySelector('#tool-select') || app.el('tool-select');
        const tool = toolSelect?.value;

        if (!tool || !prompt) {
            return;
        }

        this.appendUserMessage(prompt);

        if (input) {
            input.value = '';
            input.style.height = 'auto';
        }

        this.setBusyState(true, form);

        const loadingMessage = this.appendLoadingMessage();

        if (!loadingMessage) {
            this.setBusyState(false, form);
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
            this.setBusyState(false, form);
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
        const scope = this.activeContainer || document;
        const badge = scope.querySelector('#model-badge') || app.el('model-badge');

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
        const stream = this.getStream();

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

    setBusyState(isBusy, form = null) {
        const scope = form || this.activeContainer || document;
        const sendBtn = scope.querySelector('#ai-send-btn');
        const input = scope.querySelector('#ai-prompt-input');
        const uploadBtn = scope.querySelector('#ai-upload-btn');

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
        const stream = this.getStream();

        if (stream) {
            stream.scrollTop = stream.scrollHeight;
        }
    }
};

// Scope input lookup directly to the submitted form (event.target)
document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form && form.id === 'ai-prompt-form') {
        event.preventDefault();
        const input = form.querySelector('#ai-prompt-input');
        AiController.handlePromptSubmit(input, form);
    }
});