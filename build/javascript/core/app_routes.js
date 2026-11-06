app.routes = function() {
    console.log({'routes': this.currentPage});
};

app.navigation = function() {

const pages = {
        home: () => HomeController.index(),
        ai: () => AiController.index(),
        articles: () => ArticlesController.index(),
        agent: () => AgentController.index(),
    };

    for (const page in pages) {
        if (this.currentPage === page && typeof pages[page] === 'function') {
            pages[page]();
            break;
        }
    }

};
