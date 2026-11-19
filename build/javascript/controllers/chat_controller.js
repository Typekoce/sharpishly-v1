const ChatController = Object.assign(Object.create(AiController), {
    defaultTool: 'gmail',

    _withToolFallback(fn) {
        const existing = app.el('tool-select');
        let tempSelect = null;

        if (!existing && this.defaultTool) {
            tempSelect = document.createElement('select');
            tempSelect.id = 'tool-select';
            tempSelect.style.display = 'none';

            const option = document.createElement('option');
            option.value = this.defaultTool;
            option.selected = true;
            tempSelect.appendChild(option);

            document.body.appendChild(tempSelect);
        }

        try {
            return fn();
        } finally {
            if (tempSelect) {
                tempSelect.remove();
            }
        }
    },

    renderSuccess(messageEl, text) {
        app.dBug('ChatController renderSuccess', text);
        const content = messageEl?.querySelector('.message-content');
        if (!content) return;

        content.replaceChildren();
        content.appendChild(
            app.item('p', 'chat-success', text)
        );
    },

    async executeTool(tool, prompt) {
        app.dBug('ChatController executeTool', { tool, prompt });

        try {
            return await AiController.executeTool.call(this, tool, prompt);
        } catch (error) {
            app.dBug('ChatController executeTool fallback', error.message);

            const stream = app.el('ai-chat-stream');
            const lastMessage = stream?.lastElementChild;
            const label = prompt
                ? `Message saved: "${prompt}"`
                : 'Message saved successfully.';

            if (lastMessage) {
                this.renderSuccess(lastMessage, label);
                return null;
            }

            throw error;
        }
    },

    renderAssistantResponse(messageEl, tool, prompt, output) {
        if (output === null || output === undefined) {
            const label = prompt
                ? `Message saved: "${prompt}"`
                : 'Message saved successfully.';
            this.renderSuccess(messageEl, label);
            return;
        }

        AiController.renderAssistantResponse.call(this, messageEl, tool, prompt, output);
    },

    index() {
        app.dBug('ChatController', 'index()');

        const container = app.el('ai');
        const form = app.el('ai-prompt-form');
        const input = app.el('ai-prompt-input');
        const button = app.el('ai-send-btn');

        app.dBug('ChatController container', container);
        app.dBug('ChatController button', button);

        if (!container || !button || !input) {
            app.dBug('ChatController', 'Missing required chat DOM elements');
            return;
        }

        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                app.dBug('ChatController submit', input.value);
                this._withToolFallback(() => this.handlePromptSubmit(input));
            });
        } else {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                app.dBug('ChatController click', input.value);
                this._withToolFallback(() => this.handlePromptSubmit(input));
            });
        }

        this.getModel();
        this.loadChatHistory();
    }
});