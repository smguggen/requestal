const { ProtoResponse } = require('@srcer/questal-proto');

class RequestalResponse extends ProtoResponse {
    constructor(response, data, omitBody) {
        super(response, omitBody);
        this.settings = response || {};
        this.responseData = data || '';
    }
    
    get headers() {
        if (!this.active) {
            return {};
        }
        let res = this.settings.headers;
        let result = {};
        if (res) {
            result = res.split('\r\n').reduce((acc, header) => {
                let parts = header.split(':');
                if (parts && parts.length == 2) {
                    let key = QuestalUtil.toCamelCase(parts[0]);
                    if (['contentType', 'cacheControl'].includes(key)) {
                        let separator = key == 'contentType' ? ';' : ',';
                        let sets = parts[1].split(separator);
                        let val = sets[0].trim();
                        acc[key] = val;
                        if (key == 'contentType') {
                            acc.encoding = val.split('/')[1];
                        }
                        if (sets.length > 1) {
                            let params = sets[1].split('=');
                            if (params.length > 1) {
                                let param = QuestalUtil.toCamelCase(params[0]);
                                acc[param] = params[1].trim();
                            }
                        }
                    } else {
                        acc[key] = parts[1].trim();
                    }
                }
                return acc;
            }, {});
        }
        if (this.type) {
            result.responseType = this.type;
        }
        return result;
    }
    
    get url() {
        return this.settings.url;
    }
    
    get result() {
        try {
            return this.responseData.toString();
        } catch (e) {
            return this.responseData;
        }
    }

    get text() {
        try {
            return this.responseData.toString();
        } catch (e) {
            return '';
        }
    }
    
    get json() {
        try {
            let data = JSON.parse(this.result);
            while (data && typeof data !== 'object') {
                data = JSON.parse(data);
            }
            return data;
        } catch(e) {
            return [this.result];
        }
    }
    
    get message() {
        return this.settings.statusMessage;
    }
    
    get code() {
        return this.settings.statusCode;
    }
    
    get status() {
        return this.code + ' ' + this.message;
    }
    
    set responseData(d) {
        if (!d) {
            return;
        }
        if (!this._responseData) {
            this._responseData = Buffer.from(d);
        } else {
            let b = Buffer.from(d);
            let length = this.responseData.length + b.length;
            this._responseData = Buffer.concat([this._responseData, b], length);
        }
    }
    
    get responseData() {
        return this._responseData || Buffer.alloc(10);
    }
    
    isSuccess() {
        let code = this.code;
        return code >= 200 && code < 300;
    }
    
    mapEncoding(type) {
        switch(type) {
            case 'binary':
            case 'latin':
            case 'latin1':
            case 'latin-1': return 'binary';
            break;
            case 'ascii': return 'ascii';
            break;
            case 'utf16':
            case 'utf16le':
            case 'utf-16':
            case 'ucs2': return 'utf16le';
            break;
            case 'base':
            case 'base64':
            case 'base-64': return 'base64';
            break;
            case 'hex':
            case 'hexadecimal': return 'hex';
            break;
            case 'plain':
            case 'text': return 'text/plain';
            break;
            default: return 'utf8';
            break;
        }
    }
    
    set encoding(type) {
        this._encoding = type;
    }
    
    get encoding() {
        return this.mapEncoding(this._encoding);
    }
    
    setEncoding(type) {
        this.encoding = type;
        return this.encoding;
    }
}

module.exports = RequestalResponse;