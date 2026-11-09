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

app.navigation = function() {

const pages = {
        home: () => HomeController.index(),
        ai: () => AiController.index(),
        articles: () => ArticlesController.index(),
        agent: () => AgentController.index(),
    };

    for (const page in pages) {
        if (this.currentPage === page && typeof pages[page] === 'function') {
            pages[page]();
            break;
        }
    }

};

const HomeController = {
    async index() {
        RenderController.index('home','todo/read');
    },
};
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

    if (tool === 'gmail') {
      let cleanPrompt = prompt.trim();
      // Parse stringified JSON if submitted directly into the input
      if (cleanPrompt.startsWith('{') && cleanPrompt.endsWith('}')) {
        try {
          const parsed = JSON.parse(cleanPrompt);
          args = parsed.args || parsed;
        } catch (e) {
          args = { action: 'list', query: cleanPrompt };
        }
      } else if (cleanPrompt.toLowerCase().startsWith('read ')) {
        args = { action: 'read', query: cleanPrompt.substring(5).trim() };
      } else if (cleanPrompt.toLowerCase() === 'list' || cleanPrompt === '') {
        args = { action: 'list', query: '' };
      } else {
        args = { action: 'search', query: cleanPrompt };
      }
    } else if (tool === 'calculator') {
      args = { expression: prompt };
    } else if (tool === 'stock_quote') {
      args = { ticker: prompt.toUpperCase() };
    } else {
      args = { query: prompt };
    }

    const response = await fetch(this.executeEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, args })
    });

    const result = await response.json();
    if (!response.ok || result.status !== 'success') {
      throw new Error(result.message ?? 'Tool execution failed.');
    }

    return result.output;
  },

  renderAssistantResponse(messageEl, tool, prompt, output) {
    const content = messageEl.querySelector('.message-content');
    if (!content) return;
    content.innerHTML = '';

    const badgeText = `⚡ Executed [${tool}]`;
    content.appendChild(app.item('div', 'tool-call-badge', badgeText));

    if (tool === 'gmail' && output.raw_output) {
      // Display formatted CLI output block cleanly
      const codeBlock = app.item('pre', 'cli-output', output.raw_output);
      content.appendChild(codeBlock);
    } else {
      // Formatted multi-line JSON output
      const jsonBlock = app.item('pre', 'json-output', JSON.stringify(output, null, 2));
      content.appendChild(jsonBlock);
    }
  },  

  // async executeTool(tool, prompt) {
  //   let args = {};
  //   if (tool === 'calculator') {
  //     args = { expression: prompt };
  //   } else if (tool === 'stock_quote') {
  //     args = { ticker: prompt.toUpperCase() };
  //   } else if (tool === 'gmail') {
  //     args = { action: 'search', query: prompt };
  //   } else {
  //     args = { query: prompt };
  //   }

  //   const response = await fetch(this.executeEndpoint, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ tool, args })
  //   });

  //   let result;
  //   try {
  //     result = await response.json();
  //   } catch {
  //     throw new Error(
  //       response.ok
  //         ? "Invalid response from MCP service."
  //         : `MCP service returned HTTP ${response.status}.`
  //     );
  //   }

  //   if (!response.ok || result.status !== 'success') {
  //     throw new Error(result.message ?? `Tool execution failed.`);
  //   }

  //   return result.output;
  // },

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

  // renderAssistantResponse(messageEl, tool, prompt, output) {
  //   const content = messageEl.querySelector('.message-content');
  //   if (!content) return;
  //   content.innerHTML = '';

  //   const formattedOutput = this.formatToolOutput(tool, output);
  //   const badgeText = `⚡ Executed [${tool}]: ${prompt} → ${formattedOutput}`;
    
  //   content.appendChild(app.item('div', 'tool-call-badge', badgeText));
  //   content.appendChild(app.item('p', '', `Result successfully retrieved.`));
  // },

