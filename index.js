var crypto = require('crypto')
var stream = require('stream')
var fileType = require('file-type')
var Upload = require('@aws-sdk/lib-storage').Upload
var DeleteObjectCommand = require('@aws-sdk/client-s3').DeleteObjectCommand
var util = require('util')

var defaultAcl = staticValue('private')
var defaultContentType = staticValue('application/octet-stream')
var defaultMetadata = staticValue(undefined)
var defaultCacheControl = staticValue(null)
var defaultContentDisposition = staticValue(null)
var defaultContentEncoding = staticValue(null)
var defaultStorageClass = staticValue('STANDARD')
var defaultSSE = staticValue(null)
var defaultSSEKMS = staticValue(null)
var defaultShouldTransform = staticValue(false)
var defaultTransformers = []

function defaultKey (req, file, cb) {
  crypto.randomBytes(16, function (err, raw) {
    cb(err, err ? undefined : raw.toString('hex'))
  })
}

function staticValue (value) {
  return function (req, file, cb) {
    cb(null, value)
  }
}

function waterfall (funcs, callback) {
  var index = 0
  var values = []

  function next (err, value) {
    if (err) return callback(err)
    values.push(value)
    if (index >= funcs.length) return callback(null, values)
    funcs[index++](next)
  }

  funcs[index++](next)
}

