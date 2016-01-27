/* eslint-env mocha */

require('chai').should()

var express = require('express')
var supertest = require('supertest')
var multerS3 = require('../../index')
var multer = require('multer')
var AWS = require('aws-sdk')

var app = express()
var lastReq = null

var upload = multer({storage: multerS3({
  bucket: 'some-bucket',
  secretAccessKey: 'some secret',
  accessKeyId: 'some key',
  region: 'us-east-1',
  s3ForcePathStyle: true,
  endpoint: new AWS.Endpoint('http://localhost:4568')
})})

var uploadAuto = multer({storage: multerS3({
  bucket: 'some-bucket',
  secretAccessKey: 'some secret',
  accessKeyId: 'some key',
  region: 'us-east-1',
  s3ForcePathStyle: true,
  endpoint: new AWS.Endpoint('http://localhost:4568'),
  contentType: multerS3.AUTO_CONTENT_TYPE
})})

var uploadCustomKey = multer({storage: multerS3({
  bucket: 'some-bucket',
  secretAccessKey: 'some secret',
  accessKeyId: 'some key',
  region: 'us-east-1',
  s3ForcePathStyle: true,
  endpoint: new AWS.Endpoint('http://localhost:4568'),
  key: function (req, file, cb) {
    cb(null, 'key-name')
  }
})})

// express setup
app.post('/upload', upload.array('photos', 3), function (req, res, next) {
  lastReq = req
  res.status(200).send()
})

app.post('/upload-auto', uploadAuto.array('photos', 3), function (req, res, next) {
  lastReq = req
  res.status(200).send()
})
app.post('/upload-custom', uploadCustomKey.array('photos', 3), function (req, res, next) {
  lastReq = req
  res.status(200).send()
})

describe('express', function () {
  it('successfully uploads a file', function (done) {
    supertest(app)
      .post('/upload')
      .attach('photos', 'test/fixtures/ffffff.png')
      .expect(200, done)
  })

  it('returns a req.files with the s3 filename', function (done) {
    supertest(app)
      .post('/upload')
      .attach('photos', 'test/fixtures/ffffff.png')
      .end(function (err, res) {
        if (err) return done(err)

        lastReq.files.map(function (file) {
          file.should.have.property('key')
          file.should.have.property('size')
          file.size.should.equal(68)
        })

        done()
      })
  })

  it('returns a req.files with the s3 filename with auto content-type', function (done) {
    supertest(app)
      .post('/upload-auto')
      .attach('photos', 'test/fixtures/ffffff.png')
      .end(function (err, res) {
        if (err) return done(err)

        lastReq.files.map(function (file) {
          file.should.have.property('key')
          file.should.have.property('size')
          file.size.should.equal(68)
        })

        done()
      })
  })

  it('calls a custom key function is provided', function (done) {
    supertest(app)
      .post('/upload-custom')
      .attach('photos', 'test/fixtures/ffffff.png')
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err)

        lastReq.files.map(function (file) {
          file.should.have.property('key', 'key-name')
          file.should.have.property('size')
          file.size.should.equal(68)
        })

        done()
      })
  })
})
