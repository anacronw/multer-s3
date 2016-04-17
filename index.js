var crypto = require('crypto')
var stream = require('stream')
var fileType = require('file-type')

function staticValue (value) {
  return function (req, file, cb) {
    cb(null, value)
  }
}

function defaultKey (req, file, cb) {
  crypto.randomBytes(16, function (err, raw) {
    cb(err, err ? undefined : raw.toString('hex'))
  })
}

function defaultContentType (req, file, cb) {
  setImmediate(function () { cb(null, 'application/octet-stream') })
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
  storage.getBucket(req, file, function (err, bucket) {
    if (err) return cb(err)

    storage.getKey(req, file, function (err, key) {
      if (err) return cb(err)

      storage.getContentType(req, file, function (err, contentType, replacementStream) {
        if (err) return cb(err)

        cb.call(storage, null, {
          bucket: bucket,
          key: key,
          contentType: contentType,
          replacementStream: replacementStream
        })
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

  switch (typeof opts.contentType) {
    case 'function': this.getContentType = opts.contentType; break
    case 'undefined': this.getContentType = defaultContentType; break
    default: throw new TypeError('Expected opts.contentType to be undefined or function')
  }
}

S3Storage.prototype._handleFile = function (req, file, cb) {
  collect(this, req, file, function (err, opts) {
    if (err) return cb(err)

    var currentSize = 0
    var upload = this.s3.upload({
      Bucket: opts.bucket,
      Key: opts.key,
      ContentType: opts.contentType,
      Body: (opts.replacementStream || file.stream)
    })

    upload.on('httpUploadProgress', function (ev) {
      if (ev.total) currentSize = ev.total
    })

    upload.send(function (err, result) {
      if (err) return cb(err)

      cb(null, {
        size: currentSize,
        bucket: opts.bucket,
        key: opts.key,
        contentType: opts.contentType,
        location: result.Location,
        etag: result.ETag
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
