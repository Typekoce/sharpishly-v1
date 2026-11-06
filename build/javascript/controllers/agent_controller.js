const AgentController = {
    async init() {

        const container = document.getElementById('agent');

        if (!container) return;

        this.agent(container);

    },
    agent(container){
        
        msg = 'My name is Tweeky, I am your personal assistant';
        
        const agent = app.item('div','agent',msg);
        
    }
};
