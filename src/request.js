const RequestalHeaders = require('../lib/headers');
const RequestalResponse = require('../lib/response');
const { ProtoRequest } = require('@srcer/questal-proto')
const http = require('http');
const https = require('https');
const { echo } = require('ternal');
const util = require('util');
class RequestalRequest extends ProtoRequest {
    constructor(options) {
        super(null, options);
        this.chunks = '';
        this.active = false;
    }
    
    set state(st) {
        if (['unsent', 'ready', 'responseHeaders', 'loadStart', 'complete'].includes(st)) {
            this._state = st;
        }
    }
    
    get state() {
      return this._state || 'unsent';   
    }
    
    set base(b) {
        this._base = b;    
    }
    
    get base() {
        return this._base || this.options.base || null;
    }
    
    set url(u) { 
        if (!u) {
            return;
        }
        if (u == '/' && !this.base) {
           this.events.fire('error', '"/" is not a valid Url.'); 
        }
        let url;
        if (typeof u === 'string') {
            if (this.base) {
                try {
                    let newUrl = new URL(u);
                } catch(e) {
                    u = this.base.trim().replace(/\/$/, '') + '/' + u.trim().replace(/^\//, '');
                }
            }
            url = [u, null];
        } else if (Array.isArray(u)) {
            url = [u[0], u[1] || this.base || null];
        } else if (u && typeof u === 'object' && u.path) {
            url = [u.path, u.base || this.base || null];
        }
        let obj;
        let $this = this;
        url = url.filter(a => a ? true : false);

        try {
            obj = new URL(...url);
            this.data.params = obj.search;
            this._url = obj;
        } catch(e) {
            $this.events.fire('error', 'URL Error: ', e);
        }
    }

    get url() {
        if (!this._url) {
            return null;
        } else {
            return this._url.href;
        }
    }
    
    get urlObject() {
        return this._url;
    }

    get protocol() {
        if (this.options.forceHttps) {
            return https;
        }
        if (!this.url) {
            return null;
        }
        let protocol = this.urlObject.protocol;
        if (protocol.indexOf('s') < 0) {
            return http;
        }
        return https;
    }
    
    setSettings() {
        let $this = this;
        let fields = {
            agent: ['agent', 'userAgent', 'user-agent'],
            createConnection: ['createConnection', 'connection', 'connect'],
            family: ['family', 'ip', 'ipAddress'],
            insecureHTTPParser: ['insecureHTTPParser', 'insecure', 'insecureParser'],
            localAddress: ['localAddress', 'local'],
            lookup: ['lookup'],
            maxHeaderSize: ['maxHeaderSize', 'maxHeader', 'max-header'],
            socketPath: ['socketPath', 'socket'],
            auth: ['auth', 'authorization'],
            defaultPort: ['port', 'defaultPort'],
            timeout: ['timeout']
        }
        let defaults = {
            timeout: 30000
        }
        let settings = {
            method: $this.method.toUpperCase(),
        }
        let keys = Object.keys(this.options);
        Object.keys(fields).forEach((fieldKey, index) => {
            let field = fields[fieldKey];
            for (let i = 0; i < field.length;i++) {
                if (keys.includes(field[i])) {
                    let option = this.options[field[i]];
                    if (option) {
                        this.settings[fieldKey] = option;
                    }
                    break;
                }
            }
        }, this);
        this.settings = Object.assign({}, defaults, this.settings, settings);
        return this;
    }
    
    checkUrl(url) {
        console.log(this.url, url);
        url = url ? url : this.url;
        console.log('url', url);
        if (!this.method) {
            this.events.fire('error', 'Request method is empty');
        } else if (!url) {
            this.events.fire('error', `Request Url "${url}" is invalid`);
        }
        this.events.fire('init');
        
        return url;
    }
    
    presend(url, data) {
        if (url && typeof url === 'object') {
            data = url;
            url = null;
        } 
        this.url = this.checkUrl(url);
        return {
            url: this.url,
            data: data
        };
    }
    
    open(url) {
        if (!url) {
            url = this.checkUrl(url);
        } else {
            this.url = url;
        }
        let $this = this;
        this.events.fire('ready');
        this.settings.headers = this.headers.get();
        this.request = this.protocol.request(this.url, this.settings, response => {
            $this.response.settings = response;
            $this.active = true;
            $this.events.fire('responseHeaders', response.headers);
            response.setEncoding($this.response.encoding);
            
            response.on('error', (err) => {
                $this.events.fire('error', 'Response Error:', util.inspect(err))
            });
            response.on('data', chunk => {
                $this.events.fire('data');
                $this.chunks = $this.events.get('data').__calc('data', chunk); 
            });
            
            response.on('end', () => {
               if ($this.chunks) {
                   $this.events.fire('success', $this.response, response);
               } 
               $this.events.fire('complete', $this.response, response);
            });
        });
        if (this.settings.timeout) {
            this.request.setTimeout(this.settings.timeout, () => {
               $this.events.fire('timeout'); 
            });
        }
        this.request.on('error', (err) => {
            $this.events.fire('error', 'Request Error:', util.inspect(err || 'Unknown'));
        });
        this.request.on('abort', () => {
           $this.events.fire('abort'); 
        });
        this.request.on('information', info => {
           $this.events.fire('progress', info); 
        });
        return this;
    }
    
    send(body) {
        let params = super.send(body);        
        if (params) {
            let processedParams = this.headers.processRequestBody(params);
            this.request.write(processedParams);
        }
        this.request.end();
        return this;
    }
    
    init(options) {
        this.eventNames = ['init', 'ready', 'responseHeaders', 'data', 'change', 'complete', 'success', 'progress', 'abort', 'error', 'timeout'];
        this.setOptions(options);
        if (this.options.url) {
            this.url = this.options.url;
        }
        this.headers = new RequestalHeaders(this.options.headers);
        this.response = new RequestalResponse({}, this.chunks, this.omitBody);
        if (this.options.encoding) {
            this.response.setEncoding(this.options.encoding);
        }
        this.method = this.options.method || 'get';
        this.data.params = this.options.data || this.options.params;
        this.setSettings();
        this._defaultEvents();
        this.onReady(options);
    }
        
    setOptions(options) {
        options = options || {};
        this.options = {};
        if (options.events && typeof options.events === 'object') {
            let eventKeys = Object.keys(options.events);
            for (let j = 0; j < eventKeys.length; j++) {
                let eventKey = eventKeys[j];
                let eventOption = options.events[eventKey];
                if (this.eventNames && this.eventNames.includes(eventKey) && typeof eventOption === 'function') {
                    this.on(eventKey, eventOption);
                }
            }
            delete options.events;
        }
        let keys = Object.keys(options);
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let option = options[key];
            if (this.eventNames && this.eventNames.includes(key) && typeof option === 'function') {
                this.on(key, option);
            } else {
                this.options[key] = option;
            }
        }
    }
    
