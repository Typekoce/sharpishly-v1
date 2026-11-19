const MultiplePromptsController = {
    defaultTool: 'qwen',
    executeEndpoint: `${AiConfig.apiBaseUrl}/mcp/execute`,

    splitPrompt(prompt) {
        if (!prompt || typeof prompt !== 'string') return [];

        return prompt
            .split(/\s*(?:&&|;|\r?\n)\s*/)
            .map((part) => part.trim())
            .filter(Boolean);
    },

    inferTool(segment, fallbackTool = this.defaultTool) {
        const lower = segment.toLowerCase();

        if (/^(?:gmail|email|mail|inbox|read\s+\S+|list)$/i.test(lower) || /@[\w.-]+\.\w+/.test(segment)) {
            return 'gmail';
        }
        if (/^(?:calc|calculator)\b/i.test(lower) || (/^[0-9+\-*/().%\s^]+$/.test(segment.trim()) && /[+\-*/^]/.test(segment))) {
            return 'calculator';
        }
        if (/^(?:stock|quote|ticker)\s+[A-Za-z]{1,5}$/i.test(lower)) {
            return 'stock_quote';
        }

        return fallbackTool;
    },

    cleanSegment(segment, tool) {
        if (tool === 'calculator') {
            return segment.replace(/^(?:calc|calculator)\s*:?\s*/i, '').trim();
        }
        if (tool === 'stock_quote') {
            return segment.replace(/^(?:stock|quote|ticker)\s*:?\s*/i, '').trim();
        }
        return segment;
    },

    async _tools(promptOrInput, fallbackTool = this.defaultTool) {
        const rawPrompt = typeof promptOrInput === 'string'
            ? promptOrInput
            : (promptOrInput?.value ?? '');

        const segments = this.splitPrompt(rawPrompt);
        app.dBug('MultiplePromptsController._tools segments', segments);

        if (!segments.length) return [];

        const execContext = {
            ...AiController,
            executeEndpoint: this.executeEndpoint || AiController.executeEndpoint
        };

        const tasks = segments.map(async (segment, index) => {
            const tool = this.inferTool(segment, fallbackTool);
            const cleaned = this.cleanSegment(segment, tool);

            app.dBug('MultiplePromptsController task', { index, tool, prompt: cleaned });

            try {
                const output = await AiController.executeTool.call(execContext, tool, cleaned);
                return { index, tool, prompt: cleaned, status: 'fulfilled', output };
            } catch (error) {
                app.dBug('MultiplePromptsController task error', error.message);
                return { index, tool, prompt: cleaned, status: 'rejected', error: error.message };
            }
        });

        const results = await Promise.all(tasks);
        app.dBug('MultiplePromptsController._tools results', results);
        return results;
    }
};