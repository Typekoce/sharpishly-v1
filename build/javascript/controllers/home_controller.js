const HomeController = {
    async index() {
        const container = app.el('home');
        app.dBug('container',container);
        if (!container) return;

        const wrapper = app.item('div', 'records_container');
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

    renderRecords(container, records) {
        records.forEach(record => {
            const row = app.item('div', 'record-row', record.title || JSON.stringify(record));
            container.appendChild(row);
        });
    }
};