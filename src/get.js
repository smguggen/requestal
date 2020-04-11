const RequestalRequest = require('./request');

class RequestalGet extends RequestalRequest {
    constructor(options) {
        super(options);
    }

    get method() {
        return 'get';
    }
    set method(m) {

    }

    open() {
        return null;
    }

    send(uri, params) {
        let { url, data } = this.presend(uri, params);
        this.setQueryString(url, data);
        super.open(this.url)
        super.send();
    }
    
    setQueryString(url, data) {

        if (url && url.length > 1) {
            this.url = url;
        }
        if (data && typeof data !== 'object') {
            data = this.data.parseParamsToObject(data);
        } else if (!data) {
            data = {};
        }
        let q = Object.assign({}, this.data.data, this.urlObject.searchParams, data);
        
        q = this.data.parseParamsToString(q).replace('=undefined', '');
        if (q && q.length > 1) {
            this.urlObject.search = q;
        }
        return this;
    }
}

module.exports = RequestalGet;