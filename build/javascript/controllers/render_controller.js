const RenderController = {
    async index(page, url) {
        app.dBug('RenderController', 'index() start', { page, url });
        const container = app.getDom(page);
        if (!container) {
            app.dBug('RenderController', 'index() container not found', page);
            return;
        }

        const wrapper = app.item('div', page + '-records');
        container.appendChild(wrapper);

        // Show loading spinner while fetching records
        const spinner = app.loadingSpinner('Loading records...');
        wrapper.appendChild(spinner);

        const result = await app.get(url);
        wrapper.innerHTML = ''; // Clear spinner

        const records = result?.records || result?.data || [];
        app.dBug('RenderController', 'index() records fetched', { count: records.length, url });

        if (records.length === 0) {
            this.renderEmpty(wrapper);
        } else {
            this.renderRecords(wrapper, records);
        }
    },

    renderEmpty(container) {
        app.dBug('RenderController', 'renderEmpty()');
        this.menu(container);
        container.appendChild(app.item('p', 'text-muted', 'No records found.'));
    },

    createValueElement(record) {
        const text = String(record.description || JSON.stringify(record)).trim();
        const label = String(record.link || JSON.stringify(record)).trim();
        const isUrl = /^https?:\/\/\S+$/i.test(text);

        app.dBug('RenderController', 'createValueElement()', {
            id: record?.id,
            description: record?.description,
            text,
            isUrl
        });

        if (isUrl) {
            const link = app.item('a', 'metric-value', label);
            link.href = text;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';

            link.addEventListener('click', (event) => {
                app.dBug('RenderController', 'link clicked', {
                    href: link.href,
                    attrHref: link.getAttribute('href'),
                    defaultPrevented: event.defaultPrevented,
                    target: event.target?.tagName
                });
            });

            app.dBug('RenderController', 'created anchor element', {
                tagName: link.tagName,
                href: link.href,
                attrHref: link.getAttribute('href')
            });

            return link;
        }

        const span = app.item('span', 'metric-value', text);
        span.addEventListener('click', () => {
            app.dBug('RenderController', 'span clicked (not treated as URL)', { text });
        });

        return span;
    },

    renderRecords(container, records) {
        app.dBug('RenderController', 'renderRecords()', { count: records.length });
        this.createForm(container);
        this.menu(container);

        records.forEach((record, index) => {
            const metricItem = app.item('div', 'metric-item');

            const labelSpan = app.item('span', 'metric-label', 'Edit');

            labelSpan.setAttribute('style','cursor:pointer');

            labelSpan.onclick = function() {
                app.dBug('RenderController', 'labelSpan clicked', { index, id: record?.id });
                // TODO: Display details page
            };

            const valueEl = this.createValueElement(record);

            metricItem.appendChild(labelSpan);
            metricItem.appendChild(valueEl);

            container.appendChild(metricItem);

            app.dBug('RenderController', 'appended metricItem', {
                index,
                childCount: metricItem.children.length,
                valueTag: valueEl.tagName,
                valueHref: valueEl.href || null
            });
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

        const form = document.querySelector('.render-form');
        if (!form) {
            app.dBug('RenderController', 'Form not found');
            return;
        }

        const submitBtn = form.querySelector('.render-submit-btn');

        const payload = {
            title: form.querySelector('[name="title"]')?.value.trim() || '',
            description: form.querySelector('[name="description"]')?.value.trim() || ''
        };

        if (!payload.title) {
            alert('Please enter a title.');
            return;
        }

        if (submitBtn) submitBtn.disabled = true;

        // Append loading spinner next to submit button
        const spinner = app.loadingSpinner('Saving...');
        form.appendChild(spinner);

        try {
            const result = await app.post('todo/create', payload);

            app.dBug('create Todo', result?.success);

            if (result?.success) {
                form.querySelector('[name="title"]').value = '';
                form.querySelector('[name="description"]').value = '';
                await this.read();
            } else {
                alert(result?.error || 'Unable to save record.');
            }
        } catch (error) {
            console.error(error);
            alert('Unable to save record.');
        } finally {
            spinner.remove();
            if (submitBtn) submitBtn.disabled = false;
        }
    },

    async read() {
        app.dBug('RenderController', 'read()');

        const container = app.getDom('home');
        if (container) {
            container.innerHTML = '';
            await this.index('home', 'todo/read');
        }
    },

    async update() { app.dBug('RenderController', 'update()'); },
    async delete() { app.dBug('RenderController', 'delete()'); },
    async previous() { app.dBug('RenderController', 'previous()'); },
    async next() { app.dBug('RenderController', 'next()'); }
};