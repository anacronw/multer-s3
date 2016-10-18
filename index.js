var crypto = require('crypto')
var stream = require('stream')
var fileType = require('file-type')
var parallel = require('run-parallel')

function staticValue (value) {
  return function (req, file, cb) {
    cb(null, value)
  }
}

var defaultAcl = staticValue('private')
var defaultContentType = staticValue('application/octet-stream')

var defaultMetadata = staticValue(null)
var defaultCacheControl = staticValue(null)

var defaultSSECustomerAlgorithm = staticValue(null)
var defaultSSECustomerKey = staticValue(null)

function defaultKey (req, file, cb) {
  crypto.randomBytes(16, function (err, raw) {
    cb(err, err ? undefined : raw.toString('hex'))
  })
}

function autoContentType (req, file, cb) {
  file.stream.once('data', function (firstChunk) {
    var type = fileType(firstChunk)
    var mime = (type === null ? 'application/octet-stream' : type.mime)
    var outStream = new stream.PassThrough()

    outStream.write(firstChunk)
    file.stream.pipe(outStream)

    cb(null, mime, outStream)
  })
}

function collect (storage, req, file, cb) {
  parallel([
    storage.getBucket.bind(storage, req, file),
    storage.getKey.bind(storage, req, file),
    storage.getAcl.bind(storage, req, file),
    storage.getMetadata.bind(storage, req, file),
    storage.getCacheControl.bind(storage, req, file),
    storage.getSSECustomerAlgorithm.bind(storage, req, file),
    storage.getSSECustomerKey.bind(storage, req, file)
  ], function (err, values) {
    if (err) return cb(err)

    storage.getContentType(req, file, function (err, contentType, replacementStream) {
      if (err) return cb(err)

      cb.call(storage, null, {
        bucket: values[0],
        key: values[1],
        acl: values[2],
        metadata: values[3],
        cacheControl: values[4],
        contentType: contentType,
        replacementStream: replacementStream,
        sseCustomerAlgorithm: values[5],
        sseCustomerKey: values[6],
        sseCustomerKeyMD5: values[6] ? crypto.createHash('md5').update(values[6]).digest("base64") : null
      })
    })
  })
}

function S3Storage (opts) {
  switch (typeof opts.s3) {
    case 'object': this.s3 = opts.s3; break
    default: throw new TypeError('Expected opts.s3 to be object')
  }

  switch (typeof opts.bucket) {
    case 'function': this.getBucket = opts.bucket; break
    case 'string': this.getBucket = staticValue(opts.bucket); break
    case 'undefined': throw new Error('bucket is required')
    default: throw new TypeError('Expected opts.bucket to be undefined, string or function')
  }

  switch (typeof opts.key) {
    case 'function': this.getKey = opts.key; break
    case 'undefined': this.getKey = defaultKey; break
    default: throw new TypeError('Expected opts.key to be undefined or function')
  }

  switch (typeof opts.acl) {
    case 'function': this.getAcl = opts.acl; break
    case 'string': this.getAcl = staticValue(opts.acl); break
    case 'undefined': this.getAcl = defaultAcl; break
    default: throw new TypeError('Expected opts.acl to be undefined, string or function')
  }

  switch (typeof opts.contentType) {
    case 'function': this.getContentType = opts.contentType; break
    case 'undefined': this.getContentType = defaultContentType; break
    default: throw new TypeError('Expected opts.contentType to be undefined or function')
  }

  switch (typeof opts.metadata) {
    case 'function': this.getMetadata = opts.metadata; break
    case 'undefined': this.getMetadata = defaultMetadata; break
    default: throw new TypeError('Expected opts.metadata to be undefined or function')
  }

  switch (typeof opts.cacheControl) {
    case 'function': this.getCacheControl = opts.cacheControl; break
    case 'string': this.getCacheControl = staticValue(opts.cacheControl); break
    case 'undefined': this.getCacheControl = defaultCacheControl; break
    default: throw new TypeError('Expected opts.cacheControl to be undefined, string or function')
  }

  switch (typeof opts.sseCustomerAlgorithm) {
    case 'string': this.getSSECustomerAlgorithm = staticValue(opts.sseCustomerAlgorithm); break
    case 'undefined': this.getSSECustomerAlgorithm = defaultSSECustomerAlgorithm; break
    default: throw new TypeError('Expected opts.sseCustomerAlgorithm to be undefined or string')
  }

  switch (typeof opts.sseCustomerKey) {
    case 'function': this.getSSECustomerKey = opts.sseCustomerKey; break
    case 'string': this.getSSECustomerKey = staticValue(opts.sseCustomerKey); break
    case 'undefined': this.getSSECustomerKey = defaultSSECustomerKey; break
    default: throw new TypeError('Expected opts.sseCustomerKey to be undefined, string or function')
  }
}

S3Storage.prototype._handleFile = function (req, file, cb) {
  collect(this, req, file, function (err, opts) {
    if (err) return cb(err)

    var currentSize = 0
    var upload = this.s3.upload({
      Bucket: opts.bucket,
      Key: opts.key,
      ACL: opts.acl,
      CacheControl: opts.cacheControl,
      ContentType: opts.contentType,
      Metadata: opts.metadata,
      Body: (opts.replacementStream || file.stream),
      SSECustomerAlgorithm: opts.sseCustomerAlgorithm,
      SSECustomerKey: opts.sseCustomerKey,
      SSECustomerKeyMD5: opts.sseCustomerKeyMD5
    })

    console.log({
      Bucket: opts.bucket,
      Key: opts.key,
      ACL: opts.acl,
      CacheControl: opts.cacheControl,
      ContentType: opts.contentType,
      Metadata: opts.metadata,
      Body: (opts.replacementStream || file.stream),
      SSECustomerAlgorithm: opts.sseCustomerAlgorithm,
      SSECustomerKey: opts.sseCustomerKey,
      SSECustomerKeyMD5: opts.sseCustomerKeyMD5
    });

    upload.on('httpUploadProgress', function (ev) {
      if (ev.total) currentSize = ev.total
    })

    upload.send(function (err, result) {
      if (err) return cb(err)

      cb(null, {
        size: currentSize,
        bucket: opts.bucket,
        key: opts.key,
        acl: opts.acl,
        contentType: opts.contentType,
        metadata: opts.metadata,
        location: result.Location,
        etag: result.ETag,
        sseCustomerAlgorithm: opts.sseCustomerAlgorithm,
        sseCustomerKey: opts.sseCustomerKey
      })
    })
  })
}

S3Storage.prototype._removeFile = function (req, file, cb) {
  this.s3.deleteObject({ Bucket: file.bucket, Key: file.key }, cb)
}

module.exports = function (opts) {
  return new S3Storage(opts)
}

module.exports.AUTO_CONTENT_TYPE = autoContentType
module.exports.DEFAULT_CONTENT_TYPE = defaultContentType
