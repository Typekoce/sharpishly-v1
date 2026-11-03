const Pages = {
    'home': () => HomeController.index(),
    'ai': () => AiController.index(),
};
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
    }
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
    index() {
        const form = app.el('ai-prompt-form');
        const input = app.el('ai-prompt-input');

        if (!form || form.dataset.initialized) return;
        form.dataset.initialized = 'true';

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const prompt = input.value.trim();
            const tool = app.el('tool-select').value;
            if (!prompt) return;

            this.appendMessage('user', prompt);
            input.value = '';

            this.sendPromptToQwen(prompt, tool);
        });
    },

    async sendPromptToQwen(userPrompt, targetTool) {
        const sendBtn = app.el('ai-send-btn');
        sendBtn.disabled = true;

        const loadingBubble = this.appendMessage('assistant', 'Thinking and invoking tools...');

        try {
            const response = await fetch('http://127.0.0.1:8000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userPrompt, tool: targetTool })
            });

            const result = await response.json();

            if (response.ok && result.status === 200) {
                const data = result.data;
                let formattedHtml = '';

                if (data.type === 'tool_call' && data.tool_calls) {
                    data.tool_calls.forEach(call => {
                        formattedHtml += `<div class="tool-call-badge">⚡ Executed: ${call.tool} (${JSON.stringify(call.args)})</div>`;
                    });
                }

                formattedHtml += `<p>${data.answer || 'No response returned.'}</p>`;
                loadingBubble.querySelector('.message-content').innerHTML = formattedHtml;
            } else {
                const errorMsg = result.error || 'Request failed';
                loadingBubble.querySelector('.message-content').innerHTML = `<p style="color: #ff5555;">[Error]: ${errorMsg}</p>`;
            }
        } catch (err) {
            loadingBubble.querySelector('.message-content').innerHTML = `<p style="color: #ff5555;">[Network Error]: ${err.message}</p>`;
        } finally {
            sendBtn.disabled = false;
            this.scrollToBottom();
        }
    },

    appendMessage(role, text) {
        const stream = app.el('ai-chat-stream');
        const msgDiv = app.item('div', `chat-message ${role}-message`);

        const avatar = app.item('div', 'avatar', role === 'user' ? 'You' : 'AI');
        const content = app.item('div', 'message-content');
        content.innerHTML = `<p>${text}</p>`;

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(content);

        stream.appendChild(msgDiv);
        this.scrollToBottom();
        return msgDiv;
    },

    scrollToBottom() {
        const stream = app.el('ai-chat-stream');
        if (stream) {
            stream.scrollTop = stream.scrollHeight;
        }
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
