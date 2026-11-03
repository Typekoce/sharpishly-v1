const AiConfig = {
  apiBaseUrl: "http://127.0.0.1:8000"
};

const AiController = {
  apiEndpoint: `${AiConfig.apiBaseUrl}/api/chat`,

  index() {
    const form = app.el('ai-prompt-form');
    const input = app.el('ai-prompt-input');
    if (!form || form.dataset.initialized) return;

    form.dataset.initialized = 'true';
    this.bindEvents(form, input);
    this.getModel();
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

  async handlePromptSubmit(input) {
    const prompt = input.value.trim();
    const toolSelect = app.el('tool-select');
    const tool = toolSelect?.value || 'calculator';

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
      const data = await this.fetchChatResponse(prompt, tool);
      this.renderAssistantResponse(loadingMessage, data);
    } catch (error) {
      this.renderError(loadingMessage, error.message);
    } finally {
      this.setBusyState(false);
      this.scrollToBottom();
    }
  },

  async fetchChatResponse(prompt, tool) {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, tool })
    });

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        response.ok
          ? "Invalid response from AI service."
          : `AI service returned HTTP ${response.status}.`
      );
    }

    if (!response.ok || result.status !== 200) {
      throw new Error(result.error ?? `Request failed (HTTP ${response.status})`);
    }

    return result.data ?? {};
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
    const spinner = app.loadingSpinner('Thinking…');
    return this.appendMessage('assistant', spinner);
  },

  renderAssistantResponse(messageEl, data) {
    const content = messageEl.querySelector('.message-content');
    if (!content) return;
    content.innerHTML = '';

    if (data.type === 'tool_call' && Array.isArray(data.tool_calls)) {
      data.tool_calls.forEach(call => {
        const badgeText = `⚡ Executed: ${call.tool} ${JSON.stringify(call.args)} → ${call.output}`;
        content.appendChild(app.item('div', 'tool-call-badge', badgeText));
      });
    }

    content.appendChild(app.item('p', '', data.answer || 'No response returned.'));
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