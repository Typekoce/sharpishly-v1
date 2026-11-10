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

        this.createForm(container);

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
    createForm(container) {
        const form = app.item('div', 'render-form');

        const fields = [
            { 
                label: 'Title', 
                type: 'input', 
                inputType: 'text',
                name: 'title',
                placeholder: 'Enter todo title...' 
            },
            { 
                label: 'Description', 
                type: 'textarea', 
                name: 'description',
                placeholder: 'Enter todo details...' 
            }
        ];

        fields.forEach(field => {
            const group = app.item('div', 'render-form-group');
            
            const label = app.item('label', 'render-form-label', field.label);
            group.appendChild(label);

            let input;
            if (field.type === 'textarea') {
                input = app.item('textarea', 'render-form-input render-textarea');
                input.rows = 3;
            } else {
                input = app.item('input', 'render-form-input');
                input.type = field.inputType || 'text';
            }

            input.name = field.name;
            input.placeholder = field.placeholder;
            group.appendChild(input);

            form.appendChild(group);
        });

        const submitBtn = app.item('button', 'render-submit-btn', 'Save Record');
        submitBtn.type = 'button';
        submitBtn.onclick = () => this.create();
        form.appendChild(submitBtn);

        container.appendChild(form);
        return container;
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

    async create() { 
        app.dBug('RenderController', 'create()'); 

    },
    async read() { app.dBug('RenderController', 'read()'); },
    async update() { app.dBug('RenderController', 'update()'); },
    async delete() { app.dBug('RenderController', 'delete()'); },
    async previous() { app.dBug('RenderController', 'previous()'); },
    async next() { app.dBug('RenderController', 'next()'); }
};