    log(message) {
        let msg;
        try {
            msg = JSON.stringify(message);
        } catch(e) {
            msg = message;
        } finally {
            process.stdout.write(msg);
            return this;
        }
    }
    
    transform(dataFunction) {
        let $this = this;
        if (typeof dataFunction === 'function') {
            this.events.onCalc('data', data => {
                dataFunction.call($this, data);
            });
        }
        return this;
    }
    
    set chunks(c) {
        this.response.responseData = c;
        if (!this._chunks) {
            this._chunks = '';
        }
        this._chunks += c;
    }
    
    get chunks() {
        return this._chunks || '';
    }
    
    _defaultEvents() {
        this.on('error', (...errs) => {
           echo('red', util.inspect(errs.join(',')));
           process.exit(1);
        });
        this.events.first('ready', () => {
           this.state = 'ready'; 
           this.events.fire('change', 'ready');
        });
        this.events.first('responseHeaders', () => {
            this.state = 'responseHeaders'; 
            this.events.fire('change', 'responseHeaders');
        });
        this.events.first('data', () => {
            this.state = 'data'; 
            this.events.fire('change', 'data');
        });
        this.events.first('complete', () => {
            this.state = 'complete'; 
            this.events.fire('change', 'complete');
        });
        this.events.onCalc('data', data => {
           return data;
        });
    }
    
    onReady(options) {
        let $this = this;
        options = options || this.options;
        this.on('ready', () => {
            options.headers = options.headers || {};
            let type = options.headers.accept || ['application/json'];
            $this.headers.accept = type;
            $this.headers.init();
        });
    }
}

module.exports = RequestalRequest;