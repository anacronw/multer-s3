var S3FS = require('s3fs')
var crypto = require('crypto')

function S3Storage (opts) {
  if (!opts.bucket) throw new Error('bucket is required')
  if (!opts.secretAccessKey) throw new Error('secretAccessKey is required')
  if (!opts.accessKeyId) throw new Error('accessKeyId is required')
  if (!opts.region) throw new Error('region is required')
  if (!opts.dirname) throw new Error('dirname is required')

  this.options = opts
  this.s3fs = new S3FS(opts.bucket, opts)
}

S3Storage.prototype._handleFile = function (req, file, cb) {
  var extension = file.originalname.slice(-4);
  var originalFilename = file.originalname.slice(0, -4);

  if (this.options.originalname) {
    var fileName = file.originalname;
    console.log('using original name: ', fileName);
  } else if (!this.options.originalname && this.options.filename) {
    var fileName = this.options.filename + extension;
    console.log('using user-defined filename: ', fileName);
  } else {
    var fileName = crypto.randomBytes(20).toString('hex')
    console.log('using crypo name: ', fileName);
  }

  var filePath = this.options.dirname + '/' + fileName
  var outStream = this.s3fs.createWriteStream(filePath)

  file.stream.pipe(outStream)

  outStream.on('error', cb)
  outStream.on('finish', function () {
    cb(null, { size: outStream.bytesWritten, key: filePath })
  })
}

S3Storage.prototype._removeFile = function (req, file, cb) {
  this.s3fs.unlink(file.key, cb)
}

module.exports = function (opts) {
  return new S3Storage(opts)
}
