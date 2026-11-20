const ChatController = Object.assign(Object.create(AiController), {
    defaultTool: 'qwen',
    lastMessageId: null,

    _resolveUrl(path) {
        return typeof app.url === 'function' ? app.url(path) : path;
    },

    _withToolFallback(fn) {
        const existing = app.el('tool-select');
        let tempSelect = null;

        if (!existing && this.defaultTool) {
            tempSelect = document.createElement('select');
            tempSelect.id = 'tool-select';
            tempSelect.style.display = 'none';
            const opt = document.createElement('option');
            opt.value = this.defaultTool;
            opt.selected = true;
            tempSelect.appendChild(opt);
            document.body.appendChild(tempSelect);
        }

        try {
            return fn();
        } finally {
            if (tempSelect) tempSelect.remove();
        }
    },

    _bindSubmit(target, input) {
        if (!target) return;
        target.addEventListener('submit', (event) => {
            event.preventDefault();
            const prompt = input.value;
            app.dBug('ChatController submit', prompt);
            Object.create(MultiplePromptsController)._tools(prompt, this.defaultTool);
            this._withToolFallback(() => this.handlePromptSubmit(input));
        });
    },

    setSavedMessageId(res) {
        const id = res?.message_id ?? res?.id ?? null;
        if (id) {
            this.lastMessageId = id;
        }
        app.dBug('ChatController lastMessageId', this.lastMessageId);
        return this.lastMessageId;
    },

async saveResponsePref(responseText, prompt = '', messageId = this.lastMessageId) {
        app.dBug('ChatController saveResponsePref', { id: messageId, pref: responseText, prompt });
        if (!messageId) return null;

        try {
            const res = await app.post('chat/update', {
                id: messageId,
                pref: responseText
            });
            app.dBug('ChatController chat/update result', res);
            return res;
        } catch (error) {
            app.dBug('ChatController saveResponsePref ERROR', error.message);
            return null;
        }
    },

    renderSuccess(messageEl, text) {
        app.dBug('ChatController renderSuccess', text);
        const content = messageEl?.querySelector('.message-content');
        if (!content) return;
        content.replaceChildren(app.item('p', 'chat-success', text));
    },

    async executeTool(tool, prompt) {
        app.dBug('ChatController executeTool', { tool, prompt });
        try {
            const output = await AiController.executeTool.call(this, tool, prompt);
            const text = this.formatToolOutput(tool, output);
            const targetId = this.lastMessageId || 1;
            await this.saveResponsePref(text, prompt, targetId);
            await this.reply(targetId);
            return output;
        } catch (error) {
            app.dBug('ChatController executeTool fallback', error.message);
            const label = prompt ? `Message saved: "${prompt}"` : 'Message saved successfully.';
            const targetId = this.lastMessageId || 1;
            await this.saveResponsePref(label, prompt, targetId);

            const lastMessage = app.el('ai-chat-stream')?.lastElementChild;
            if (lastMessage) {
                this.renderSuccess(lastMessage, label);
                return null;
            }
            throw error;
        }
    },

    renderAssistantResponse(messageEl, tool, prompt, output) {
        if (output === null || output === undefined) {
            const label = prompt ? `Message saved: "${prompt}"` : 'Message saved successfully.';
            this.renderSuccess(messageEl, label);
            return;
        }
        AiController.renderAssistantResponse.call(this, messageEl, tool, prompt, output);
    },

    renderHistory(records) {
        if (!Array.isArray(records) || !records.length) return;
        const stream = app.el('ai-chat-stream');
        if (stream) stream.replaceChildren();

        records.forEach((record) => {
            const role = record.role === 'user' ? 'user' : 'assistant';
            const text = role === 'assistant'
                ? (record.pref ?? record.content ?? '')
                : (record.content ?? record.pref ?? '');
            this.appendMessage(role, app.item('p', '', text));
        });

        this.scrollToBottom();
    },

    extractSavedResponse(data) {
        app.dBug('ChatController extractSavedResponse data', data);
        if (!data) return '';
        const records = Array.isArray(data.records) ? data.records : (data.record ? [data.record] : []);
        if (records.length > 0) {
            const first = records[0];
            app.dBug('ChatController first record', first);
            const val = first.pref ?? first.content ?? first.response ?? first.message ?? '';
            if (String(val).trim() !== '') return String(val);
        }
        return data.pref ?? data.message ?? '';
    },

    async reply(id = this.lastMessageId || 1) {
        app.dBug('ChatController.reply()', { id });
        const loadingEl = this.appendLoadingMessage();
        const url = this._resolveUrl(`ai/reply/${id}`);
        app.dBug('ChatController.reply() url', url);

        try {
            const raw = await app.request(url);
            const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
            app.dBug('ChatController.reply() data', data);

            const savedText = this.extractSavedResponse(data) || 'No saved AI response found.';
            app.dBug('ChatController.reply() savedText', savedText);

            const target = loadingEl?.querySelector('.message-content');
            app.dBug('ChatController.reply() target', {
                hasLoadingEl: Boolean(loadingEl),
                hasTarget: Boolean(target),
                stream: app.el('ai-chat-stream')
            });

            if (target) {
if (target) {
                target.replaceChildren(app.item('p', '', savedText));
                app.dBug('ChatController.reply() rendered in target', {
                    childCount: app.el('ai-chat-stream')?.children.length ?? 0,
                    text: target.textContent
                });
            } else {
                this.appendMessage('assistant', app.item('p', '', savedText));
            }            } else {
                this.appendMessage('assistant', app.item('p', '', savedText));
            }
            this.scrollToBottom();
            return savedText;
        } catch (error) {
            app.dBug('ChatController.reply() ERROR', error.message);
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

        if (!container || !button || !input) return;

        if (form) {
            this._bindSubmit(form, input);
        } else {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                form ? form.requestSubmit() : this._withToolFallback(() => this.handlePromptSubmit(input));
            });
        }

        this.getModel();
        this.loadChatHistory();
    }
});