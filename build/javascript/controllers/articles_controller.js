const ArticlesController = {
    index(){
        app.dBug('Controller','ArticlesController');
        //this.init();
    },
    async init() {
        const container = document.getElementById('articles-records');
        if (!container) return;

        try {
            const res = await fetch(app.get('todo/read'));
            const result = await res.json();
            
            container.textContent = '';
            if (result.status === 'success' && result.records.length > 0) {
                const ul = App.item('ul');
                result.records.forEach(item => {
                    const li = App.item('li');
                    li.textContent = item.title || JSON.stringify(item);
                    ul.appendChild(li);
                });
                container.appendChild(ul);
            } else {
                const p = App.item('p');
                p.textContent = 'No records found.';
                container.appendChild(p);
            }
        } catch (err) {
            console.error('Failed to load articles records:', err);
        }
    }
};
