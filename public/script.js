const Pages = {
    'home': () => HomeController.index(),
    //'syncapply': 'Controller',
};
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
    }
};
app.routes = function() {
    console.log({'routes': this.currentPage});
};

const HomeController = {
    async index() {
        
        const container = app.getDom('home');

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
