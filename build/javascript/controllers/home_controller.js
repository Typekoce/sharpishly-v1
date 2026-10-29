const HomeController = {
    async index(){

        const url = 'http://sharpishly2.test/php/home/index';

        const records = app.request(url);

        const record_container = document.createElement('div');

        records.setAttribute('class','records_container');

        for(record in records){

            const row = document.createElement('div');

            row.innerHTML=record.text();
        }

        // append to #home

    },
};