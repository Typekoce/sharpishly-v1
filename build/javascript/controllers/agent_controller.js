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