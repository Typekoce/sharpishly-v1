const ChatController = Object.assign(Object.create(AiController), {
    defaultTool: 'qwen',

    _withToolFallback(fn) {
        const existing = app.el('tool-select');
        let tempSelect = null;

        app.dBug('ChatController._withToolFallback start', {
            hasExistingSelect: Boolean(existing),
            defaultTool: this.defaultTool
        });

        if (!existing && this.defaultTool) {
            tempSelect = document.createElement('select');
            tempSelect.id = 'tool-select';
            tempSelect.style.display = 'none';

            const option = document.createElement('option');
            option.value = this.defaultTool;
            option.selected = true;
            tempSelect.appendChild(option);

            document.body.appendChild(tempSelect);
            app.dBug('ChatController._withToolFallback injected tempSelect', this.defaultTool);
        }

        try {
            return fn();
        } finally {
            if (tempSelect) {
                tempSelect.remove();
                app.dBug('ChatController._withToolFallback removed tempSelect');
            }
        }
    },

    async saveResponsePref(responseText, prompt = '') {
        app.dBug('ChatController saveResponsePref start', { pref: responseText, prompt });

        try {
            const res = await app.post('chat/save', {
                prompt,
                pref: responseText
            });
            app.dBug('ChatController saveResponsePref response', res);
            return res;
        } catch (error) {
            app.dBug('ChatController saveResponsePref ERROR', error.message);
            return null;
        }
    },

    renderSuccess(messageEl, text) {
        app.dBug('ChatController renderSuccess', { hasMessageEl: Boolean(messageEl), text });
        const content = messageEl?.querySelector('.message-content');
        if (!content) {
            app.dBug('ChatController renderSuccess missing .message-content');
            return;
        }

        content.replaceChildren();
        content.appendChild(
            app.item('p', 'chat-success', text)
        );
    },

    async executeTool(tool, prompt) {
        app.dBug('ChatController executeTool start', { tool, prompt });

        try {
            const output = await AiController.executeTool.call(this, tool, prompt);
            app.dBug('ChatController executeTool raw output', output);

            const text = this.formatToolOutput(tool, output);
            app.dBug('ChatController executeTool formatted text', text);

            const saveResult = await this.saveResponsePref(text, prompt);
            const savedId = saveResult?.message_id ?? 1;
            app.dBug('ChatController executeTool calling reply()', { savedId });
            await this.reply(savedId);

            return output;
        } catch (error) {
            app.dBug('ChatController executeTool fallback error', error.message);

            const label = prompt
                ? `Message saved: "${prompt}"`
                : 'Message saved successfully.';

            const saveResult = await this.saveResponsePref(label, prompt);
            const savedId = saveResult?.message_id ?? 1;

            const stream = app.el('ai-chat-stream');
            const lastMessage = stream?.lastElementChild;
            app.dBug('ChatController executeTool fallback DOM', {
                hasStream: Boolean(stream),
                hasLastMessage: Boolean(lastMessage),
                savedId
            });

            if (lastMessage) {
                this.renderSuccess(lastMessage, label);
                return null;
            }

            throw error;
        }
    },

    renderAssistantResponse(messageEl, tool, prompt, output) {
        app.dBug('ChatController renderAssistantResponse', {
            hasMessageEl: Boolean(messageEl),
            tool,
            prompt,
            output
        });

        if (output === null || output === undefined) {
            const label = prompt
                ? `Message saved: "${prompt}"`
                : 'Message saved successfully.';
            this.renderSuccess(messageEl, label);
            return;
        }

        AiController.renderAssistantResponse.call(this, messageEl, tool, prompt, output);
    },

    renderHistory(records) {
        app.dBug('ChatController renderHistory', {
            isArray: Array.isArray(records),
            count: Array.isArray(records) ? records.length : 0
        });

        if (!Array.isArray(records) || !records.length) return;

        const stream = app.el('ai-chat-stream');
        if (stream) {
            stream.replaceChildren();
        }

        records.forEach((record) => {
            const role = record.role === 'user' ? 'user' : 'assistant';
            const text = role === 'assistant'
                ? (record.pref ?? record.content ?? '')
                : (record.content ?? record.pref ?? '');

            app.dBug('ChatController renderHistory item', { id: record.id, role, hasPref: Boolean(record.pref), text });
            this.appendMessage(role, app.item('p', '', text));
        });

        this.scrollToBottom();
    },

    extractSavedResponse(data) {
        app.dBug('ChatController extractSavedResponse input', data);
        if (!data) return '';

        const records = Array.isArray(data.records)
            ? data.records
            : (data.record ? [data.record] : []);

        if (records.length > 0) {
            const first = records[0];
            app.dBug('ChatController extractSavedResponse first record', first);
            const fromRecord = first.pref ?? first.content ?? first.response ?? first.message ?? '';
            if (String(fromRecord).trim() !== '') {
                return String(fromRecord);
            }
        }

        return data.pref ?? data.message ?? '';
    },

    async reply(id = 1) {
        app.dBug('ChatController.reply() start', { id });

        const stream = app.el('ai-chat-stream');
        app.dBug('ChatController.reply() stream element', stream);

        const loadingEl = this.appendLoadingMessage();
        app.dBug('ChatController.reply() loadingEl', loadingEl);

        const relPath = `ai/reply/${id}`;
        const url = typeof app.url === 'function' ? app.url(relPath) : relPath;
        app.dBug('ChatController.reply() resolved url', { relPath, url });

        try {
            const raw = await app.request(url);
            app.dBug('ChatController.reply() raw response', raw);

            const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
            app.dBug('ChatController.reply() parsed data', data);

            const savedText = this.extractSavedResponse(data) || 'No saved AI response found.';
            app.dBug('ChatController.reply() savedText', savedText);

            if (loadingEl) {
                const content = loadingEl.querySelector('.message-content');
                app.dBug('ChatController.reply() target .message-content', content);
                if (content) {
                    content.replaceChildren(app.item('p', '', savedText));
                }
            } else {
                app.dBug('ChatController.reply() appending new assistant message');
                this.appendMessage('assistant', app.item('p', '', savedText));
            }

            this.scrollToBottom();
            return savedText;
        } catch (error) {
            app.dBug('ChatController.reply() ERROR', {
                message: error.message,
                stack: error.stack
            });

            if (loadingEl) {
                this.renderError(loadingEl, error.message);
            } else {
                this.appendMessage('assistant', app.item('p', 'chat-error', `[Error]: ${error.message}`));
            }

            this.scrollToBottom();
            return null;
        }
    },

    index() {
        app.dBug('ChatController', 'index()');

        const container = app.el('ai');
        const form = app.el('ai-prompt-form');
        const input = app.el('ai-prompt-input');
        const button = app.el('ai-send-btn');

        app.dBug('ChatController container', container);
        app.dBug('ChatController form', form);
        app.dBug('ChatController input', input);
        app.dBug('ChatController button', button);

        if (!container || !button || !input) {
            app.dBug('ChatController', 'Missing required chat DOM elements');
            return;
        }

        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                const currentPrompt = input.value;
                app.dBug('ChatController submit', currentPrompt);
                const mpc = Object.create(MultiplePromptsController);
                mpc._tools(currentPrompt, this.defaultTool);
                this._withToolFallback(() => this.handlePromptSubmit(input));
            });
        } else {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const currentPrompt = input.value;
                app.dBug('ChatController click', currentPrompt);
                const mpc = Object.create(MultiplePromptsController);
                mpc._tools(currentPrompt, this.defaultTool);
                this._withToolFallback(() => this.handlePromptSubmit(input));
            });
        }

        this.getModel();
        this.loadChatHistory();
    }
});