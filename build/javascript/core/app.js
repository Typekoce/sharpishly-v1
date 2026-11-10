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



    async getPage(page) {
        this.setPage(page);
        const container = this.el('app');
        if (!container) return;

        try {
            template = `/views/pages/${encodeURIComponent(page)}.html`;
            this.dBug('Template',template);
            const res = await fetch(template);
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
    },
    // Add inside app object in app.js
// Add inside app object in app.js
    loadingSpinner(label = 'Thinking…') {
        const wrapper = this.item('div', 'loading-spinner-wrapper');
        wrapper.style.display = 'inline-flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '0.5rem';
        wrapper.style.fontFamily = 'var(--font-mono)';
        wrapper.style.fontSize = '0.85rem';
        wrapper.style.color = 'var(--accent-cyan)';

        const spinnerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        spinnerSvg.setAttribute('width', '16');
        spinnerSvg.setAttribute('height', '16');
        spinnerSvg.setAttribute('viewBox', '0 0 24 24');
        spinnerSvg.setAttribute('fill', 'none');
        spinnerSvg.setAttribute('stroke', 'currentColor');
        spinnerSvg.setAttribute('stroke-width', '2');
        spinnerSvg.style.animation = 'spin 1s linear infinite';

        spinnerSvg.innerHTML = `
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2 a10 10 0 0 1 10 10" stroke="currentColor"></path>
        `;

        const textSpan = this.item('span', 'spinner-label', label);
        wrapper.appendChild(spinnerSvg);
        wrapper.appendChild(textSpan);

        return wrapper;
    },
get(endpoint) {
        const cleanEndpoint = endpoint.replace(/^\/+/, '');
        return this.request(`http://sharpishly2.test/php/${cleanEndpoint}`);
    },

    async post(endpoint, data) {
        const cleanEndpoint = endpoint.replace(/^\/+/, '');
        try {
            const res = await fetch(`http://sharpishly2.test/php/${cleanEndpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error(`Failed to post to URL: ${cleanEndpoint}`, error);
            return { success: false, error: error.message };
        }
    },
};