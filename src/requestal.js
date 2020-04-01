const RequestalRequest = require('./request');
const RequestalGet = require('./get');
//const QuestalPost = require('./post');
//const QuestalDelete = require('./delete');

class Requestal {
    
    get(options) {
        return new RequestalGet(options);
    }

    static Request() {
        return new RequestalRequest();
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
}

module.exports = Requestal;