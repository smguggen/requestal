const RequestalRequest = require('./request');
const RequestalGet = require('./get');
const RequestalPost = require('./post');
const RequestalDelete = require('./delete');
const SrcerConfig = require('@srcer/config');

class Requestal {
    
    constructor(options) {
        options = options && typeof options === 'string' ? {
                base: options
            } : (options || {});
            let settings = 'requestal';
            if (options.config) {
                settings = {
                    fullPath: options.config
                }
                delete options.config;
            }
        this.options = SrcerConfig.import({}, options, settings);
    }
    
    request(method, ...options) {
        options = this._parseOptions(...options);
        method = method ? method.toLowerCase() : null
        if (method == 'get') {
            return this.get(options);
        } else if (method == 'post') {
            return this.post(options);
        } else {
            options.method = method;
            let req = new RequestalRequest(options);
            return req;
        }
    }
    
    get(...options) {
        options = this._parseOptions(...options);
        return new RequestalGet(options);
    }
    
    post(...options) {
        options = this._parseOptions(...options);
        return new RequestalPost(options);
    }
    
    put(url, data, options, delayRequest) {
        options = this._processOptions(options);
        let req = this.request('put', options);
        if (delayRequest) {
            return req;
        }
        return req.open(url).send(data);
    }
    
    patch(url, data, options, delayRequest) {
        options = this._processOptions(options);
        let req = this.request('patch', options);
        if (delayRequest) {
            return req;
        }
        return req.open(url).send(data);
    }

    head(url, options, delayRequest) {
        options = this._processOptions(options, 'responseHeaders');
        let req = this.request('head', options);
        if (delayRequest) {
            return req;
        }
        return req.open(url).send();
    }
    
    delete(url, options, delayRequest) {
        options = this._processOptions(options);
        let req = new RequestalDelete(options);
        if (delayRequest) {
            return req;
        }
        return req.send(url);
    }

    
    static Request(options) {
        return new RequestalRequest(options);
    }
    
    static Get(url, data, onSuccess, onError) {
        if (typeof data === 'function') {
            onSuccess = data;
            onError = onSuccess;
            data = {};
        }
        let req = new RequestalGet({
            success:onSuccess,
            error:onError
        });

        return req.send(url, data);
    }
    
    static Post(url, data, onSuccess, onError) {
        if (typeof data === 'function') {
            onSuccess = data;
            onError = onSuccess;
            data = {};
        }
        let req = new RequestalPost({
            success:onSuccess,
            error:onError
        });
        return req.send(url, data);
    }
    
    static Put(url, data, onSuccess, onError) {
        let q = new Requestal();
       return q._staticTemplate('put', url, data, onSuccess, onError)
    }
    
    static Patch(url, data, onSuccess, onError) {
        let q = new Requestal();
       return q._staticTemplate('patch', url, data, onSuccess, onError)
    }
    
    static Head(url, onSuccess, onError) {
        let q = new Requestal();
       return q.head(url, { 
           success: onSuccess, 
           error:onError
       });
    }
    
    static Delete(url, onSuccess, onError) {
        let q = new Requestal();
       return q.delete(url, { 
           success: onSuccess, 
           error:onError
       });
    }
    
    static get eventNames() {
        let q = new RequestalRequest();
        return q.eventNames;
    }

    _processOptions(options, key) {
        key = key || 'success';
        options = options || {};
        if (typeof options === 'function') {
           options[key] = options;
        }
        if (this.base) {
            options.base = this.base;
        }
        return options;
    }
    
    _staticTemplate(type, url, data, success, error) {
        if (typeof data === 'function') {
            onSuccess = data;
            onError = onSuccess;
            data = {};
        }
        let req = this[type];
        if (typeof req === 'function') {
            return req(url, data, {
                success:success,
                error:error
            });
        }
        return null;
    }
    
    _parseOptions(...options) {
        let [option1, option2, option3] = options;
        let result = {};
        if (option1 && typeof option1 == 'object') {
            result = option1;
        } else {
            if (typeof option1 === 'string') {
                result.url = option1;
            } 
            if (option2 && typeof option2 == 'object') {
                result.data = option2;
            }
            if (option3 && typeof option3 == 'object') {
                result = Object.assign({}, option3, result);
            }
        }
        if (this.options && typeof this.options === 'object') {
            result = Object.assign({}, this.options, result);
        }
        return result;
    }
    
    _processOptions(options, key) {
        key = key || 'success';
        options = options || {};
        let result = {};
        if (typeof options === 'function') {
           result[key] = options;
        } else {
            result = options;
        }
        return result;
    }
    
    _staticTemplate(type, url, data, success, error) {
        if (typeof data === 'function') {
            onSuccess = data;
            onError = onSuccess;
            data = {};
        }
        let req = this[type];
        if (typeof req === 'function') {
            return req(url, data, {
                success:success,
                error:error
            });
        }
        return null;
    }
}

module.exports = Requestal;