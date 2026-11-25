/* ---------- Page Controllers ---------- */

const CommandController = Object.assign(Object.create(BaseController), {
    async index(page = 'command') {
        app.dBug('CommandController', 'index()', page);
        const container = app.getDom(page) || app.el(page) || app.el('app');
        if (!container) return;

        const panel = container.querySelector('#commandTelemetry') || container;
        const spinner = app.loadingSpinner('Loading command telemetry...');
        panel.replaceChildren(spinner);

        const result = await app.get('todo/read');
        const records = result?.records || result?.data || [];

        const summary = app.item('div', 'command-summary');
        const mode = app.data?.mode || 'b2b';
        summary.appendChild(
            app.item('p', 'command-mode', `Active Mode: ${mode.toUpperCase()} · Vectors: ${ThreatData.attacks.length} · Protocols: ${ThreatData.protocols.length}`)
        );

        panel.replaceChildren(summary);
        if (records.length === 0) {
            this.renderEmpty(panel);
        } else {
            this.renderRecords(panel, records);
        }
    }
});

const ThreatsController = Object.assign(Object.create(BaseController), {
    selectedCategory: 'ALL',

    async index(page = 'threats') {
        app.dBug('ThreatsController', 'index()', page);
        const container = app.getDom(page) || app.el(page) || app.el('app');
        if (!container) return;

        const listEl = container.querySelector('#threatsList') || container;
        const mode = app.data?.mode || 'b2b';
        const items = this.selectedCategory === 'ALL'
            ? ThreatData.attacks
            : ThreatData.attacks.filter(a => a.cat === this.selectedCategory);

        listEl.innerHTML = '';
        items.forEach(attack => {
            const card = app.item('article', 'threat-card');
            card.append(
                app.item('h3', 'threat-name', `${attack.name} [${attack.severity}]`),
                app.item('p', 'threat-desc', attack.desc),
                app.item('p', 'threat-kill', `Kill chain: ${attack.kill}`),
                app.item('p', 'threat-ioc', `IoCs: ${attack.ioc}`),
                app.item('p', 'threat-mitigation', mode === 'b2b' ? `B2B: ${attack.b2b}` : `B2C: ${attack.b2c}`)
            );
            listEl.appendChild(card);
        });
    },

    filterByCategory(category, page = 'threats') {
        this.selectedCategory = category || 'ALL';
        void this.index(page);
    }
});

const ProtocolsController = Object.assign(Object.create(BaseController), {
    selectedGroup: 'ALL',

    async index(page = 'protocols') {
        app.dBug('ProtocolsController', 'index()', page);
        const container = app.getDom(page) || app.el(page) || app.el('app');
        if (!container) return;

        const listEl = container.querySelector('#protocolsList') || container;
        const items = this.selectedGroup === 'ALL'
            ? ThreatData.protocols
            : ThreatData.protocols.filter(p => p.group === this.selectedGroup);

        listEl.innerHTML = '';
        items.forEach(proto => {
            const row = app.item('div', 'protocol-item');
            row.append(
                app.item('span', 'protocol-group', proto.group),
                app.item('strong', 'protocol-name', proto.name),
                app.item('p', 'protocol-summary', proto.summary)
            );
            listEl.appendChild(row);
        });
    }
});

const MethodologiesController = Object.assign(Object.create(BaseController), {
    async index(page = 'methodologies') {
        app.dBug('MethodologiesController', 'index()', page);
        const container = app.getDom(page) || app.el(page) || app.el('app');
        if (!container) return;

        const listEl = container.querySelector('#frameworksList') || container;
        listEl.innerHTML = '';

        ThreatData.frameworks.forEach(fw => {
            const card = app.item('article', 'framework-card');
            const ul = app.item('ul', 'framework-points');
            fw.points.forEach(pt => ul.appendChild(app.item('li', '', pt)));
            card.append(
                app.item('h3', 'framework-name', `${fw.name} (${fw.type})`),
                ul
            );
            listEl.appendChild(card);
        });
    }
});

