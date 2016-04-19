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

### Setting ACL

[ACL values](http://docs.aws.amazon.com/AmazonS3/latest/API/RESTObjectPOST.html#d0e24378) can be set by passing an optional `acl` parameter into the `multerS3` object.

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

Options: `private | public-read | public-read-write | aws-exec-read | authenticated-read | bucket-owner-read | bucket-owner-full-control`.

## Testing

The tests mock all access to S3 and can be run completely offline.

```sh
npm test
```
