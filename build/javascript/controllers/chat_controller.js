const ChatController = Object.assign(Object.create(AiController), {
    realityId: 1,

    index() {
        app.dBug('ChatController', 'index() called');

        const form = this.getActiveForm();
        const container = form ? form.closest('.ai-container') : app.el('ai');

        if (!container) {
            app.dBug('ChatController', 'ERROR: Active #ai container not found');
            return;
        }

        this.realityId = Number(container.dataset.realityId) || 1;
        this.activeContainer = container;
        this.gateway = this;

        app.dBug('ChatController', 'Initialized gateway', {
            realityId: this.realityId,
            hasForm: !!form
        });

        this.init(this);
        this.loadHistory();
    },

    async loadHistory() {
        app.dBug('ChatController', 'loadHistory()', { realityId: this.realityId });

        try {
            const data = await app.get(`chat/history?reality_id=${this.realityId}`);
            if (data?.success && Array.isArray(data.records)) {
                this.renderHistory(data.records);
            }
        } catch (error) {
            app.dBug('ChatController', 'loadHistory() ERROR', error.message);
        }
    },

    async sendMessage(prompt, file = null, signal = null) {
        app.dBug('ChatController', 'sendMessage()', {
            realityId: this.realityId,
            prompt,
            hasFile: !!file
        });

        const formData = new FormData();
        formData.append('reality_id', this.realityId);
        formData.append('message', prompt);
        if (file) formData.append('file', file);

        const response = await fetch('/php/chat/handle', {
            method: 'POST',
            body: formData,
            signal
        });

        const payload = await response.json();
        app.dBug('ChatController', 'sendMessage() response', {
            status: response.status,
            payload
        });

        if (!response.ok) {
            throw new Error(payload?.error || `HTTP ${response.status}`);
        }

        return payload;
    }
});