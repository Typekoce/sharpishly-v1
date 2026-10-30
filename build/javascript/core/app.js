const app = {
    currentPage: 'home',
    data: {},
    setData(key,val){
        this.data[key] = val;
    },
    setPage(page) {
        this.currentPage = page;
        console.log({ currentPage: page });
    },

    init() {
        void this.getPage('home');
        this.gotoPage();
        this.navigation();
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
            const res = await fetch(`/views/pages/${encodeURIComponent(page)}.html`);
            container.innerHTML = await res.text();
            this.setData(page,this.el(page));
            this.setData('app-container',container);
            this.dBug('data',this.data);
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
        return this.request(`http://sharpishly2.test/php/todo/read}`);
    },

    item(tag, className = '', text = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    },

    dBug(key,val){
        console.log({key:key,value:val});
    }
};