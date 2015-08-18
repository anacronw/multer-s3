# multer-s3
Streaming multer storage engine for AWS S3

This project is mostly an integration piece for existing code samples from Multer's [storage engine documentation](https://github.com/expressjs/multer/blob/master/StorageEngine.md) with [s3fs](https://github.com/RiptideElements/s3fs) as the substitution piece for file system.  Existing solutions I found required buffering the multipart uploads into the actual filesystem which is difficult to scale.

# Install
```
npm install --save multer-s3
```

# Tests
Tested with [s3rver](https://github.com/jamhall/s3rver) instead of your actual s3 credentials.  Doesn't require a real account or changing of hosts files.  Includes integration tests ensuring that it should work with express + multer.

```
npm test
```

# Usage
```
var express = require('express');
var app = express();
var multer = require('multer');
var s3 = require('multer-s3');

var upload = multer({
  storage: s3({
    dirname: 'uploads/photos',
    bucket: 'some-bucket',
    secretAccessKey: 'some secret',
    accessKeyId: 'some key',
    region: 'us-east-1',
    filename: function (req, file, cb) {
      cb(null, Date.now())
    }
  })
})

app.post('/upload', upload.array('photos', 3), function(req, res, next){
  res.send('Successfully uploaded!');
});
```
