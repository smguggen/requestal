const { ProtoHeaders, ProtoData } = require('@srcer/questal-proto');

class RequestalHeaders extends ProtoHeaders {
    constructor(options) {
        super(options);
        this.headers = {};
        this.options = options || {};
        this.init();
    }

    set contentType(type) {
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
    get contentType() {
        if (!this._content) {
            return 'application/json';
        } else {
            return this._content;
        }
    }
    
    charMap(type) {
        switch(type.toLowerCase()) {
            case 'iso':
            case 8859:
            case '8859':
            case 'iso-8859-1': return 'ISO-8859-1';
            break;
            case 'ascii': return 'ASCII';
            break;
            case 'ansi': return 'ANSI';
            break;
            case 'utf':
            case 'utf8':
            case 'utf-8': return 'UTF-8';
            break;
            default: return null;
            break;
        }
    }
    
    set charset(type) {
        this._charset = type;
    }
    
    get charset() {
        let $this = this;
        if (Array.isArray(this._charset)) {
            return this._charset.map(char => $this.charMap(char)).join(',');
        } else {
            return this._charset || null;
        }
    }
    
    set(key, value) {
        if (key.toLowerCase() == 'accept') {
               this.accept = value;
           } else if (key == 'charset') {
               this.charset = value;
           } else {
               this.headers[key] = value;
           }
       return this;
   }
    
    get() {
        if (this.accept) {
            this.headers.Accept = this.accept;
        } else {
            this.headers.Accept = '*/*';
        }
        if (this.contentType) {
            this.headers['Content-Type'] = this.contentType;
        }
        if (this.charset) {
            this.headers['Accept-Charset'] = this.charset;
        }
        
        return this.headers;
    }
    
 
    init() {
        let keys = Object.keys(this.options);
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let newKey = key;
            if (/[cC]ontent\-?[lL]ength/.test(key)) {
                newKey = 'Content-Length';
            } else if (/connection/i.test(key)) {
                newKey = 'CONNECTION';
            } else if (/[cC]ontent\-?[tT]ype/.test(key)) {
                this.contentType = value;
                continue;
            } else if (/[aA]ccept/.test(key)) {
                this.accept = value;
                continue;
            }
            let value = this.options[key];
            this.set(newKey, value);
        }
    }
    
    processRequestBody(input) {
        if (input && typeof input !== 'string' && !Buffer.isBuffer(input)) { 
            if (!this._accept || 
                !(this._accept.length) ||
                this._accept.includes('*/*') || 
                this._accept.includes('application/json')
            ) {
                try {
                    return JSON.stringify(input);
                } catch(e) {
                    return ProtoData.stringify(input);
                }
            } else {
                return ProtoData.stringify(input);
            }
        } else {
            return input;
        }
    } 
    
}

module.exports = RequestalHeaders;