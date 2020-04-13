const Requestal = require('../index');
const RequestalResponse = require('../lib/response');
const { echo } = require('ternal');
const util = require('util');
const path = require('path');
const evental = require('evental').instance;

class RequestalShell {
    constructor() {
        this.verbose = 0;
        this.current = false;
        this.raw = null;
        this.test = false;
        this.silent = false;
        this.color = 'green';
        this.message = 'Response from __: ';
        this.request = new Requestal();
        let $this = this;
        process.on('exit', () => {
            if ($this._loading) {
                process.stdout.write("\r" + "\x1B[?25h");
            }
        });
        process.on('SIGINT', number => $this.unplannedExit(128 + number));
        process.on('SIGTERM', number => $this.unplannedExit(128 + number));
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
        }
        process.stdout.write(printed);
    }
    
    exit(code) {
        this.loaded();
        process.exit(code);
    }
    
    unplannedExit(number, msg) {
        this.loaded();
        process.stdout.write("\n" + "\x1B[?25h");
        if (msg) {
            echo('red', msg);
        }
        process.exit(number);
    }
    
    isFlag(arg) {
        if (arg.startsWith('-')) {
            let key = arg.replace(/^-*/, '');
            if (key == 'table') {
                this.raw = false;
            } else if (key == 'on') {
                this.current = 'event';
            } else if (key == 'silent') {
                this.silent = true;
            } else if (key == 'timeout') {
                this.current = 'timeout';
            } else if (key == 'test') {
                this.test = true;
            } else if (key.startsWith('d') || key.startsWith('p')) {
                this.current = 'data';
            } else if (key.startsWith('h')) {
                this.current = 'headers';
            } else if (key.startsWith('e')) {
                this.current = 'encoding';
            } else if (key.startsWith('u')) {
                this.current = 'url'
            } else if (key.startsWith('v')) {
                this.verbose = true;
            } else if (key.startsWith('r')) {
                this.raw = true;
            } else if (key.startsWith('s')) {
                this.current = 'subset';
            }
            return true;
        }
        return false;
    }
    
    getResponse(response, subset) {
        if (this.silent) {
            return this.silence(response);
        }
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
            printed = this.getSubset(subset, printed);
        }
        if (toPrint && !printed) {
            if (response.status == 'OK') {
                this.color = 'yellow';
                this.message = 'Subset parsing failed, printing full response from __:';
                printed = toPrint;
            } else {
                this.setError('red', 'Subset parsing failed, Status: ' + response.code + ' ' + response.status);
            }
        }
        return printed;
    }
    
    print(data, url) {
        if (!this.test) {
            this.loaded(true, true);
            this.closingMessage(url);
        }
        if (!this.silent) {
            if (this.raw) {
                console.dir(data);
            } else {
                console.table(data);
            }
        }
    }
    
    parseFlags(args) {
        let results = {
            data:{},
            url:'',
            subset: [],
            event: {},
            headers: {},
            encoding: '',
            timeout: 30000
        }
        for (let i = 0; i < args.length; i++) {
            let arg = args[i];
            if (this.isFlag(arg)) {
                continue;
            }
            let newArg = args[i];
            if (!this.current) {
                results.url = newArg;
            } else if (this.current == 'subset') {
                results.subset.push(newArg);
            } else if (this.current == 'encoding') {
                results.encoding = newArg;
            } else if (this.current == 'timeout' && !isNaN(Number(newArg))) {
                results.timeout = Number(newArg);
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
        try {
            let url = new URL(results.url);
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
    
    defaultEvents(url, subset) {
        let $this = this;
        return {
            success: $this.eventWrapper(subset, data => {
                $this.print(data, url);
            }),
            error: err => {
                $this.unplannedExit(1, "\n" + "Request Failed: " + util.inspect(err));
            },
            timeout: () => {
                $this.unplannedExit(0, "\n" + 'Request Took Too Long To Respond, Exiting...');
            }
        }
    }
    
    getEvents(events, url, subset) {
        let $this = this;
        let options = {};
        
        let cb = Object.assign({}, this.defaultEvents(url, subset), events || {});
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
        this.test = args.some(arg => /^\-\-?test/i.test(arg));
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
        let { url, data, subset, event, headers, encoding, timeout } = this.parseFlags(args);
        let options = {};
        if (headers && Object.keys(headers).length) {
            options.headers = headers;
        }
        if (encoding) {
            options.encoding = encoding;
        }
        options.timeout = timeout;
        let exists, isFunction;
        exists = this.request[method] ? true : false;
        isFunction = typeof this.request[method] === 'function';
        if (exists && isFunction) {
            let events = this.getEvents(event, url, subset);
            if (events && Object.keys(events).length) {
                options.events = events;
            }
            let params;
            if (['head', 'delete'].includes(method.toLowerCase())) {
                params = [url, options]
            } else {
                params = [url, data, options];
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
    
    
    silence(response) {
        this.color = response.isSuccess() ? 'green' : 'red';
        this.message = 'Status: ' + response.code + ' ' + response.status;
        let length = response.settings && 
            response.settings.headers && 
            response.settings.headers['content-length'] > -1 ? 
            response.settings.headers['content-length'] : 'Unknown';
        this.message += '; Response Size: ' + length;
        return {};
    }
    
    getSubset(subset, printed) {
        if (!Array.isArray(subset)) {
            return printed;
        }
        return subset.reduce((acc, pr) => {
            try {
                if (acc && typeof acc == 'object') {
                    return acc[pr] 
                } else {
                    return acc;
                }
            } catch(e) {
                return acc;
            }
        }, printed);
    }
}

module.exports = new RequestalShell();