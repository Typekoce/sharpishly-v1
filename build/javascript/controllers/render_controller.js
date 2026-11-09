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
