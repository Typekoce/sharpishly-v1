const MultiplePromptsController = Object.assign(Object.create(AiController), {
    defaultTool: 'qwen',

    splitPrompt(prompt) {
        if (!prompt || typeof prompt !== 'string') return [];
        return prompt.split(/\s*(?:&&|;|\r?\n)\s*/).map((s) => s.trim()).filter(Boolean);
    },

    inferTool(segment, fallbackTool = this.defaultTool) {
        const lower = segment.toLowerCase();
        if (/^(?:gmail|email|mail|inbox|read\s+\S+|list)$/i.test(lower) || /@[\w.-]+\.\w+/.test(segment)) return 'gmail';
        if (/^(?:calc|calculator)\b/i.test(lower) || (/^[0-9+\-*/().%\s^]+$/.test(segment.trim()) && /[+\-*/^]/.test(segment))) return 'calculator';
        if (/^(?:stock|quote|ticker)\s+[A-Za-z]{1,5}$/i.test(lower)) return 'stock_quote';
        return fallbackTool;
    },

    async _tools(promptOrInput, fallbackTool = this.defaultTool) {
        const raw = typeof promptOrInput === 'string' ? promptOrInput : (promptOrInput?.value ?? '');
        const segments = this.splitPrompt(raw);
        if (!segments.length) return [];

        return Promise.all(segments.map(async (segment, index) => {
            const tool = this.inferTool(segment, fallbackTool);
            const prompt = segment.replace(/^(?:calc|calculator|stock|quote|ticker)\s*:?\s*/i, '').trim();
            app.dBug('MultiplePromptsController task', { index, tool, prompt });
            try {
                const output = await AiController.executeTool.call(this, tool, prompt);
                return { index, tool, prompt, status: 'fulfilled', output };
            } catch (error) {
                app.dBug('MultiplePromptsController task error', error.message);
                return { index, tool, prompt, status: 'rejected', error: error.message };
            }
        }));
    }
});