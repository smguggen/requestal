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

    onReady(options) {
        let $this = this;
        options = options || this.options;
        this.on('ready', () => {
            let type = options.headers.accept || ['application/json'];
            $this.headers.accept = type;
            $this.headers.init();
        });
    }
}

module.exports = RequestalPost;