function autoContentType (req, file, cb) {
  // Regular expression to detect svg file content, inspired by: https://github.com/sindresorhus/is-svg/blob/master/index.js
  // It is not always possible to check for an end tag if a file is very big. The firstChunk, see below, might not be the entire file.
  var svgRegex = /^\s*(?:<\?xml[^>]*>\s*)?(?:<!doctype svg[^>]*>\s*)?<svg[^>]*>/i

  function isSvg (svg) {
    // Remove DTD entities
    svg = svg.replace(/\s*<!Entity\s+\S*\s*(?:"|')[^"]+(?:"|')\s*>/img, '')
    // Remove DTD markup declarations
    svg = svg.replace(/\[?(?:\s*<![A-Z]+[^>]*>\s*)*\]?/g, '')
    // Remove HTML comments
    svg = svg.replace(/<!--([\s\S]*?)-->/g, '')

    return svgRegex.test(svg)
  }

  var outStream = new stream.PassThrough()

  stream.pipeline(file.stream, outStream, function (err) {
    if (err) return cb(err)
  })

  file.stream.once('data', function (firstChunk) {
    fileType.fromBuffer(firstChunk).then(function (type) {
      var mime = 'application/octet-stream' // default type

      // Make sure to check xml-extension for svg files.
      if ((!type || type.ext === 'xml') && isSvg(firstChunk.toString())) {
        mime = 'image/svg+xml'
      } else if (type) {
        mime = type.mime
      }

      cb(null, mime, outStream)
    })
  })
}

function collect (storage, req, file, cb) {
  waterfall([
    storage.getBucket.bind(storage, req, file),
    storage.getKey.bind(storage, req, file),
    storage.getAcl.bind(storage, req, file),
    storage.getMetadata.bind(storage, req, file),
    storage.getCacheControl.bind(storage, req, file),
    storage.getContentDisposition.bind(storage, req, file),
    storage.getStorageClass.bind(storage, req, file),
    storage.getSSE.bind(storage, req, file),
    storage.getSSEKMS.bind(storage, req, file),
    storage.getContentEncoding.bind(storage, req, file),
    storage.getShouldTransform.bind(storage, req, file)
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
        contentDisposition: values[5],
        storageClass: values[6],
        contentType: contentType,
        replacementStream: replacementStream,
        serverSideEncryption: values[7],
        sseKmsKeyId: values[8],
        contentEncoding: values[9],
        shouldTransform: values[10]
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
    case 'string': this.getKey = staticValue(opts.key); break
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
    case 'string': this.getContentType = staticValue(opts.contentType); break
    case 'undefined': this.getContentType = defaultContentType; break
    default: throw new TypeError('Expected opts.contentType to be undefined, string or function')
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

  switch (typeof opts.contentDisposition) {
    case 'function': this.getContentDisposition = opts.contentDisposition; break
    case 'string': this.getContentDisposition = staticValue(opts.contentDisposition); break
    case 'undefined': this.getContentDisposition = defaultContentDisposition; break
    default: throw new TypeError('Expected opts.contentDisposition to be undefined, string or function')
  }

  switch (typeof opts.contentEncoding) {
    case 'function': this.getContentEncoding = opts.contentEncoding; break
    case 'string': this.getContentEncoding = staticValue(opts.contentEncoding); break
    case 'undefined': this.getContentEncoding = defaultContentEncoding; break
    default: throw new TypeError('Expected opts.contentEncoding to be undefined, string or function')
  }

  switch (typeof opts.storageClass) {
    case 'function': this.getStorageClass = opts.storageClass; break
    case 'string': this.getStorageClass = staticValue(opts.storageClass); break
    case 'undefined': this.getStorageClass = defaultStorageClass; break
    default: throw new TypeError('Expected opts.storageClass to be undefined, string or function')
  }

  switch (typeof opts.serverSideEncryption) {
    case 'function': this.getSSE = opts.serverSideEncryption; break
    case 'string': this.getSSE = staticValue(opts.serverSideEncryption); break
    case 'undefined': this.getSSE = defaultSSE; break
    default: throw new TypeError('Expected opts.serverSideEncryption to be undefined, string or function')
  }

  switch (typeof opts.sseKmsKeyId) {
    case 'function': this.getSSEKMS = opts.sseKmsKeyId; break
    case 'string': this.getSSEKMS = staticValue(opts.sseKmsKeyId); break
    case 'undefined': this.getSSEKMS = defaultSSEKMS; break
    default: throw new TypeError('Expected opts.sseKmsKeyId to be undefined, string, or function')
  }

  switch (typeof opts.shouldTransform) {
    case 'function': this.getShouldTransform = opts.shouldTransform; break
    case 'boolean': this.getShouldTransform = staticValue(opts.shouldTransform); break
    case 'undefined': this.getShouldTransform = defaultShouldTransform; break
    default: throw new TypeError('Expected opts.shouldTransform to be undefined, boolean or function')
  }

  switch (typeof opts.transformers) {
    case 'object': this.transformers = opts.transformers; break
    case 'undefined': this.transformers = defaultTransformers; break
    default: throw new TypeError('Expected opts.transforms to be undefined or object')
  }

  this.transformers.map(function (transformer) {
    switch (typeof transformer.id) {
      case 'string': break
      default: throw new TypeError('Expected opts.transformer[].id to be string')
    }

    switch (typeof transformer.key) {
      case 'function': break
      case 'string': transformer.key = staticValue(transformer.key); break
      case 'undefined': transformer.key = defaultKey(); break
      default: throw new TypeError('Expected opts.transformer[].key to be unedefined, string or function')
    }

    switch (typeof transformer.transform) {
      case 'function': break
      default: throw new TypeError('Expected opts.transformer[].transform to be function')
    }

    switch (typeof transformer.contentType) {
      case 'function': transformer.getContentType = transformer.contentType; break
      case 'string': transformer.getContentType = staticValue(transformer.contentType); break
      case 'undefined': transformer.getContentType = staticValue(undefined); break
      default: throw new TypeError('Expected opts.transformer[].contentType to be undefined, string or function')
    }

    return transformer
  })
}

S3Storage.prototype.directUpload = function (opts, file, cb) {
  var currentSize = 0

  var params = {
    Bucket: opts.bucket,
    Key: opts.key,
    ACL: opts.acl,
    CacheControl: opts.cacheControl,
    ContentType: opts.contentType,
    Metadata: opts.metadata,
    StorageClass: opts.storageClass,
    ServerSideEncryption: opts.serverSideEncryption,
    SSEKMSKeyId: opts.sseKmsKeyId,
    Body: opts.piper ? (opts.replacementStream || file.stream).pipe(opts.piper) : (opts.replacementStream || file.stream)
  }

  if (opts.contentDisposition) {
    params.ContentDisposition = opts.contentDisposition
  }

  if (opts.contentEncoding) {
    params.ContentEncoding = opts.contentEncoding
  }

  var upload = new Upload({
    client: this.s3,
    params: params
  })

  upload.on('httpUploadProgress', function (ev) {
    if (ev.total) currentSize = ev.total
  })

  util.callbackify(upload.done.bind(upload))(function (err, result) {
    if (err) return cb(err)

    cb(null, {
      id: opts.id,
      size: currentSize,
      bucket: opts.bucket,
      key: opts.key,
      acl: opts.acl,
      contentType: opts.contentType,
      contentDisposition: opts.contentDisposition,
      contentEncoding: opts.contentEncoding,
      storageClass: opts.storageClass,
      serverSideEncryption: opts.serverSideEncryption,
      metadata: opts.metadata,
      location: result.Location,
      etag: result.ETag,
      versionId: result.VersionId
    })
  })
}

S3Storage.prototype.transformUpload = function (opts, req, file, cb) {
  var storage = this
  var transformations = {}
  var pending = storage.transformers.length

  waterfall(
    storage.transformers.map(function (transform) {
      return transform.key.bind(storage, req, file)
    }),
    function (err, keys) {
      if (err) return cb(err)

      keys.forEach(function (key, i) {
        var transform = storage.transformers[i].transform.bind(storage, req, file)
        var getContentType = storage.transformers[i].getContentType.bind(storage, req, file)

        getContentType(function (err, contentType) {
          if (err) return cb(err)

          transform(function (err, piper) {
            if (err) return cb(err)

            var transformerOpts = Object.assign({}, opts)
            transformerOpts.id = storage.transformers[i].id || i
            transformerOpts.key = key
            transformerOpts.contentType = contentType || transformerOpts.contentType
            transformerOpts.piper = piper

            storage.directUpload(transformerOpts, file, function (err, result) {
              if (err) return cb(err)

              transformations[transformerOpts.id] = result
              if (--pending === 0) cb(null, { transformations: transformations })
            })
          })
        })
      })
    }
  )
}

S3Storage.prototype._handleFile = function (req, file, cb) {
  collect(this, req, file, function (err, opts) {
    if (err) return cb(err)

    if (opts.shouldTransform) {
      this.transformUpload(opts, req, file, cb)
    } else {
      this.directUpload(opts, file, cb)
    }
  })
}

S3Storage.prototype._removeFile = function (req, file, cb) {
  this.s3.send(
    new DeleteObjectCommand({
      Bucket: file.bucket,
      Key: file.key
    }),
    cb
  )
}

module.exports = function (opts) {
  return new S3Storage(opts)
}

module.exports.AUTO_CONTENT_TYPE = autoContentType
module.exports.DEFAULT_CONTENT_TYPE = defaultContentType
