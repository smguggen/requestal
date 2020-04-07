# Requestal

![Version](https://img.shields.io/npm/v/requestal?style=plastic)
![License](https://img.shields.io/npm/l/requestal?style=plastic)
![Downloads](https://img.shields.io/npm/dw/requestal?style=plastic)
![Size](https://img.shields.io/bundlephobia/min/requestal?style=plastic)
![Language](https://img.shields.io/github/languages/top/smguggen/requestal?style=plastic&logo=javascript)  

A Node module for handling HTTP requests, using Node's built-in http and https modules. For making browser-based requests, see [Questal](https://www.npmjs.com/package/questal).

Install
-------
```console
npm install requestal
```

Basic Usage:
-------------

You can make `get`, `post`, `put`, `patch`, and `delete` requests with `Requestal`. to make a quick one off request you can capitalize the first letter and call the static version of the method, or you can set more customized options by instantiating a new `Requestal` instance:
:
```javascript
const Requestal = require('requestal');

//static request
Requestal.Get('full/path/to/dest', data => {
    console.log(data)
});

//using full Get method instance
const q = new Requestal();  
let getInstance = q.get(options);
// do stuff
getInstance.send(url, data);
```
Pass parameters into the Requestal constructor to have them persist through every call made by that instance, then optionally override a parameter on any individual call:
```javascript
let post = q.post(
    {
        url:'/data',
        data: {
            id:16,
            first: 'Bill',
            last: 'Jones',
        }
    }
);

//Parameters sent: { url:'/data', data: { id:16, first:'Bill', last: 'Jones' } }
post.send();  

//Parameters sent: { url:'/params', data: { id:17, first:'Bill', last: 'Nelson' } }
post.send('/params', { id:17, last:'Nelson' });  
```

Base Domains
-------------
If you plan on making the lion's share of requests with your `Requestal` Instance to the same domain, you can pass a base url into the constructor when instantiating:
```javascript
const q = new Requestal('https://mydomain.com');
```
Then any requests with no base will use `q.base`, while passing a full url with a request will override the base:
```javascript
q.post('/my/path'); // Request will be sent to 'https://mydomain.com/my/path'

q.post('https://yourdomain.com/my/path'); // Request will be sent to 'https://yourdomain.com/my/path'
```

Callbacks
---------
```javascript
//static post request
Requestal.Post('/path/to/dest', function(data) { console.log(data, data.json)});
```
The data parameter passed to the 'on success' callback is a Requestal Response object containing the results of the request, including some handy methods for accessing the data.

#### data.json:
```json
"names": [
    {
        "id": 1,
        "first": "Bill",
        "last": "Jones"
    },
    {
        "id":2,
        "first":"Jane",
        "last":"Smith"
    },
    {
        "id":3,
        "first":"Bob",
        "last":"Davis"
    }
]
```

Headers
-------

```javascript
let post = q.post('/data')

post.headers.set('contentType', 'html'); // sets Content-Type to 'text/html' (default is application/json) 

post.response.setEncoding('base64'); // sets encoding of the response to base64 (default is utf8) 
```

You can check the response object's headers parameter to confirm response headers:
```javascript
post.on('responseHeaders', headers => {
    console.log(headers); // Prints response headers to console
});

//after setup, send request
post.send({ mykey: myValue });
```
You can override default headers by passing `options.headers` to any of the instance methods 

Put and Delete
--------------
Upload files using the `put` method
```javascript
let get = q.get('/path/to/dest');
get.on('success', (res) => {
    q.put('/data/data2.json', { file: res.text });
});

get.send();
```
Or delete an existing file using the delete method
```javascript
 q.delete('/data/data2.json', res => (alert(res.text)));
```