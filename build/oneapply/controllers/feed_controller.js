const FeedController = Object.assign(Object.create(RenderController), {
    defaultTool: 'qwen',
    lastMessageId: null,

    async init() {
        await this.index('feed', 'todo/read');
    },

    async index(page, url) {
        const feedSection = app.getDom(page); // #feed
        const target = feedSection?.querySelector('#feedList') || feedSection;

        if (!target) {
            app.dBug('FeedController', 'index() target not found', page);
            return;
        }

        const spinner = app.loadingSpinner('Loading records...');
        target.innerHTML = '';
        target.appendChild(spinner);

        const result = await app.get(url);
        target.innerHTML = '';

        const records = result?.records || result?.data || [];
        app.dBug('FeedController', 'index() records fetched', { count: records.length, url });

        if (records.length === 0) {
            this.renderEmpty(target);
        } else {
            this.renderRecords(target, records);
        }
    }
});