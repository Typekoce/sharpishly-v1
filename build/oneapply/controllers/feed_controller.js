const FeedController = {
    async feed(){
        const data = app.request(app.url('todo/read'));
        app.dBug('FeedController.feed()',{data:data});
    }
};