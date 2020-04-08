const Requestal = require('../index');
const RequestalResponse = require('../lib/response');
const { echo } = require('ternal');
const util = require('util');
const { exec } = require('child_process');
class RequestalShell {
    constructor() {
        this.verbose = 0;
        this.current = false;
        this.raw = null;
        this.test = false;
        this.shell = false;
    }
     
    isFlag(arg) {
        if (arg.startsWith('-')) {
            let key = arg.replace(/^-*/, '');
            if (key.startsWith('opt')) {
                this.current = 'options';
            } else if (key == 'data' || key == 'params') {
                this.current = 'data';
            } else if (key.startsWith('u')) {
                this.current = 'url'
            } else if (key.startsWith('v')) {
                this.verbose = true;
            } else if (key.startsWith('r')) {
                this.raw = true;
            } else if (key == 'table') {
                this.raw = false;
            } else if (key.startsWith('s')) {
                this.current = 'subset';
            } else if (key.startsWith('t')) {
                this.test = true;
            } else if (key == 'on') {
                this.current = 'event';
            } else if (key == 'shell') {
                this.shell = true;
            }
            return true;
        }
        return false;
    }
    
    print(response, url, subset) {
        if (!subset || !subset.length) {
            subset = null;
        }
        let data = this.verbose ? response : response.json;
        if (!data) {
            echo('red', 'No Response Data available');
            process.exit(0);
        }
        if (Buffer.isBuffer(data)) {
            data = data.toString();
        }
        let raw = typeof this.raw === 'boolean' ? this.raw : this.verbose ? true : false;
        let fn = raw ? this.printRaw : this.printTable;
        let toPrint;
        if (subset && typeof data === 'string') {
            try {
                toPrint = JSON.parse(data);
            } catch(e) {
                toPrint = data;
            }
        } else {
            toPrint = data;
        }
        if (raw || typeof toPrint === 'string') {
            if (subset) {
                let msg = typeof toPrint == 'string' ? 'string' : 'raw data';
                echo('red', 'Cannot get subset of ' + msg + ', printing full result');
            }
            this.printRaw(data, url);
            return;
        }
        let printed;
        if (subset) {
            printed = subset.reduce((acc, pr) => {
                try {
                    return acc[pr];
                } catch(e) {
                    echo('red', 'Request failed, cannot parse subset ' + util.inspect(acc[pr]));
                    process.exit(0);
                }
            }, toPrint);
        } else {
            printed = toPrint;
        }
        echo('green', 'Response from ' + url + ': ');
        console.table(printed);
        echo('green', 'End Response');
    }
    
    printRaw(data, url) {
        if (!data) {
            echo('red', 'No Response Data available');
            process.exit(0);
        }
        echo('green', 'Response from ' + url + ': ');
        console.log(util.format('%O', data));
        echo('green', 'End Response');
    }
    
    parseFlags(args) {
        let results = {
            options:{},
            data:{},
            url:'',
            subset: [],
            event: {}
        }
        for (let i = 0; i < args.length; i++) {
            let arg = args[i];
            if (this.isFlag(arg)) {
                continue;
            }
            let newArg = args[i];
            if (newArg && !this.current) {
                results.url = newArg;
            } else if (this.current == 'subset') {
                results.subset.push(newArg);
            } else {
                if (newArg.indexOf('=') > -1) {
                    let [key, val] = newArg.split('=');
                    if (this.current && key && val) {
                        results[this.current][key] = val;
                    } else {
                        echo('red', 'Can\'t Parse ' + util.inspect(results[this.current][key] = val));
                        process.exit(0);
                    }
                } else if (newArg) {
                    results.url = newArg;
                }
            }
        }
        let uri = results.options.url || results.url;
        try {
            let url = new URL(uri);
        } catch(e) {
            echo('red', 'Request failed, Url is invalid');
            process.exit(0);
        }
        return results;
    }
    
    getEvents(q, events) {
        if (!q) {
            return;
        }
        let defaultEvents = {
            success: res => {
                $this.print(res, url, subset);
            },
            error: err => {
                echo('red', 'Request Failed: ' + err);
            }
        }
        let cb = Object.assign({}, defaultEvents, events || {});
        for (let c in cb) {
            if (cb.hasOwnProperty(c)) {
                if (!q.eventNames.includes(c)) {
                    continue;
                }
                let e = cb[c];
                if (typeof e === 'function') {
                    q.on(c, e);
                }
                let fn;
                if (e) {
                    if (typeof e === 'string') {
                        if (this.shell) {
                            fn = function(...args) {
                                if (args[0] && typeof args[0] === 'object' && args[0] instanceof RequestalResponse) {
                                    args.splice(0, 1, args[0].text);
                                }
                                let params = args.filter(arg => arg && typeof arg === 'string');
                                let cmd = params.length ? e + ' ' + params.join(' ') : e;
                                exec(cmd, err => {
                                    if (err) {
                                        echo('red', 'Shell Script Error for Script ' + e + ': ' + err);
                                    }
                                });
                            }
                        } else {
                            fn = function(...args) {
                                let result;
                                try {
                                    result = require(e);
                                } catch(e) {
                                    result = e;
                                }                
                            }
                            if (typeof result === 'function') {
                                return result(...args);
                            } else {
                                return result;
                            }
                        }
                    }
                }
                if (typeof fn === 'function') {
                    q.on(c, fn);
                }
            }
        }
    }
    
    prepareRequest(method, url, data, options, subset, event) {
        let $this = this;
        options.success = res => {
            $this.print(res, url, subset);
        }
        options.error = err => {
            echo('red', 'Request Failed: ' + err);
        }
        if (['head', 'delete'].includes(method.toLowerCase())) {
            return [url, options]
        } else {
            return [url, data, options];
        }
    }

    run(...args) {
        if (!args[0]) {
            echo('red', 'Request failed, Arguments Are Incomplete');
            process.exit(0);
        }
        let method = args.shift();
        if (method == 'request') {
            method = 'get';
        }
        let { url, data, options, subset, event } = this.parseFlags(args);
        let exists, isFunction;
        let q = new Requestal();
        exists = q[method] ? true : false;
        isFunction = typeof q[method] === 'function';
        if (exists && isFunction) {
            this.getEvents(q, event);
            let params = this.prepareRequest(method, url, data, options, subset, event);
            q[method](...params).send();
        } else { 
            if (!exists) {
                echo('red', 'Request Failed, ' + method + ' is not a Requestal method');
                process.exit(0);   
            } else if (!isFunction) {
                echo('red', 'Request Failed, ' + method + ' is not a function');
                process.exit(0);
            }
        }
    }
}

module.exports = new RequestalShell();