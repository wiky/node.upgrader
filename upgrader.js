var http = require('http'),
    https = require('https'),
    fs = require('fs'),
    util = require('util'),
    nodePath = require('path'),
    nodeUrl = require('url'),
    events = require('events'),
    unzip = require('unzip');

var Upgrader = function(config) {
    events.EventEmitter.call(this);
    this._init(config);
};

util.inherits(Upgrader, events.EventEmitter);

Upgrader.prototype._init = function(config) {
    this.config = config;
    config.dest = config.dest || './';
    mkdirs(config.dest);
};
Upgrader.prototype.check = function(callback) {
    var _self = this,
        config = this.config,
        version = config.version,
        localData = null,
        req = this._getReqest(version.remote);

    callback = callback || function() {};

    try {
        localData = JSON.parse(fs.readFileSync(version.local));
    } catch (e) {}

    req.on('response', function(res) {
        var body = '';

        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('error', function(err) {
            callback.call(_self, null, null);
        });

        res.on('end', function() {
            var remoteData;
            try {
                remoteData = JSON.parse(body);
                _self.remoteData = remoteData;
                callback.call(_self, localData, remoteData);
                _self.emit('checked', localData, remoteData);
            } catch (e) {
                callback.call(_self, localData, null);
            }
        });
    });

    req.end();
};
Upgrader.prototype.download = function(url, callback) {
    if (typeof url === 'function' || !url) {
        callback = url || function() {};
        url = this.config.url;
    }

    callback = callback || function() {};

    var _self = this,
        req = this._getReqest(url),
        config = this.config,
        fileName = nodeUrl.parse(url).pathname.split('/').pop();
    this.fileName = fileName;

    req.on('response', function(res) {
        var len = parseInt(res.headers['content-length'], 10),
            filePath = nodePath.join(config.dest, fileName),
            file = fs.createWriteStream(filePath),
            current = 0;

        res.on('data', function(chunk) {
            file.write(chunk);
            current += chunk.length;
            _self.emit('downloading', len, current);
        });

        res.on('error', function(err) {
            callback.call(_self, err);
            _self.emit('downloadError', err);
        });

        res.on('end', function() {
            file.end();
            callback.call(_self, len);
            _self.emit('downloaded', len);
        });

        _self.emit('download', len);
    });

    req.end();
};
Upgrader.prototype.extract = function(delzip, callback) {
    if (typeof delzip === 'function' || typeof delzip === 'undefined') {
        callback = delzip || function() {};
        delzip = !! this.config.delzip;
    }

    callback = callback || function() {};

    var _self = this,
        dest = this.config.dest,
        extract, filePath, file;

    extract = unzip.Extract({
        path: dest
    });

    extract.on('close', function() {
        if (delzip) {
            fs.unlink(filePath);
        }
        callback.call(_self);
        _self.emit('extracted');
    });

    filePath = nodePath.join(dest, this.fileName);
    file = fs.createReadStream(filePath).pipe(extract);
    this.emit('extract');
};
Upgrader.prototype._getReqest = function(url) {
    var req,
        matcher,
        param;

    if (!url) {
        throw new Error('Download url is required');
    }

    url = nodeUrl.parse(url);
    matcher = url.protocol.match(/^http[s]?/i);
    param = {
        host: url.host,
        port: url.port || 80,
        path: url.path
    };

    if (matcher && matcher[0] === 'http') {
        req = http.request(param);
    } else if (matcher && matcher[0] === 'https') {
        param.port = url.port || 443;
        req = https.request(param);
    } else {
        throw new Error('Protocol ' + url.protocol + ' is not supported');
    }

    return req;
};

function mkdirs(dirPath, mode, cb) {
    var dirs = dirPath.replace(/\/?[^\/]+\/?/g, '$`$&,').split(',');
    dirs.pop();
    (function next(e) {
        var finished = ! dirs.length,
            dir = dirs.shift();

        if (!e) {
            if (dir && !fs.existsSync(dir)) {
                fs.mkdir(dir, mode, next);
            } else if (!finished) {
                next();
            }
        } else {
            throw e;
        }
        if (finished && typeof cb === 'function') {
            cb(e);
        }
    })(null);
}

module.exports = function(config) {
    return new Upgrader(config);
};