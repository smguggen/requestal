const RequestalHeaders = require('../lib/headers');
const RequestalResponse = require('../lib/response');
const { ProtoRequest } = require('@srcer/questal-proto')
const Url = require('url');
const http = require('http');
const https = require('https');
const { echo } = require('ternal');

class RequestalRequest extends ProtoRequest {
    constructor(options) {
        if (typeof options === 'string') {
            options = {
                url: options
            }
        }
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
    
    set url(u) {
        let url;
        if (typeof u === 'string') {
            url = new URL(u || '/');
        } else if (Array.isArray(u)) {
            url = new URL(...u);
        } else if (u && typeof u === 'object') {
            url = new URL(u.path, u.base);
        } else {
            return;
        }
        this.data.params = url.search;
        this._url = url;
    }

    get url() {
        if (!this._url) {
            return '/';
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
        if (protocol == 'http') {
            return http;
        }
        return https;
    }
    
    setSettings() {
        let $this = this;
        let fields = {
            auth: ['auth', 'authorization'],
            defaultPort: ['port', 'defaultPort'],
            hostname: ['hostname', 'host'],
            method: ['method'],
            timeout: ['timeout']
        }
        let mutations = {
            method: m => m.toUpperCase(),
            protocol: () => $this.url.protocol,
        }
        let keys = Object.keys(this.options);
        Object.keys(fields).forEach((fieldKey, index) => {
            let field = fields[fieldKey];
            for (let i = 0; i < field.length;i++) {
                if (keys.includes(field[i])) {
                    let option = this.options[field[i]];
                    if (mutations[fieldKey]) {
                        option = mutations[fieldKey](option);
                    }
                    this.settings[fieldKey] = this.options[field[i]];
                    break;
                }
            }
        }, this);
        return this;
    }
    
    open(url, data) {
        let $this = this;
        this._presend(url, data);
  
        this.events.fire('ready');
        this.settings.headers = this.headers.get();
        this.request = this.protocol.request(this.url, this.settings, response => {
            $this.active = true;
            $this.events.fire('responseHeaders', response.headers);
            response.setEncoding($this.headers.encoding || 'utf8');
            
            response.on('error', (...err) => {
                $this.events.fire('error', 'Response Error:', ...err)
            });
            response.on('data', chunk => {
                $this.chunks = $this.events.calc('data', chunk); 
            });
            
            response.on('end', () => {
                $this.response = new RequestalResponse(response, $this.chunks, $this.omitBody);
               if ($this.chunks) {
                   $this.events.fire('success', $this.response);
               } 
               $this.events.fire('complete', $this.response);
            });
        });
        if (this.settings.timeout) {
            this.request.setTimeout(this.settings.timeout, () => {
               $this.events.fire('timeout'); 
            });
        }
        this.request.on('error', (...err) => {
            $this.events.fire('error', 'Request Error:', ...err);
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
        if (body) {
            this.data.params = body;
        } else {
            this.data.params = this.url.search;
        }
        let params = this.data.params;
        if (params) {
            this.request.write(this.data.params);
        }
        this.request.end();
        return this;
    }
    
    
    init(options) {
        this.options = options || {};
        this.eventNames = ['init', 'ready', 'responseHeaders', 'data', 'change', 'complete', 'success', 'progress', 'abort', 'error', 'timeout'];
        this.url = this.options.url;
        this.headers = new RequestalHeaders(this.options.headers);
        this.data.params = this.options.data || this.options.params;
        this.setSettings();
        this._defaultEvents();
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
    
    _defaultEvents() {
        let $this = this;
        this.on('error', (...errs) => {
           echo('red', ...errs);
           process.exit(0);
        });
        this.on('ready', () => {
           this.state = 'ready'; 
           this.events.fire('change', 'ready');
        });
        this.on('responseHeaders', () => {
            this.state = 'responseHeaders'; 
            this.events.fire('change', 'responseHeaders');

        });
        this.on('data', () => {
            this.state = 'data'; 
            this.events.fire('change', 'data');

        });
        this.on('complete', () => {
            this.state = 'complete'; 
            this.events.fire('change', 'complete');
        });
        this.events.onCalc('data', data => {
           let newData = $this.chunks + data;
           return newData;
        });
    }
   
}

module.exports = RequestalRequest;