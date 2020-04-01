const Requestal = require('../index');
//static get request
let c = Requestal.Get('https://srcer.com/test/data', function(data, event){
    process.stdout.write(data)
    console.log(data);
});

/*let q = new Requestal();
let g = q.get('https://srcer.com/test/data');
g.on('complete', res => console.log(res.json[0]));
g.send();
*/