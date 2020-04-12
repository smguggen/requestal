const Requestal = require('../index');
const { echo } = require('ternal');
const assert = require('assert');
const RequestalResponse = require('../lib/response');
const evental = require('evental').instance;
const { spawn } = require('child_process');

module.exports = function() {
    evental.on('put', () => {
        let x = 1;
        let msg = setInterval(function() {
            process.stdout.write("\r" + 'File Added, Preparing To Delete... ' + x + 's');
            x++;
        }, 1000);
        setTimeout(function() {
            Requestal.Delete('https://srcer.com/test/data/data2.json', res2 => {
                assert.equal(res2.text, 'DELETED');
                clearInterval(msg);
                echo ({color:'green', format:'bold'}, '\n\DELETE Tests Successful');
            });
        }, 4000);
    });
    
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
            methodChecks('GET Static', data);
        }
    });

    //static post request
    Requestal.Post('https://srcer.com/test/data', { method: 'post' }, function(data) { 
        if (checkConnection(data)) {
            assert.equal(data.json[0], '<tr><td>1.</td><td>Bill Jones</td></tr>');
            assert.equal(data.json[1], '<tr><td>2.</td><td>Jane Smith</td></tr>');
            assert.equal(data.json[2], '<tr><td>3.</td><td>Bob Davis</td></tr>');
            echo ({color:'green', format:'bold'}, 'POST Static Tests Successful');
        }
    });

    //instantiate Requestal object
    const q = new Requestal('https://srcer.com');

    //get request using Requestal instance
    let g = q.get('https://srcer.com/test/data');
    g.on('success', data => {
        if (checkConnection(data)) {
            methodChecks('GET Instance', data);
            q.put('/test/data/data2.json', { file: JSON.stringify(data.json, null, '\t') }, res => {
                assert.equal(res.text, 'PUT');
                echo ({color:'green', format:'bold'}, 'PUT Tests Successful');
                evental.fire('put');
            });
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
            success: function(data) {
                assert.equal(data.json[0], '<tr><td>1.</td><td>Bill Jones</td></tr>');
                assert.equal(data.json[1], '<tr><td>2.</td><td>Jane Smith</td></tr>');
                assert.equal(data.json[2], '<tr><td>3.</td><td>Bob Davis</td></tr>');
                echo ({color:'green', format:'bold'}, 'POST Instance Tests Successful');
            }
        }
    );

    post.headers.set('contentType', 'json'); //sets content type to application/json
        
    post.on('responseHeaders', headers => {
        assert.equal(headers['content-type'], 'application/json; charset=utf-8');
        assert.equal(post.state, 'responseHeaders');
        echo ({color:'green', format:'bold'}, 'Response Header Tests Successful');
    });

    post.send({id:17, last:'Nelson'});
}.call();

const cmd = spawn('requestal', [
    'get', 
    'https://srcer.com/test/data',
    '-s', '0', 'names', '1', 'first', '-test'
]);
let count = 0;
cmd.stdout.on('data', (data) => {
  assert.equal(data.toString(), 'Jane\n');
  count++;
  echo ({color:'green', format:'bold'}, 'Executable Test 1 Successful');
});

cmd.stderr.on('data', err => {
    throw new Error(err);
})

const cmd2 = spawn('requestal', [
    'post', 
    'https://srcer.com/test/data',
    '-s', '0', '-d', 'method=post', '-test'
]);

cmd2.stdout.on('data', (data) => {
    assert.equal(data.toString(), '<tr><td>1.</td><td>Bill Jones</td></tr>\n');
    count++;
    echo ({color:'green', format:'bold'}, 'Executable Test 2 Successful');
});

cmd2.stderr.on('data', err => {
    throw new Error(err);
})

const cmd3 = spawn('requestal', [
    'get', 
    'https://srcer.com/test/data',
    '-on', 'success=./test/test-exec',
    '-s', '0', 'names', '2', 'last',
    '-d', 'method=post', '-test'
]);

cmd3.stdout.on('data', (data) => {
    count++;
    console.log(data.toString());
});

cmd3.stderr.on('data', err => {
    throw new Error(err);
});

setTimeout(function() {
    if (count != 3) {
        throw new Error('Executables received ' + count + ' of 3 responses');
    }
}, 5000);
