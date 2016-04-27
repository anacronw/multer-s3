# Multer S3

Streaming multer storage engine for AWS S3.

This project is mostly an integration piece for existing code samples from Multer's [storage engine documentation](https://github.com/expressjs/multer/blob/master/StorageEngine.md) with [s3fs](https://github.com/RiptideElements/s3fs) as the substitution piece for file system.  Existing solutions I found required buffering the multipart uploads into the actual filesystem which is difficult to scale.

## Installation

```sh
npm install --save multer-s3
```

## Usage

```javascript
var aws = require('aws-sdk')
var express = require('express')
var multer = require('multer')
var multerS3 = require('multer-s3')

var app = express()
var s3 = new aws.S3({ /* ... */ })

var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'some-bucket',
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  })
})

app.post('/upload', upload.array('photos', 3), function(req, res, next) {
  res.send('Successfully uploaded ' + req.files.length + ' files!')
})
```

### File information

Each file contains the following information exposed by `multer-s3`:

Key | Description | Note
--- | --- | ---
`size` | Size of the file in bytes |
`bucket` | The bucket used to store the file | `S3Storage`
`key` | The name of the file | `S3Storage`
`acl` | Access control for the file | `S3Storage`
`contentType` | The `mimetype` used to upload the file | `S3Storage`
`location` | The S3 `url` to access the file  | `S3Storage`
`etag` | The `etag`of the uploaded file in S3  | `S3Storage`

### Setting ACL

[ACL values](http://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html#canned-acl) can be set by passing an optional `acl` parameter into the `multerS3` object.

```javascript
var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'some-bucket',
    acl: 'public-read',
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  })
})
```

Available options for canned ACL.

ACL Option | Permissions added to ACL
--- | ---
`private` | Owner gets `FULL_CONTROL`. No one else has access rights (default).
`public-read` | Owner gets `FULL_CONTROL`. The `AllUsers` group gets `READ` access.
`public-read-write` | Owner gets `FULL_CONTROL`. The `AllUsers` group gets `READ` and `WRITE` access. Granting this on a bucket is generally not recommended.
`aws-exec-read` | Owner gets `FULL_CONTROL`. Amazon EC2 gets `READ` access to `GET` an Amazon Machine Image (AMI) bundle from Amazon S3.
`authenticated-read` | Owner gets `FULL_CONTROL`. The `AuthenticatedUsers` group gets `READ` access.
`bucket-owner-read` | Object owner gets `FULL_CONTROL`. Bucket owner gets `READ` access. If you specify this canned ACL when creating a bucket, Amazon S3 ignores it.
`bucket-owner-full-control` | Both the object owner and the bucket owner get `FULL_CONTROL` over the object. If you specify this canned ACL when creating a bucket, Amazon S3 ignores it.
`log-delivery-write` | The `LogDelivery` group gets `WRITE` and `READ_ACP` permissions on the bucket. For more information on logs.


## Testing

The tests mock all access to S3 and can be run completely offline.

```sh
npm test
```
