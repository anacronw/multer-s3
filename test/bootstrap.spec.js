var S3rver = require('s3rver')
var os = require('os')
var s3rver = new S3rver()
var path = require('path')
var fs = require('fs');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

before(function(done){
  s3rver
    .setHostname('localhost')
    .setPort(4568)
    .setDirectory(path.resolve(__dirname, 'fixtures/.tmp'))
    .setSilent(true)
    .run(function (err, host, port) {
      if(err) return done(err);
      mkdirp(path.resolve(__dirname, 'fixtures/.tmp/some-bucket'), done);
    });
});

after(function(done){
  rimraf(path.resolve(__dirname, 'fixtures/.tmp/some-bucket'), done);
});
