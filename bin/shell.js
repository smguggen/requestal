const Requestal = require('../index');
const RequestalResponse = require('../lib/response');
const { echo } = require('ternal');
const util = require('util');
const path = require('path');

class RequestalShell {
    constructor() {
        this.verbose = 0;
        this.current = false;
        this.raw = null;
        this.test = false;
        this.color = 'green';
        this.message = 'Response from __: ';
        this.request = new Requestal();
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
    
    loaded(fill, addLine) {
        let printed = '';
        if (addLine) {
            printed += "\n";
        }
        if (this._loading) {
            clearInterval(this._loading);
            if (fill) {
                printed += '\n';
                let output = this.fill(30, 30, 'Done');
                process.stdout.write("\r" + output);
            }
            printed += "\x1B[?25h";
        }
        process.stdout.write(printed);
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
    
    getResponse(response, subset) {
        let $this = this;
        if (!subset || !subset.length) {
            subset = null;
        }
        let data = this.verbose ? response : response.json;
        if (!data) {
            this.setError('yellow', 'No Response Data Received, Status: ' + response.code + ' ' + response.status, 0);
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
            this.setError('red', 'Subset parsing failed, Status: ' + response.code + ' ' + response.status);
        }
        if (raw || typeof toPrint === 'string') {
            this.raw = true;
            if (subset) {
                let msg = typeof toPrint == 'string' ? 'string' : 'raw data';
                this.color = 'yellow';
                this.message = 'Cannot get subset of ' + msg + ', printing full response from __: '
            }
            return toPrint;
        }
        let printed = toPrint;
        if (subset && subset.length) {
            printed = subset.reduce((acc, pr) => {
                if (acc && typeof acc == 'object') {
                    return acc[pr] 
                } else {
                    $this.setError('error', 'Subset parsing failed, can\'t parse ' + util.inspect(acc + '[' + pr + ']') + '; Status: ' + response.code + ' ' + response.status);
                }
            }, printed);
        }
        if (toPrint && !printed) {
            this.setError('red', 'Subset parsing failed, Status: ' + response.code + ' ' + response.status);
        }
        return printed;
    }
    
    print(data, url) {
        if (!this.test) {
            this.loaded(true, true);
            this.closingMessage(url);
        }
        if (this.raw) {
            console.dir(data);
        } else {
            console.table(data);
        }
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
    
    eventWrapper(subset, callback) {
        let $this = this;
        return function(res) {
            let data = res instanceof RequestalResponse ? [$this.getResponse(res, subset), res] : [res];
            return callback(...data);
        }
    }
    
    setError(color, msg, priority) {
        priority = priority || 1;
        echo(color, "\n\n" + msg);
        this.exit(priority)
    }
    
    closingMessage(url) {
        echo(this.color, this.message.replace('__', url))
    }
    
    getEvents(events, url, subset) {
        let $this = this;
        let defaultEvents = {
            success: $this.eventWrapper(subset, data => {
                $this.print(data, url);
            }),
            error:  err => {
                echo('red', 'Request Failed: ' + util.inspect(err));
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
                    options[c] = $this.eventWrapper(subset, e);
                    continue;
                }
                if (e) {
                    if (typeof e === 'string') {
                        let result;
                        try {
                            let ev = path.join(process.cwd(), e);
                            result = require(ev);
                        } catch(e) {
                            result = () => e;
                        } finally {
                            if (typeof result === 'function') {
                                options[c] = $this.eventWrapper(subset, result);
                            }
                        }
                    }
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
        exists = this.request[method] ? true : false;
        isFunction = typeof this.request[method] === 'function';
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
                this.request[method](...params).send();
            } else {
                this.request[method](...params);
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