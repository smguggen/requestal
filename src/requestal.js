const RequestalRequest = require('./request');
const RequestalGet = require('./get');
const RequestalPost = require('./post');
//const QuestalDelete = require('./delete');

class Requestal {
    
    static Request(options) {
        return new RequestalRequest(options);
    }
    
    get(...options) {
        options = this._parseOptions(...options);
        return new RequestalGet(options);
    }
    
    post(...options) {
        options = this._parseOptions(...options);
        return new RequestalPost(options);
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

    _processOptions(options, key) {
        key = key || 'success';
        options = options || {};
        if (typeof options === 'function') {
           options[key] = options;
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
        return result;
    }
}

module.exports = Requestal;