const AiConfig = {
  apiBaseUrl: "http://sharpishly2.test/py"
};

const AiController = {
  toolsEndpoint: `${AiConfig.apiBaseUrl}/mcp/tools`,
  executeEndpoint: `${AiConfig.apiBaseUrl}/mcp/execute`,

  index() {
    app.dBug('toolsEndpoint',this.toolsEndpoint);
    app.dBug('executeEndpoint',this.executeEndpoint);
    const form = app.el('ai-prompt-form');
    const input = app.el('ai-prompt-input');
    if (!form || form.dataset.initialized) return;

    form.dataset.initialized = 'true';
    this.bindEvents(form, input);
    this.getModel();
    this.loadToolsDropdown();
  },

  bindEvents(form, input) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handlePromptSubmit(input);
    });

    if (!input) return;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
    });
  },

  async loadToolsDropdown() {
    const select = app.el('tool-select');
    if (!select) return;

    try {
      const response = await fetch(this.toolsEndpoint);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data.tools) || data.tools.length === 0) {
        throw new Error('No MCP tools available.');
      }

      select.innerHTML = '';

      data.tools.forEach((tool) => {
        const option = app.item('option', '', `${tool.name} — ${tool.description}`);
        option.value = tool.name;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('Failed to load MCP tools:', error);

      select.innerHTML = '';
      const fallback = app.item('option', '', 'MCP tools unavailable');
      fallback.value = '';
      fallback.disabled = true;
      fallback.selected = true;
      select.appendChild(fallback);
    }
  },

  async handlePromptSubmit(input) {
    const prompt = input.value.trim();
    const toolSelect = app.el('tool-select');
    const tool = toolSelect?.value;

    if (!tool) {
      throw new Error('No MCP tool is available.');
    }

    if (!prompt) return;

    this.appendUserMessage(prompt);
    input.value = '';
    input.style.height = 'auto';

    this.setBusyState(true);
    const loadingMessage = this.appendLoadingMessage();

    if (!loadingMessage) {
      this.setBusyState(false);
      return;
    }

    try {
      const result = await this.executeTool(tool, prompt);
      this.renderAssistantResponse(loadingMessage, tool, prompt, result);
    } catch (error) {
      this.renderError(loadingMessage, error.message);
    } finally {
      this.setBusyState(false);
      this.scrollToBottom();
    }
  },

  async executeTool(tool, prompt) {
    let args = {};
    if (tool === 'calculator') {
      args = { expression: prompt };
    } else if (tool === 'stock_quote') {
      args = { ticker: prompt.toUpperCase() };
    } else if (tool === 'gmail') {
      args = { action: 'search', query: prompt };
    } else {
      args = { query: prompt };
    }

    const response = await fetch(this.executeEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, args })
    });

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(
        response.ok
          ? "Invalid response from MCP service."
          : `MCP service returned HTTP ${response.status}.`
      );
    }

    if (!response.ok || result.status !== 'success') {
      throw new Error(result.message ?? `Tool execution failed.`);
    }

    return result.output;
  },

  getModel() {
    const badge = app.el('model-badge');
    if (badge) badge.textContent = 'qwen2.5:0.5b';
  },

  // --- Modular Render Helpers ---

  appendUserMessage(text) {
    return this.appendMessage('user', app.item('p', '', text));
  },

  appendLoadingMessage() {
    const spinner = app.loadingSpinner('Executing MCP tool…');
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

  renderAssistantResponse(messageEl, tool, prompt, output) {
    const content = messageEl.querySelector('.message-content');
    if (!content) return;
    content.innerHTML = '';

    const formattedOutput = this.formatToolOutput(tool, output);
    const badgeText = `⚡ Executed [${tool}]: ${prompt} → ${formattedOutput}`;
    
    content.appendChild(app.item('div', 'tool-call-badge', badgeText));
    content.appendChild(app.item('p', '', `Result successfully retrieved.`));
  },

  renderError(messageEl, errorMessage) {
    const content = messageEl.querySelector('.message-content');
    if (!content) return;
    content.innerHTML = '';
    content.appendChild(app.item('p', 'chat-error', `[Error]: ${errorMessage}`));
  },

  appendMessage(role, childNode) {
    const stream = app.el('ai-chat-stream');
    if (!stream) return null;

    const message = app.item('div', `chat-message ${role}-message`);
    const content = app.item('div', 'message-content');

    content.appendChild(childNode);
    message.append(
      app.item('div', 'avatar', role === 'user' ? 'You' : 'AI'),
      content
    );

    stream.appendChild(message);
    this.scrollToBottom();

    return message;
  },

  setBusyState(isBusy) {
    const sendBtn = app.el('ai-send-btn');
    const input = app.el('ai-prompt-input');

    if (sendBtn) sendBtn.disabled = isBusy;
    if (input) input.disabled = isBusy;
  },

  scrollToBottom() {
    const stream = app.el('ai-chat-stream');
    if (stream) stream.scrollTop = stream.scrollHeight;
  }
};