const ForumController = Object.assign(Object.create(FeedController), {
    threads: [
        { id: 't1', channel: '#blue-team-defense', title: 'Enforcing FIDO2 passkeys on admin accounts', body: 'Hardware/device passkeys eliminate MFA prompt fatigue.' },
        { id: 't2', channel: '#b2c-scam-help-desk', title: 'Verifying unexpected delivery & banking alerts', body: 'Open official apps directly rather than tapping SMS links.' }
    ],

    async init() {
        await this.index('forum', 'todo/read');
    },

    async index(page = 'forum', url = 'todo/read') {
        app.dBug('ForumController', 'index()', { page, url });
        const section = app.getDom(page) || app.el(page) || app.el('app');
        const target = section?.querySelector('#forumList') || section;
        if (!target) return;

        const form = section?.querySelector('#forumForm');
        if (form && !form.dataset.bound) {
            form.dataset.bound = 'true';
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                void this.createThread(form, target);
            });
        }

        const remote = await app.get(url);
        const remoteRecords = remote?.records || remote?.data || [];
        const combined = [...this.threads, ...remoteRecords];

        target.innerHTML = '';
        combined.forEach(item => {
            const post = app.item('article', 'forum-thread');
            post.append(
                app.item('span', 'forum-channel', item.channel || '#general'),
                app.item('h3', 'forum-title', item.title || 'Untitled Thread'),
                app.item('p', 'forum-body', item.body || item.summary || '')
            );
            target.appendChild(post);
        });
    },

    async createThread(form, target) {
        const titleInput = form.querySelector('[name="title"]');
        const bodyInput = form.querySelector('[name="body"]');
        const title = titleInput?.value.trim() || '';
        const body = bodyInput?.value.trim() || '';
        if (!title || !body) return;

        const newThread = { id: String(Date.now()), channel: '#threat-exchange', title, body };
        this.threads.unshift(newThread);
        await app.post('chat/save', { prompt: `${title}: ${body}`, reality_id: 1 });

        if (titleInput) titleInput.value = '';
        if (bodyInput) bodyInput.value = '';
        await this.index('forum', 'todo/read');
        if (target) app.dBug('ForumController', 'thread added', newThread.id);
    }
});

const ToolkitController = Object.assign(Object.create(BaseController), {
    async index(page = 'toolkit') {
        app.dBug('ToolkitController', 'index()', page);
        const container = app.getDom(page) || app.el(page) || app.el('app');
        if (!container) return;

        const pwInput = container.querySelector('#pwInput');
        const pwOut = container.querySelector('#pwResult');
        if (pwInput && pwOut && !pwInput.dataset.bound) {
            pwInput.dataset.bound = 'true';
            pwInput.addEventListener('input', () => {
                const bits = this.estimateEntropy(pwInput.value);
                pwOut.textContent = `Entropy: ${bits.toFixed(1)} bits`;
            });
        }

        const urlInput = container.querySelector('#phishUrlInput');
        const phishOut = container.querySelector('#phishResult');
        const phishBtn = container.querySelector('#phishCheckBtn');
        if (phishBtn && phishOut && !phishBtn.dataset.bound) {
            phishBtn.dataset.bound = 'true';
            phishBtn.addEventListener('click', () => {
                const raw = urlInput?.value.trim() || '';
                const flags = [];
                if (!raw.toLowerCase().startsWith('https://')) flags.push('Not using HTTPS');
                if (raw.toLowerCase().includes('xn--')) flags.push('Punycode domain detected');
                if (/https?:\/\/\d{1,3}(\.\d{1,3}){3}/.test(raw)) flags.push('Raw IP address in URL');
                phishOut.textContent = flags.length ? `Warnings: ${flags.join('; ')}` : 'No basic URL warnings found.';
            });
        }
    },

    estimateEntropy(str) {
        let pool = 0;
        if (/[a-z]/.test(str)) pool += 26;
        if (/[A-Z]/.test(str)) pool += 26;
        if (/[0-9]/.test(str)) pool += 10;
        if (/[^a-zA-Z0-9]/.test(str)) pool += 32;
        if (!pool) pool = 1;
        return str.length * Math.log2(pool);
    }
});

const BookController = Object.assign(Object.create(BaseController), {
    async index(page = 'book') {
        app.dBug('BookController', 'index()', page);
        const container = app.getDom(page) || app.el(page) || app.el('app');
        if (!container) return;

        const form = container.querySelector('#bookingForm');
        const out = container.querySelector('#bookingSummary');
        if (form && out && !form.dataset.bound) {
            form.dataset.bound = 'true';
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fd = new FormData(form);
                const payload = {
                    mode: app.data?.mode || 'b2b',
                    service: String(fd.get('service') || ''),
                    name: String(fd.get('name') || ''),
                    notes: String(fd.get('notes') || '')
                };
                out.textContent = `Intake prepared for ${payload.name} (${payload.mode.toUpperCase()} — ${payload.service}).`;
                await app.post('chat/save', { prompt: JSON.stringify(payload), reality_id: 1 });
            });
        }
    }
});

const CapabilitiesController = Object.assign(Object.create(BaseController), {
    async index(page = 'capabilities') {
        app.dBug('CapabilitiesController', 'index()', page);
        const container = app.getDom(page) || app.el(page) || app.el('app');
        if (!container) return;

        const listEl = container.querySelector('#capabilitiesList') || container;
        const checks = [
            { api: 'fetch', ok: typeof fetch === 'function' },
            { api: 'localStorage', ok: typeof localStorage !== 'undefined' },
            { api: 'crypto.subtle', ok: Boolean(window.crypto && window.crypto.subtle) },
            { api: 'customElements', ok: typeof customElements !== 'undefined' }
        ];

        listEl.innerHTML = '';
        checks.forEach(c => {
            listEl.appendChild(
                app.item('div', 'cap-row', `${c.api}: ${c.ok ? 'Supported' : 'Unavailable'}`)
            );
        });
    }
});