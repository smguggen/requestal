const Requestal = require('../index');
const { echo } = require('ternal');
const util = require('util');
const path = require('path');

class RequestalShell {
    constructor() {
        this.verbose = 0;
        this.current = false;
        this.raw = null;
        this.test = false;
    }
    
    fill(x, total, msg) {
        total = total || 30;
        let y = total - x;
        let filledStr = Array(x).fill(' ');
        let emptyStr = Array(y).fill(' ');
        if (msg) {
            let mid = Math.ceil(total/2) - 1;
            let start = mid - Math.floor(msg.length/2);
            let half1 = msg.substring(0, x - start);
            let half2 = msg.substring(x - start);
            filledStr.splice(start, half1.length, ...half1);
            emptyStr.splice(start - total, half2.length, ...half2);
        }
        let output = "[\x1b[30;47m" + filledStr.join('') + "\x1b[0m" + "\x1b[37;49m" + emptyStr.join('') + "\x1b[0m]";
        return output;
    }
    
    loading(msg, length, time) {
        time = time || 25;
        length = length || 30;
        let $this = this;
        this._loading = (function() {
            let x = 0;
            let dir = 'asc';
            process.stdout.write("\n\x1B[?25l")
            return setInterval(function() {
                if (x == length) {
                    dir = 'desc';
                } else if (x == 0) {
                    dir = 'asc';
                }
                if (dir == 'asc') {
                    x++;
                } else {
                   x--;
                }
                let output = $this.fill(x, length, msg);
                process.stdout.write("\r" + output);
            }, time);
        })();
    }
    
    exit(code) {
        this.loaded();
        process.exit(code);
    }
    
    loaded(fill) {
        if (this._loading) {
            clearInterval(this._loading);
            if (fill) {
                let output = this.fill(30, 30, 'Done');
                process.stdout.write("\r" + output);
            }
            process.stdout.write("\n\n\x1B[?25h");
        }
    }
    
    isFlag(arg) {
        if (arg.startsWith('-')) {
            let key = arg.replace(/^-*/, '');
            if (key == 'table') {
                this.raw = false;
            } else if (key == 'on') {
                this.current = 'event';
            } else if (key.startsWith('d') || key.startsWith('p')) {
                this.current = 'data';
            } else if (key.startsWith('o')) {
                this.current = 'options';
            } else if (key.startsWith('u')) {
                this.current = 'url'
            } else if (key.startsWith('v')) {
                this.verbose = true;
            } else if (key.startsWith('r')) {
                this.raw = true;
            } else if (key.startsWith('s')) {
                this.current = 'subset';
            } else if (key.startsWith('t')) {
                this.test = true;
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
            echo('yellow', 'No Response Data Received, Status: ' + response.code + ' ' + response.status);
            this.exit(0);
        }
        if (Buffer.isBuffer(data)) {
            data = data.toString();
        }
        let raw = typeof this.raw === 'boolean' ? this.raw : this.verbose ? true : false;
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
        if (data && !toPrint) {
            echo('red', 'Subset parsing failed, Status: ' + response.code + ' ' + response.status);
            this.exit(1);
        }
        if (raw || typeof toPrint === 'string') {
            if (subset) {
                let msg = typeof toPrint == 'string' ? 'string' : 'raw data';
                echo('red', 'Cannot get subset of ' + msg + ', printing full result');
            }
            this.printRaw(data, url);
            return;
        }
        let _toPrint = toPrint.concat([]);
        let printed = this.getSubset(_toPrint, subset);
        if (toPrint && !printed) {
            echo('red', 'Subset parsing failed, Status: ' + response.code + ' ' + response.status);
            this.exit(1);
        }
        if (!this.test) {
            this.loaded(true);
            echo('green', 'Response from ' + url + ': ');
        }
        console.table(printed);
    }
    
    printRaw(data, url) {     
        if (!data) {
            echo('yellow', 'No Response Data Received, Status: ' + response.code + ' ' + response.status);
            this.exit(0);
        }
        if (!this.test) {
            this.loaded(true);
            echo('green', 'Response from ' + url + ': ');
        }
        console.dir(data);
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
                        echo('red', 'Can\'t Parse ' + util.inspect(`${results} [${this.current}][${key}] = ${val}`));
                        this.exit(1);
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
            this.exit(1);
        }
        return results;
    }

    getSubset(data, subset) {
        if (subset && subset.length) {
            return subset.reduce((acc, pr) => {
                if (acc && typeof acc == 'object') {
                    return acc[pr] 
                } else {
                    echo('red', 'Error: Subset parsing failed, can\'t parse ' + util.inspect(acc + '[' + pr + ']') + '; Status: ' + response.code + ' ' + response.status);
                    this.exit(1);
                }
            }, data);
        }
        return data;
    }
    
    getEvents(events, url, subset) {
        let $this = this;
        let defaultEvents = {
            success: res => {
                $this.print(res, url, subset);
            },
            error: err => {
                echo('red', 'Request Failed: ' + err);
            }
        }
        let options = {};
        let cb = Object.assign({}, defaultEvents, events || {});
        for (let c in cb) {
            if (cb.hasOwnProperty(c)) {
                if (!Requestal.eventNames.includes(c)) {
                    continue;
                }
                let e = cb[c];
                if (typeof e === 'function') {
                    options[c] = e;
                    continue;
                }
                let fn;
                if (e) {
                    if (typeof e === 'string') {
                        fn = function(...args) {
                            let result;
                            try {
                                let ev = path.join(process.cwd(), e);
                                result = require(ev);
                            } catch(e) {
                                result = e;
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
                    options[c] = fn;
                }
            }
        }
        return options;
    }
    
    run(...args) {
        this.test = args.some(arg => /^\-\-?[tT]/.test(arg));
        if (!this.test) {
            this.loading('Loading');
        }
        if (!args[0]) {
            echo('red', 'Request failed, Arguments Are Incomplete');
            this.exit(1);
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
            let events = this.getEvents(event, url, subset);
            let opts = Object.assign({}, options, events);
            let params;
            if (['head', 'delete'].includes(method.toLowerCase())) {
                params = [url, opts]
            } else {
                params = [url, data, opts];
            }
            if (['get', 'post'].includes(method)) {
                q[method](...params).send();
            } else {
                q[method](...params);
            }
        } else { 
            if (!exists) {
                echo('red', 'Request Failed, ' + method + ' is not a Requestal method');
                this.exit(1);   
            } else if (!isFunction) {
                echo('red', 'Request Failed, ' + method + ' is not a function');
                this.exit(1);
            }
        }
    }
}

module.exports = new RequestalShell();