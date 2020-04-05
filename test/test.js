const Requestal = require('../index');
const { echo } = require('ternal');
const assert = require('assert');
const RequestalResponse = require('../lib/response');

function endpointActive(data) {
    if (data && data instanceof RequestalResponse) {
        return data.isSuccess();
    } else {
        echo('red', data);
        process.exit(0);
    }    
}

function checkConnection(data) {
    if (!endpointActive(data)) {
        echo('red', 'Test connection down, results inconclusive');
        process.exit(0);
    }
    return true;
}

function methodChecks(methodName, data) {
    let d = data.json[0].names;
    assert.equal(d[0].id, 1);
    assert.equal(d[0].first, 'Bill');
    assert.equal(d[0].last, 'Jones');
    assert.equal(d[1].id, 2);
    assert.equal(d[1].first, 'Jane');
    assert.equal(d[1].last, 'Smith');
    assert.equal(d[2].id, 3);
    assert.equal(d[2].first, 'Bob');
    assert.equal(d[2].last, 'Davis');
    echo ({color:'green', format:'bold'}, methodName + ' Tests Successful');
}
//static get request
Requestal.Get('https://srcer.com/test/data?id=12345', function(data){
    if (checkConnection(data)) {
        assert.equal(data.json[0].params.id, '12345');
        methodChecks('Get Static', data);
    }
});

//static post request
Requestal.Post('https://srcer.com/test/data', { method: 'post' }, function(data) { 
    if (checkConnection(data)) {
        assert.equal(data.json[0], '<tr><td>1.</td><td>Bill Jones</td></tr>');
        assert.equal(data.json[1], '<tr><td>2.</td><td>Jane Smith</td></tr>');
        assert.equal(data.json[2], '<tr><td>3.</td><td>Bob Davis</td></tr>');
        echo ({color:'green', format:'bold'}, 'Post Static Tests Successful');
    }
});

//instantiate Requestal object
const q = new Requestal();

//get request using Requestal instance
let g = q.get('https://srcer.com/test/data');
g.on('success', data => {
    if (checkConnection(data)) {
        methodChecks('Get Instance', data);
    }
});
g.send();

//post request using questal instance
let post = q.post('/test/data',
    {
        id:16,
        method:'post'
    },
    { 
        base:'https://srcer.com',
        success: function(data) {
            assert.equal(data.json[0], '<tr><td>1.</td><td>Bill Jones</td></tr>');
            assert.equal(data.json[1], '<tr><td>2.</td><td>Jane Smith</td></tr>');
            assert.equal(data.json[2], '<tr><td>3.</td><td>Bob Davis</td></tr>');
            echo ({color:'green', format:'bold'}, 'Post Instance Tests Successful');
        }
    }
);

post.headers.accept = 'json'; //adds 'application/json' to accept headers to be set

post.response.type = 'json'; //sets response type to application/json

post.on('responseHeaders', (headers) => {
    assert.equal(headers['content-type'], 'application/json; charset=utf-8');
    assert.equal(post.state, 'responseHeaders');
});

post.send({id:17, last:'Nelson'});