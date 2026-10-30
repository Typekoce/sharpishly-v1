const SampleController = {
    async init() {
        const container = document.getElementById('sample-records');
        if (!container) return;

        try {
            const res = await fetch(App.url('sample/read'));
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
            console.error('Failed to load sample records:', err);
        }
    }
};
