const ChatController = Object.assign(Object.create(AiController), {
    realityId: 1,
    gateway: null,

    index() {
        const container = app.el('ai');

        if (!container) {
            console.error('ChatController: #ai container not found.');
            return;
        }

        this.realityId = Number(container.dataset.realityId) || 1;
        this.gateway = this;

        if (
            typeof AiController === 'undefined' ||
            typeof AiController.init !== 'function'
        ) {
            console.error('ChatController: AiController.init is unavailable.');
            return;
        }

        AiController.init(this);
        this.loadHistory();
    },

    async loadHistory() {
        try {
            const data = await app.get(
                `chat/history?reality_id=${this.realityId}`
            );

            if (data?.success && Array.isArray(data.records)) {
                this.renderHistory(data.records);
            }
        } catch (error) {
            console.error(
                'ChatController: Failed to load chat history.',
                error
            );
        }
    },

    async sendMessage(prompt, file = null, signal = null) {
        app.dBug('ChatController', 'sendMessage()', {
            prompt,
            hasFile: !!file
        });

        const formData = this.buildFormData(prompt, file);

        const response = await fetch('/php/chat/handle', {
            method: 'POST',
            body: formData,
            signal
        });

        return this.parseJsonResponse(response, '/php/chat/handle');
    },

    buildFormData(prompt, file = null) {
        const formData = new FormData();

        formData.append('reality_id', this.realityId);
        formData.append('message', prompt);

        if (file) {
            formData.append('file', file);
        }

        return formData;
    },

    async parseJsonResponse(response, endpoint) {
        let payload = null;

        try {
            payload = await response.json();
        } catch (error) {
            throw new Error(
                `Invalid server response from ${endpoint} ` +
                `(HTTP ${response.status}).`
            );
        }

        if (!response.ok) {
            throw new Error(
                payload?.error ||
                `Request to ${endpoint} failed (HTTP ${response.status}).`
            );
        }

        return payload;
    }
});