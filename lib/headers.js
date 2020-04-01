const { ProtoHeaders } = require('@srcer/questal-proto');

class RequestalHeaders extends ProtoHeaders {
    constructor(options) {
        super(options);
        this.headers = {};
        this.options = options || {};
        this.init();
    }
    
    set content(type) {
        if (type.indexOf('/') < 0) {
            switch(type) {
                case 'multipart': type = 'multipart/form-data';
                break;
                case 'form': type = 'application/x-www-form-urlencoded';
                case 'url':
                case 'urlEncoded':
                case 'url-encoded':
                case 'encoded':
                break;
                case 'html': type = 'text/html';
                break;
                case 'xml': type = 'text/xml';
                break;
                case 'plain': type = 'text/plain';
                break;
                case 'app': type = 'application/octet-stream';
                case 'application':
                case 'generic':
                break;
                default: type = 'application/json';
                break;
            }
        }
        this._content = type;
    }
    get content() {
        if (!this._content) {
            return 'application/json';
        } else {
            return this._content;
        }
    }
    
    set encoding(type) {
        switch(type) {
            case 'binary': type = 'binary';
            case 'latin':
            case 'latin1':
            case 'latin-1':
            break;
            case 'ascii': type = 'ascii';
            break;
            case 'utf16': type = 'utf16le';
            case 'utf16le':
            case 'ucs2':
            break;
            case 'base': type = 'base64';
            case 'base64':
            case 'base-64':
            break;
            case 'hex': type = 'hex';
            case 'hexadecimal':
            break;
            case 'plain': type = 'text/plain';
            break;
            default: type = 'utf8';
            break;
        }
        this._encoding = type;
    }
    
    get encoding() {
        if (!this._encoding) {
            return 'utf8';
        } else {
            return this._encoding;
        }
    }
    
    get() {
        if (this.accept) {
            this.headers.Accept = this.accept;
        } else {
            this.headers.Accept = '*/*';
        }
        if (this.content) {
            this.headers['Content-Type'] = this.content;
        }
        return this.headers;
    }
    
 
    init() {
        let keys = Object.keys(this.options);
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let value = this.options[key];
            this.set(key, value);
        }
    }
}

module.exports = RequestalHeaders;