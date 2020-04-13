# Requestal

![Version](https://img.shields.io/npm/v/requestal?style=plastic)
![License](https://img.shields.io/npm/l/requestal?style=plastic)
![Downloads](https://img.shields.io/npm/dw/requestal?style=plastic)
![Size](https://img.shields.io/bundlephobia/min/requestal?style=plastic)

A Node module for handling HTTP requests. For making browser-based requests, see [Questal](https://www.npmjs.com/package/questal).

Install
-------
```bash
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
 
# Version 2.0

New in Version 2, you can run requests on the command line with the `requestal` terminal command. 
```bash
foo:bar foo$ requestal <method> <url> [-p | --params | -d | --data <name>=<value>]
             [-s | --subset <key>] [-h | --headers <name=value>] [--on <path/to/module>]
             [-e | --encoding <value>] [--timeout <value>] [-v | --verbose] 
             [-r | --raw] [--silent]
```

Arguments
---------
* **method**  
    The request method to use: `get`, `post`, `put`, `patch`, `head`, or `delete`.  

* **url**  
    The full url and path to the request destination  
   
   
Flags
-----
* **-p | --params | -d | --data**  
    The data to send along with the request. As for any way you use requestal, these can be in the form of a query string tacked on to the url or as a parameter object, here expressed as `-p id=myId name=myName`  

* **-s | --subset**  
   View a subset of the returned data in the console. If the subset doesn't exist the response defaults to the full response.
   ```bash
    foo:bar foo$ requestal post https://mydomain/myendpoint 
    
    Response from https://srcer.com/test/data: 
    ┌─────────┬────┬────────┬─────────┐
    │ (index) │ id │ first  │  last   │
    ├─────────┼────┼────────┼─────────┤
    │    0    │ 1  │ 'Bill' │ 'Jones' │
    │    1    │ 2  │ 'Jane' │ 'Smith' │
    │    2    │ 3  │ 'Bob'  │ 'Davis' │
    └─────────┴────┴────────┴─────────┘
    
    foo:bar foo$ requestal get https://srcer.com/test/data -s first
    
    Subset parsing failed, printing full response from https://srcer.com/test/data:
    ┌─────────┬────┬────────┬─────────┐
    │ (index) │ id │ first  │  last   │
    ├─────────┼────┼────────┼─────────┤
    │    0    │ 1  │ 'Bill' │ 'Jones' │
    │    1    │ 2  │ 'Jane' │ 'Smith' │
    │    2    │ 3  │ 'Bob'  │ 'Davis' │
    └─────────┴────┴────────┴─────────┘
    
    foo:bar foo$ requestal get https://srcer.com/test/data -s 0 first
    
    Response from https://srcer.com/test/data: 
    Bill
   ```  

* **-h | --headers**  
    Set headers for the request here in a `<key>=<value>` fashion:
    ```bash
    foo:bar foo$ requestal get https://srcer.com/test/data -s 0 first -h contentType=json connection=keep-alive
    ```  
    
* **-on**  
    Set event handlers here in an `<event>=<path/to/module>` fashion. If the module exists it will be pulled via `require` and then if it's a function it will be passed as an event callback:
    ```javascript
    // myfile.js
    module.exports = function(data) {
        console.log(data);
    }
    ```
    ```bash
    foo:bar foo$ requestal get https://srcer.com/test/data -s 0 first -on success=./myfile.js
    
    Response from https://srcer.com/test/data: 
    Bill
    ``` 
    
* **-e | --encoding**  
    Set the encoding of the response, default is `utf8`:
    ```bash
    foo:bar foo$ requestal get https://srcer.com/test/data -s 0 first -e utf16
    
    Response from https://srcer.com/test/data: 
    筛渢浡獥㨢筛椢≤ㄺ∬楦獲≴∺楂汬Ⱒ氢獡≴∺潊敮≳ⱽ≻摩㨢ⰲ昢物瑳㨢䨢湡≥∬慬瑳㨢匢業桴索第椢≤㌺∬楦獲≴∺潂≢∬慬瑳㨢䐢癡獩索絝
    ```
    
* **--timeout**  
    Set the time in milliseconds that the process will wait for response before exiting, default is 30000

* **-v | --verbose**  
    Activating this flag will send the full response object back rather than just the response body  
    
* **-r | --raw**  
    Will send back the raw response body rather than the formatted table structure that is the default.

* **--silent**  
    Rather than printing response body, will only print response status code and message as well as the content-length from the response header:
    ```bash
    foo:bar foo$ requestal get https://srcer.com/test/data -s 0 first --silent
    Status: 200 OK; Response Size: 129
    ```

