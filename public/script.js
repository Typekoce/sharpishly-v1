const app = {
    currentPage: 'home',
    dom: {},
    data:{},
    setDom(key, val) {
        this.dom[key] = val;
    },

    getDom(page) {
        return this.dom[page];
    },

    setPage(page) {
        this.currentPage = page;
        console.log({ currentPage: page });
    },

    init() {
        void this.getPage('home');
        this.gotoPage();
        // Removed synchronous navigation() here to prevent running before fetch completes
    },

    navigation() {
        if (this.currentPage === 'home' && typeof HomeController !== 'undefined') {
            HomeController.index();
        }

        if (this.currentPage === 'ai' && typeof AiController !== 'undefined') {
            AiController.index();
        }
    },

    async getPage(page) {
        this.setPage(page);
        const container = this.el('app');
        if (!container) return;

        try {
            template = `/views/pages/${encodeURIComponent(page)}.html`;
            this.dBug('Template',template);
            const res = await fetch(template);
            container.innerHTML = await res.text();
            this.setDom(page, this.el(page));
            // Trigger navigation / controller execution after DOM elements exist
            this.navigation();
        } catch (error) {
            console.error(`Failed to load page: ${page}`, error);
        } 
    },

    gotoPage() {
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-page]');
            if (target) {
                event.preventDefault();
                const page = target.getAttribute('data-page');
                if (page) void this.getPage(page);
            }
        });
    },

    async request(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error(`Failed to load URL: ${url}`, error);
            return null;
        }
    },

    el(id) {
        return document.getElementById(id);
    },

    get(endpoint) {
        const cleanEndpoint = endpoint.replace(/^\/+/, '');
        return this.request(`http://sharpishly2.test/php/${cleanEndpoint}`);
    },

    item(tag, className = '', text = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    },

    dBug(key, val) {
        console.log({ key: key, value: val });
    },
    // Add inside app object in app.js
// Add inside app object in app.js
    loadingSpinner(label = 'Thinking…') {
        const wrapper = this.item('div', 'loading-spinner-wrapper');
        wrapper.style.display = 'inline-flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '0.5rem';
        wrapper.style.fontFamily = 'var(--font-mono)';
        wrapper.style.fontSize = '0.85rem';
        wrapper.style.color = 'var(--accent-cyan)';

        const spinnerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        spinnerSvg.setAttribute('width', '16');
        spinnerSvg.setAttribute('height', '16');
        spinnerSvg.setAttribute('viewBox', '0 0 24 24');
        spinnerSvg.setAttribute('fill', 'none');
        spinnerSvg.setAttribute('stroke', 'currentColor');
        spinnerSvg.setAttribute('stroke-width', '2');
        spinnerSvg.style.animation = 'spin 1s linear infinite';

        spinnerSvg.innerHTML = `
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2 a10 10 0 0 1 10 10" stroke="currentColor"></path>
        `;

        const textSpan = this.item('span', 'spinner-label', label);
        wrapper.appendChild(spinnerSvg);
        wrapper.appendChild(textSpan);

        return wrapper;
    },
};
app.routes = function() {
    console.log({'routes': this.currentPage});
};

const HomeController = {
    async index() {

        const container = app.getDom('home');

        const wrapper = app.item('div', 'home-records');

        container.appendChild(wrapper);

        const result = await app.get('todo/read');
        const records = result?.records || result?.data || [];

        if (records.length === 0) {
            this.renderEmpty(wrapper);
        } else {
            this.renderRecords(wrapper, records);
        }
    },

    renderEmpty(container) {
        container.appendChild(app.item('p', 'text-muted', 'No records found.'));
    },

    // TODO: Move to RenderController
    renderRecords(container, records) {
        records.forEach(record => {
            const metricItem = app.item('div', 'metric-item');

            metricItem.onclick = function(){alert('foo')};
            
            const labelSpan = app.item('span', 'metric-label', 'Framework');
            const valueSpan = app.item('span', 'metric-value', record.title || JSON.stringify(record));
            
            metricItem.appendChild(labelSpan);
            metricItem.appendChild(valueSpan);
            
            container.appendChild(metricItem);
        });
    }
};
const AiController = {
    apiEndpoint: 'http://localhost:8000/api/chat',

    index() {
        const form = app.el('ai-prompt-form');
        const input = app.el('ai-prompt-input');
        if (!form || form.dataset.initialized) return;

        form.dataset.initialized = 'true';
        this.bindEvents(form, input);
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

        const result = await response.json();
        if (!response.ok || result.status !== 200) {
            throw new Error(result.error ?? 'Request failed');
        }

        return result.data ?? {};
    },

    getModel(){
        // get model & display in #model-badge
    },

    selectTool(){
        // get tools, no static drop downs
    },

    // --- Render Helpers (DRY & MVC Compliant) ---

    appendUserMessage(text) {
        return this.appendMessage('user', app.item('p', '', text));
    },

    appendLoadingMessage() {
        const spinner = app.loadingSpinner('Thinking…');
        return this.appendMessage('assistant', spinner);
    },

    renderAssistantResponse(messageEl, data) {
        const content = messageEl.querySelector('.message-content');
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
        content.innerHTML = '';
        content.appendChild(app.item('p', 'chat-error', `[Error]: ${errorMessage}`));
    },

    appendMessage(role, childNode) {
        const stream = app.el('ai-chat-stream');
        const message = app.item('div', `chat-message ${role}-message`);
        const avatar = app.item('div', 'avatar', role === 'user' ? 'You' : 'AI');
        const content = app.item('div', 'message-content');

        content.appendChild(childNode);
        message.append(avatar, content);
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
document.addEventListener('DOMContentLoaded', () => {

    app.init();

    const toggleBtn = document.getElementById('menu-toggle');
    const menu = document.getElementById('nav-menu');

    const setMenuState = (open) => {
        menu?.classList.toggle('show', open);
        toggleBtn?.setAttribute('aria-expanded', String(open));
    };

    toggleBtn?.addEventListener('click', () => {
        setMenuState(!menu.classList.contains('show'));
    });

    // Close menu on nav item selection (SPA navigation friendly)
    menu?.addEventListener('click', (event) => {
        const link = event.target.closest('.nav-link');
        if (link) {
            setMenuState(false);
        }
    });

    // Close menu on Escape key press
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setMenuState(false);
        }
    });
});
