const RequestalRequest = require('./request');

class RequestalPost extends RequestalRequest {
    constructor(options) {
        super(options);
    }

    get method() {
        return 'post';
    }
    set method(m) {

    }

    open() {
        return null;
    }

    send(uri, params) {
        let { url, data } = this.presend(uri, params);
        super.open(url);
        super.send(data);
    }
}

module.exports = RequestalPost;