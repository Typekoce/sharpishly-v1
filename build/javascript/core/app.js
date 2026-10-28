const app = {
    // TODO: Create routes
    setPage(page){
        this.currentPage = page;
        console.log({currentPage:page});
    },
    init() {

        void this.getPage('home');

        // Test request
        const url = 'http://sharpishly2.test/php/home/index';

        this.request(url);

        this.gotoPage();

        this.navigation();
    },
    navigation(){
        console.log({navigation:this.currentPage});
        if(this.currentPage=='home'){
            HomeController.index();
        }
    },
    async getPage(page) {

        this.setPage(page);

        const container = document.getElementById('app');
        const flash = document.getElementById('flash');
        const spinner = document.getElementById('spinner');

        try {
            const url = `/views/pages/${encodeURIComponent(page)}.html`;
            const response = await fetch(url);
            const html = await response.text();
            container.innerHTML = html;
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
                if (page) {
                    void this.getPage(page);
                }
            }
        });
    },
async request(url) {
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log({ data: data });
            return data;
        } catch (error) {
            console.error(`Failed to load URL: ${url}`, error);
        }
    }
};