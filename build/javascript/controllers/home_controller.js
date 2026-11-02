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