renderAssistantResponse(messageEl, tool, prompt, output) {
    const content = messageEl.querySelector('.message-content');
    if (!content) return;
    content.innerHTML = '';

    const formattedOutput = this.formatToolOutput(tool, output);
    
    // If the output contains Himalaya CLI text, render it cleanly
    if (tool === 'gmail' && output.output) {
      content.appendChild(app.item('pre', 'himalaya-output', output.output));
    } else {
      content.appendChild(app.item('div', 'tool-call-badge', `⚡ Executed [${tool}]`));
      content.appendChild(app.item('p', '', formattedOutput));
    }
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
const ArticlesController = {
    index(){
        app.dBug('Controller','ArticlesController');
        //this.init();
    },
    async init() {
        const container = document.getElementById('articles-records');
        if (!container) return;

        try {
            const res = await fetch(app.get('todo/read'));
            const result = await res.json();
            
            container.textContent = '';
            if (result.status === 'success' && result.records.length > 0) {
                const ul = App.item('ul');
                result.records.forEach(item => {
                    const li = App.item('li');
                    li.textContent = item.title || JSON.stringify(item);
                    ul.appendChild(li);
                });
                container.appendChild(ul);
            } else {
                const p = App.item('p');
                p.textContent = 'No records found.';
                container.appendChild(p);
            }
        } catch (err) {
            console.error('Failed to load articles records:', err);
        }
    }
};

const AgentController = {
    nodes: [],
    running: false,

    index() {
        const root = document.getElementById('agent');
        globalThis.app?.dBug?.('AgentController', 'init()');

        if (!root) {
            return;
        }

        this.bindEvents(root);
    },

    bindEvents(root) {
        const dropzone = root.querySelector('#agent-nodes-dropzone');
        const runButton = root.querySelector('#agent-run-btn');
        const clearButton = root.querySelector('#agent-clear-btn');

        if (!dropzone) {
            return;
        }

        // Re-bind palette items cleanly across SPA view remounts
        root.querySelectorAll('.agent-tool-item').forEach((item) => {
            item.ondragstart = (event) => {
                if (this.running) {
                    event.preventDefault();
                    return;
                }
                event.dataTransfer.setData(
                    'application/json',
                    JSON.stringify({
                        tool: item.dataset.tool,
                        type: item.dataset.type,
                        title: item.textContent.trim()
                    })
                );
            };

            item.onclick = () => {
                if (this.running) return;
                this.addNode({
                    tool: item.dataset.tool,
                    type: item.dataset.type,
                    title: item.textContent.trim()
                });
            };
        });

        dropzone.ondragover = (event) => {
            if (this.running) return;
            event.preventDefault();
            dropzone.classList.add('drag-over');
        };

        dropzone.ondragleave = () => {
            dropzone.classList.remove('drag-over');
        };

        dropzone.ondrop = (event) => {
            if (this.running) return;
            event.preventDefault();
            dropzone.classList.remove('drag-over');

            const raw = event.dataTransfer.getData('application/json')
                || event.dataTransfer.getData('text/plain');

            try {
                this.addNode(JSON.parse(raw));
            } catch (error) {
                console.error('Invalid workflow node data.', error);
            }
        };

        dropzone.onclick = (event) => {
            if (this.running) return;
            const removeButton = event.target.closest('.node-delete');
            if (removeButton) {
                this.removeNode(removeButton.dataset.nodeId);
            }
        };

        dropzone.oninput = (event) => {
            if (this.running) return;
            const input = event.target.closest('.node-query');
            if (input) {
                this.updateQuery(input.dataset.nodeId, input.value);
            }
        };

        if (runButton) {
            runButton.onclick = () => this.runWorkflow();
        }

        if (clearButton) {
            clearButton.onclick = () => this.clearWorkflow();
        }
    },

    addNode(data) {
        if (this.running || !data?.tool) {
            return;
        }

        const root = document.getElementById('agent');
        const dropzone = root?.querySelector('#agent-nodes-dropzone');
        const emptyState = root?.querySelector('#agent-empty-msg');

        if (!dropzone) {
            return;
        }

        if (emptyState) {
            emptyState.hidden = true;
        }

        const nodeId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const node = {
            id: nodeId,
            tool: data.tool,
            type: data.type ?? 'tool',
            title: data.title ?? data.tool,
            query: ''
        };

        this.nodes.push(node);

        const element = document.createElement('div');
        element.className = 'agent-workflow-node';
        element.id = nodeId;

        const title = document.createElement('span');
        title.className = 'node-title';
        title.textContent = `${node.title} (${node.type})`;

        const removeButton = document.createElement('button');
        removeButton.className = 'node-delete';
        removeButton.type = 'button';
        removeButton.dataset.nodeId = nodeId;
        removeButton.textContent = '×';
        removeButton.setAttribute('aria-label', `Remove ${node.title}`);

        const header = document.createElement('div');
        header.className = 'node-header';
        header.append(title, removeButton);

        const inputId = `query_${nodeId}`;
        const label = document.createElement('label');
        label.htmlFor = inputId;
        label.textContent = 'Service Endpoint / Query';

        const input = document.createElement('input');
        input.id = inputId;
        input.type = 'text';
        input.className = 'node-query';
        input.dataset.nodeId = nodeId;
        input.placeholder = `Enter endpoint for ${node.tool}...`;

        const output = document.createElement('pre');
        output.className = 'node-output-preview';
        output.id = `output_${nodeId}`;
        output.textContent = 'Ready for execution...';

        const body = document.createElement('div');
        body.className = 'node-body';
        body.append(label, input, output);

        element.append(header, body);
        dropzone.appendChild(element);

        this.updateMetrics();
    },

    removeNode(nodeId) {
        if (this.running) return;

        this.nodes = this.nodes.filter((node) => node.id !== nodeId);
        const root = document.getElementById('agent');
        root?.querySelector(`#${nodeId}`)?.remove();

        if (this.nodes.length === 0) {
            const emptyState = root?.querySelector('#agent-empty-msg');
            if (emptyState) {
                emptyState.hidden = false;
            }
        }

        this.updateMetrics();
    },

    updateQuery(nodeId, value) {
        if (this.running) return;
        const node = this.nodes.find((item) => item.id === nodeId);
        if (node) {
            node.query = value;
        }
    },

    clearWorkflow() {
        if (this.running) return;

        this.nodes = [];
        const root = document.getElementById('agent');

        root?.querySelectorAll('.agent-workflow-node').forEach((node) => node.remove());

        const emptyState = root?.querySelector('#agent-empty-msg');
        if (emptyState) {
            emptyState.hidden = false;
        }

        this.updateMetrics();

        const status = root?.querySelector('#agent-status-text');
        const execution = root?.querySelector('#exec-status');

        if (status) status.textContent = 'Ready';
        if (execution) execution.textContent = 'Idle';
    },

    updateMetrics() {
        const root = document.getElementById('agent');
        const count = root?.querySelector('#node-count');
        if (count) {
            count.textContent = String(this.nodes.length);
        }
    },

    async runWorkflow() {
        if (this.running) return;

        if (!this.nodes.length) {
            alert('Add at least one tool node before running the workflow.');
            return;
        }

        const root = document.getElementById('agent');
        const execution = root?.querySelector('#exec-status');
        const status = root?.querySelector('#agent-status-text');
        const runBtn = root?.querySelector('#agent-run-btn');
        const clearBtn = root?.querySelector('#agent-clear-btn');

        this.running = true;
        if (runBtn) runBtn.disabled = true;
        if (clearBtn) clearBtn.disabled = true;

        const nodesSnapshot = this.nodes.map((n) => ({ ...n }));
        let failures = 0;

        if (execution) execution.textContent = 'Running...';
        if (status) status.textContent = `Executing ${nodesSnapshot.length} node(s)...`;

        try {
            for (const node of nodesSnapshot) {
                const output = root?.querySelector(`#output_${node.id}`);

                if (output) {
                    output.textContent = 'Executing...';
                    output.classList.remove('success', 'error');
                }

                try {
                    const endpoint = node.query.trim();
                    if (!endpoint) {
                        throw new Error(`Enter an endpoint for ${node.tool}.`);
                    }

                    const response = await fetch('/php/api/index', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            service: node.tool,
                            endpoint,
                            method: 'GET'
                        })
                    });

                    const payload = await response.json();

                    if (!response.ok) {
                        throw new Error(payload?.error ?? `HTTP ${response.status}`);
                    }

                    if (output) {
                        output.textContent = JSON.stringify(payload, null, 2);
                        output.classList.add('success');
                    }
                } catch (error) {
                    failures++;
                    console.error(`Workflow node failed: ${node.tool}`, error);

                    if (output) {
                        output.textContent = `Execution failed: ${error.message}`;
                        output.classList.add('error');
                    }
                }
            }
        } finally {
            this.running = false;
            if (runBtn) runBtn.disabled = false;
            if (clearBtn) clearBtn.disabled = false;

            if (execution) {
                execution.textContent = failures ? 'Completed with errors' : 'Completed';
            }

            if (status) {
                status.textContent = `${nodesSnapshot.length - failures} succeeded; ${failures} failed.`;
            }
        }
    }
};
const RenderController = {
    async index(page, url) {
        const container = app.getDom(page);
        if (!container) return;

        const wrapper = app.item('div', page + '-records');
        container.appendChild(wrapper);

        const result = await app.get(url);
        const records = result?.records || result?.data || [];

        if (records.length === 0) {
            this.renderEmpty(wrapper);
        } else {
            this.renderRecords(wrapper, records);
        }
    },

    renderEmpty(container) {
        this.menu(container);
        container.appendChild(app.item('p', 'text-muted', 'No records found.'));
    },

    renderRecords(container, records) {
        this.menu(container);

        records.forEach(record => {
            const metricItem = app.item('div', 'metric-item');
            metricItem.onclick = function() { alert('foo'); };
            
            const labelSpan = app.item('span', 'metric-label', 'Framework');
            const valueSpan = app.item('span', 'metric-value', record.title || JSON.stringify(record));
            
            metricItem.appendChild(labelSpan);
            metricItem.appendChild(valueSpan);
            
            container.appendChild(metricItem);
        });
    },

    menu(container) {
        const menuBar = app.item('div', 'render-menu-bar');

        const menuItems = [
            { title: 'Create', action: () => this.create() },
            { title: 'Read', action: () => this.read() },
            { title: 'Update', action: () => this.update() },
            { title: 'Delete', action: () => this.delete() },
            { title: 'Previous', action: () => this.previous() },
            { title: 'Next', action: () => this.next() }
        ];

        menuItems.forEach(item => {
            const btn = app.item('button', 'render-menu-btn', item.title);
            btn.type = 'button';
            btn.onclick = item.action;
            menuBar.appendChild(btn);
        });

        container.appendChild(menuBar);
        return container;
    },

    async create() { app.dBug('RenderController', 'create()'); },
    async read() { app.dBug('RenderController', 'read()'); },
    async update() { app.dBug('RenderController', 'update()'); },
    async delete() { app.dBug('RenderController', 'delete()'); },
    async previous() { app.dBug('RenderController', 'previous()'); },
    async next() { app.dBug('RenderController', 'next()'); }
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
